import { getCategories, getTransactions, getBudgetsForMonth, getEmis, seedIfEmpty, getSetting } from '$lib/db/queries';
import type { Transaction, Category, Budget, Emi } from '$lib/db/schema';
import { currentMonth, today } from '$lib/utils';

class AppStore {
  categories    = $state<Category[]>([]);
  transactions  = $state<Transaction[]>([]);
  budgets       = $state<Budget[]>([]);
  emis          = $state<Emi[]>([]);
  monthlyIncome = $state(0);
  isLoading     = $state(true);
  showQuickAdd  = $state(false);
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

  async init() {
    this.isLoading = true;
    await seedIfEmpty();
    await this.refreshAll();
    this.isLoading = false;
  }

  async refreshAll() {
    const month = currentMonth();
    [this.categories, this.transactions, this.budgets, this.emis] = await Promise.all([
      getCategories(),
      getTransactions({ month }),
      getBudgetsForMonth(month),
      getEmis()
    ]);
    const inc = await getSetting('monthlyIncome');
    this.monthlyIncome = parseFloat(inc) || 0;
  }

  async refreshTransactions(month?: string) {
    this.transactions = await getTransactions({ month: month ?? currentMonth() });
  }

  async refreshBudgets(month?: string) {
    this.budgets = await getBudgetsForMonth(month ?? currentMonth());
  }

  async refreshEmis() {
    this.emis = await getEmis();
  }

  async refreshCategories() {
    this.categories = await getCategories();
  }
}

export const app = new AppStore();
