import { createClient } from '@libsql/client/web';
import { db } from './schema';
import { getSetting } from './queries';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'unconfigured';

let syncStatus = $state<SyncStatus>('unconfigured');
let lastSyncAt = $state<string | null>(null);
let syncError = $state<string | null>(null);

export { syncStatus, lastSyncAt, syncError };

export async function syncToTurso(): Promise<void> {
  const url   = await getSetting('tursoUrl');
  const token = await getSetting('tursoToken');

  if (!url || !token) {
    syncStatus = 'unconfigured';
    return;
  }

  syncStatus = 'syncing';
  syncError  = null;

  try {
    const client = createClient({ url, authToken: token });

    // Ensure tables exist on Turso
    await client.executeMultiple(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY, type TEXT, amount REAL, categoryId TEXT,
        note TEXT, paymentMode TEXT, date TEXT, createdAt TEXT
      );
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY, name TEXT, icon TEXT, color TEXT,
        sortOrder INTEGER, isActive INTEGER
      );
      CREATE TABLE IF NOT EXISTS budgets (
        id TEXT PRIMARY KEY, categoryId TEXT, amount REAL, month TEXT,
        UNIQUE(categoryId, month)
      );
      CREATE TABLE IF NOT EXISTS emis (
        id TEXT PRIMARY KEY, name TEXT, principal REAL, monthlyAmount REAL,
        startDate TEXT, totalMonths INTEGER, paidMonths INTEGER,
        nextDueDate TEXT, notes TEXT
      );
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
    `);

    const [txs, cats, budgets, emis, settings] = await Promise.all([
      db.transactions.toArray(),
      db.categories.toArray(),
      db.budgets.toArray(),
      db.emis.toArray(),
      db.settings.toArray()
    ]);

    // Upsert all local data to Turso
    const stmts = [
      ...txs.map(t => ({
        sql: `INSERT OR REPLACE INTO transactions VALUES (?,?,?,?,?,?,?,?)`,
        args: [t.id, t.type, t.amount, t.categoryId, t.note ?? null, t.paymentMode, t.date, t.createdAt]
      })),
      ...cats.map(c => ({
        sql: `INSERT OR REPLACE INTO categories VALUES (?,?,?,?,?,?)`,
        args: [c.id, c.name, c.icon, c.color, c.sortOrder, c.isActive ? 1 : 0]
      })),
      ...budgets.map(b => ({
        sql: `INSERT OR REPLACE INTO budgets VALUES (?,?,?,?)`,
        args: [b.id, b.categoryId, b.amount, b.month]
      })),
      ...emis.map(e => ({
        sql: `INSERT OR REPLACE INTO emis VALUES (?,?,?,?,?,?,?,?,?)`,
        args: [e.id, e.name, e.principal, e.monthlyAmount, e.startDate, e.totalMonths, e.paidMonths, e.nextDueDate, e.notes ?? null]
      })),
      ...settings.map(s => ({
        sql: `INSERT OR REPLACE INTO settings VALUES (?,?)`,
        args: [s.key, s.value]
      }))
    ];

    if (stmts.length > 0) {
      await client.batch(stmts, 'write');
    }

    syncStatus = 'success';
    lastSyncAt = new Date().toISOString();
  } catch (err) {
    syncStatus = 'error';
    syncError = err instanceof Error ? err.message : 'Sync failed';
  }
}
