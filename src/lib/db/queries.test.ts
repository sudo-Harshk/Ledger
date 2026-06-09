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
  addEmi,
  markEmiPaid,
  getTransactions,
} from './queries';

// ── helpers ──────────────────────────────────────────────────────────────────

async function clearDB() {
  await Promise.all([
    db.categories.clear(),
    db.transactions.clear(),
    db.budgets.clear(),
    db.emis.clear(),
    db.settings.clear(),
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

  it('updates budgets that reference the old category ID', async () => {
    const def = DEFAULT_CATEGORIES.find(c => c.name === 'Groceries')!;
    const randomId = 'old-groceries-id';

    await db.categories.add({ ...def, id: randomId });
    await db.budgets.add({ id: 'bud-1', categoryId: randomId, month: '2026-06', amount: 5000 });

    await migrateCategoryIds();

    const bud = await db.budgets.get('bud-1');
    expect(bud?.categoryId).toBe(def.id);
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
});
