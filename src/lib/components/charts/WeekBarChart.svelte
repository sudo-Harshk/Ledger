<script lang="ts">
  import { weekDayLabel, today, formatINR } from '$lib/utils';
  import { cubicOut } from 'svelte/easing';
  import { fly } from 'svelte/transition';

  let { data, dailyBudget = 0 }: {
    data: { date: string; total: number }[];
    dailyBudget?: number;
  } = $props();

  const CHART_H = 72;
  const todayStr = today();
  const max = $derived(Math.max(...data.map(d => d.total), dailyBudget || 0, 1));

  // Hover (desktop) + pinned (tap/click) — hover takes priority when present
  let hoverDate  = $state<string | null>(null);
  let pinnedDate = $state<string | null>(null);
  const activeDate = $derived(hoverDate ?? pinnedDate);
  const activeDay  = $derived(activeDate ? (data.find(d => d.date === activeDate) ?? null) : null);

  function toggle(date: string) {
    pinnedDate = pinnedDate === date ? null : date;
  }

  function shortAmt(n: number): string {
    if (n === 0) return '';
    return n >= 1000 ? `₹${+(n / 1000).toFixed(1)}k` : `₹${n}`;
  }

  function dayLabel(dateStr: string): string {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short'
    });
  }

  const refBottom = $derived(
    dailyBudget > 0 ? Math.min((dailyBudget / max) * CHART_H, CHART_H - 1) : -1
  );
</script>

<!-- Tooltip info line — replaces noisy labels, shows on interaction -->
<div class="h-7 flex items-center mb-2">
  {#if activeDay}
    {@const over = dailyBudget > 0 && activeDay.total > dailyBudget}
    <div in:fly={{ y: -5, duration: 160, easing: cubicOut }}
         class="flex items-center gap-1.5 text-xs">
      <span class="font-medium text-[var(--color-text)]">
        {dayLabel(activeDay.date)}
      </span>
      <span class="text-[var(--color-border)]">·</span>
      {#if activeDay.total > 0}
        <span class="font-bold"
              style="color:{over ? 'var(--color-expense)' : 'var(--color-primary)'}">
          {formatINR(activeDay.total)}
        </span>
        {#if over}
          <span class="text-[10px] text-[var(--color-expense)]
                       bg-[var(--color-expense)]/10 px-1.5 py-0.5 rounded-full">
            +{formatINR(activeDay.total - dailyBudget)} over
          </span>
        {/if}
      {:else}
        <span class="text-[var(--color-text-muted)]">No spend</span>
      {/if}
    </div>
  {:else}
    <span class="text-[10px] text-[var(--color-text-muted)]/50 select-none">
      Tap a bar for details
    </span>
  {/if}
</div>

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
    {@const barH  = Math.max((day.total / max) * CHART_H, day.total > 0 ? 5 : 2)}
    {@const isToday  = day.date === todayStr}
    {@const isActive = activeDate === day.date}
    {@const over     = dailyBudget > 0 && day.total > dailyBudget}
    <div class="flex-1 flex justify-center items-end h-full cursor-pointer"
         role="button"
         tabindex="0"
         aria-label="{dayLabel(day.date)}: {day.total > 0 ? formatINR(day.total) : 'No spend'}"
         onclick={() => toggle(day.date)}
         onkeydown={(e) => e.key === 'Enter' && toggle(day.date)}
         onmouseenter={() => hoverDate = day.date}
         onmouseleave={() => hoverDate = null}>
      <div class="w-full max-w-[30px] rounded-t-md transition-all duration-300"
           style="height: {barH}px;
                  opacity: {activeDate && !isActive ? 0.35 : 1};
                  transform: {isActive ? 'scaleY(1.04)' : 'scaleY(1)'};
                  transform-origin: bottom;
                  background: {isToday
                    ? 'var(--color-primary)'
                    : over
                      ? 'var(--color-expense)'
                      : isActive
                        ? 'var(--color-primary)'
                        : 'var(--color-surface-3)'}">
      </div>
    </div>
  {/each}
</div>

<!-- Day name + amount labels -->
<div class="flex justify-between gap-1 px-1 mt-2">
  {#each data as day}
    {@const isToday  = day.date === todayStr}
    {@const isActive = activeDate === day.date}
    {@const over     = dailyBudget > 0 && day.total > dailyBudget}
    <div class="flex-1 flex flex-col items-center gap-[3px]"
         role="button"
         tabindex="-1"
         onclick={() => toggle(day.date)}
         onkeydown={(e) => e.key === 'Enter' && toggle(day.date)}>
      <span class="text-[9px] font-medium leading-none transition-colors duration-150
                   {isToday || isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}">
        {weekDayLabel(day.date)}
      </span>
      <span class="text-[8px] font-semibold leading-none transition-colors duration-150
                   {isToday
                     ? 'text-[var(--color-primary)]'
                     : over
                       ? 'text-[var(--color-expense)]'
                       : isActive
                         ? 'text-[var(--color-primary)]'
                         : 'text-[var(--color-text-muted)]'}">
        {shortAmt(day.total)}
      </span>
    </div>
  {/each}
</div>
