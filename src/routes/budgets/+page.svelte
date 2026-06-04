<script lang="ts">
  import { app } from '$lib/stores/app.svelte';
  import { setBudget, deleteBudget } from '$lib/db/queries';
  import BudgetRing from '$lib/components/BudgetRing.svelte';
  import { formatINR, monthLabel } from '$lib/utils';
  import { Plus, Pencil, Check, X } from '@lucide/svelte';

  let editingId = $state<string | null>(null);
  let editAmount = $state('');
  let adding = $state(false);
  let newCatId = $state('');
  let newAmount = $state('');

  function spentFor(categoryId: string) {
    return app.transactions
      .filter(t => t.categoryId === categoryId && t.type === 'expense' && t.date.startsWith(app.monthStr))
      .reduce((s, t) => s + t.amount, 0);
  }

  async function saveEdit(b: { id: string; categoryId: string; month: string }) {
    const amount = parseFloat(editAmount);
    if (!amount || amount <= 0) return;
    await setBudget(b.categoryId, b.month, amount);
    await app.refreshBudgets();
    editingId = null;
  }

  async function saveNew() {
    const amount = parseFloat(newAmount);
    if (!amount || !newCatId) return;
    await setBudget(newCatId, app.monthStr, amount);
    await app.refreshBudgets();
    adding = false;
    newCatId = ''; newAmount = '';
  }

  async function remove(id: string) {
    await deleteBudget(id);
    await app.refreshBudgets();
  }

  const budgetedCatIds = $derived(new Set(app.budgets.map(b => b.categoryId)));
  const unbudgetedCats = $derived(app.categories.filter(c => !budgetedCatIds.has(c.id)));

  const totalBudget = $derived(app.budgets.reduce((s, b) => s + b.amount, 0));
  const totalSpent  = $derived(app.budgets.reduce((s, b) => s + spentFor(b.categoryId), 0));
  const overallPct  = $derived(totalBudget > 0 ? Math.min(totalSpent / totalBudget, 1) : 0);
  const overallColor = $derived(
    overallPct >= 1 ? 'var(--color-expense)' :
    overallPct >= 0.8 ? 'var(--color-warning)' :
    'var(--color-income)'
  );
</script>

<div class="px-4 pt-6 animate-fade-in">
  <div class="flex items-center justify-between mb-5">
    <div>
      <h1 class="text-xl font-bold">Budgets</h1>
      <p class="text-xs text-[var(--color-text-muted)]">{monthLabel(app.monthStr)}</p>
    </div>
    <button onclick={() => adding = true}
            class="flex items-center gap-1.5 bg-[var(--color-primary)]/20 text-[var(--color-primary)]
                   px-3 py-2 rounded-xl text-sm font-medium">
      <Plus size={16} /> Add
    </button>
  </div>

  {#if app.budgets.length > 0}
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

  {#if adding}
    <div class="bg-[var(--color-surface)] rounded-2xl p-4 mb-4 animate-fade-in space-y-3">
      <p class="text-sm font-semibold">New Budget</p>
      <select bind:value={newCatId}
              class="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl
                     px-4 py-3 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]">
        <option value="">Select category</option>
        {#each unbudgetedCats as cat}
          <option value={cat.id}>{cat.icon} {cat.name}</option>
        {/each}
      </select>
      <input type="number" bind:value={newAmount} placeholder="Monthly budget (₹)"
             class="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl
                    px-4 py-3 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]" />
      <div class="flex gap-2">
        <button onclick={saveNew}
                class="flex-1 py-3 bg-[var(--color-primary)] text-white rounded-xl text-sm font-semibold">
          Save
        </button>
        <button onclick={() => { adding = false; newCatId = ''; newAmount = ''; }}
                class="py-3 px-4 bg-[var(--color-surface-2)] text-[var(--color-text-muted)] rounded-xl text-sm">
          Cancel
        </button>
      </div>
    </div>
  {/if}

  {#if app.budgets.length === 0 && !adding}
    <div class="text-center py-16">
      <p class="text-4xl mb-3">🎯</p>
      <p class="text-[var(--color-text-muted)] text-sm">No budgets set</p>
      <p class="text-xs text-[var(--color-text-muted)] mt-1">Set limits to track your spending</p>
    </div>
  {:else}
    <div class="space-y-3 pb-28">
      {#each app.budgets as b}
        {@const cat = app.getCategoryById(b.categoryId)}
        {@const spent = spentFor(b.categoryId)}
        {@const pct = b.amount > 0 ? Math.min(spent / b.amount, 1) : 0}
        {@const barColor = pct >= 1 ? 'var(--color-expense)' : pct >= 0.8 ? 'var(--color-warning)' : 'var(--color-income)'}

        <div class="bg-[var(--color-surface)] rounded-2xl p-4">
          <div class="flex items-center gap-3">
            <BudgetRing {spent} budget={b.amount} size={64} />
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-lg">{cat?.icon ?? '📌'}</span>
                <span class="text-sm font-semibold truncate">{cat?.name ?? 'Unknown'}</span>
                {#if pct >= 1}
                  <span class="text-[10px] bg-[var(--color-expense)]/20 text-[var(--color-expense)] px-1.5 py-0.5 rounded-full">Over!</span>
                {:else if pct >= 0.9}
                  <span class="text-[10px] bg-[var(--color-warning)]/20 text-[var(--color-warning)] px-1.5 py-0.5 rounded-full">Almost</span>
                {/if}
              </div>

              {#if editingId === b.id}
                <div class="flex gap-2 items-center">
                  <input type="number" bind:value={editAmount}
                         class="flex-1 bg-[var(--color-surface-2)] border border-[var(--color-primary)] rounded-lg
                                px-3 py-1.5 text-sm text-[var(--color-text)] focus:outline-none" />
                  <button onclick={() => saveEdit(b)} class="p-1.5 text-[var(--color-income)]"><Check size={16}/></button>
                  <button onclick={() => editingId = null} class="p-1.5 text-[var(--color-text-muted)]"><X size={16}/></button>
                </div>
              {:else}
                <p class="text-xs text-[var(--color-text-muted)]">
                  {formatINR(spent)}
                  <span style="color:{barColor}"> / {formatINR(b.amount)}</span>
                </p>
                <div class="h-1.5 bg-[var(--color-border)] rounded-full mt-2">
                  <div class="h-full rounded-full transition-all duration-500"
                       style="width:{pct*100}%; background:{barColor}"></div>
                </div>
              {/if}
            </div>

            {#if editingId !== b.id}
              <div class="flex flex-col gap-1">
                <button onclick={() => { editingId = b.id; editAmount = String(b.amount); }}
                        class="p-1.5 text-[var(--color-text-muted)]"><Pencil size={14}/></button>
                <button onclick={() => remove(b.id)} class="p-1.5 text-[var(--color-text-muted)]"><X size={14}/></button>
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
