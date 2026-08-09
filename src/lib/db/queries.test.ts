// Mock Firestore before any imports so queries.ts never touches Firebase
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('./firestore', () => ({
  pushDoc:                  vi.fn().mockResolvedValue(undefined),
  removeDoc:                vi.fn().mockResolvedValue(undefined),
  clearFirestoreCollection: vi.fn().mockResolvedValue(undefined),
  pullFromFirestore:        vi.fn().mockResolvedValue(undefined),
}));

// Override only today() — real addMonths/nanoid/currentMonth stay in use.
// today() itself is proven to be IST in src/lib/utils.test.ts; this mock pins
// the app's shared IST date so markEmiPaid's transaction date is deterministic.
vi.mock('$lib/utils', async (importOriginal) => {
  const mod = await importOriginal<typeof import('$lib/utils')>();
  return { ...mod, today: () => '2026-08-09' };
});

import { db, DEFAULT_CATEGORIES } from './schema';
import {
  seedIfEmpty,
  migrateCategoryIds,
  addTransaction,
  addEmi,
  markEmiPaid,
  getTransactions,
  addPgNeed,
  togglePgNeed,
  deletePgNeed,
  getPgNeeds,
} from './queries';

// ── helpers ──────────────────────────────────────────────────────────────────

async function clearDB() {
  await Promise.all([
    db.categories.clear(),
    db.transactions.clear(),
    db.emis.clear(),
    db.settings.clear(),
    db.lends.clear(),
    db.pgneeds.clear(),
  ]);
}

function getCategoryById(id: string) {
  return db.categories.get(id);
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

  it('updates EMIs/subscriptions that reference the old category ID', async () => {
    const def = DEFAULT_CATEGORIES.find(c => c.name === 'Entertainment')!;
    const randomId = 'old-ent-id';

    await db.categories.add({ ...def, id: randomId });
    const emi = await addEmi({
      type: 'subscription', name: 'Netflix', monthlyAmount: 199,
      startDate: '2026-06-15', paidMonths: 0, nextDueDate: '2026-06-15',
      categoryId: randomId,
    });

    await migrateCategoryIds();

    const updated = await db.emis.get(emi.id);
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

// ── markEmiPaid + subscription category resolution ────────────────────────────

describe('subscription payment → transaction category resolution', () => {
  it('transaction created by markEmiPaid has a resolvable categoryId', async () => {
    await seedIfEmpty();

    const def = DEFAULT_CATEGORIES.find(c => c.name === 'Entertainment')!;
    const sub = await addEmi({
      type: 'subscription', name: 'Spotify', monthlyAmount: 119,
      startDate: '2026-06-10', paidMonths: 0, nextDueDate: '2026-06-10',
      categoryId: def.id,
    });

    const txId = await markEmiPaid(sub.id);
    expect(txId).not.toBeNull();

    const tx = await db.transactions.get(txId!);
    expect(tx).toBeTruthy();
    expect(tx!.categoryId).toBe(def.id);

    // Simulates what the UI does: getCategoryById(tx.categoryId)
    const cat = await getCategoryById(tx!.categoryId);
    expect(cat).toBeTruthy();
    expect(cat!.name).toBe('Entertainment');
  });

  it('cross-device: subscription with stable categoryId resolves after independent reseed', async () => {
    // Device A: seeds and creates a subscription
    await seedIfEmpty();
    const def = DEFAULT_CATEGORIES.find(c => c.name === 'Entertainment')!;
    const sub = await addEmi({
      type: 'subscription', name: 'Netflix', monthlyAmount: 199,
      startDate: '2026-06-10', paidMonths: 0, nextDueDate: '2026-06-10',
      categoryId: def.id,
    });

    // Device B: clear categories and re-seed independently (stable IDs → same result)
    await db.categories.clear();
    await seedIfEmpty();

    // Mark subscription paid — the categoryId in the EMI must still resolve
    const txId = await markEmiPaid(sub.id);
    const tx = await db.transactions.get(txId!);
    const cat = await getCategoryById(tx!.categoryId);

    expect(cat?.name).toBe('Entertainment');
  });

  it('no transaction is created when subscription has no category linked', async () => {
    const sub = await addEmi({
      type: 'subscription', name: 'Generic Sub', monthlyAmount: 99,
      startDate: '2026-06-10', paidMonths: 0, nextDueDate: '2026-06-10',
    });

    const txId = await markEmiPaid(sub.id);
    expect(txId).toBeNull();

    const txs = await getTransactions();
    expect(txs.length).toBe(0);
  });

  it('advances nextDueDate by one month when subscription is marked paid', async () => {
    await seedIfEmpty();
    const def = DEFAULT_CATEGORIES[0];
    const sub = await addEmi({
      type: 'subscription', name: 'Test Sub', monthlyAmount: 100,
      startDate: '2026-06-10', paidMonths: 0, nextDueDate: '2026-06-10',
      categoryId: def.id,
    });

    await markEmiPaid(sub.id);

    const updated = await db.emis.get(sub.id);
    expect(updated?.nextDueDate).toBe('2026-07-10');
  });

  it('clamps a month-end due date to the target month\'s last day (Jan 31 → Feb 28)', async () => {
    await seedIfEmpty();
    const def = DEFAULT_CATEGORIES[0];
    const emi = await addEmi({
      type: 'emi', name: 'Jan Loan', monthlyAmount: 1000, principal: 12000,
      startDate: '2026-01-31', paidMonths: 0, nextDueDate: '2026-01-31', totalMonths: 12,
      categoryId: def.id,
    });

    await markEmiPaid(emi.id);

    const updated = await db.emis.get(emi.id);
    expect(updated?.nextDueDate).toBe('2026-02-28');
  });

  it('does not skip a month when the next due date is the 29th', async () => {
    await seedIfEmpty();
    const def = DEFAULT_CATEGORIES[0];
    const emi = await addEmi({
      type: 'emi', name: 'Feb Loan', monthlyAmount: 1000, principal: 12000,
      startDate: '2026-02-28', paidMonths: 0, nextDueDate: '2026-02-28', totalMonths: 12,
      categoryId: def.id,
    });

    await markEmiPaid(emi.id);

    const updated = await db.emis.get(emi.id);
    expect(updated?.nextDueDate).toBe('2026-03-28');
  });

  it('dates the auto-created transaction with the app today() (IST), not a UTC-derived date', async () => {
    // today() is mocked to '2026-08-09' (the shared IST date helper). The
    // transaction must use it verbatim instead of new Date().toISOString().
    await seedIfEmpty();
    const def = DEFAULT_CATEGORIES[0];
    const sub = await addEmi({
      type: 'subscription', name: 'IST Sub', monthlyAmount: 100,
      startDate: '2026-08-01', paidMonths: 0, nextDueDate: '2026-08-01',
      categoryId: def.id,
    });

    const txId = await markEmiPaid(sub.id);
    const tx = await db.transactions.get(txId!);

    expect(tx?.date).toBe('2026-08-09');
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
