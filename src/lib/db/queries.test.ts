// Mock Firestore before any imports so queries.ts never touches Firebase
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('./firestore', () => ({
  pushDoc:                  vi.fn().mockResolvedValue(undefined),
  removeDoc:                vi.fn().mockResolvedValue(undefined),
  clearFirestoreCollection: vi.fn().mockResolvedValue(undefined),
  pullFromFirestore:        vi.fn().mockResolvedValue(undefined),
}));

import { db, DEFAULT_CATEGORIES } from './schema';
import {
  seedIfEmpty,
  migrateCategoryIds,
  addTransaction,
  getTransactions,
  addPgNeed,
  togglePgNeed,
  deletePgNeed,
  getPgNeeds,
  addLend,
  addRepayment,
  deleteLend,
  backfillLendTransactions,
} from './queries';

// ── helpers ──────────────────────────────────────────────────────────────────

async function clearDB() {
  await Promise.all([
    db.categories.clear(),
    db.transactions.clear(),
    db.settings.clear(),
    db.lends.clear(),
    db.pgneeds.clear(),
  ]);
}

// ── tests ─────────────────────────────────────────────────────────────────────

beforeEach(clearDB);

// ── seedIfEmpty ───────────────────────────────────────────────────────────────

describe('seedIfEmpty', () => {
  it('seeds all default categories with their stable IDs', async () => {
    await seedIfEmpty();
    const cats = await db.categories.toArray();
    for (const def of DEFAULT_CATEGORIES) {
      expect(cats.find(c => c.id === def.id), `category "${def.name}" should have stable id ${def.id}`).toBeTruthy();
    }
  });

  it('is idempotent — running twice does not duplicate categories', async () => {
    await seedIfEmpty();
    await seedIfEmpty();
    const cats = await db.categories.toArray();
    const names = cats.map(c => c.name.toLowerCase());
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
    expect(cats.length).toBe(DEFAULT_CATEGORIES.length);
  });

  it('cross-device: independently seeding on two "devices" produces matching IDs', async () => {
    // Device A seeds (fresh DB)
    await seedIfEmpty();
    const deviceACats = (await db.categories.toArray()).sort((a, b) => a.name.localeCompare(b.name));

    // Simulate Device B: clear local DB and seed again independently
    await clearDB();
    await seedIfEmpty();
    const deviceBCats = (await db.categories.toArray()).sort((a, b) => a.name.localeCompare(b.name));

    expect(deviceACats.length).toBe(deviceBCats.length);
    for (let i = 0; i < deviceACats.length; i++) {
      expect(deviceACats[i].id).toBe(deviceBCats[i].id);
    }
  });
});

// ── migrateCategoryIds ────────────────────────────────────────────────────────

describe('migrateCategoryIds', () => {
  it('replaces a random-ID category with the canonical stable ID', async () => {
    const def = DEFAULT_CATEGORIES.find(c => c.name === 'Entertainment')!;
    const randomId = 'old-random-id-abc';

    // Insert the category with a random ID (simulates pre-fix device seed)
    await db.categories.add({ ...def, id: randomId });

    await migrateCategoryIds();

    const after = await db.categories.toArray();
    expect(after.find(c => c.id === randomId)).toBeUndefined();
    expect(after.find(c => c.id === def.id)).toBeTruthy();
  });

  it('updates transactions that reference the old category ID', async () => {
    const def = DEFAULT_CATEGORIES.find(c => c.name === 'Food & Dining')!;
    const randomId = 'old-food-id';

    await db.categories.add({ ...def, id: randomId });
    const tx = await addTransaction({
      type: 'expense', amount: 300, categoryId: randomId,
      paymentMode: 'upi', date: '2026-06-01',
    });

    await migrateCategoryIds();

    const updated = await db.transactions.get(tx.id);
    expect(updated?.categoryId).toBe(def.id);
  });

  it('fixes transactions when Firestore re-pulls both old-ID and stable-ID category on reload', async () => {
    // Scenario: migration ran once (stable cat + transaction pushed to Firestore),
    // but removeDoc for the old category failed — so Firestore still has the old-ID
    // category. On next load, pullFromFirestore re-pulls BOTH old-ID and stable-ID
    // categories AND the transaction that already has the stable categoryId.
    // deduplicateCategories must NOT run before migrateCategoryIds or it could remove
    // the stable-ID category and leave the transaction un-resolvable.
    const def = DEFAULT_CATEGORIES.find(c => c.name === 'Entertainment')!;
    const oldId = 'old-ent-firestore';

    // Simulate state after a failed removeDoc: both old and stable exist in local DB
    await db.categories.bulkPut([
      { ...def, id: oldId },        // old (from Firestore re-pull)
      { ...def, id: def.id },       // stable (from previous migration)
    ]);
    // Transaction already has the stable ID from previous migration run
    const tx = await addTransaction({
      type: 'expense', amount: 199, categoryId: def.id,
      paymentMode: 'upi', date: '2026-06-07', note: 'Netflix',
    });

    // seedIfEmpty must resolve cleanly: migrateCategoryIds runs BEFORE deduplicateCategories
    await seedIfEmpty();

    // Stable category must still exist and be findable
    const cat = await db.categories.get(def.id);
    expect(cat).toBeTruthy();

    // Transaction must still resolve
    const updatedTx = await db.transactions.get(tx.id);
    const resolved = await db.categories.get(updatedTx!.categoryId);
    expect(resolved?.name).toBe('Entertainment');
  });

  it('is a no-op for categories that already have stable IDs', async () => {
    await seedIfEmpty();
    const before = await db.categories.orderBy('sortOrder').toArray();

    await migrateCategoryIds();

    const after = await db.categories.orderBy('sortOrder').toArray();
    expect(after.map(c => c.id)).toEqual(before.map(c => c.id));
  });
});

// ── Lends → auto expense/income ──────────────────────────────────────────────

describe('Lend auto-transactions', () => {
  it('addLend creates an expense transaction on the lend date with the Lent Money category', async () => {
    await seedIfEmpty();

    await addLend({ personName: 'Ravi', amount: 5000, date: '2026-08-03', note: 'trip' });

    const txs = await getTransactions();
    expect(txs).toHaveLength(1);
    expect(txs[0]).toMatchObject({
      type: 'expense',
      amount: 5000,
      categoryId: 'cat-lent',
      date: '2026-08-03',
      note: 'Lent to Ravi',
      paymentMode: 'upi',
    });
  });

  it('addLend stores the created transaction id on the lend record', async () => {
    await seedIfEmpty();

    const lend = await addLend({ personName: 'Ravi', amount: 5000, date: '2026-08-03' });

    const stored = await db.lends.get(lend.id);
    const tx = await db.transactions.get(lend.txId!);
    expect(stored?.txId).toBe(lend.txId);
    expect(tx?.amount).toBe(5000);
  });

  it('addLend still records the expense when the Lent Money category is missing', async () => {
    // No seedIfEmpty — categories table is empty
    await addLend({ personName: 'Ravi', amount: 5000, date: '2026-08-03' });

    const txs = await getTransactions();
    expect(txs).toHaveLength(1);
    expect(txs[0].categoryId).toBeUndefined();
  });

  it('addRepayment creates an income transaction on the repayment date', async () => {
    await seedIfEmpty();
    const lend = await addLend({ personName: 'Ravi', amount: 5000, date: '2026-08-03' });

    await addRepayment(lend.id, { amount: 2000, date: '2026-08-10' });

    const txs = await getTransactions();
    expect(txs).toHaveLength(2);
    const income = txs.find(t => t.type === 'income');
    expect(income).toMatchObject({
      type: 'income',
      amount: 2000,
      categoryId: 'cat-lent',
      date: '2026-08-10',
      note: 'Repayment from Ravi',
    });
    const stored = await db.lends.get(lend.id);
    expect(stored?.repayments[0].txId).toBe(income!.id);
  });

  it('deleteLend removes the expense and all repayment income transactions', async () => {
    await seedIfEmpty();
    const lend = await addLend({ personName: 'Ravi', amount: 5000, date: '2026-08-03' });
    await addRepayment(lend.id, { amount: 2000, date: '2026-08-10' });
    await addRepayment(lend.id, { amount: 3000, date: '2026-08-20' });

    expect(await getTransactions()).toHaveLength(3);

    await deleteLend(lend.id);

    expect(await getTransactions()).toHaveLength(0);
    expect(await db.lends.get(lend.id)).toBeUndefined();
  });

  it('backfillLendTransactions creates transactions for lends recorded before the feature', async () => {
    await seedIfEmpty();
    // Pre-feature lend: no txId, repayment with no txId
    await db.lends.add({
      id: 'lend-legacy', personName: 'Ravi', amount: 5000, date: '2026-08-01',
      repayments: [{ id: 'repay-legacy', amount: 2000, date: '2026-08-05' }],
      createdAt: '2026-08-01T10:00:00.000Z',
    });

    await backfillLendTransactions();

    const txs = await getTransactions();
    expect(txs).toHaveLength(2);
    const expense = txs.find(t => t.type === 'expense');
    const income  = txs.find(t => t.type === 'income');
    expect(expense).toMatchObject({ amount: 5000, date: '2026-08-01', categoryId: 'cat-lent', note: 'Lent to Ravi' });
    expect(income).toMatchObject({ amount: 2000, date: '2026-08-05', note: 'Repayment from Ravi' });

    // txIds persisted on the lend record
    const stored = await db.lends.get('lend-legacy');
    expect(stored?.txId).toBe(expense!.id);
    expect(stored?.repayments[0].txId).toBe(income!.id);
  });

  it('backfillLendTransactions is idempotent — re-running creates nothing new', async () => {
    await seedIfEmpty();
    const lend = await addLend({ personName: 'Ravi', amount: 5000, date: '2026-08-01' });
    await addRepayment(lend.id, { amount: 2000, date: '2026-08-05' });

    await backfillLendTransactions();
    await backfillLendTransactions();

    expect(await getTransactions()).toHaveLength(2);
  });

  it('backfill links a manually-logged expense instead of duplicating it', async () => {
    await seedIfEmpty();
    // Manually logged before the feature existed (no txId on the lend)
    await addTransaction({
      type: 'expense', amount: 5000, categoryId: 'cat-lent',
      paymentMode: 'upi', date: '2026-08-01', note: 'Lent to Ravi',
    });
    await db.lends.add({
      id: 'lend-manual', personName: 'Ravi', amount: 5000, date: '2026-08-01',
      repayments: [], createdAt: '2026-08-01T10:00:00.000Z',
    });

    await backfillLendTransactions();

    const txs = await getTransactions();
    expect(txs).toHaveLength(1); // no duplicate
    const stored = await db.lends.get('lend-manual');
    expect(stored?.txId).toBe(txs[0].id);
  });

  it('backfill links a manually-logged repayment income instead of duplicating it', async () => {
    await seedIfEmpty();
    await addTransaction({
      type: 'income', amount: 2000, categoryId: 'cat-lent',
      paymentMode: 'upi', date: '2026-08-05', note: 'Repayment from Ravi',
    });
    await db.lends.add({
      id: 'lend-manual-repay', personName: 'Ravi', amount: 5000, date: '2026-08-01',
      repayments: [{ id: 'repay-manual', amount: 2000, date: '2026-08-05' }],
      createdAt: '2026-08-01T10:00:00.000Z',
    });

    await backfillLendTransactions();

    const txs = await getTransactions();
    expect(txs).toHaveLength(2); // expense (new) + income (linked, not duplicated)
    const income = txs.filter(t => t.type === 'income');
    expect(income).toHaveLength(1);
    const stored = await db.lends.get('lend-manual-repay');
    expect(stored?.repayments[0].txId).toBe(income[0].id);
  });

  it('backfill does not link a manual transaction logged under a different category', async () => {
    await seedIfEmpty();
    // Logged under Misc instead of Lent Money — not considered the lend's expense
    await addTransaction({
      type: 'expense', amount: 5000, categoryId: 'cat-misc',
      paymentMode: 'upi', date: '2026-08-01', note: 'gave money',
    });
    await db.lends.add({
      id: 'lend-misc', personName: 'Ravi', amount: 5000, date: '2026-08-01',
      repayments: [], createdAt: '2026-08-01T10:00:00.000Z',
    });

    await backfillLendTransactions();

    const txs = await getTransactions();
    expect(txs).toHaveLength(2); // manual Misc expense + new Lent Money expense
    const stored = await db.lends.get('lend-misc');
    expect(stored?.txId).not.toBe('unset');
    expect(txs.filter(t => t.categoryId === 'cat-lent')).toHaveLength(1);
  });

  it('cross-device: auto-transaction category resolves after an independent re-seed', async () => {
    await seedIfEmpty();
    const lend = await addLend({ personName: 'Ravi', amount: 5000, date: '2026-08-01' });

    // Device B: categories wiped and re-seeded (stable IDs) — the stored
    // categoryId 'cat-lent' must still resolve
    await db.categories.clear();
    await seedIfEmpty();

    const cat = await db.categories.get('cat-lent');
    expect(cat).toBeTruthy();
    expect(cat!.name).toBe('Lent Money');
    // seedIfEmpty also runs the backfill — no duplicates
    expect(await getTransactions()).toHaveLength(1);
  });
});

// ── PG Needs ─────────────────────────────────────────────────────────────────

describe('PG Needs', () => {
  it('adds an item to the given month', async () => {
    const need = await addPgNeed({ name: 'Detergent', month: '2026-08' });
    const list = await getPgNeeds('2026-08');
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('Detergent');
    expect(list[0].done).toBe(false);
    expect(need.month).toBe('2026-08');
  });

  it('is scoped per month', async () => {
    await addPgNeed({ name: 'Detergent', month: '2026-08' });
    await addPgNeed({ name: 'Napkins',   month: '2026-09' });
    expect(await getPgNeeds('2026-08')).toHaveLength(1);
    expect(await getPgNeeds('2026-09')).toHaveLength(1);
  });

  it('toggles done and deletes', async () => {
    const need = await addPgNeed({ name: 'Toothpaste', month: '2026-08' });
    await togglePgNeed(need.id);
    let list = await getPgNeeds('2026-08');
    expect(list[0].done).toBe(true);

    await togglePgNeed(need.id);
    list = await getPgNeeds('2026-08');
    expect(list[0].done).toBe(false);

    await deletePgNeed(need.id);
    expect(await getPgNeeds('2026-08')).toHaveLength(0);
  });
});
