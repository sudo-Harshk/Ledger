<script lang="ts">
  import { app } from '$lib/stores/app.svelte';
  import { getMonthSummary, getCategorySpend, getDailySpend } from '$lib/db/queries';
  import MonthDonut from '$lib/components/charts/MonthDonut.svelte';
  import DailyTrend from '$lib/components/charts/DailyTrend.svelte';
  import { formatINR, currentMonth, prevMonth, nextMonth, monthLabel } from '$lib/utils';
  import { ChevronLeft, ChevronRight } from '@lucide/svelte';

  const APP_START_MONTH = '2026-06';

  let month        = $state(currentMonth());
  let histSummary  = $state({ income: 0, expense: 0, net: 0, transactions: [] as any[] });
  let histCatSpend = $state<{ categoryId: string; total: number }[]>([]);
  let histDaily    = $state<{ date: string; total: number }[]>([]);

  const isCurrentMonth = $derived(month === currentMonth());

  // ── Current month: derive directly from store (always reactive) ───────────
  const liveSummary = $derived((() => {
    const txs     = app.transactions;
    const income  = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { income, expense, net: income - expense, transactions: txs };
  })());

  const liveCatSpend = $derived((() => {
    const map = new Map<string, number>();
    for (const t of app.transactions.filter(t => t.type === 'expense'))
      map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount);
    return Array.from(map.entries()).map(([categoryId, total]) => ({ categoryId, total }));
  })());

  const liveDaily = $derived((() => {
    const map = new Map<string, number>();
    for (const t of app.transactions.filter(t => t.type === 'expense'))
      map.set(t.date, (map.get(t.date) ?? 0) + t.amount);
    return Array.from(map.entries())
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => a.date.localeCompare(b.date));
  })());

  let loading = $state(false);

  // ── Historical months: query DB when month changes ────────────────────────
  $effect(() => {
    const m = month;
    if (m === currentMonth()) { loading = false; return; }
    loading = true;
    Promise.all([
      getMonthSummary(m),
      getCategorySpend(m),
      getDailySpend(m),
    ]).then(([s, c, d]) => { histSummary = s; histCatSpend = c; histDaily = d; loading = false; });
  });

  const summary  = $derived(isCurrentMonth ? liveSummary  : histSummary);
  const catSpend = $derived(isCurrentMonth ? liveCatSpend : histCatSpend);
  const dailyData = $derived(isCurrentMonth ? liveDaily   : histDaily);
</script>

<div class="px-4 pt-6 md:px-8 md:pt-8 animate-fade-in">
  <div class="flex items-center justify-between mb-5">
    <h1 class="text-xl md:text-2xl font-bold">Reports</h1>
    <div class="flex items-center gap-2 bg-[var(--color-surface)] rounded-2xl px-2">
      <button onclick={() => month = prevMonth(month)}
              disabled={month <= APP_START_MONTH}
              class="p-2 text-[var(--color-text-muted)] disabled:opacity-30">
        <ChevronLeft size={18} />
      </button>
      <span class="text-sm font-semibold">{monthLabel(month)}</span>
      <button onclick={() => month = nextMonth(month)}
              disabled={month >= currentMonth()}
              class="p-2 text-[var(--color-text-muted)] disabled:opacity-30">
        <ChevronRight size={18} />
      </button>
    </div>
  </div>

  <!-- Summary stats -->
  <div class="grid grid-cols-3 gap-3 mb-5">
    {#if loading}
      {#each [0,1,2] as _}
        <div class="bg-[var(--color-surface)] rounded-2xl p-4 space-y-2">
          <div class="h-2.5 w-10 rounded-full bg-[var(--color-border)] animate-pulse"></div>
          <div class="h-4 w-16 rounded-full bg-[var(--color-border)] animate-pulse"></div>
        </div>
      {/each}
    {:else}
      <div class="bg-[var(--color-surface)] rounded-2xl p-4">
        <p class="text-[10px] text-[var(--color-text-muted)] uppercase mb-1">Income</p>
        <p class="font-bold text-[var(--color-income)] text-sm">{formatINR(summary.income)}</p>
      </div>
      <div class="bg-[var(--color-surface)] rounded-2xl p-4">
        <p class="text-[10px] text-[var(--color-text-muted)] uppercase mb-1">Expense</p>
        <p class="font-bold text-[var(--color-expense)] text-sm">{formatINR(summary.expense)}</p>
      </div>
      <div class="bg-[var(--color-surface)] rounded-2xl p-4">
        <p class="text-[10px] text-[var(--color-text-muted)] uppercase mb-1">Net</p>
        <p class="font-bold text-sm {summary.net >= 0 ? 'text-[var(--color-income)]' : 'text-[var(--color-expense)]'}">
          {summary.net >= 0 ? '+' : ''}{formatINR(summary.net)}
        </p>
      </div>
    {/if}
  </div>

  <!-- Desktop: two-column split / Mobile: single column -->
  <div class="md:grid md:grid-cols-2 md:gap-6 md:items-start space-y-5 md:space-y-0">

    <!-- Left: donut + category breakdown -->
    <div class="space-y-5">
      <div class="bg-[var(--color-surface)] rounded-2xl p-5">
        <p class="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-4">Spend by Category</p>
        {#if loading}
          <div class="flex items-center justify-center">
            <div class="w-40 h-40 rounded-full bg-[var(--color-border)] animate-pulse"></div>
          </div>
        {:else}
          <MonthDonut slices={catSpend} categories={app.categories} transactions={summary.transactions} />
        {/if}
      </div>

      {#if loading}
        <div class="bg-[var(--color-surface)] rounded-2xl p-5 space-y-4">
          <div class="h-2.5 w-20 rounded-full bg-[var(--color-border)] animate-pulse"></div>
          {#each [0,1,2,3] as _}
            <div class="space-y-1.5">
              <div class="flex justify-between">
                <div class="h-2.5 w-24 rounded-full bg-[var(--color-border)] animate-pulse"></div>
                <div class="h-2.5 w-14 rounded-full bg-[var(--color-border)] animate-pulse"></div>
              </div>
              <div class="h-1.5 w-full rounded-full bg-[var(--color-border)] animate-pulse"></div>
            </div>
          {/each}
        </div>
      {:else if catSpend.length > 0}
        {@const breakdownTotal = catSpend.reduce((s, c) => s + c.total, 0)}
        <div class="bg-[var(--color-surface)] rounded-2xl p-5">
          <p class="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-4">Breakdown</p>
          <div class="space-y-3">
            {#each catSpend.sort((a,b) => b.total - a.total) as cs}
              {@const cat = app.categories.find(c => c.id === cs.categoryId)}
              {@const pct = breakdownTotal > 0 ? cs.total / breakdownTotal : 0}
              <div class="space-y-1">
                <div class="flex justify-between text-xs">
                  <span class="flex items-center gap-1.5">
                    <span>{cat?.icon ?? '📌'}</span>
                    <span class="text-[var(--color-text-muted)]">{cat?.name ?? 'Unknown'}</span>
                  </span>
                  <span class="font-medium">{formatINR(cs.total)}</span>
                </div>
                <div class="h-1.5 bg-[var(--color-border)] rounded-full">
                  <div class="h-full rounded-full transition-all duration-500"
                       style="width:{pct*100}%; background:{cat?.color ?? '#9B99B8'}"></div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>

    <!-- Right: daily trend -->
    <div class="space-y-5">
      <div class="bg-[var(--color-surface)] rounded-2xl p-5">
        <p class="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-4">Daily Spend</p>
        {#if loading}
          <div class="space-y-2">
            <div class="flex items-end gap-1 h-32">
              {#each [40,65,30,80,55,70,45,90,35,60,75,50,85,40,65,25,70,55,80,45,60,35,75,50,65,40,85,55,70,45] as h}
                <div class="flex-1 rounded-t-sm bg-[var(--color-border)] animate-pulse"
                     style="height:{h}%"></div>
              {/each}
            </div>
            <div class="h-2 w-full rounded-full bg-[var(--color-border)] animate-pulse"></div>
          </div>
        {:else}
          <DailyTrend data={dailyData} month={month} />
        {/if}
      </div>
    </div>

  </div>

  <div class="h-4"></div>
</div>
