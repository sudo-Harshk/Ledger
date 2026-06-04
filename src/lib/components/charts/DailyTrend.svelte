<script lang="ts">
  import { formatShortDate } from '$lib/utils';

  let { data }: { data: { date: string; total: number }[] } = $props();

  const max = $derived(Math.max(...data.map(d => d.total), 1));
  const CHART_H = 80;

  // Show at most 15 bars
  const visible = $derived(data.length > 15 ? data.slice(-15) : data);
</script>

{#if data.length === 0}
  <div class="h-20 flex items-center justify-center text-[var(--color-text-muted)] text-sm">
    No data for this month
  </div>
{:else}
  <div class="flex items-end gap-1" style="height: {CHART_H + 20}px">
    {#each visible as day}
      {@const h = Math.max((day.total / max) * CHART_H, 4)}
      <div class="flex flex-col items-center gap-1 flex-1 min-w-0">
        <div class="w-full rounded-t-sm bg-[var(--color-primary)]/70 transition-all duration-300"
             style="height: {h}px; margin-top: {CHART_H - h}px;"></div>
        <span class="text-[8px] text-[var(--color-text-muted)] truncate w-full text-center">
          {day.date.slice(8)}
        </span>
      </div>
    {/each}
  </div>
{/if}
