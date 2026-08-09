import { getCategories, getTransactions, getLends, getPgNeeds, seedIfEmpty } from '$lib/db/queries';
import { subscribeToFirestore } from '$lib/db/firestore';
import type { Transaction, Category, Lend, TransactionType, PgNeed } from '$lib/db/schema';
import { currentMonth, today } from '$lib/utils';

class AppStore {
  categories    = $state<Category[]>([]);
  transactions  = $state<Transaction[]>([]);
  lends         = $state<Lend[]>([]);
  pgneeds       = $state<PgNeed[]>([]);
  isLoading     = $state(true);
  showQuickAdd  = $state(false);
  quickAddType  = $state<TransactionType>('expense');
  editingTx     = $state<Transaction | null>(null);

  get todayStr()  { return today(); }
  get monthStr()  { return currentMonth(); }

  get todayExpenses() {
    return this.transactions
      .filter(t => t.date === this.todayStr && t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0);
  }
  get monthExpenses() {
    return this.transactions
      .filter(t => t.type === 'expense' && t.date.startsWith(this.monthStr))
      .reduce((s, t) => s + t.amount, 0);
  }
  get monthIncome() {
    return this.transactions
      .filter(t => t.type === 'income' && t.date.startsWith(this.monthStr))
      .reduce((s, t) => s + t.amount, 0);
  }

  getCategoryById(id: string) {
    return this.categories.find(c => c.id === id);
  }

  openQuickAdd(type: TransactionType = 'expense') {
    this.editingTx   = null;
    this.quickAddType = type;
    this.showQuickAdd = true;
  }

  async init() {
    this.isLoading = true;
    await seedIfEmpty();
    await this.refreshAll();
    this.isLoading = false;
    subscribeToFirestore(() => this.refreshAll());
  }

  async refreshAll() {
    const month = currentMonth();
    [this.categories, this.transactions, this.lends, this.pgneeds] = await Promise.all([
      getCategories(),
      getTransactions({ month }),
      getLends(),
      getPgNeeds(month),
    ]);
  }

  async refreshTransactions(month?: string) {
    this.transactions = await getTransactions({ month: month ?? currentMonth() });
  }

  async refreshLends() {
    this.lends = await getLends();
  }

  async refreshPgNeeds(month?: string) {
    this.pgneeds = await getPgNeeds(month ?? currentMonth());
  }

  async refreshCategories() {
    this.categories = await getCategories();
  }
}

export const app = new AppStore();
