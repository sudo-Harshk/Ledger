<script lang="ts">
  import type { Transaction, Category } from '$lib/db/schema';
  import { formatINR, today, addDays, dayOfWeek } from '$lib/utils';

  let { transactions, categories }: {
    transactions: Transaction[];
    categories:   Category[];
  } = $props();

  interface Insight {
    icon:  string;
    text:  string;
    sub?:  string;
    kind:  'danger' | 'warning' | 'positive' | 'neutral';
  }

  const insights = $derived((() => {
    const result: Insight[] = [];
    const expenses  = transactions.filter(t => t.type === 'expense');

    // ── 1. Category streak ────────────────────────────────────────────────
    const catDates = new Map<string, Set<string>>();
    for (const t of expenses) {
      const id = t.categoryId ?? 'unknown';
      const s = catDates.get(id) ?? new Set<string>();
      s.add(t.date);
      catDates.set(id, s);
    }

    let bestStreak = { catId: '', count: 0 };
    for (const [catId, dates] of catDates) {
      let count = 0;
      let d = today();
      while (dates.has(d)) {
        count++;
        d = addDays(d, -1);
      }
      if (count > bestStreak.count) bestStreak = { catId, count };
    }

    if (bestStreak.count >= 3) {
      const cat   = categories.find(c => c.id === bestStreak.catId);
      const total = expenses
        .filter(t => t.categoryId === bestStreak.catId)
        .reduce((s, t) => s + t.amount, 0);
      result.push({
        icon: cat?.icon ?? '📌',
        text: `${cat?.name} ${bestStreak.count} days in a row`,
        sub:  `${formatINR(total)} this month`,
        kind: 'neutral',
      });
    }

    // ── 2. Week-over-week comparison ──────────────────────────────────────
    const now           = today();
    const thisMonday    = addDays(now, -((dayOfWeek(now) + 6) % 7));
    const lastMonday    = addDays(thisMonday, -7);
    const lastSunday    = addDays(thisMonday, -1);

    const thisWeekStart = thisMonday;
    const lastWeekStart = lastMonday;
    const lastWeekEnd   = lastSunday;
    const todayStr      = now;

    const thisWeekTotal = expenses
      .filter(t => t.date >= thisWeekStart && t.date <= todayStr)
      .reduce((s, t) => s + t.amount, 0);
    const lastWeekTotal = expenses
      .filter(t => t.date >= lastWeekStart && t.date <= lastWeekEnd)
      .reduce((s, t) => s + t.amount, 0);

    if (lastWeekTotal > 0 && thisWeekTotal > 0) {
      const diff = thisWeekTotal - lastWeekTotal;
      const pct  = Math.round(Math.abs(diff) / lastWeekTotal * 100);
      if (pct >= 15) {
        result.push({
          icon: diff > 0 ? '📈' : '📉',
          text: diff > 0
            ? `Spending up ${pct}% vs last week`
            : `Spending down ${pct}% vs last week`,
          sub:  `${formatINR(thisWeekTotal)} this week`,
          kind: diff > 0 ? 'warning' : 'positive',
        });
      }
    }

    // Sort: danger → warning → neutral/positive, cap at 3
    const order = { danger: 0, warning: 1, positive: 2, neutral: 3 };
    return result.sort((a, b) => order[a.kind] - order[b.kind]).slice(0, 3);
  })());

  const kindColor: Record<string, string> = {
    danger:   'var(--color-expense)',
    warning:  'var(--color-warning)',
    positive: 'var(--color-income)',
    neutral:  'var(--color-text)',
  };
</script>

{#if insights.length > 0}
  <div class="bg-[var(--color-surface)] rounded-2xl p-5">
    <p class="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-3">
      Insights
    </p>
    <div class="space-y-3">
      {#each insights as insight}
        <div class="flex items-start gap-3">
          <span class="text-base leading-none shrink-0 mt-0.5">{insight.icon}</span>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium leading-snug"
               style="color:{kindColor[insight.kind]}">
              {insight.text}
            </p>
            {#if insight.sub}
              <p class="text-xs text-[var(--color-text-muted)] mt-0.5">{insight.sub}</p>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  </div>
{/if}
