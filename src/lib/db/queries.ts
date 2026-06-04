import { db, DEFAULT_CATEGORIES } from './schema';
import type { Transaction, Category, Budget, Emi, TransactionType } from './schema';
import { nanoid } from '$lib/utils';
import { autoSync, autoSyncDelete } from './sync.svelte';

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

export async function seedIfEmpty() {
  await deduplicateCategories();

  // Seed only names that don't exist yet
  const existing = new Set(
    (await db.categories.toArray()).map(c => c.name.toLowerCase().trim())
  );
  const toAdd = DEFAULT_CATEGORIES
    .filter(c => !existing.has(c.name.toLowerCase().trim()))
    .map(c => ({ ...c, id: nanoid() }));
  if (toAdd.length > 0) {
    await db.categories.bulkAdd(toAdd);
    toAdd.forEach(c => autoSync('categories', { ...c, isActive: c.isActive ? 1 : 0 }));
  }

  const income = await db.settings.get('monthlyIncome');
  if (!income) {
    await db.settings.put({ key: 'monthlyIncome', value: '0' });
    await db.settings.put({ key: 'tursoUrl',      value: '' });
    await db.settings.put({ key: 'tursoToken',    value: '' });
  }
}

// ── Transactions ─────────────────────────────────────────────────────────────

export async function addTransaction(data: Omit<Transaction, 'id' | 'createdAt'>) {
  const tx: Transaction = { ...data, id: nanoid(), createdAt: new Date().toISOString() };
  await db.transactions.add(tx);
  autoSync('transactions', tx);
  return tx;
}

export async function updateTransaction(id: string, data: Partial<Omit<Transaction, 'id' | 'createdAt'>>) {
  await db.transactions.update(id, data);
  const updated = await db.transactions.get(id);
  if (updated) autoSync('transactions', updated);
}

export async function deleteTransaction(id: string) {
  await db.transactions.delete(id);
  autoSyncDelete('transactions', id);
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
  autoSync('categories', { ...cat, isActive: cat.isActive ? 1 : 0 });
  return cat;
}

export async function updateCategory(id: string, data: Partial<Omit<Category, 'id'>>) {
  await db.categories.update(id, data);
  const updated = await db.categories.get(id);
  if (updated) autoSync('categories', { ...updated, isActive: updated.isActive ? 1 : 0 });
}

export async function deleteCategory(id: string) {
  await db.categories.update(id, { isActive: false });
  const updated = await db.categories.get(id);
  if (updated) autoSync('categories', { ...updated, isActive: 0 });
}

// ── Budgets ───────────────────────────────────────────────────────────────────

export async function getBudgetsForMonth(month: string) {
  return db.budgets.where('month').equals(month).toArray();
}

export async function setBudget(categoryId: string, month: string, amount: number) {
  const existing = await db.budgets.where('[categoryId+month]').equals([categoryId, month]).first();
  if (existing) {
    await db.budgets.update(existing.id, { amount });
    autoSync('budgets', { ...existing, amount });
  } else {
    const budget: Budget = { id: nanoid(), categoryId, month, amount };
    await db.budgets.add(budget);
    autoSync('budgets', budget);
  }
}

export async function deleteBudget(id: string) {
  await db.budgets.delete(id);
  autoSyncDelete('budgets', id);
}

// ── EMIs ──────────────────────────────────────────────────────────────────────

export async function getEmis() {
  return db.emis.orderBy('nextDueDate').toArray();
}

export async function addEmi(data: Omit<Emi, 'id'>) {
  const emi: Emi = { ...data, id: nanoid() };
  await db.emis.add(emi);
  autoSync('emis', emi);
  return emi;
}

export async function markEmiPaid(id: string) {
  const emi = await db.emis.get(id);
  if (!emi) return;
  const paidMonths = emi.paidMonths + 1;
  const next = new Date(emi.nextDueDate);
  next.setMonth(next.getMonth() + 1);
  const updates = { paidMonths, nextDueDate: next.toISOString().slice(0, 10) };
  await db.emis.update(id, updates);
  autoSync('emis', { ...emi, ...updates });
}

export async function deleteEmi(id: string) {
  await db.emis.delete(id);
  autoSyncDelete('emis', id);
}

// ── Settings ──────────────────────────────────────────────────────────────────

export async function getSetting(key: string): Promise<string> {
  const s = await db.settings.get(key);
  return s?.value ?? '';
}

export async function setSetting(key: string, value: string) {
  await db.settings.put({ key, value });
  // Don't auto-sync credentials — user controls sync explicitly
  if (key !== 'tursoUrl' && key !== 'tursoToken') {
    autoSync('settings', { key, value });
  }
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
