<script lang="ts">
  import { X, ArrowRight, Sparkles } from '@lucide/svelte';
  import { getSetting, setSetting, getTransactions } from '$lib/db/queries';
  import { formatINR, prevMonth, currentMonth, monthLabel } from '$lib/utils';
  import { fly } from 'svelte/transition';
  import { cubicIn } from 'svelte/easing';
  import { onMount } from 'svelte';
  import { app } from '$lib/stores/app.svelte';
  import type { Transaction } from '$lib/db/schema';

  const todayDate   = new Date().getDate();              // 1, 2, or 3
  const thisMonth   = currentMonth();                    // e.g. "2026-07"
  const lastMonth   = prevMonth(thisMonth);              // e.g. "2026-06"
  const DISMISS_KEY = `new_month_welcome_dismissed_${thisMonth}`;

  const thisMonthName = new Date(thisMonth + '-01T00:00:00').toLocaleDateString('en-IN', { month: 'long' });
  const lastMonthName = new Date(lastMonth + '-01T00:00:00').toLocaleDateString('en-IN', { month: 'long' });

  // Only relevant on days 1-3 of a new month
  const shouldShow = todayDate >= 1 && todayDate <= 3;

  let dismissed  = $state(true); // hide until DB check resolves (prevents flash)
  let enabled    = $state(true);
  let loading    = $state(true);
  let prevTxns   = $state<Transaction[]>([]);

  onMount(async () => {
    if (!shouldShow) { loading = false; return; }

    const [dismissVal, txns, bannerSetting] = await Promise.all([
      getSetting(DISMISS_KEY),
      getTransactions({ month: lastMonth }),
      getSetting('banner_new_month'),
    ]);

    dismissed = dismissVal === 'true';
    enabled   = bannerSetting !== 'false'; // default true if key not set yet
    prevTxns  = txns;
    loading   = false;
  });

  // ── Previous month stats ──────────────────────────────────────────────────────

  const prevExpenses = $derived(
    prevTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  );
  const prevIncome = $derived(
    prevTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  );
  const prevTxCount  = $derived(prevTxns.length);
  const hasPrevData  = $derived(prevTxns.length > 0);

  const prevSavings = $derived(
    // Only show savings if income was logged OR monthly income setting is set
    prevIncome > 0 ? prevIncome - prevExpenses : null
  );

  const topCatId = $derived.by(() => {
    const tally: Record<string, number> = {};
    for (const t of prevTxns) {
      if (t.type === 'expense') tally[t.categoryId] = (tally[t.categoryId] ?? 0) + t.amount;
    }
    return Object.entries(tally).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;
  });

  // categories from app store (already loaded, current + historical same set)
  const topCat = $derived(topCatId ? app.categories.find(c => c.id === topCatId) ?? null : null);

  async function dismiss() {
    await setSetting(DISMISS_KEY, 'true');
    dismissed = true;
  }
</script>

{#if shouldShow && enabled && !dismissed && !loading}
  <div out:fly={{ y: -24, duration: 220, easing: cubicIn }}
       class="bg-[var(--color-surface)] rounded-2xl overflow-hidden
              border border-[var(--color-primary)]/20 animate-fade-in">

    <!-- Accent stripe -->
    <div class="h-0.5 bg-gradient-to-r from-[var(--color-primary)] via-[var(--color-primary)]/40 to-transparent"></div>

    <div class="p-4">

      <!-- Header row -->
      <div class="flex items-start justify-between gap-3 mb-3">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-lg bg-[var(--color-primary)]/15 flex items-center justify-center shrink-0">
            <Sparkles size={14} style="color:var(--color-primary)" />
          </div>
          <div>
            <p class="text-sm font-bold text-[var(--color-text)]">{thisMonthName} has started!</p>
            <p class="text-xs text-[var(--color-text-muted)]">
              {hasPrevData ? `Here's how ${lastMonthName} went` : `Nothing logged in ${lastMonthName}`}
            </p>
          </div>
        </div>
        <button onclick={dismiss}
                class="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)]
                       transition-colors shrink-0 -mt-0.5">
          <X size={14} />
        </button>
      </div>

      {#if hasPrevData}
        <!-- Stats chips -->
        <div class="flex flex-wrap gap-2 mb-3">

          <!-- Total spent -->
          <div class="flex items-center gap-1.5 bg-[var(--color-surface-2)] rounded-xl px-3 py-2">
            <span class="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide">Spent</span>
            <span class="text-sm font-bold text-[var(--color-expense)]">{formatINR(prevExpenses)}</span>
          </div>

          <!-- Savings / over (only when income was logged) -->
          {#if prevSavings !== null}
            <div class="flex items-center gap-1.5 bg-[var(--color-surface-2)] rounded-xl px-3 py-2">
              <span class="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide">
                {prevSavings >= 0 ? 'Saved' : 'Over by'}
              </span>
              <span class="text-sm font-bold"
                    style="color:{prevSavings >= 0 ? 'var(--color-income)' : 'var(--color-expense)'}">
                {formatINR(Math.abs(prevSavings))}
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

          <!-- Transaction count -->
          <div class="flex items-center gap-1.5 bg-[var(--color-surface-2)] rounded-xl px-3 py-2">
            <span class="text-sm font-bold text-[var(--color-text)]">{prevTxCount}</span>
            <span class="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide">transactions</span>
          </div>

        </div>
      {:else}
        <!-- No previous month data -->
        <p class="text-xs text-[var(--color-text-muted)] mb-3">
          Start fresh — add your first {thisMonthName} transaction now.
        </p>
      {/if}

      <!-- CTA -->
      <a href="/reports"
         class="inline-flex items-center gap-1 text-xs font-semibold
                text-[var(--color-primary)] hover:underline underline-offset-2">
        {hasPrevData ? `See ${lastMonthName}'s full recap` : 'Go to Reports'}
        <ArrowRight size={12} />
      </a>

    </div>
  </div>
{/if}
