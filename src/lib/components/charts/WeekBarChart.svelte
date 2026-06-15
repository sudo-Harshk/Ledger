<script lang="ts">
  import type { Transaction, Category } from '$lib/db/schema';
  import { today, formatINR } from '$lib/utils';

  let { data, transactions = [], categories = [], dailyBudget = 0 }: {
    data:          { date: string; total: number }[];
    transactions?: Transaction[];
    categories?:   Category[];
    dailyBudget?:  number;
  } = $props();

  const todayStr = today();

  function dayAbbrev(dateStr: string): string {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 3);
  }

  function dayNum(dateStr: string): string {
    return new Date(dateStr + 'T00:00:00').getDate().toString();
  }

  // Unique category icons for a given date (up to 4, then "+N more")
  function iconsForDay(dateStr: string): { icons: string[]; extra: number } {
    const txs = transactions.filter(t => t.date === dateStr && t.type === 'expense');
    const seen = new Set<string>();
    const icons: string[] = [];
    for (const t of txs) {
      if (!seen.has(t.categoryId)) {
        seen.add(t.categoryId);
        const cat = categories.find(c => c.id === t.categoryId);
        if (cat) icons.push(cat.icon);
      }
    }
    return { icons: icons.slice(0, 4), extra: Math.max(0, icons.length - 4) };
  }
</script>

<div class="space-y-1">
  {#each data as day}
    {@const isToday  = day.date === todayStr}
    {@const hasSpend = day.total > 0}
    {@const over     = dailyBudget > 0 && day.total > dailyBudget}
    {@const { icons, extra } = iconsForDay(day.date)}

    <div class="flex items-center gap-3 py-2 px-1 rounded-xl transition-colors
                {isToday ? 'bg-[var(--color-primary)]/8' : ''}">

      <!-- Day pill -->
      <div class="flex flex-col items-center w-8 shrink-0">
        <span class="text-[10px] font-semibold leading-none
                     {isToday ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}">
          {dayAbbrev(day.date)}
        </span>
        <span class="text-[11px] font-bold leading-none mt-0.5
                     {isToday ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}">
          {dayNum(day.date)}
        </span>
      </div>

      <!-- Divider -->
      <div class="w-px h-6 bg-[var(--color-border)]/60 shrink-0"></div>

      <!-- Category icons -->
      <div class="flex-1 flex items-center gap-1 min-w-0">
        {#if hasSpend}
          {#each icons as icon}
            <span class="text-base leading-none">{icon}</span>
          {/each}
          {#if extra > 0}
            <span class="text-[10px] text-[var(--color-text-muted)] font-medium">+{extra}</span>
          {/if}
        {:else}
          <span class="text-xs text-[var(--color-border)] select-none">—</span>
        {/if}
      </div>

      <!-- Amount -->
      <div class="shrink-0 text-right">
        {#if hasSpend}
          <span class="text-sm font-semibold"
                style="color:{over ? 'var(--color-expense)' : isToday ? 'var(--color-primary)' : 'var(--color-text)'}">
            {formatINR(day.total)}
          </span>
          {#if over && dailyBudget > 0}
            <p class="text-[9px] text-[var(--color-expense)] leading-none mt-0.5">
              +{formatINR(day.total - dailyBudget)} over
            </p>
          {/if}
        {:else}
          <span class="text-xs text-[var(--color-border)]">—</span>
        {/if}
      </div>

    </div>
  {/each}
</div>
