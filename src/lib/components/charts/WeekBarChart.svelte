<script lang="ts">
  import { weekDayLabel, today } from '$lib/utils';

  let { data, dailyBudget = 0 }: {
    data: { date: string; total: number }[];
    dailyBudget?: number;
  } = $props();

  const CHART_H = 72;
  const todayStr = today();
  const max = $derived(Math.max(...data.map(d => d.total), dailyBudget || 0, 1));

  function shortAmt(n: number): string {
    if (n === 0) return '';
    return n >= 1000 ? `₹${+(n / 1000).toFixed(1)}k` : `₹${n}`;
  }

  const refBottom = $derived(
    dailyBudget > 0 ? Math.min((dailyBudget / max) * CHART_H, CHART_H - 1) : -1
  );
</script>

<div>
  <!-- Bars -->
  <div class="relative flex items-end justify-between gap-1 px-1" style="height: {CHART_H}px">
    <!-- Daily budget reference line -->
    {#if refBottom > 0}
      <div class="absolute inset-x-1 z-10 flex items-center gap-1 pointer-events-none"
           style="bottom: {refBottom}px">
        <div class="flex-1 border-t border-dashed border-[var(--color-warning)]/60"></div>
        <span class="text-[7px] text-[var(--color-warning)] font-medium leading-none shrink-0">
          daily limit
        </span>
      </div>
    {/if}

    {#each data as day}
      {@const barH = Math.max((day.total / max) * CHART_H, day.total > 0 ? 5 : 2)}
      {@const isToday = day.date === todayStr}
      {@const over = dailyBudget > 0 && day.total > dailyBudget}
      <div class="flex-1 flex justify-center items-end h-full">
        <div class="w-full max-w-[30px] rounded-t-md transition-all duration-700"
             style="height: {barH}px;
                    background: {isToday
                      ? 'var(--color-primary)'
                      : over
                        ? 'var(--color-expense)'
                        : 'var(--color-surface-3)'}">
        </div>
      </div>
    {/each}
  </div>

  <!-- Day name + amount labels -->
  <div class="flex justify-between gap-1 px-1 mt-2">
    {#each data as day}
      {@const isToday = day.date === todayStr}
      {@const over = dailyBudget > 0 && day.total > dailyBudget}
      <div class="flex-1 flex flex-col items-center gap-[3px]">
        <span class="text-[9px] font-medium leading-none
                     {isToday ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}">
          {weekDayLabel(day.date)}
        </span>
        <span class="text-[8px] font-semibold leading-none
                     {isToday
                       ? 'text-[var(--color-primary)]'
                       : over
                         ? 'text-[var(--color-expense)]'
                         : 'text-[var(--color-text-muted)]'}">
          {shortAmt(day.total)}
        </span>
      </div>
    {/each}
  </div>
</div>
