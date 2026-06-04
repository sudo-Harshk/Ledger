import { createClient, type Client } from '@libsql/client/web';
import { db } from './schema';
import { getSetting } from './queries';
import type { Transaction, Category, Budget, Emi } from './schema';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'unconfigured';

// ── Cached client ─────────────────────────────────────────────────────────────

let _client: Client | null = null;
let _clientUrl = '';
let _clientToken = '';
let _tablesReady = false;

async function getClient(): Promise<Client | null> {
  const url   = await getSetting('tursoUrl');
  const token = await getSetting('tursoToken');
  if (!url || !token) return null;
  if (_client && _clientUrl === url && _clientToken === token) return _client;
  _client       = createClient({ url, authToken: token });
  _clientUrl    = url;
  _clientToken  = token;
  _tablesReady  = false;
  return _client;
}

async function ensureTables(client: Client) {
  if (_tablesReady) return;
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
  _tablesReady = true;
}

// ── Reactive store ────────────────────────────────────────────────────────────

class SyncStore {
  status     = $state<SyncStatus>('unconfigured');
  lastSyncAt = $state<string | null>(null);
  error      = $state<string | null>(null);

  // Full push: all local data → Turso
  async pushAll(): Promise<void> {
    const client = await getClient();
    if (!client) { this.status = 'unconfigured'; return; }

    this.status = 'syncing';
    this.error  = null;

    try {
      await ensureTables(client);

      const [txs, cats, budgets, emis, settings] = await Promise.all([
        db.transactions.toArray(),
        db.categories.toArray(),
        db.budgets.toArray(),
        db.emis.toArray(),
        db.settings.toArray()
      ]);

      const stmts = [
        ...txs.map(t => ({
          sql: `INSERT OR REPLACE INTO transactions VALUES (?,?,?,?,?,?,?,?)`,
          args: [t.id, t.type, t.amount, t.categoryId, t.note ?? null, t.paymentMode, t.date, t.createdAt] as any[]
        })),
        ...cats.map(c => ({
          sql: `INSERT OR REPLACE INTO categories VALUES (?,?,?,?,?,?)`,
          args: [c.id, c.name, c.icon, c.color, c.sortOrder, c.isActive ? 1 : 0] as any[]
        })),
        ...budgets.map(b => ({
          sql: `INSERT OR REPLACE INTO budgets VALUES (?,?,?,?)`,
          args: [b.id, b.categoryId, b.amount, b.month] as any[]
        })),
        ...emis.map(e => ({
          sql: `INSERT OR REPLACE INTO emis VALUES (?,?,?,?,?,?,?,?,?)`,
          args: [e.id, e.name, e.principal, e.monthlyAmount, e.startDate, e.totalMonths, e.paidMonths, e.nextDueDate, e.notes ?? null] as any[]
        })),
        ...settings.map(s => ({
          sql: `INSERT OR REPLACE INTO settings VALUES (?,?)`,
          args: [s.key, s.value] as any[]
        }))
      ];

      if (stmts.length > 0) await client.batch(stmts, 'write');

      this.status    = 'success';
      this.lastSyncAt = new Date().toISOString();
    } catch (err) {
      this.status = 'error';
      this.error  = err instanceof Error ? err.message : 'Push failed';
    }
  }
}

export const syncStore = new SyncStore();

// ── Public API ────────────────────────────────────────────────────────────────

export async function tursoConfigured(): Promise<boolean> {
  const url   = await getSetting('tursoUrl');
  const token = await getSetting('tursoToken');
  return !!(url && token);
}

/** Pull all Turso data → IndexedDB. Use on new device or to restore. */
export async function pullFromTurso(): Promise<void> {
  const client = await getClient();
  if (!client) return;

  syncStore.status = 'syncing';
  syncStore.error  = null;

  try {
    await ensureTables(client);

    const [txRows, catRows, budgetRows, emiRows] = await Promise.all([
      client.execute('SELECT * FROM transactions'),
      client.execute('SELECT * FROM categories'),
      client.execute('SELECT * FROM budgets'),
      client.execute('SELECT * FROM emis'),
    ]);

    const toObj = (row: any) => Object.fromEntries(
      Object.entries(row).map(([k, v]) => [k, v])
    );

    const txs: Transaction[] = txRows.rows.map(r => ({
      id: r.id as string, type: r.type as any, amount: r.amount as number,
      categoryId: r.categoryId as string, note: r.note as string | undefined,
      paymentMode: r.paymentMode as any, date: r.date as string,
      createdAt: r.createdAt as string
    }));

    const cats: Category[] = catRows.rows.map(r => ({
      id: r.id as string, name: r.name as string, icon: r.icon as string,
      color: r.color as string, sortOrder: r.sortOrder as number,
      isActive: (r.isActive as number) === 1
    }));

    const budgets: Budget[] = budgetRows.rows.map(r => ({
      id: r.id as string, categoryId: r.categoryId as string,
      amount: r.amount as number, month: r.month as string
    }));

    const emis: Emi[] = emiRows.rows.map(r => ({
      id: r.id as string, name: r.name as string,
      principal: r.principal as number, monthlyAmount: r.monthlyAmount as number,
      startDate: r.startDate as string, totalMonths: r.totalMonths as number,
      paidMonths: r.paidMonths as number, nextDueDate: r.nextDueDate as string,
      notes: r.notes as string | undefined
    }));

    await db.transaction('rw', [db.transactions, db.categories, db.budgets, db.emis], async () => {
      if (txs.length)     await db.transactions.bulkPut(txs);
      if (cats.length)    await db.categories.bulkPut(cats);
      if (budgets.length) await db.budgets.bulkPut(budgets);
      if (emis.length)    await db.emis.bulkPut(emis);
    });

    syncStore.status    = 'success';
    syncStore.lastSyncAt = new Date().toISOString();
  } catch (err) {
    syncStore.status = 'error';
    syncStore.error  = err instanceof Error ? err.message : 'Pull failed';
  }
}

type TableName = 'transactions' | 'categories' | 'budgets' | 'emis' | 'settings';

/** Fire-and-forget: push one row to Turso. Never throws. */
export function autoSync(table: TableName, row: Record<string, any>): void {
  getClient().then(client => {
    if (!client) return;
    ensureTables(client).then(() => {
      const keys   = Object.keys(row);
      const values = Object.values(row).map(v =>
        typeof v === 'boolean' ? (v ? 1 : 0) : (v ?? null)
      );
      const placeholders = keys.map(() => '?').join(',');
      return client.execute({
        sql: `INSERT OR REPLACE INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`,
        args: values as any[]
      });
    });
  }).catch(() => {});
}

/** Fire-and-forget: delete one row from Turso by id. Never throws. */
export function autoSyncDelete(table: TableName, id: string): void {
  getClient().then(client => {
    if (!client) return;
    ensureTables(client).then(() =>
      client.execute({ sql: `DELETE FROM ${table} WHERE id = ?`, args: [id] })
    );
  }).catch(() => {});
}

/** Delete a settings key from Turso. */
export function autoSyncDeleteSetting(key: string): void {
  getClient().then(client => {
    if (!client) return;
    ensureTables(client).then(() =>
      client.execute({ sql: `DELETE FROM settings WHERE key = ?`, args: [key] })
    );
  }).catch(() => {});
}

export function syncToTurso() { return syncStore.pushAll(); }
