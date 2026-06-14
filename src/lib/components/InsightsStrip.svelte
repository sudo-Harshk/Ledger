<script lang="ts">
  import type { Transaction, Category, Budget } from '$lib/db/schema';
  import { formatINR, daysInMonth } from '$lib/utils';

  let { transactions, categories, budgets, monthStr }: {
    transactions: Transaction[];
    categories:   Category[];
    budgets:      Budget[];
    monthStr:     string;
  } = $props();

  function localStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  interface Insight {
    icon:  string;
    text:  string;
    sub?:  string;
    kind:  'danger' | 'warning' | 'positive' | 'neutral';
  }

  const insights = $derived((() => {
    const result: Insight[] = [];
    const expenses  = transactions.filter(t => t.type === 'expense');
    const daysGone  = new Date().getDate();
    const daysTotal = daysInMonth(monthStr);
    const daysLeft  = daysTotal - daysGone;

    // ── 1. Budget warnings (most urgent) ─────────────────────────────────
    for (const budget of budgets) {
      const spent = expenses
        .filter(t => t.categoryId === budget.categoryId)
        .reduce((s, t) => s + t.amount, 0);
      const cat        = categories.find(c => c.id === budget.categoryId);
      const pct        = budget.amount > 0 ? spent / budget.amount : 0;
      const dailyRate  = daysGone > 0 ? spent / daysGone : 0;
      const daysToExceed = dailyRate > 0
        ? Math.floor((budget.amount - spent) / dailyRate)
        : Infinity;

      if (pct >= 1) {
        result.push({
          icon: cat?.icon ?? '📌',
          text: `${cat?.name} budget exceeded`,
          sub:  `over by ${formatINR(spent - budget.amount)}`,
          kind: 'danger',
        });
      } else if (daysLeft > 0 && isFinite(daysToExceed) && daysToExceed <= Math.min(daysLeft, 4)) {
        result.push({
          icon: '⚠️',
          text: `${cat?.name} budget runs out`,
          sub:  daysToExceed <= 0 ? 'today at this pace' : `in ~${daysToExceed} day${daysToExceed !== 1 ? 's' : ''} at this pace`,
          kind: 'warning',
        });
      }
    }

    // ── 2. Category streak ────────────────────────────────────────────────
    const catDates = new Map<string, Set<string>>();
    for (const t of expenses) {
      const s = catDates.get(t.categoryId) ?? new Set<string>();
      s.add(t.date);
      catDates.set(t.categoryId, s);
    }

    let bestStreak = { catId: '', count: 0 };
    for (const [catId, dates] of catDates) {
      let count = 0;
      const d = new Date();
      while (dates.has(localStr(d))) {
        count++;
        d.setDate(d.getDate() - 1);
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

    // ── 3. Week-over-week comparison ──────────────────────────────────────
    const now           = new Date();
    const thisMonday    = new Date(now);
    thisMonday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    const lastMonday    = new Date(thisMonday);
    lastMonday.setDate(thisMonday.getDate() - 7);
    const lastSunday    = new Date(thisMonday);
    lastSunday.setDate(thisMonday.getDate() - 1);

    const thisWeekStart = localStr(thisMonday);
    const lastWeekStart = localStr(lastMonday);
    const lastWeekEnd   = localStr(lastSunday);
    const todayStr      = localStr(now);

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
