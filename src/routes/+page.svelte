<script lang="ts">
  import { app } from '$lib/stores/app.svelte';
  import WeekBarChart from '$lib/components/charts/WeekBarChart.svelte';
  import { formatINR, getWeekDates, today, daysInMonth, monthLabel } from '$lib/utils';
  import { TrendingUp, TrendingDown, Wallet, Settings, AlertTriangle } from '@lucide/svelte';
  import CountUp from '$lib/components/CountUp.svelte';
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';

  const todayStr  = today();
  const weekDates = getWeekDates();

  const weekData = $derived(weekDates.map(date => ({
    date,
    total: app.transactions
      .filter(t => t.date === date && t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0)
  })));

  const recent = $derived(
    [...app.transactions]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5)
  );
  const recentAll = $derived(
    [...app.transactions]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 20)
  );

  const totalBudget = $derived(app.budgets.reduce((s, b) => s + b.amount, 0));
  const daysLeft    = $derived(daysInMonth(app.monthStr) - new Date().getDate());

  const todayIncome = $derived(
    app.transactions
      .filter(t => t.date === todayStr && t.type === 'income')
      .reduce((s, t) => s + t.amount, 0)
  );

  // ── Month Health Card ──────────────────────────────────────────────────────
  // Reference = income if set, else total budget, else 0 (bar hidden)
  const reference = $derived(
    app.monthlyIncome > 0 ? app.monthlyIncome :
    totalBudget > 0       ? totalBudget        : 0
  );
  const refLabel = $derived(
    app.monthlyIncome > 0 ? `${formatINR(app.monthlyIncome)} income` :
    totalBudget > 0       ? `${formatINR(totalBudget)} budget`        : ''
  );

  const spendPct  = $derived(reference > 0 ? app.monthExpenses / reference : 0);
  const barColor  = $derived(
    spendPct >= 1   ? 'var(--color-expense)'  :
    spendPct >= 0.8 ? 'var(--color-warning)'  :
                      'var(--color-income)'
  );

  const left      = $derived(reference - app.monthExpenses);
  const leftColor = $derived(
    left <= 0              ? 'var(--color-expense)' :
    left < reference * 0.2 ? 'var(--color-warning)' :
                              'var(--color-income)'
  );

  // Pace: project end-of-month spend based on current daily burn rate
  const daysGone    = $derived(new Date().getDate());
  const dailyRate   = $derived(daysGone > 0 && app.monthExpenses > 0 ? app.monthExpenses / daysGone : 0);
  const pace        = $derived(Math.round(dailyRate * daysInMonth(app.monthStr)));
  const paceWarning = $derived(reference > 0 && pace > reference);
  const paceColor   = $derived(
    !paceWarning             ? 'var(--color-income)'  :
    pace > reference * 1.2   ? 'var(--color-expense)' :
                               'var(--color-warning)'
  );

  // Bar animates from 0 on mount → feels alive
  let barMounted = $state(false);
  $effect(() => {
    const id = requestAnimationFrame(() => { barMounted = true; });
    return () => cancelAnimationFrame(id);
  });

  // ── Weekly stats ─────────────────────────────────────────────────────────
  const dailyBudget   = $derived(totalBudget > 0 ? totalBudget / daysInMonth(app.monthStr) : 0);
  const weekTotal     = $derived(weekData.reduce((s, d) => s + d.total, 0));
  const weekDaysSpent = $derived(weekData.filter(d => d.total > 0).length);
  const weekAvg       = $derived(weekDaysSpent > 0 ? Math.round(weekTotal / weekDaysSpent) : 0);

  // ── Budget overview (separate from per-category Budgets page) ────────────
  const budgetPct   = $derived(totalBudget > 0 ? Math.min(app.monthExpenses / totalBudget, 1) : 0);
  const budgetColor = $derived(
    budgetPct >= 1   ? 'var(--color-expense)'  :
    budgetPct >= 0.8 ? 'var(--color-warning)'  :
                       'var(--color-income)'
  );
</script>

<div class="px-4 pt-6 pb-32 md:px-8 md:pt-8 md:pb-0 animate-fade-in">

  <!-- Mobile header -->
  <div class="flex items-center justify-between mb-5 md:hidden">
    <div>
      <p class="text-xs text-[var(--color-text-muted)] font-medium">
        {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>
      <h1 class="text-xl font-bold text-[var(--color-text)]">My Ledger</h1>
    </div>
    <div class="flex items-center gap-2">
      <a href="/settings" class="w-9 h-9 rounded-full bg-[var(--color-surface)] flex items-center justify-center">
        <Settings size={18} class="text-[var(--color-text-muted)]" />
      </a>
      <div class="w-9 h-9 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center">
        <Wallet size={18} class="text-[var(--color-primary)]" />
      </div>
    </div>
  </div>

  <!-- Desktop page title -->
  <div class="hidden md:flex items-center justify-between mb-6">
    <h1 class="text-2xl font-bold">Dashboard</h1>
    <p class="text-sm text-[var(--color-text-muted)]">{monthLabel(app.monthStr)}</p>
  </div>

  <!-- Desktop split layout -->
  <div class="md:grid md:grid-cols-[1fr_340px] md:gap-6 md:items-start">

    <!-- ── Left panel ─────────────────────────────────────────────────────── -->
    <div class="space-y-4">

      <!-- ═══════════════════════════════════════════════════════════════════
           MONTH HEALTH CARD — the single answer to "how much am I spending?"
           ═══════════════════════════════════════════════════════════════════ -->
      <div class="bg-[var(--color-surface)] rounded-2xl p-5">

        <!-- Month + days left pill -->
        <div class="flex items-center justify-between mb-4">
          <p class="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            {monthLabel(app.monthStr)}
          </p>
          <span class="text-xs font-medium px-2.5 py-1 rounded-full
                       bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
            {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
          </span>
        </div>

        <!-- Hero spend number — biggest element on the page (Fitts's Law) -->
        <div class="mb-5">
          <CountUp
            value={app.monthExpenses}
            class="text-5xl font-extrabold tracking-tight text-[var(--color-text)]"
          />
          <p class="text-sm text-[var(--color-text-muted)] mt-1 leading-tight">
            spent in {new Date().toLocaleDateString('en-IN', { month: 'long' })}
          </p>
        </div>

        <!-- Progress bar — animates from 0 on mount so it feels alive -->
        {#if reference > 0}
          <div class="mb-4">
            <div class="h-3 bg-[var(--color-border)] rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all duration-700 ease-out"
                   style="width:{barMounted ? Math.min(spendPct, 1) * 100 : 0}%;
                          background:{barColor}">
              </div>
            </div>
            <div class="flex justify-between mt-1.5 text-[10px]">
              <span class="text-[var(--color-text-muted)]">₹0</span>
              <span class="font-semibold" style="color:{barColor}">{Math.round(spendPct * 100)}%</span>
              <span class="text-[var(--color-text-muted)]">{refLabel}</span>
            </div>
          </div>
        {:else}
          <!-- No income/budget set — nudge toward setting one -->
          <div class="mb-4">
            <a href="/settings"
               class="text-xs text-[var(--color-primary)] underline underline-offset-2">
              Set monthly income to see how you're tracking →
            </a>
          </div>
        {/if}

        <!-- Two-stat row: Left to spend + On-pace projection -->
        <!-- Staggered fly-in (Progressive Disclosure — context after the hero) -->
        <div class="grid grid-cols-2 gap-3"
             in:fly={{ y: 10, duration: 240, delay: 180, easing: cubicOut }}>

          <div class="bg-[var(--color-surface-2)] rounded-xl px-3 py-2.5">
            <p class="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide mb-0.5">
              Left to spend
            </p>
            {#if reference > 0}
              <p class="text-sm font-bold leading-none" style="color:{leftColor}">
                {left > 0 ? formatINR(left) : 'Over budget'}
              </p>
            {:else}
              <p class="text-sm font-bold text-[var(--color-text-muted)]">—</p>
            {/if}
          </div>

          <div class="bg-[var(--color-surface-2)] rounded-xl px-3 py-2.5">
            <p class="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide mb-0.5">
              Month-end pace
            </p>
            {#if dailyRate > 0}
              <div class="flex items-center gap-1">
                <p class="text-sm font-bold leading-none" style="color:{paceColor}">
                  {formatINR(pace)}
                </p>
                {#if paceWarning}
                  <AlertTriangle size={11} style="color:{paceColor}" />
                {/if}
              </div>
            {:else}
              <p class="text-sm font-bold text-[var(--color-text-muted)]">—</p>
            {/if}
          </div>
        </div>

        <!-- Today strip — labelled clearly so meaning is never ambiguous -->
        {#if app.todayExpenses > 0 || todayIncome > 0}
          <div class="mt-4 pt-3 border-t border-[var(--color-border)]/50"
               in:fly={{ y: 6, duration: 200, delay: 260, easing: cubicOut }}>
            <p class="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide mb-2">Today</p>
            <div class="flex items-center gap-2">
              {#if app.todayExpenses > 0}
                <div class="flex items-center gap-1.5 bg-[var(--color-expense)]/10
                            px-2.5 py-1.5 rounded-lg">
                  <TrendingDown size={12} class="text-[var(--color-expense)] shrink-0" />
                  <span class="text-xs text-[var(--color-text-muted)]">Spent</span>
                  <span class="text-xs font-bold text-[var(--color-expense)]">
                    {formatINR(app.todayExpenses)}
                  </span>
                </div>
              {/if}
              {#if todayIncome > 0}
                <div class="flex items-center gap-1.5 bg-[var(--color-income)]/10
                            px-2.5 py-1.5 rounded-lg">
                  <TrendingUp size={12} class="text-[var(--color-income)] shrink-0" />
                  <span class="text-xs text-[var(--color-text-muted)]">Earned</span>
                  <span class="text-xs font-bold text-[var(--color-income)]">
                    {formatINR(todayIncome)}
                  </span>
                </div>
              {/if}
            </div>
          </div>
        {/if}
      </div>

      <!-- Weekly chart -->
      <div class="bg-[var(--color-surface)] rounded-2xl p-5">
        <div class="flex items-center justify-between mb-3">
          <p class="text-xs text-[var(--color-text-muted)] font-medium uppercase tracking-wide">This Week</p>
          {#if weekTotal > 0}
            <div class="flex items-center gap-2 text-[10px] text-[var(--color-text-muted)]">
              <span>Total <span class="text-[var(--color-text)] font-semibold">{formatINR(weekTotal)}</span></span>
              {#if weekAvg > 0}
                <span class="opacity-40">·</span>
                <span>Avg/day <span class="text-[var(--color-text)] font-semibold">{formatINR(weekAvg)}</span></span>
              {/if}
            </div>
          {/if}
        </div>
        <WeekBarChart data={weekData} dailyBudget={dailyBudget} />
      </div>

      <!-- Budget category breakdown (distinct from health card's overall bar) -->
      {#if totalBudget > 0}
        <div class="bg-[var(--color-surface)] rounded-2xl p-5">
          <div class="flex justify-between items-center text-xs mb-3">
            <span class="font-medium">Budget overview</span>
            <a href="/budgets" class="text-[var(--color-primary)]">Manage →</a>
          </div>
          <div class="h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
            <div class="h-full rounded-full transition-all duration-700"
                 style="width:{budgetPct * 100}%; background:{budgetColor}"></div>
          </div>
          <p class="text-xs text-[var(--color-text-muted)] mt-2">
            {formatINR(app.monthExpenses)} of {formatINR(totalBudget)} budget used
          </p>
        </div>
      {/if}

      <!-- Upcoming EMIs -->
      {#if app.emis.length > 0}
        {@const upcoming = app.emis.slice(0, 2)}
        <div class="bg-[var(--color-surface)] rounded-2xl p-5">
          <div class="flex items-center justify-between mb-3">
            <p class="text-sm font-semibold">Upcoming</p>
            <a href="/emis" class="text-xs text-[var(--color-primary)]">See all</a>
          </div>
          <div class="space-y-2">
            {#each upcoming as emi}
              <div class="flex items-center justify-between">
                <span class="text-sm text-[var(--color-text-muted)]">{emi.name}</span>
                <span class="text-sm font-medium">{formatINR(emi.monthlyAmount)}</span>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Recent transactions (mobile only) -->
      <div class="md:hidden bg-[var(--color-surface)] rounded-2xl p-5">
        <div class="flex items-center justify-between mb-4">
          <p class="text-sm font-semibold">Recent</p>
          <a href="/transactions" class="text-xs text-[var(--color-primary)]">See all</a>
        </div>
        {#if recent.length === 0}
          <div class="text-center py-6">
            <p class="text-2xl mb-2">💸</p>
            <p class="text-sm text-[var(--color-text-muted)]">No transactions yet</p>
            <p class="text-xs text-[var(--color-text-muted)]">Tap + to add your first one</p>
          </div>
        {:else}
          <div class="space-y-3">
            {#each recent as tx}
              {@const cat = app.getCategoryById(tx.categoryId)}
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                     style="background:{cat?.color ?? '#9B99B8'}22">
                  {cat?.icon ?? '📌'}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium truncate">{cat?.name ?? 'Unknown'}</p>
                  <p class="text-xs text-[var(--color-text-muted)]">{tx.note || tx.paymentMode.toUpperCase()}</p>
                </div>
                <span class="font-semibold text-sm shrink-0
                             {tx.type === 'income' ? 'text-[var(--color-income)]' : 'text-[var(--color-expense)]'}">
                  {tx.type === 'income' ? '+' : '-'}{formatINR(tx.amount)}
                </span>
              </div>
            {/each}
          </div>
        {/if}
      </div>

    </div>

    <!-- ── Right panel (desktop only) ────────────────────────────────────── -->
    <div class="hidden md:flex flex-col gap-4">
      <div class="bg-[var(--color-surface)] rounded-2xl p-5">
        <div class="flex items-center justify-between mb-4">
          <p class="text-sm font-semibold">Recent Transactions</p>
          <a href="/transactions" class="text-xs text-[var(--color-primary)]">See all</a>
        </div>
        {#if recentAll.length === 0}
          <div class="text-center py-10">
            <p class="text-3xl mb-2">💸</p>
            <p class="text-sm text-[var(--color-text-muted)]">No transactions yet</p>
            <p class="text-xs text-[var(--color-text-muted)] mt-1">Click "Add Transaction" to start</p>
          </div>
        {:else}
          <div class="space-y-3">
            {#each recentAll as tx}
              {@const cat = app.getCategoryById(tx.categoryId)}
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                     style="background:{cat?.color ?? '#9B99B8'}22">
                  {cat?.icon ?? '📌'}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium truncate">{cat?.name ?? 'Unknown'}</p>
                  <p class="text-xs text-[var(--color-text-muted)]">
                    {tx.note || ''}{tx.note ? ' · ' : ''}{tx.date}
                  </p>
                </div>
                <span class="font-semibold text-sm shrink-0
                             {tx.type === 'income' ? 'text-[var(--color-income)]' : 'text-[var(--color-expense)]'}">
                  {tx.type === 'income' ? '+' : '-'}{formatINR(tx.amount)}
                </span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>

  </div>
</div>
