<script lang="ts">
  import { formatINR } from '$lib/utils';
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';

  let { data, month }: {
    data: { date: string; total: number }[];
    month: string;
  } = $props();

  const spendMap  = $derived(new Map(data.map(d => [d.date, d.total])));
  const max       = $derived(Math.max(...data.map(d => d.total), 1));
  const spendDays = $derived(data.filter(d => d.total > 0));
  const avgSpend  = $derived(
    spendDays.length > 0
      ? spendDays.reduce((s, d) => s + d.total, 0) / spendDays.length
      : 0
  );

  // Build Mon-first calendar grid for the month
  const calendarDays = $derived((() => {
    const [y, m]    = month.split('-').map(Number);
    const daysInMon = new Date(y, m, 0).getDate();
    const firstDow  = new Date(y, m - 1, 1).getDay(); // 0 = Sun
    const offset    = (firstDow + 6) % 7;             // Mon = 0, Sun = 6
    const days: (string | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= daysInMon; d++)
      days.push(`${month}-${String(d).padStart(2, '0')}`);
    while (days.length % 7 !== 0) days.push(null);
    return days;
  })());

  let hoverDate  = $state<string | null>(null);
  let pinnedDate = $state<string | null>(null);
  const activeDate  = $derived(hoverDate ?? pinnedDate);
  const activeTotal = $derived(activeDate !== null ? (spendMap.get(activeDate) ?? 0) : null);

  function toggle(date: string) {
    pinnedDate = pinnedDate === date ? null : date;
  }

  function cellBg(date: string, isActive: boolean): string {
    const total = spendMap.get(date) ?? 0;
    if (total === 0) return isActive ? 'var(--color-border)' : 'var(--color-surface-2)';
    const ratio = total / max;
    const pct   = Math.round(25 + ratio * 65);
    const color = ratio > 0.65
      ? 'var(--color-expense)'
      : ratio > 0.35
        ? 'var(--color-warning)'
        : 'var(--color-primary)';
    return `color-mix(in srgb, ${color} ${pct}%, var(--color-surface-2))`;
  }

  function contextLabel(total: number): string {
    if (total === 0) return 'No spend';
    if (total === max && spendDays.length > 1) return 'Highest day';
    if (avgSpend > 0 && total > avgSpend * 1.5) return 'Above average';
    if (avgSpend > 0 && total < avgSpend * 0.5) return 'Below average';
    return 'Average day';
  }

  const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const LEGEND_RATIOS = [0.08, 0.25, 0.45, 0.65, 0.88];
</script>

<!-- Info strip -->
<div class="h-10 flex items-center mb-3">
  {#if activeDate !== null && activeTotal !== null}
    <div in:fly={{ y: -4, duration: 150, easing: cubicOut }}
         class="flex items-center gap-2 flex-wrap">
      <span class="text-xs font-semibold text-[var(--color-text)]">
        {new Date(activeDate + 'T00:00:00').toLocaleDateString('en-IN', {
          weekday: 'short', day: 'numeric', month: 'short'
        })}
      </span>
      <span class="text-[var(--color-border)]">·</span>
      <span class="text-sm font-bold" style="color:{activeTotal > 0 ? 'var(--color-primary)' : 'var(--color-text-muted)'}">
        {activeTotal > 0 ? formatINR(activeTotal) : '₹0'}
      </span>
      <span class="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
        {contextLabel(activeTotal)}
      </span>
    </div>
  {:else}
    <span class="text-[10px] text-[var(--color-text-muted)]/50 select-none">
      Tap a day to see details
    </span>
  {/if}
</div>

<!-- Day-of-week headers -->
<div class="grid grid-cols-7 gap-1 mb-1.5">
  {#each WEEKDAYS as label}
    <div class="text-center text-[9px] font-semibold uppercase tracking-wide
                text-[var(--color-text-muted)]">
      {label}
    </div>
  {/each}
</div>

<!-- Calendar grid -->
<div class="grid grid-cols-7 gap-1">
  {#each calendarDays as date}
    {#if date === null}
      <div class="aspect-square"></div>
    {:else}
      {@const total    = spendMap.get(date) ?? 0}
      {@const isActive = activeDate === date}
      <button
        onclick={() => toggle(date)}
        onmouseenter={() => hoverDate = date}
        onmouseleave={() => hoverDate = null}
        class="aspect-square rounded-lg flex items-center justify-center
               transition-all duration-150 cursor-pointer
               {isActive ? 'scale-110 z-10 ring-2 ring-[var(--color-primary)] ring-offset-1 ring-offset-[var(--color-surface)]' : 'hover:scale-105'}"
        style="background: {cellBg(date, isActive)}"
        aria-label="{date}: {total > 0 ? formatINR(total) : 'No spend'}"
      >
        <span class="text-[10px] leading-none select-none
                     {total > 0 ? 'font-semibold text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'}
                     {isActive ? '!font-bold' : ''}">
          {date.slice(8)}
        </span>
      </button>
    {/if}
  {/each}
</div>

<!-- Color legend -->
<div class="flex items-center gap-2 mt-4">
  <span class="text-[9px] text-[var(--color-text-muted)] shrink-0">Less</span>
  <div class="flex gap-0.5 flex-1">
    {#each LEGEND_RATIOS as ratio}
      {@const pct   = Math.round(25 + ratio * 65)}
      {@const color = ratio > 0.65
        ? 'var(--color-expense)'
        : ratio > 0.35
          ? 'var(--color-warning)'
          : 'var(--color-primary)'}
      <div class="flex-1 h-2 rounded-sm"
           style="background: color-mix(in srgb, {color} {pct}%, var(--color-surface-2))">
      </div>
    {/each}
  </div>
  <span class="text-[9px] text-[var(--color-text-muted)] shrink-0">More</span>
</div>
