<script lang="ts">
  import { weekDayLabel, today } from '$lib/utils';

  let { data }: { data: { date: string; total: number }[] } = $props();

  const todayStr = today();
  const max = $derived(Math.max(...data.map(d => d.total), 1));
</script>

<div class="flex items-end justify-between gap-1 h-20 px-1">
  {#each data as day}
    {@const pct = day.total / max}
    {@const isToday = day.date === todayStr}
    <div class="flex flex-col items-center gap-1 flex-1 min-w-0">
      <div class="w-full flex items-end justify-center" style="height: 60px;">
        <div class="w-full max-w-[28px] rounded-t-md transition-all duration-500"
             style="height: {Math.max(pct * 100, day.total > 0 ? 8 : 2)}%;
                    background: {isToday ? 'var(--color-primary)' : 'var(--color-surface-3)'};">
        </div>
      </div>
      <span class="text-[9px] font-medium {isToday ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}">
        {weekDayLabel(day.date)}
      </span>
    </div>
  {/each}
</div>
