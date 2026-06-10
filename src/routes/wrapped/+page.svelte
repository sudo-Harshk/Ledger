<script lang="ts">
  import { getMonthSummary, getCategorySpend, getTransactions } from '$lib/db/queries';
  import { app } from '$lib/stores/app.svelte';
  import { toast } from '$lib/stores/toast.svelte';
  import { formatINR, currentMonth, monthLabel } from '$lib/utils';
  import CountUp from '$lib/components/CountUp.svelte';
  import { Share2, Sparkles } from '@lucide/svelte';

  type Mode = 'month' | 'year';

  let mode         = $state<Mode>('year');
  let loading      = $state(true);
  let revealed     = $state(false);

  let totalExpense  = $state(0);
  let totalIncome   = $state(0);
  let totalSaved    = $state(0);
  let savingsRate   = $state(0);
  let txCount       = $state(0);
  let biggestTx     = $state<{ amount: number; note: string; icon: string } | null>(null);
  let favPayment    = $state('UPI');
  let breakdown     = $state<{ categoryId: string; total: number }[]>([]);
  let personality   = $state({ label: 'The Balanced One', emoji: '⚖️' });

  const year       = new Date().getFullYear().toString();
  const thisMonth  = currentMonth();

  function monthsForMode(m: Mode): string[] {
    if (m === 'month') return [thisMonth];
    const n = parseInt(thisMonth.split('-')[1]);
    return Array.from({ length: n }, (_, i) =>
      `${year}-${String(i + 1).padStart(2, '0')}`
    );
  }

  function derivePersonality(
    bd: { categoryId: string; total: number }[],
    totalExp: number,
    savRate: number
  ) {
    if (totalExp === 0) return { label: 'The Balanced One', emoji: '⚖️' };
    const pct = (id: string) => (bd.find(c => c.categoryId === id)?.total ?? 0) / totalExp;

    if (savRate > 40)                                            return { label: 'The Saver',         emoji: '💰' };
    if (pct('cat-food-dining') + pct('cat-groceries') > 0.35)   return { label: 'The Foodie',         emoji: '🍽️' };
    if (pct('cat-transport') > 0.20)                             return { label: 'The Commuter',       emoji: '🚗' };
    if (pct('cat-entertainment') > 0.20)                         return { label: 'The Explorer',       emoji: '🎬' };
    if (pct('cat-shopping') > 0.20)                              return { label: 'The Shopaholic',     emoji: '🛍️' };
    if (pct('cat-personal-care') > 0.15)                         return { label: 'The Self-Care Guru', emoji: '💆' };
    return { label: 'The Balanced One', emoji: '⚖️' };
  }

  async function loadStats(m: Mode) {
    loading  = true;
    revealed = false;

    const months = monthsForMode(m);
    const [summaries, catSpends, txLists] = await Promise.all([
      Promise.all(months.map(getMonthSummary)),
      Promise.all(months.map(getCategorySpend)),
      Promise.all(months.map(mo => getTransactions({ month: mo }))),
    ]);

    totalExpense = summaries.reduce((s, r) => s + r.expense, 0);
    totalIncome  = summaries.reduce((s, r) => s + r.income,  0);
    totalSaved   = Math.max(0, totalIncome - totalExpense);
    savingsRate  = totalIncome > 0 ? Math.round((totalSaved / totalIncome) * 100) : 0;

    const allTxs    = txLists.flat();
    const expenses  = allTxs.filter(t => t.type === 'expense');
    txCount = expenses.length;

    // Biggest single expense
    if (expenses.length > 0) {
      const top = expenses.reduce((a, b) => b.amount > a.amount ? b : a);
      const cat = app.getCategoryById(top.categoryId);
      biggestTx = { amount: top.amount, note: top.note || cat?.name || 'Expense', icon: cat?.icon ?? '📌' };
    } else {
      biggestTx = null;
    }

    // Most-used payment mode
    const payMap: Record<string, number> = {};
    for (const tx of expenses) payMap[tx.paymentMode] = (payMap[tx.paymentMode] ?? 0) + 1;
    favPayment = Object.entries(payMap).sort((a, b) => b[1] - a[1])[0]?.[0]?.toUpperCase() ?? 'UPI';

    // Category breakdown (merged across months)
    const catMap = new Map<string, number>();
    for (const month of catSpends)
      for (const cs of month)
        catMap.set(cs.categoryId, (catMap.get(cs.categoryId) ?? 0) + cs.total);

    breakdown = [...catMap.entries()]
      .map(([categoryId, total]) => ({ categoryId, total }))
      .sort((a, b) => b.total - a.total);

    personality = derivePersonality(breakdown, totalExpense, savingsRate);
    loading = false;

    // Stagger the reveal so CountUp animations fire after mount
    setTimeout(() => { revealed = true; }, 60);
  }

  $effect(() => { loadStats(mode); });

  const topTotal      = $derived(breakdown[0]?.total ?? 1);
  const periodLabel   = $derived(mode === 'month' ? monthLabel(thisMonth) : `${year} so far`);
  const topCat        = $derived(app.getCategoryById(breakdown[0]?.categoryId ?? ''));

  async function share() {
    const lines = [
      `My Spending DNA — ${periodLabel}`,
      `${personality.emoji} ${personality.label}`,
      `Spent: ${formatINR(totalExpense)} · Saved: ${formatINR(totalSaved)} (${savingsRate}%)`,
      topCat ? `Top: ${topCat.icon} ${topCat.name}` : '',
      `${txCount} transactions · tracked on Ledger`,
    ].filter(Boolean).join('\n');

    try {
      if (navigator.share) {
        await navigator.share({ title: 'My Spending DNA', text: lines });
      } else {
        await navigator.clipboard.writeText(lines);
        toast.show('Copied to clipboard!');
      }
    } catch {
      await navigator.clipboard.writeText(lines);
      toast.show('Copied to clipboard!');
    }
  }
</script>

<div class="px-4 pt-6 pb-28 md:px-8 md:pt-8 md:pb-8 animate-fade-in">

  <!-- Header -->
  <div class="flex items-center justify-between mb-5 md:mb-6">
    <div class="flex items-center gap-2">
      <Sparkles size={20} class="text-[var(--color-primary)]" />
      <h1 class="text-xl font-bold">Spending DNA</h1>
    </div>

    <!-- Mode toggle -->
    <div class="flex bg-[var(--color-surface-2)] rounded-xl p-1 text-xs font-medium">
      <button onclick={() => mode = 'month'}
              class="px-3 py-1.5 rounded-lg transition-all
                     {mode === 'month'
                       ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm'
                       : 'text-[var(--color-text-muted)]'}">
        This Month
      </button>
      <button onclick={() => mode = 'year'}
              class="px-3 py-1.5 rounded-lg transition-all
                     {mode === 'year'
                       ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm'
                       : 'text-[var(--color-text-muted)]'}">
        This Year
      </button>
    </div>
  </div>

  {#if loading}
    <div class="flex flex-col items-center justify-center py-24 gap-3">
      <Sparkles size={32} class="text-[var(--color-primary)] animate-pulse" />
      <p class="text-sm text-[var(--color-text-muted)]">Analysing your money…</p>
    </div>

  {:else if totalExpense === 0 && txCount === 0}
    <div class="text-center py-20">
      <p class="text-4xl mb-3">🧬</p>
      <p class="text-[var(--color-text-muted)] text-sm">No transactions for {periodLabel} yet</p>
      <p class="text-xs text-[var(--color-text-muted)] mt-1">Add some expenses to reveal your spending DNA</p>
    </div>

  {:else}
    <!-- Desktop: two-column grid. Mobile: single column (space-y-4 stacks both divs) -->
    <div class="space-y-4 md:space-y-0 md:grid md:grid-cols-2 md:gap-6 md:items-start">

      <!-- Left column: hero card + stats grid -->
      <div class="space-y-4">

        <!-- Hero card — gradient personality reveal -->
        <div class="rounded-3xl overflow-hidden
                    bg-gradient-to-br from-[var(--color-primary)] to-[#4B44CC]
                    text-white p-6 relative">
          <p class="text-xs font-semibold uppercase tracking-widest opacity-70 mb-1">{periodLabel}</p>
          <p class="text-sm font-medium opacity-80 mb-4">Your Spending DNA</p>

          <!-- Personality -->
          <div class="animate-pop" style="animation-delay: 0ms; animation-fill-mode: both;">
            <p class="text-6xl mb-2">{personality.emoji}</p>
            <p class="text-2xl font-black leading-tight">{personality.label}</p>
          </div>

          <!-- Top category callout -->
          {#if topCat}
            <div class="mt-4 inline-flex items-center gap-2 bg-white/15 rounded-full px-3 py-1.5
                        animate-pop" style="animation-delay: 80ms; animation-fill-mode: both;">
              <span class="text-base">{topCat.icon}</span>
              <span class="text-xs font-semibold">{topCat.name} is your #1 spend</span>
            </div>
          {/if}

          <!-- Share CTA — within the hero at the peak moment -->
          <div class="mt-5 pt-4 border-t border-white/20">
            <button onclick={share}
                    class="w-full flex items-center justify-center gap-2
                           bg-white/15 hover:bg-white/25 active:scale-[0.98]
                           transition-all py-2.5 rounded-xl text-sm font-semibold">
              <Share2 size={15} />
              Share my Spending DNA
            </button>
          </div>

          <!-- Decorative sparkle dots -->
          <div class="absolute top-4 right-4 opacity-20 text-3xl select-none">✦</div>
        </div>

        <!-- Stats grid -->
        <div class="grid grid-cols-2 gap-3">
          <div class="bg-[var(--color-surface)] rounded-2xl p-4
                      animate-pop" style="animation-delay: 120ms; animation-fill-mode: both;">
            <p class="text-xs text-[var(--color-text-muted)] mb-1">Total Spent</p>
            {#if revealed}
              <CountUp value={totalExpense} class="text-xl font-bold text-[var(--color-expense)]" />
            {:else}
              <p class="text-xl font-bold text-[var(--color-expense)]">₹0</p>
            {/if}
          </div>

          <div class="bg-[var(--color-surface)] rounded-2xl p-4
                      animate-pop" style="animation-delay: 180ms; animation-fill-mode: both;">
            <p class="text-xs text-[var(--color-text-muted)] mb-1">Total Saved</p>
            {#if revealed}
              <CountUp value={totalSaved} class="text-xl font-bold text-[var(--color-income)]" />
            {:else}
              <p class="text-xl font-bold text-[var(--color-income)]">₹0</p>
            {/if}
          </div>

          <div class="bg-[var(--color-surface)] rounded-2xl p-4
                      animate-pop" style="animation-delay: 240ms; animation-fill-mode: both;">
            <p class="text-xs text-[var(--color-text-muted)] mb-1">Savings Rate</p>
            <p class="text-xl font-bold
                      {savingsRate >= 20 ? 'text-[var(--color-income)]' : 'text-[var(--color-warning)]'}">
              {savingsRate}%
            </p>
          </div>

          <div class="bg-[var(--color-surface)] rounded-2xl p-4
                      animate-pop" style="animation-delay: 300ms; animation-fill-mode: both;">
            <p class="text-xs text-[var(--color-text-muted)] mb-1">Transactions</p>
            <p class="text-xl font-bold">{txCount}</p>
          </div>
        </div>

      </div>

      <!-- Right column: DNA bars + highlights + share -->
      <div class="space-y-4">

        <!-- Spend Leaderboard — ranked rows with category colour accents -->
        {#if breakdown.length > 0}
          <div class="bg-[var(--color-surface)] rounded-2xl p-4
                      animate-fade-in" style="animation-delay: 360ms; animation-fill-mode: both;">
            <p class="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-3">
              Top Spends
            </p>
            <div class="space-y-1.5">
              {#each breakdown.slice(0, 6) as cs, i}
                {@const cat = app.getCategoryById(cs.categoryId)}
                {@const pct = totalExpense > 0 ? Math.round((cs.total / totalExpense) * 100) : 0}
                <div class="flex items-center gap-3 rounded-xl px-3 py-2.5 animate-fade-in"
                     style="background:{cat?.color ?? '#9B99B8'}12;
                            animation-delay:{380 + i * 50}ms; animation-fill-mode:both;">
                  <span class="text-xl font-black tabular-nums leading-none w-7 shrink-0 text-right"
                        style="color:{cat?.color ?? '#9B99B8'}">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div class="w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0"
                       style="background:{cat?.color ?? '#9B99B8'}22">
                    {cat?.icon ?? '📌'}
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold leading-none truncate">{cat?.name ?? 'Other'}</p>
                    <p class="text-[10px] text-[var(--color-text-muted)] mt-0.5">{pct}% of spending</p>
                  </div>
                  <p class="text-sm font-bold shrink-0" style="color:{cat?.color ?? '#9B99B8'}">
                    {formatINR(cs.total)}
                  </p>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Fun callouts -->
        <div class="bg-[var(--color-surface)] rounded-2xl p-4 space-y-3
                    animate-fade-in" style="animation-delay: 560ms; animation-fill-mode: both;">
          <p class="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Highlights</p>

          {#if biggestTx}
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-lg">{biggestTx.icon}</span>
                <div>
                  <p class="text-xs text-[var(--color-text-muted)]">Biggest splurge</p>
                  <p class="text-sm font-semibold truncate max-w-[180px]">{biggestTx.note}</p>
                </div>
              </div>
              <p class="text-sm font-bold text-[var(--color-expense)] shrink-0">{formatINR(biggestTx.amount)}</p>
            </div>
          {/if}

          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-lg">💳</span>
              <div>
                <p class="text-xs text-[var(--color-text-muted)]">Favourite payment</p>
                <p class="text-sm font-semibold">{favPayment}</p>
              </div>
            </div>
            <p class="text-xs text-[var(--color-text-muted)]">{txCount} transactions</p>
          </div>
        </div>

      </div>

    </div>
  {/if}

</div>
