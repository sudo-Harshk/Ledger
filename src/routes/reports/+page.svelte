<script lang="ts">
  import { app } from '$lib/stores/app.svelte';
  import { getMonthSummary, getCategorySpend, getDailySpend } from '$lib/db/queries';
  import MonthDonut from '$lib/components/charts/MonthDonut.svelte';
  import DailyTrend from '$lib/components/charts/DailyTrend.svelte';
  import { formatINR, currentMonth, prevMonth, nextMonth, monthLabel } from '$lib/utils';
  import { ChevronLeft, ChevronRight } from '@lucide/svelte';

  const APP_START_MONTH = '2026-06';

  let month     = $state(currentMonth());
  let summary   = $state({ income: 0, expense: 0, net: 0, transactions: [] as any[] });
  let catSpend  = $state<{ categoryId: string; total: number }[]>([]);
  let dailyData = $state<{ date: string; total: number }[]>([]);

  $effect(() => {
    Promise.all([
      getMonthSummary(month),
      getCategorySpend(month),
      getDailySpend(month),
    ]).then(([s, c, d]) => { summary = s; catSpend = c; dailyData = d; });
  });
</script>

<div class="px-4 pt-6 animate-fade-in">
  <div class="flex items-center justify-between mb-5">
    <h1 class="text-xl font-bold">Reports</h1>
  </div>

  <div class="flex items-center justify-between bg-[var(--color-surface)] rounded-2xl p-3 mb-5">
    <button onclick={() => month = prevMonth(month)}
            disabled={month <= APP_START_MONTH}
            class="p-2 text-[var(--color-text-muted)] disabled:opacity-30">
      <ChevronLeft size={20} />
    </button>
    <span class="text-sm font-semibold">{monthLabel(month)}</span>
    <button onclick={() => month = nextMonth(month)}
            disabled={month >= currentMonth()}
            class="p-2 text-[var(--color-text-muted)] disabled:opacity-30">
      <ChevronRight size={20} />
    </button>
  </div>

  <div class="grid grid-cols-3 gap-3 mb-5">
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
  </div>


<div class="bg-[var(--color-surface)] rounded-2xl p-5 mb-5">
    <p class="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-4">Spend by Category</p>
    <MonthDonut slices={catSpend} categories={app.categories} />
  </div>

  <div class="bg-[var(--color-surface)] rounded-2xl p-5 mb-5">
    <p class="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-4">Daily Spend</p>
    <DailyTrend data={dailyData} />
  </div>

  {#if catSpend.length > 0}
    {@const breakdownTotal = catSpend.reduce((s, c) => s + c.total, 0)}
    <div class="bg-[var(--color-surface)] rounded-2xl p-5 mb-5">
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

  <div class="h-4"></div>
</div>
