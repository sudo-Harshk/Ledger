import { getCategories, getTransactions, getEmis, getLends, seedIfEmpty } from '$lib/db/queries';
import { subscribeToFirestore } from '$lib/db/firestore';
import type { Transaction, Category, Emi, Lend, TransactionType } from '$lib/db/schema';
import { currentMonth, today } from '$lib/utils';

class AppStore {
  categories    = $state<Category[]>([]);
  transactions  = $state<Transaction[]>([]);
  emis          = $state<Emi[]>([]);
  lends         = $state<Lend[]>([]);
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
    [this.categories, this.transactions, this.emis, this.lends] = await Promise.all([
      getCategories(),
      getTransactions({ month }),
      getEmis(),
      getLends(),
    ]);
  }

  async refreshTransactions(month?: string) {
    this.transactions = await getTransactions({ month: month ?? currentMonth() });
  }

  async refreshEmis() {
    this.emis = await getEmis();
  }

  async refreshLends() {
    this.lends = await getLends();
  }

  async refreshCategories() {
    this.categories = await getCategories();
  }
}

export const app = new AppStore();
