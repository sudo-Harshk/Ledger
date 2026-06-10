<script lang="ts">
  import { formatShortDate, formatINR } from '$lib/utils';
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';

  let { data }: { data: { date: string; total: number }[] } = $props();

  const max     = $derived(Math.max(...data.map(d => d.total), 1));
  const CHART_H = 80;

  // Show at most 15 bars
  const visible = $derived(data.length > 15 ? data.slice(-15) : data);

  // Hover (desktop) + pinned (tap) — hover takes priority
  let hoverDate  = $state<string | null>(null);
  let pinnedDate = $state<string | null>(null);
  const activeDate = $derived(hoverDate ?? pinnedDate);
  const activeDay  = $derived(activeDate ? (visible.find(d => d.date === activeDate) ?? null) : null);

  function toggle(date: string) {
    pinnedDate = pinnedDate === date ? null : date;
  }
</script>

{#if data.length === 0}
  <div class="h-20 flex items-center justify-center text-[var(--color-text-muted)] text-sm">
    No data for this month
  </div>
{:else}
  <!-- Tooltip info line -->
  <div class="h-7 flex items-center mb-2">
    {#if activeDay}
      <div in:fly={{ y: -5, duration: 160, easing: cubicOut }}
           class="flex items-center gap-1.5 text-xs">
        <span class="font-medium text-[var(--color-text)]">{formatShortDate(activeDay.date)}</span>
        <span class="text-[var(--color-border)]">·</span>
        <span class="font-bold text-[var(--color-primary)]">{formatINR(activeDay.total)}</span>
      </div>
    {:else}
      <span class="text-[10px] text-[var(--color-text-muted)]/50 select-none">
        Tap a bar for details
      </span>
    {/if}
  </div>

  <!-- Bars -->
  <div class="flex items-end gap-1" style="height: {CHART_H}px">
    {#each visible as day}
      {@const h        = Math.max((day.total / max) * CHART_H, 4)}
      {@const isActive = activeDate === day.date}
      <div class="flex flex-col items-center gap-1 flex-1 min-w-0 cursor-pointer h-full justify-end"
           role="button"
           tabindex="0"
           aria-label="{formatShortDate(day.date)}: {formatINR(day.total)}"
           onclick={() => toggle(day.date)}
           onkeydown={(e) => e.key === 'Enter' && toggle(day.date)}
           onmouseenter={() => hoverDate = day.date}
           onmouseleave={() => hoverDate = null}>
        <div class="w-full rounded-t-sm transition-all duration-200"
             style="height: {h}px;
                    opacity: {activeDate && !isActive ? 0.35 : 1};
                    transform: {isActive ? 'scaleY(1.05)' : 'scaleY(1)'};
                    transform-origin: bottom;
                    background: {isActive
                      ? 'var(--color-primary)'
                      : 'var(--color-primary)'}70;">
        </div>
        <span class="text-[8px] text-[var(--color-text-muted)] truncate w-full text-center
                     transition-colors duration-150
                     {isActive ? '!text-[var(--color-primary)] font-semibold' : ''}">
          {day.date.slice(8)}
        </span>
      </div>
    {/each}
  </div>
{/if}
