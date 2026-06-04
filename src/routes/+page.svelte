<script lang="ts">
  import { app } from '$lib/stores/app.svelte';
  import WeekBarChart from '$lib/components/charts/WeekBarChart.svelte';
  import { formatINR, getWeekDates, today, daysInMonth, monthLabel } from '$lib/utils';
  import { TrendingUp, Wallet, Settings } from '@lucide/svelte';
  import CountUp from '$lib/components/CountUp.svelte';

  const todayStr = today();
  const weekDates = getWeekDates();

  const weekData = $derived(weekDates.map(date => ({
    date,
    total: app.transactions
      .filter(t => t.date === date && t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0)
  })));

  const recent = $derived(
    [...app.transactions]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5)
  );

  const totalBudget = $derived(app.budgets.reduce((s, b) => s + b.amount, 0));

  const daysLeft = $derived(() => {
    return daysInMonth(app.monthStr) - new Date().getDate();
  });

  const budgetPct   = $derived(totalBudget > 0 ? Math.min(app.monthExpenses / totalBudget, 1) : 0);
  const budgetColor = $derived(
    budgetPct >= 1   ? 'var(--color-expense)'  :
    budgetPct >= 0.8 ? 'var(--color-warning)'  :
                       'var(--color-income)'
  );

  const todayIncome = $derived(
    app.transactions
      .filter(t => t.date === todayStr && t.type === 'income')
      .reduce((s, t) => s + t.amount, 0)
  );

  const savings      = $derived(app.monthlyIncome - app.monthExpenses);
  const savingsPct   = $derived(app.monthlyIncome > 0 ? Math.max(0, savings / app.monthlyIncome) : 0);
</script>

<div class="px-4 pt-6 space-y-5 animate-fade-in">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <p class="text-xs text-[var(--color-text-muted)] font-medium">
        {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>
      <h1 class="text-xl font-bold text-[var(--color-text)]">My Ledger</h1>
    </div>
    <div class="flex items-center gap-2">
      <a href="/settings" class="w-9 h-9 rounded-full bg-[var(--color-surface)] flex items-center justify-center">
        <Settings size={18} class="text-[var(--color-text-muted)]" />
      </a>
      <div class="w-9 h-9 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center">
        <Wallet size={18} class="text-[var(--color-primary)]" />
      </div>
    </div>
  </div>

  <!-- Today card -->
  <div class="bg-[var(--color-surface)] rounded-2xl p-5 space-y-1">
    <p class="text-xs text-[var(--color-text-muted)] font-medium uppercase tracking-wide">Today's Spend</p>
    <CountUp value={app.todayExpenses} class="text-4xl font-extrabold text-[var(--color-text)]" />
    {#if todayIncome > 0}
      <p class="text-sm text-[var(--color-income)] flex items-center gap-1">
        <TrendingUp size={14} /> +{formatINR(todayIncome)} income today
      </p>
    {/if}
  </div>

  <!-- This week chart -->
  <div class="bg-[var(--color-surface)] rounded-2xl p-5">
    <p class="text-xs text-[var(--color-text-muted)] font-medium uppercase tracking-wide mb-3">This Week</p>
    <WeekBarChart data={weekData} />
  </div>

  <!-- Month stats -->
  <div class="grid grid-cols-2 gap-3">
    <div class="bg-[var(--color-surface)] rounded-2xl p-4 space-y-1">
      <p class="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide">Income</p>
      {#if app.monthlyIncome > 0}
        <CountUp value={app.monthlyIncome} class="text-base font-bold text-[var(--color-income)]" />
      {:else}
        <a href="/settings" class="text-xs text-[var(--color-primary)]">Set income →</a>
      {/if}
    </div>
    <div class="bg-[var(--color-surface)] rounded-2xl p-4 space-y-1">
      <p class="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide">Spent</p>
      <CountUp value={app.monthExpenses} class="text-base font-bold text-[var(--color-expense)]" />
    </div>
    <div class="bg-[var(--color-surface)] rounded-2xl p-4 space-y-1">
      <p class="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide">Savings</p>
      {#if app.monthlyIncome > 0}
        <CountUp value={savings} class="text-base font-bold {savings >= 0 ? 'text-[var(--color-income)]' : 'text-[var(--color-expense)]'}" />
      {:else}
        <p class="text-base font-bold text-[var(--color-text-muted)]">—</p>
      {/if}
    </div>
    <div class="bg-[var(--color-surface)] rounded-2xl p-4 space-y-1">
      <p class="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide">Days Left</p>
      <p class="text-base font-bold text-[var(--color-text)]">{daysLeft()}</p>
    </div>
  </div>

  <!-- Budget progress bar -->
  {#if totalBudget > 0}
    <div class="bg-[var(--color-surface)] rounded-2xl p-5">
      <div class="flex justify-between text-xs mb-2">
        <span class="text-[var(--color-text-muted)]">{monthLabel(app.monthStr)} budget</span>
        <span style="color: {budgetColor}">{Math.round(budgetPct * 100)}%</span>
      </div>
      <div class="h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
        <div class="h-full rounded-full transition-all duration-700"
             style="width: {budgetPct * 100}%; background: {budgetColor}"></div>
      </div>
      <p class="text-xs text-[var(--color-text-muted)] mt-2">
        {formatINR(app.monthExpenses)} of {formatINR(totalBudget)} used
      </p>
    </div>
  {/if}

  <!-- Upcoming EMIs -->
  {#if app.emis.length > 0}
    {@const upcoming = app.emis.slice(0, 2)}
    <div class="bg-[var(--color-surface)] rounded-2xl p-5">
      <div class="flex items-center justify-between mb-3">
        <p class="text-sm font-semibold">Upcoming EMIs</p>
        <a href="/emis" class="text-xs text-[var(--color-primary)]">See all</a>
      </div>
      <div class="space-y-2">
        {#each upcoming as emi}
          <div class="flex items-center justify-between">
            <span class="text-sm text-[var(--color-text-muted)]">{emi.name}</span>
            <span class="text-sm font-medium">{formatINR(emi.monthlyAmount)}</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Recent transactions -->
  <div class="bg-[var(--color-surface)] rounded-2xl p-5">
    <div class="flex items-center justify-between mb-4">
      <p class="text-sm font-semibold">Recent</p>
      <a href="/transactions" class="text-xs text-[var(--color-primary)]">See all</a>
    </div>

    {#if recent.length === 0}
      <div class="text-center py-6">
        <p class="text-2xl mb-2">💸</p>
        <p class="text-sm text-[var(--color-text-muted)]">No transactions yet</p>
        <p class="text-xs text-[var(--color-text-muted)]">Tap + to add your first one</p>
      </div>
    {:else}
      <div class="space-y-3">
        {#each recent as tx}
          {@const cat = app.getCategoryById(tx.categoryId)}
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                 style="background: {cat?.color ?? '#9B99B8'}22">
              {cat?.icon ?? '📌'}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">{cat?.name ?? 'Unknown'}</p>
              <p class="text-xs text-[var(--color-text-muted)]">{tx.note || tx.paymentMode.toUpperCase()}</p>
            </div>
            <span class="font-semibold text-sm shrink-0
                         {tx.type === 'income' ? 'text-[var(--color-income)]' : 'text-[var(--color-expense)]'}">
              {tx.type === 'income' ? '+' : '-'}{formatINR(tx.amount)}
            </span>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <div class="h-2"></div>
</div>
