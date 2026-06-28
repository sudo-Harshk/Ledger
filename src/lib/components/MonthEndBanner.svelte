<script lang="ts">
  import { X, ArrowRight, Timer } from '@lucide/svelte';
  import { getSetting, setSetting } from '$lib/db/queries';
  import { formatINR, monthLabel } from '$lib/utils';
  import { fly } from 'svelte/transition';
  import { cubicIn } from 'svelte/easing';
  import { onMount } from 'svelte';
  import type { Transaction, Category } from '$lib/db/schema';

  let {
    monthExpenses,
    monthlyIncome,
    monthStr,
    transactions,
    categories,
    daysLeft,
  }: {
    monthExpenses: number;
    monthlyIncome: number;
    monthStr: string;
    transactions: Transaction[];
    categories: Category[];
    daysLeft: number;
  } = $props();

  // start hidden to prevent flash before dismiss-state is loaded from DB
  let dismissed = $state(true);
  let loaded    = $state(false);

  const DISMISS_KEY = $derived(`month_end_dismissed_${monthStr}`);
  const shouldShow  = $derived(daysLeft >= 0 && daysLeft <= 2); // last 3 days of the month

  onMount(async () => {
    if (!shouldShow) { loaded = true; return; }
    dismissed = (await getSetting(DISMISS_KEY)) === 'true';
    loaded = true;
  });

  // ── Derived stats ─────────────────────────────────────────────────────────────

  const topCatId = $derived.by(() => {
    const tally: Record<string, number> = {};
    for (const t of transactions) {
      if (t.type === 'expense') tally[t.categoryId] = (tally[t.categoryId] ?? 0) + t.amount;
    }
    return Object.entries(tally).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;
  });

  const topCat       = $derived(topCatId ? categories.find(c => c.id === topCatId) ?? null : null);
  const savings      = $derived(monthlyIncome > 0 ? monthlyIncome - monthExpenses : null);
  const hasExpenses  = $derived(transactions.some(t => t.type === 'expense'));
  const monthName    = $derived(new Date(monthStr + '-01T00:00:00').toLocaleDateString('en-IN', { month: 'long' }));

  const headingText  = $derived(
    daysLeft === 0 ? `Last day of ${monthName}!` :
    daysLeft === 1 ? `1 day left in ${monthName}` :
                     `${daysLeft} days left in ${monthName}`
  );

  async function dismiss() {
    await setSetting(DISMISS_KEY, 'true');
    dismissed = true;
  }
</script>

{#if loaded && shouldShow && !dismissed}
  <div out:fly={{ y: -24, duration: 220, easing: cubicIn }}
       class="bg-[var(--color-surface)] rounded-2xl overflow-hidden
              border border-[var(--color-warning)]/25 animate-fade-in">

    <!-- Accent stripe -->
    <div class="h-0.5 bg-gradient-to-r from-[var(--color-warning)] via-[var(--color-warning)]/40 to-transparent"></div>

    <div class="p-4">

      <!-- Header row -->
      <div class="flex items-start justify-between gap-3 mb-3">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-lg bg-[var(--color-warning)]/15 flex items-center justify-center shrink-0">
            <Timer size={14} style="color:var(--color-warning)" />
          </div>
          <div>
            <p class="text-sm font-bold text-[var(--color-text)]">{headingText}</p>
            <p class="text-xs text-[var(--color-text-muted)]">
              {hasExpenses ? "Here's where you stand" : 'No expenses logged yet this month'}
            </p>
          </div>
        </div>
        <button onclick={dismiss}
                class="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)]
                       transition-colors shrink-0 -mt-0.5">
          <X size={14} />
        </button>
      </div>

      {#if hasExpenses}
        <!-- Stats chips -->
        <div class="flex flex-wrap gap-2 mb-3">

          <!-- Spent -->
          <div class="flex items-center gap-1.5 bg-[var(--color-surface-2)] rounded-xl px-3 py-2">
            <span class="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide">Spent</span>
            <span class="text-sm font-bold text-[var(--color-expense)]">{formatINR(monthExpenses)}</span>
          </div>

          <!-- Saved (only if income is set) -->
          {#if savings !== null}
            <div class="flex items-center gap-1.5 bg-[var(--color-surface-2)] rounded-xl px-3 py-2">
              <span class="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide">
                {savings >= 0 ? 'Saved' : 'Over by'}
              </span>
              <span class="text-sm font-bold"
                    style="color:{savings >= 0 ? 'var(--color-income)' : 'var(--color-expense)'}">
                {formatINR(Math.abs(savings))}
              </span>
            </div>
          {/if}

          <!-- Top category -->
          {#if topCat}
            <div class="flex items-center gap-1.5 bg-[var(--color-surface-2)] rounded-xl px-3 py-2">
              <span class="text-base leading-none">{topCat.icon}</span>
              <span class="text-xs font-semibold text-[var(--color-text)]">{topCat.name}</span>
            </div>
          {/if}

        </div>
      {:else}
        <!-- No transactions nudge -->
        <p class="text-xs text-[var(--color-text-muted)] mb-3">
          Add your {monthName} transactions before the month ends.
        </p>
      {/if}

      <!-- CTA -->
      <a href="/reports"
         class="inline-flex items-center gap-1 text-xs font-semibold
                text-[var(--color-warning)] hover:underline underline-offset-2">
        Review {monthName} in full
        <ArrowRight size={12} />
      </a>

    </div>
  </div>
{/if}
