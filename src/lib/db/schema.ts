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

export interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  month: string; // YYYY-MM
}

export type EmiType = 'emi' | 'subscription';

export interface Emi {
  id: string;
  type: EmiType;
  name: string;
  principal?: number;
  monthlyAmount: number;
  startDate: string; // YYYY-MM-DD
  totalMonths?: number;
  paidMonths: number;
  nextDueDate: string; // YYYY-MM-DD
  categoryId?: string;
  notes?: string;
}

export interface Setting {
  key: string;
  value: string;
}

class LedgerDB extends Dexie {
  transactions!: Table<Transaction>;
  categories!: Table<Category>;
  budgets!: Table<Budget>;
  emis!: Table<Emi>;
  settings!: Table<Setting>;

  constructor() {
    super('ledger');
    this.version(1).stores({
      transactions: 'id, type, categoryId, date, createdAt',
      categories:   'id, sortOrder',
      budgets:      'id, [categoryId+month], month',
      emis:         'id, nextDueDate',
      settings:     'key'
    });
  }
}

export const db = new LedgerDB();

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-pg-rent',       name: 'PG Rent',       icon: '🏠', color: '#6C63FF', sortOrder: 0,  isActive: true },
  { id: 'cat-food-dining',   name: 'Food & Dining',  icon: '🍽️', color: '#F97316', sortOrder: 1,  isActive: true },
  { id: 'cat-groceries',     name: 'Groceries',      icon: '🛒', color: '#22C55E', sortOrder: 2,  isActive: true },
  { id: 'cat-transport',     name: 'Transport',      icon: '🚗', color: '#3B82F6', sortOrder: 3,  isActive: true },
  { id: 'cat-phone-net',     name: 'Phone & Net',    icon: '📱', color: '#8B5CF6', sortOrder: 4,  isActive: true },
  { id: 'cat-personal-care', name: 'Personal Care',  icon: '💆', color: '#EC4899', sortOrder: 5,  isActive: true },
  { id: 'cat-entertainment', name: 'Entertainment',  icon: '🎬', color: '#EF4444', sortOrder: 6,  isActive: true },
  { id: 'cat-shopping',      name: 'Shopping',       icon: '🛍️', color: '#F59E0B', sortOrder: 7,  isActive: true },
  { id: 'cat-moving-setup',  name: 'Moving/Setup',   icon: '📦', color: '#06B6D4', sortOrder: 8,  isActive: true },
  { id: 'cat-salary',        name: 'Salary',         icon: '💰', color: '#22C55E', sortOrder: 9,  isActive: true },
  { id: 'cat-juice',         name: 'Juice',          icon: '🧃', color: '#F59E0B', sortOrder: 10, isActive: true },
  { id: 'cat-electricity',   name: 'Electricity',    icon: '⚡', color: '#EAB308', sortOrder: 11, isActive: true },
  { id: 'cat-medicine',      name: 'Medicine',       icon: '💊', color: '#EF4444', sortOrder: 12, isActive: true },
  { id: 'cat-misc',          name: 'Miscellaneous',  icon: '📌', color: '#9B99B8', sortOrder: 13, isActive: true },
];
