import Dexie, { type Table } from 'dexie';

export type TransactionType = 'income' | 'expense';
export type PaymentMode = 'cash' | 'upi' | 'card' | 'netbanking';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  note?: string;
  paymentMode: PaymentMode;
  date: string; // YYYY-MM-DD
  createdAt: string; // ISO string
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
}

export interface Emi {
  id: string;
  type: 'subscription';
  name: string;
  monthlyAmount: number;
  startDate: string; // YYYY-MM-DD
  paidMonths: number;
  nextDueDate: string; // YYYY-MM-DD
  categoryId?: string;
  notes?: string;
}

export interface Setting {
  key: string;
  value: string;
}

export interface Repayment {
  id: string;
  amount: number;
  date: string; // YYYY-MM-DD
  txId?: string; // income transaction auto-created when the repayment is recorded
}

export interface Lend {
  id: string;
  personName: string;
  amount: number;       // original amount lent
  date: string;         // YYYY-MM-DD
  note?: string;
  repayments: Repayment[];
  createdAt: string;
  txId?: string;        // expense transaction auto-created when the lend is recorded
}

export interface PgNeed {
  id: string;
  name: string;
  done: boolean;
  month: string; // YYYY-MM
  createdAt: string; // ISO string
  doneAt?: string;   // ISO string
}

class LedgerDB extends Dexie {
  transactions!: Table<Transaction>;
  categories!: Table<Category>;
  emis!: Table<Emi>;
  settings!: Table<Setting>;
  lends!: Table<Lend>;
  pgneeds!: Table<PgNeed>;

  constructor() {
    super('ledger');
    this.version(1).stores({
      transactions: 'id, type, categoryId, date, createdAt',
      categories:   'id, sortOrder',
      budgets:      'id, [categoryId+month], month',
      emis:         'id, nextDueDate',
      settings:     'key'
    });
    this.version(2).stores({
      transactions: 'id, type, categoryId, date, createdAt',
      categories:   'id, sortOrder',
      budgets:      'id, [categoryId+month], month',
      emis:         'id, nextDueDate',
      settings:     'key',
      lends:        'id, createdAt'
    });
    // v3 drops the budgets table — budgets feature removed
    this.version(3).stores({
      transactions: 'id, type, categoryId, date, createdAt',
      categories:   'id, sortOrder',
      emis:         'id, nextDueDate',
      settings:     'key',
      lends:        'id, createdAt'
    });
    // v4 adds the PG needs (monthly shopping list) table
    this.version(4).stores({
      transactions: 'id, type, categoryId, date, createdAt',
      categories:   'id, sortOrder',
      emis:         'id, nextDueDate',
      settings:     'key',
      lends:        'id, createdAt',
      pgneeds:      'id, month, done'
    });
    // v5 drops the emis table — EMI/Subscriptions feature removed
    this.version(5).stores({
      transactions: 'id, type, categoryId, date, createdAt',
      categories:   'id, sortOrder',
      settings:     'key',
      lends:        'id, createdAt',
      pgneeds:      'id, month, done'
    });
    // v6 re-creates the emis table — subscriptions feature kept (EMI loans stay removed)
    this.version(6).stores({
      transactions: 'id, type, categoryId, date, createdAt',
      categories:   'id, sortOrder',
      emis:         'id, nextDueDate',
      settings:     'key',
      lends:        'id, createdAt',
      pgneeds:      'id, month, done'
    });
  }
}

export const db = new LedgerDB();

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-pg-rent',       name: 'PG Rent',       icon: '🏠', color: '#6C63FF', sortOrder: 0,  isActive: true },
  { id: 'cat-food-dining',   name: 'Food & Dining',  icon: '🍽️', color: '#F97316', sortOrder: 1,  isActive: true },
  { id: 'cat-groceries',     name: 'Groceries',      icon: '🛒', color: '#22C55E', sortOrder: 2,  isActive: true },
  { id: 'cat-transport',     name: 'Transport',      icon: '🚗', color: '#3B82F6', sortOrder: 3,  isActive: true },
  { id: 'cat-phone-recharge', name: 'Recharge',  icon: '📱', color: '#8B5CF6', sortOrder: 4,  isActive: true },
  { id: 'cat-internet',      name: 'Internet',  icon: '🌐', color: '#6366F1', sortOrder: 5,  isActive: true },
  { id: 'cat-personal-care', name: 'Personal Care',  icon: '💆', color: '#EC4899', sortOrder: 5,  isActive: true },
  { id: 'cat-entertainment', name: 'Entertainment',  icon: '🎬', color: '#EF4444', sortOrder: 6,  isActive: true },
  { id: 'cat-shopping',      name: 'Shopping',       icon: '🛍️', color: '#F59E0B', sortOrder: 7,  isActive: true },
  { id: 'cat-moving-setup',  name: 'Moving/Setup',   icon: '📦', color: '#06B6D4', sortOrder: 8,  isActive: true },
  { id: 'cat-salary',        name: 'Salary',         icon: '💰', color: '#22C55E', sortOrder: 9,  isActive: true },
  { id: 'cat-juice',         name: 'Juice',          icon: '🧃', color: '#F59E0B', sortOrder: 10, isActive: true },
  { id: 'cat-electricity',   name: 'Electricity',    icon: '⚡', color: '#EAB308', sortOrder: 11, isActive: true },
  { id: 'cat-medicine',      name: 'Medicine',       icon: '💊', color: '#EF4444', sortOrder: 12, isActive: true },
  { id: 'cat-lent',          name: 'Lent Money',     icon: '🤝', color: '#14B8A6', sortOrder: 13, isActive: true },
  { id: 'cat-misc',          name: 'Miscellaneous',  icon: '📌', color: '#9B99B8', sortOrder: 14, isActive: true },
];
