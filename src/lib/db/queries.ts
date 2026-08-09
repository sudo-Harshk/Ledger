import { db, DEFAULT_CATEGORIES } from './schema';
import type { Transaction, Category, Emi, EmiType, TransactionType, Lend, Repayment, PgNeed } from './schema';
import { nanoid, currentMonth, today, addMonths } from '$lib/utils';
import { pushDoc, removeDoc, clearFirestoreCollection } from './firestore';

// ── Seed ────────────────────────────────────────────────────────────────────

export async function deduplicateCategories() {
  const allCats = await db.categories.orderBy('sortOrder').toArray();
  const seen = new Set<string>();
  const dupes: string[] = [];
  for (const cat of allCats) {
    const key = cat.name.toLowerCase().trim();
    if (seen.has(key)) dupes.push(cat.id);
    else seen.add(key);
  }
  if (dupes.length > 0) await db.categories.bulkDelete(dupes);
}

// Migrates existing categories that have random IDs to their canonical stable IDs,
// and cascades the ID change to all transactions and EMIs that reference them.
// This fixes cross-device "Unknown" category names caused by independent re-seeding.
export async function migrateCategoryIds() {
  const nameToStable = new Map(
    DEFAULT_CATEGORIES.map(c => [c.name.toLowerCase().trim(), c.id])
  );
  const allCats = await db.categories.toArray();

  for (const cat of allCats) {
    const stableId = nameToStable.get(cat.name.toLowerCase().trim());
    if (!stableId || cat.id === stableId) continue;

    const oldId = cat.id;

    // Collect affected records before modifying
    const affectedTxs  = await db.transactions.where('categoryId').equals(oldId).toArray();
    const affectedEmis = (await db.emis.toArray()).filter(e => e.categoryId === oldId);

    // Update references in local DB
    await db.transactions.where('categoryId').equals(oldId).modify({ categoryId: stableId });
    await Promise.all(affectedEmis.map(e => db.emis.update(e.id, { categoryId: stableId })));

    // Replace category record (Dexie can't update primary key, so delete + put)
    await db.categories.delete(oldId);
    await db.categories.put({ ...cat, id: stableId });

    // Sync all changed records to Firestore
    pushDoc('categories', { ...cat, id: stableId }).catch(() => {});
    removeDoc('categories', oldId).catch(() => {});
    for (const tx of affectedTxs) pushDoc('transactions', { ...tx, categoryId: stableId }).catch(() => {});
    for (const emi of affectedEmis) pushDoc('emis', { ...emi, categoryId: stableId }).catch(() => {});
  }
}

export async function migratePhoneCategories() {
  // Remove cat-phone-net and reassign its transactions to cat-phone-recharge
  const phoneNet = await db.categories.get('cat-phone-net');
  if (phoneNet) {
    const affected = await db.transactions.where('categoryId').equals('cat-phone-net').toArray();
    if (affected.length > 0) {
      await db.transactions.where('categoryId').equals('cat-phone-net').modify({ categoryId: 'cat-phone-recharge' });
      for (const tx of affected) pushDoc('transactions', { ...tx, categoryId: 'cat-phone-recharge' }).catch(() => {});
    }
    await db.categories.delete('cat-phone-net');
    removeDoc('categories', 'cat-phone-net').catch(() => {});
  }

  // Rename "Phone Recharge" to "Recharge" — independent of whether cat-phone-net existed
  const recharge = await db.categories.get('cat-phone-recharge');
  if (recharge && recharge.name !== 'Recharge') {
    await db.categories.update('cat-phone-recharge', { name: 'Recharge', sortOrder: 4 });
    pushDoc('categories', { ...recharge, name: 'Recharge', sortOrder: 4 }).catch(() => {});
  }
}

export async function seedIfEmpty() {
  await migratePhoneCategories();
  await migrateCategoryIds();
  await deduplicateCategories();
  await backfillLendTransactions();

  const existing = new Set(
    (await db.categories.toArray()).map(c => c.name.toLowerCase().trim())
  );
  const toAdd = DEFAULT_CATEGORIES.filter(c => !existing.has(c.name.toLowerCase().trim()));
  if (toAdd.length > 0) {
    await db.categories.bulkAdd(toAdd);
    for (const cat of toAdd) pushDoc('categories', cat).catch(() => {});
  }
}

// ── Transactions ─────────────────────────────────────────────────────────────

export async function addTransaction(
  data: Omit<Transaction, 'id' | 'createdAt' | 'categoryId'> & { categoryId?: string }
) {
  // categoryId may be absent when the category no longer exists — the UI
  // already renders such rows with an "Unknown" fallback.
  const tx = { ...data, id: nanoid(), createdAt: new Date().toISOString() } as Transaction;
  await db.transactions.add(tx);
  pushDoc('transactions', tx).catch(() => {});
  return tx;
}

export async function updateTransaction(id: string, data: Partial<Omit<Transaction, 'id' | 'createdAt'>>) {
  await db.transactions.update(id, data);
  const updated = await db.transactions.get(id);
  if (updated) pushDoc('transactions', updated).catch(() => {});
}

export async function deleteTransaction(id: string) {
  await db.transactions.delete(id);
  removeDoc('transactions', id).catch(() => {});
}

export async function getTransactions(opts?: { month?: string; type?: TransactionType; categoryId?: string }) {
  const all = await db.transactions.orderBy('date').reverse().toArray();
  return all.filter(t => {
    if (opts?.month      && !t.date.startsWith(opts.month))  return false;
    if (opts?.type       && t.type !== opts.type)             return false;
    if (opts?.categoryId && t.categoryId !== opts.categoryId) return false;
    return true;
  });
}

export async function getTransactionsForDate(date: string) {
  return db.transactions.where('date').equals(date).toArray();
}

export async function getTransactionsForWeek(weekDates: string[]) {
  return db.transactions.where('date').anyOf(weekDates).toArray();
}

export async function getEarliestMonth(): Promise<string> {
  const first = await db.transactions.orderBy('date').first();
  return first ? first.date.slice(0, 7) : currentMonth();
}

// ── Categories ────────────────────────────────────────────────────────────────

export async function getCategories() {
  return db.categories.orderBy('sortOrder').filter(c => c.isActive).toArray();
}

export async function getAllCategories() {
  return db.categories.orderBy('sortOrder').toArray();
}

export async function addCategory(data: Omit<Category, 'id'>) {
  const cat: Category = { ...data, id: nanoid() };
  await db.categories.add(cat);
  pushDoc('categories', cat).catch(() => {});
  return cat;
}

export async function updateCategory(id: string, data: Partial<Omit<Category, 'id'>>) {
  await db.categories.update(id, data);
  const updated = await db.categories.get(id);
  if (updated) pushDoc('categories', updated).catch(() => {});
}

export async function deleteCategory(id: string) {
  await db.categories.update(id, { isActive: false });
  const updated = await db.categories.get(id);
  if (updated) pushDoc('categories', updated).catch(() => {});
}

// ── EMIs ──────────────────────────────────────────────────────────────────────

export async function getEmis() {
  return db.emis.orderBy('nextDueDate').toArray();
}

export async function addEmi(data: Omit<Emi, 'id'>) {
  const emi: Emi = { ...data, id: nanoid() };
  await db.emis.add(emi);
  pushDoc('emis', emi).catch(() => {});
  return emi;
}

export async function markEmiPaid(id: string): Promise<string | null> {
  const emi = await db.emis.get(id);
  if (!emi) return null;
  const isSubscription = emi.type === 'subscription';
  const paidMonths = isSubscription ? emi.paidMonths : emi.paidMonths + 1;
  const updated = {
    ...emi,
    paidMonths,
    nextDueDate: addMonths(emi.nextDueDate, 1),
  };
  await db.emis.update(id, { paidMonths, nextDueDate: updated.nextDueDate });
  pushDoc('emis', updated).catch(() => {});

  // Auto-create expense transaction if a category is linked
  if (emi.categoryId) {
    const tx = await addTransaction({
      type: 'expense',
      amount: emi.monthlyAmount,
      categoryId: emi.categoryId,
      paymentMode: 'upi',
      date: today(),
      note: emi.name,
    });
    return tx.id;
  }
  return null;
}

export async function deleteEmi(id: string) {
  await db.emis.delete(id);
  removeDoc('emis', id).catch(() => {});
}

// ── Lends ─────────────────────────────────────────────────────────────────────

const LENT_CATEGORY_ID = 'cat-lent';

async function lentCategoryId(): Promise<string | undefined> {
  const cat = await db.categories.get(LENT_CATEGORY_ID);
  return cat ? LENT_CATEGORY_ID : undefined;
}

export async function getLends(): Promise<Lend[]> {
  return db.lends.orderBy('createdAt').reverse().toArray();
}

export async function addLend(data: Omit<Lend, 'id' | 'createdAt' | 'repayments'>): Promise<Lend> {
  const lend: Lend = { ...data, id: nanoid(), repayments: [], createdAt: new Date().toISOString() };
  await db.lends.add(lend);

  // Money left the account — record it as an expense on the lend date
  const catId = await lentCategoryId();
  const tx = await addTransaction({
    type: 'expense',
    amount: lend.amount,
    categoryId: catId,
    paymentMode: 'upi',
    date: lend.date,
    note: `Lent to ${lend.personName}`,
  });
  const withTx: Lend = { ...lend, txId: tx.id };
  await db.lends.update(lend.id, { txId: tx.id });
  pushDoc('lends', withTx).catch(() => {});
  return withTx;
}

export async function addRepayment(lendId: string, repayment: Omit<Repayment, 'id'>): Promise<void> {
  const lend = await db.lends.get(lendId);
  if (!lend) return;

  // Money came back to the account — record it as income on the repayment date
  const catId = await lentCategoryId();
  const tx = await addTransaction({
    type: 'income',
    amount: repayment.amount,
    categoryId: catId,
    paymentMode: 'upi',
    date: repayment.date,
    note: `Repayment from ${lend.personName}`,
  });
  const updated: Lend = {
    ...lend,
    repayments: [...lend.repayments, { ...repayment, id: nanoid(), txId: tx.id }],
  };
  await db.lends.put(updated);
  pushDoc('lends', updated).catch(() => {});
}

export async function deleteLend(id: string): Promise<void> {
  const lend = await db.lends.get(id);
  if (lend) {
    // Remove the full transaction trail: the expense + every repayment income
    const txIds = [lend.txId, ...lend.repayments.map(r => r.txId)].filter((v): v is string => !!v);
    await Promise.all(txIds.map(txId => deleteTransaction(txId)));
  }
  await db.lends.delete(id);
  removeDoc('lends', id).catch(() => {});
}

// Backfills auto-created transactions for lends recorded before this feature
// existed. Idempotent — skips any lend/repayment that already has a txId.
// Safety net: if a matching transaction was logged manually under the Lent
// Money category, it is linked instead of creating a duplicate.
export async function backfillLendTransactions() {
  const lends = await db.lends.toArray();
  for (const lend of lends) {
    let current: Lend = lend;
    let changed = false;
    const catId = await lentCategoryId();

    if (!current.txId) {
      const txId = (await findManualLentTx('expense', current.amount, current.date))?.id
        ?? (await addTransaction({
          type: 'expense',
          amount: current.amount,
          categoryId: catId,
          paymentMode: 'upi',
          date: current.date,
          note: `Lent to ${current.personName}`,
        })).id;
      current = { ...current, txId };
      changed = true;
    }

    const repayments = [...current.repayments];
    for (let i = 0; i < repayments.length; i++) {
      if (repayments[i].txId) continue;
      const txId = (await findManualLentTx('income', repayments[i].amount, repayments[i].date))?.id
        ?? (await addTransaction({
          type: 'income',
          amount: repayments[i].amount,
          categoryId: catId,
          paymentMode: 'upi',
          date: repayments[i].date,
          note: `Repayment from ${current.personName}`,
        })).id;
      repayments[i] = { ...repayments[i], txId };
      changed = true;
    }

    if (changed) {
      const updated = { ...current, repayments };
      await db.lends.put(updated);
      pushDoc('lends', updated).catch(() => {});
    }
  }
}

// Finds a transaction that was manually logged for a lend/repayment (same
// amount, date, and Lent Money category) so the backfill links it instead of
// duplicating it.
async function findManualLentTx(type: TransactionType, amount: number, date: string): Promise<Transaction | undefined> {
  const all = await db.transactions.toArray();
  return all.find(t => t.type === type && t.amount === amount && t.date === date && t.categoryId === LENT_CATEGORY_ID);
}

// ── PG Needs (monthly shopping list) ──────────────────────────────────────────

export async function getPgNeeds(month: string): Promise<PgNeed[]> {
  const items = await db.pgneeds.where('month').equals(month).toArray();
  return items.sort((a, b) => Number(a.done) - Number(b.done) || a.createdAt.localeCompare(b.createdAt));
}

export async function addPgNeed(data: { name: string; month: string }): Promise<PgNeed> {
  const need: PgNeed = {
    id: nanoid(),
    name: data.name,
    done: false,
    month: data.month,
    createdAt: new Date().toISOString(),
  };
  await db.pgneeds.add(need);
  pushDoc('pgneeds', need).catch(() => {});
  return need;
}

export async function togglePgNeed(id: string): Promise<void> {
  const need = await db.pgneeds.get(id);
  if (!need) return;
  const updated: PgNeed = { ...need, done: !need.done, doneAt: need.done ? undefined : new Date().toISOString() };
  await db.pgneeds.put(updated);
  pushDoc('pgneeds', updated).catch(() => {});
}

export async function deletePgNeed(id: string): Promise<void> {
  await db.pgneeds.delete(id);
  removeDoc('pgneeds', id).catch(() => {});
}

// ── Settings ──────────────────────────────────────────────────────────────────

export async function getSetting(key: string): Promise<string> {
  const s = await db.settings.get(key);
  return s?.value ?? '';
}

export async function setSetting(key: string, value: string) {
  const setting = { key, value };
  await db.settings.put(setting);
  pushDoc('settings', setting).catch(() => {});
}

// ── Reset ─────────────────────────────────────────────────────────────────────

export async function clearAllData() {
  // Wipe IndexedDB
  await Promise.all([
    db.transactions.clear(),
    db.emis.clear(),
    db.settings.clear(),
    db.categories.clear(),
    db.lends.clear(),
    db.pgneeds.clear(),
  ]);
  // Wipe Firestore
  await Promise.all([
    clearFirestoreCollection('transactions'),
    clearFirestoreCollection('emis'),
    clearFirestoreCollection('settings'),
    clearFirestoreCollection('categories'),
    clearFirestoreCollection('lends'),
    clearFirestoreCollection('pgneeds'),
  ]);
  // Re-seed defaults
  await seedIfEmpty();
}

// ── Reports helpers ───────────────────────────────────────────────────────────

export async function getMonthSummary(month: string) {
  const txs     = await getTransactions({ month });
  const income  = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  return { income, expense, net: income - expense, transactions: txs };
}

export async function getCategorySpend(month: string): Promise<{ categoryId: string; total: number }[]> {
  const txs = await getTransactions({ month, type: 'expense' });
  const map  = new Map<string, number>();
  for (const t of txs) map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount);
  return Array.from(map.entries()).map(([categoryId, total]) => ({ categoryId, total }));
}

export async function getDailySpend(month: string): Promise<{ date: string; total: number }[]> {
  const txs = await getTransactions({ month, type: 'expense' });
  const map  = new Map<string, number>();
  for (const t of txs) map.set(t.date, (map.get(t.date) ?? 0) + t.amount);
  return Array.from(map.entries())
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
