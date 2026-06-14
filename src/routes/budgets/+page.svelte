<script lang="ts">
  import { app } from '$lib/stores/app.svelte';
  import { setBudget, deleteBudget } from '$lib/db/queries';
  import BudgetRing from '$lib/components/BudgetRing.svelte';
  import { formatINR, monthLabel } from '$lib/utils';
  import { validateAmount, validateRequired } from '$lib/utils/validate';
  import { Plus, Pencil, Check, X, AlertCircle } from '@lucide/svelte';
  import NumberInput from '$lib/components/NumberInput.svelte';

  let editingId   = $state<string | null>(null);
  let editAmount  = $state('');
  let editAttempted = $state(false);
  let adding      = $state(false);
  let newCatId    = $state('');
  let newAmount   = $state('');
  let newAttempted = $state(false);

  // ── Budgets merged with live spent amounts ────────────────────────────────
  // Single $derived that tracks both app.budgets AND app.transactions so any
  // change to either immediately re-computes everything on this page.
  const enriched = $derived(
    app.budgets.map(b => {
      const spent     = app.transactions
        .filter(t => t.categoryId === b.categoryId && t.type === 'expense' && t.date.startsWith(app.monthStr))
        .reduce((s, t) => s + t.amount, 0);
      const pct       = b.amount > 0 ? Math.min(spent / b.amount, 1) : 0;
      const barColor  = pct >= 1 ? 'var(--color-expense)' : pct >= 0.8 ? 'var(--color-warning)' : 'var(--color-income)';
      const daysGone  = new Date().getDate();
      const daysTotal = new Date(parseInt(app.monthStr.slice(0,4)), parseInt(app.monthStr.slice(5,7)), 0).getDate();
      const daysLeft  = daysTotal - daysGone;
      const dailyRate = daysGone > 0 ? spent / daysGone : 0;
      const daysToExceed = dailyRate > 0 && b.amount > spent
        ? Math.floor((b.amount - spent) / dailyRate)
        : null;
      const paceNote  = pct >= 1
        ? `Over by ${(((spent - b.amount) / b.amount) * 100).toFixed(0)}%`
        : daysToExceed !== null && daysToExceed <= daysLeft
          ? `Runs out in ~${daysToExceed} day${daysToExceed !== 1 ? 's' : ''}`
          : daysLeft > 0 && dailyRate > 0
            ? `On track · ₹${Math.round(dailyRate)}/day`
            : null;
      return { ...b, spent, pct, barColor, paceNote };
    })
  );

  // ── Add form validation ───────────────────────────────────────────────────
  const newErrors = $derived({
    category: validateRequired(newCatId, 'Category'),
    amount:   validateAmount(newAmount, { max: 1_000_000, label: 'Budget' }),
  });
  const newHasErrors = $derived(Object.values(newErrors).some(Boolean));

  // ── Edit form validation ──────────────────────────────────────────────────
  const editErrors = $derived({
    amount: validateAmount(editAmount, { max: 1_000_000, label: 'Budget' }),
  });

  async function saveEdit(b: { id: string; categoryId: string; month: string }) {
    editAttempted = true;
    if (editErrors.amount) return;
    await setBudget(b.categoryId, b.month, parseFloat(editAmount));
    await app.refreshBudgets();
    editingId     = null;
    editAttempted = false;
  }

  async function saveNew() {
    newAttempted = true;
    if (newHasErrors) return;
    await setBudget(newCatId, app.monthStr, parseFloat(newAmount));
    await app.refreshBudgets();
    adding       = false;
    newAttempted = false;
    newCatId = ''; newAmount = '';
  }

  async function remove(id: string) {
    await deleteBudget(id);
    await app.refreshBudgets();
  }

  const budgetedCatIds = $derived(new Set(app.budgets.map(b => b.categoryId)));
  const unbudgetedCats = $derived(app.categories.filter(c => !budgetedCatIds.has(c.id)));
  const totalBudget    = $derived(enriched.reduce((s, b) => s + b.amount, 0));
  const totalSpent     = $derived(enriched.reduce((s, b) => s + b.spent, 0));
  const overallPct     = $derived(totalBudget > 0 ? Math.min(totalSpent / totalBudget, 1) : 0);
  const overallColor   = $derived(
    overallPct >= 1   ? 'var(--color-expense)'  :
    overallPct >= 0.8 ? 'var(--color-warning)'  :
                        'var(--color-income)'
  );
</script>

<div class="px-4 pt-6 md:px-8 md:pt-8 animate-fade-in">
  <div class="flex items-center justify-between mb-5">
    <div>
      <h1 class="text-xl font-bold">Budgets</h1>
      <p class="text-xs text-[var(--color-text-muted)]">{monthLabel(app.monthStr)}</p>
    </div>
    <button onclick={() => { adding = true; newAttempted = false; }}
            class="flex items-center gap-1.5 bg-[var(--color-primary)]/20 text-[var(--color-primary)]
                   px-3 py-2 rounded-xl text-sm font-medium">
      <Plus size={16} /> Add
    </button>
  </div>

  {#if enriched.length > 0}
    <div class="bg-[var(--color-surface)] rounded-2xl p-4 mb-5">
      <div class="flex justify-between text-xs text-[var(--color-text-muted)] mb-2">
        <span>Total budget</span>
        <span>{formatINR(totalSpent)} / {formatINR(totalBudget)}</span>
      </div>
      <div class="h-2 bg-[var(--color-border)] rounded-full">
        <div class="h-full rounded-full transition-all duration-700"
             style="width:{overallPct*100}%; background:{overallColor}"></div>
      </div>
    </div>
  {/if}

  <!-- ── Add form ──────────────────────────────────────────────────────────── -->
  {#if adding}
    <div class="bg-[var(--color-surface)] rounded-2xl p-4 mb-4 animate-fade-in space-y-3">
      <p class="text-sm font-semibold">New Budget</p>

      <!-- Category -->
      <div>
        <select bind:value={newCatId}
                class="w-full bg-[var(--color-surface-2)] rounded-xl px-4 py-3 text-sm text-[var(--color-text)]
                       focus:outline-none border transition-colors
                       {newAttempted && newErrors.category
                         ? 'border-[var(--color-expense)]'
                         : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'}">
          <option value="">Select category</option>
          {#each unbudgetedCats as cat}
            <option value={cat.id}>{cat.icon} {cat.name}</option>
          {/each}
        </select>
        {#if newAttempted && newErrors.category}
          <p class="text-xs text-[var(--color-expense)] mt-1 flex items-center gap-1">
            <AlertCircle size={11} /> {newErrors.category}
          </p>
        {/if}
      </div>

      <!-- Amount -->
      <div>
        <NumberInput bind:value={newAmount} min={0} max={1000000} step={500}
                     placeholder="Monthly budget (₹)" inputmode="numeric"
                     invalid={!!(newAttempted && newErrors.amount)} />
        {#if newAttempted && newErrors.amount}
          <p class="text-xs text-[var(--color-expense)] mt-1 flex items-center gap-1">
            <AlertCircle size={11} /> {newErrors.amount}
          </p>
        {/if}
      </div>

      <div class="flex gap-2">
        <button onclick={saveNew}
                class="flex-1 py-3 bg-[var(--color-primary)] text-white rounded-xl text-sm font-semibold">
          Save
        </button>
        <button onclick={() => { adding = false; newAttempted = false; newCatId = ''; newAmount = ''; }}
                class="py-3 px-4 bg-[var(--color-surface-2)] text-[var(--color-text-muted)] rounded-xl text-sm">
          Cancel
        </button>
      </div>
    </div>
  {/if}

  {#if enriched.length === 0 && !adding}
    <div class="text-center py-16">
      <p class="text-4xl mb-3">🎯</p>
      <p class="text-[var(--color-text-muted)] text-sm">No budgets set</p>
      <p class="text-xs text-[var(--color-text-muted)] mt-1">Set limits to track your spending</p>
    </div>
  {:else}
    <div class="grid md:grid-cols-2 gap-3 pb-28">
      {#each enriched as b, i}
        {@const cat = app.getCategoryById(b.categoryId)}

        <div class="bg-[var(--color-surface)] rounded-2xl p-4 animate-fade-in"
             style="animation-delay: {i * 40}ms; animation-fill-mode: both;">
          <div class="flex items-center gap-3">
            <BudgetRing spent={b.spent} budget={b.amount} size={64} />
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-lg">{cat?.icon ?? '📌'}</span>
                <span class="text-sm font-semibold truncate">{cat?.name ?? 'Unknown'}</span>
                {#if b.pct >= 1}
                  <span class="text-[10px] bg-[var(--color-expense)]/20 text-[var(--color-expense)] px-1.5 py-0.5 rounded-full">Over!</span>
                {:else if b.pct >= 0.9}
                  <span class="text-[10px] bg-[var(--color-warning)]/20 text-[var(--color-warning)] px-1.5 py-0.5 rounded-full">Almost</span>
                {/if}
              </div>

              {#if editingId === b.id}
                <div class="space-y-1">
                  <div class="flex gap-2 items-center">
                    <div class="flex-1">
                      <NumberInput bind:value={editAmount} min={0} max={1000000} step={500}
                                   inputmode="numeric"
                                   invalid={!!(editAttempted && editErrors.amount)} />
                    </div>
                    <button onclick={() => saveEdit(b)} class="p-1.5 text-[var(--color-income)]"><Check size={16}/></button>
                    <button onclick={() => { editingId = null; editAttempted = false; }}
                            class="p-1.5 text-[var(--color-text-muted)]"><X size={16}/></button>
                  </div>
                  {#if editAttempted && editErrors.amount}
                    <p class="text-xs text-[var(--color-expense)] flex items-center gap-1">
                      <AlertCircle size={11} /> {editErrors.amount}
                    </p>
                  {/if}
                </div>
              {:else}
                <p class="text-xs text-[var(--color-text-muted)]">
                  {formatINR(b.spent)}
                  <span style="color:{b.barColor}"> / {formatINR(b.amount)}</span>
                </p>
                <div class="h-1.5 bg-[var(--color-border)] rounded-full mt-2">
                  <div class="h-full rounded-full transition-all duration-500"
                       style="width:{b.pct*100}%; background:{b.barColor}"></div>
                </div>
                {#if b.paceNote}
                  <p class="text-[10px] mt-1.5 font-medium"
                     style="color:{b.pct >= 1 ? 'var(--color-expense)' : b.paceNote.startsWith('Runs') ? 'var(--color-warning)' : 'var(--color-text-muted)'}">
                    {b.paceNote}
                  </p>
                {/if}
              {/if}
            </div>

            {#if editingId !== b.id}
              <div class="flex flex-col gap-1">
                <button onclick={() => { editingId = b.id; editAmount = String(b.amount); editAttempted = false; }}
                        class="p-1.5 text-[var(--color-text-muted)]"><Pencil size={14}/></button>
                <button onclick={() => remove(b.id)}
                        class="p-1.5 text-[var(--color-text-muted)]"><X size={14}/></button>
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
