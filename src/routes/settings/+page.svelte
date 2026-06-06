<script lang="ts">
  import { app } from '$lib/stores/app.svelte';
  import { getAllCategories, addCategory, updateCategory, setSetting, getSetting, getTransactions, clearAllData } from '$lib/db/queries';
  import { currentMonth } from '$lib/utils';
  import { validateAmount, validateName } from '$lib/utils/validate';
  import { Plus, Download, AlertCircle, Sun, Moon, Trash2 } from '@lucide/svelte';
  import { themeStore } from '$lib/stores/theme.svelte';
  import NumberInput from '$lib/components/NumberInput.svelte';
  import type { Category } from '$lib/db/schema';

  let allCats         = $state<Category[]>([]);
  let income          = $state('');
  let savingIncome    = $state(false);
  let savedIncome     = $state(false);
  let incomeAttempted = $state(false);
  let addingCat       = $state(false);
  let catAttempted    = $state(false);
  let newCat          = $state({ name: '', icon: '📌', color: '#9B99B8' });
  let resetConfirm    = $state(false);
  let resetting       = $state(false);

  $effect(() => { loadAll(); });

  async function loadAll() {
    const [cats, saved] = await Promise.all([
      getAllCategories(),
      getSetting('monthlyIncome'),
    ]);
    allCats = cats;
    const n = parseFloat(saved);
    income  = n > 0 ? String(n) : '';
  }

  // ── Validation ────────────────────────────────────────────────────────────
  const incomeError = $derived((): string | null => {
    if (!incomeAttempted || income === '') return null; // empty = clearing income, that's fine
    const n = parseFloat(income);
    if (isNaN(n) || n < 0) return 'Income must be a positive number';
    if (n > 1_000_000)     return "Income can't exceed ₹10L";
    return null;
  });

  const catNameError = $derived(() => {
    if (!catAttempted) return null;
    const base = validateName(newCat.name, { min: 2, max: 30, label: 'Category name' });
    if (base) return base;
    const dup = allCats.find(c => c.name.toLowerCase() === newCat.name.trim().toLowerCase());
    if (dup) return 'A category with this name already exists';
    return null;
  });

  async function saveIncome() {
    incomeAttempted = true;
    if (incomeError()) return;
    savingIncome = true;
    const val = income === '' ? 0 : parseFloat(income);
    await setSetting('monthlyIncome', String(val));
    app.monthlyIncome = val;
    income = val > 0 ? String(val) : '';
    savingIncome = false;
    savedIncome  = true;
    setTimeout(() => savedIncome = false, 2000);
  }

  async function addCat() {
    catAttempted = true;
    const err = catNameError();
    if (err) return;
    await addCategory({ ...newCat, name: newCat.name.trim(), sortOrder: allCats.length, isActive: true });
    await loadAll();
    await app.refreshCategories();
    addingCat    = false;
    catAttempted = false;
    newCat = { name: '', icon: '📌', color: '#9B99B8' };
  }

  async function toggleCat(cat: Category) {
    await updateCategory(cat.id, { isActive: !cat.isActive });
    await loadAll();
    await app.refreshCategories();
  }

  async function exportCSV() {
    const txs    = await getTransactions();
    const catMap = new Map(allCats.map(c => [c.id, c]));
    const rows   = [['Date','Type','Amount','Category','Note','Payment Mode']];
    for (const t of txs) {
      rows.push([t.date, t.type, String(t.amount),
        catMap.get(t.categoryId)?.name ?? '', t.note ?? '', t.paymentMode]);
    }
    const csv  = rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `ledger-${currentMonth()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function resetAll() {
    resetting = true;
    await clearAllData();
    await app.refreshAll();
    resetting    = false;
    resetConfirm = false;
    income       = '';
  }

  const EMOJI_OPTIONS = ['🏠','🍽️','🛒','🚗','📱','💆','🎬','🛍️','📦','💰','📌','💊','✈️','🎓','⚡','🏋️','🐾','🎮'];
  const COLOR_OPTIONS = ['#6C63FF','#F97316','#22C55E','#3B82F6','#8B5CF6','#EC4899','#EF4444','#F59E0B','#06B6D4','#9B99B8'];
</script>

<div class="px-4 pt-6 pb-28 animate-fade-in space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="text-xl font-bold">Settings</h1>
    <button onclick={() => themeStore.toggle()}
            class="w-9 h-9 rounded-full bg-[var(--color-surface)] flex items-center justify-center transition-colors">
      {#if themeStore.current === 'dark'}
        <Sun size={18} class="text-[var(--color-text-muted)]" />
      {:else}
        <Moon size={18} class="text-[var(--color-text-muted)]" />
      {/if}
    </button>
  </div>

  <!-- Monthly income -->
  <section class="bg-[var(--color-surface)] rounded-2xl p-5">
    <h2 class="text-sm font-semibold mb-3">Monthly Income</h2>
    <div class="flex gap-2">
      <div class="flex-1">
        <NumberInput bind:value={income} min={0} max={1000000} step={1000}
                     placeholder="Not set" inputmode="numeric" invalid={!!incomeError()} />
      </div>
      <button onclick={saveIncome}
              class="px-4 py-3 rounded-xl text-sm font-medium transition-colors shrink-0
                     {savedIncome ? 'bg-[var(--color-income)] text-white' : 'bg-[var(--color-primary)] text-white'}">
        {savedIncome ? '✓ Saved' : 'Save'}
      </button>
    </div>
    {#if incomeError()}
      <p class="text-xs text-[var(--color-expense)] mt-2 flex items-center gap-1">
        <AlertCircle size={11} /> {incomeError()}
      </p>
    {/if}
  </section>

  <!-- Categories -->
  <section class="bg-[var(--color-surface)] rounded-2xl p-5">
    <div class="flex items-center justify-between mb-3">
      <h2 class="text-sm font-semibold">Categories</h2>
      <button onclick={() => addingCat = true}
              class="flex items-center gap-1 text-xs text-[var(--color-primary)]">
        <Plus size={14} /> Add
      </button>
    </div>

    {#if addingCat}
      <div class="bg-[var(--color-surface-2)] rounded-xl p-3 mb-3 space-y-2 animate-fade-in">
        <div>
          <input bind:value={newCat.name} placeholder="Category name" maxlength={30}
                 class="w-full bg-[var(--color-surface-3)] rounded-lg px-3 py-2 text-sm
                        text-[var(--color-text)] focus:outline-none border transition-colors
                        {catAttempted && catNameError()
                          ? 'border-[var(--color-expense)]'
                          : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'}" />
          {#if catAttempted && catNameError()}
            <p class="text-xs text-[var(--color-expense)] mt-1 flex items-center gap-1">
              <AlertCircle size={11} /> {catNameError()}
            </p>
          {/if}
        </div>
        <div class="flex flex-wrap gap-1.5">
          {#each EMOJI_OPTIONS as e}
            <button onclick={() => newCat.icon = e}
                    class="text-xl p-1 rounded-lg {newCat.icon === e ? 'bg-[var(--color-primary)]/20' : ''}">
              {e}
            </button>
          {/each}
        </div>
        <div class="flex flex-wrap gap-1.5">
          {#each COLOR_OPTIONS as c}
            <button onclick={() => newCat.color = c}
                    class="w-6 h-6 rounded-full border-2 transition-all
                           {newCat.color === c ? 'border-white scale-110' : 'border-transparent'}"
                    style="background:{c}" aria-label="Select color {c}"></button>
          {/each}
        </div>
        <div class="flex gap-2">
          <button onclick={addCat}
                  class="flex-1 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium">
            Add
          </button>
          <button onclick={() => { addingCat = false; newCat = { name:'',icon:'📌',color:'#9B99B8' }; }}
                  class="px-3 py-2 bg-[var(--color-surface-3)] text-[var(--color-text-muted)] rounded-lg text-sm">
            Cancel
          </button>
        </div>
      </div>
    {/if}

    <div class="space-y-2">
      {#each allCats as cat}
        <div class="flex items-center gap-3 py-2 {!cat.isActive ? 'opacity-40' : ''}">
          <span class="text-xl w-8 text-center">{cat.icon}</span>
          <span class="flex-1 text-sm">{cat.name}</span>
          <div class="w-3 h-3 rounded-full shrink-0" style="background:{cat.color}"></div>
          <button onclick={() => toggleCat(cat)}
                  class="text-xs px-2 py-1 rounded-lg
                         {cat.isActive
                           ? 'text-[var(--color-text-muted)] bg-[var(--color-surface-2)]'
                           : 'text-[var(--color-income)] bg-[var(--color-income)]/10'}">
            {cat.isActive ? 'Hide' : 'Show'}
          </button>
        </div>
      {/each}
    </div>
  </section>

  <!-- Export -->
  <section class="bg-[var(--color-surface)] rounded-2xl p-5">
    <h2 class="text-sm font-semibold mb-3">Export Data</h2>
    <button onclick={exportCSV}
            class="flex items-center gap-2 w-full py-3 px-4 bg-[var(--color-surface-2)]
                   text-[var(--color-text)] rounded-xl text-sm font-medium">
      <Download size={16} class="text-[var(--color-primary)]" />
      Export all transactions as CSV
    </button>
  </section>

  <!-- Reset -->
  <section class="bg-[var(--color-surface)] rounded-2xl p-5">
    <h2 class="text-sm font-semibold mb-1">Reset All Data</h2>
    <p class="text-xs text-[var(--color-text-muted)] mb-3">
      Permanently deletes all transactions, budgets, EMIs, and settings from this device and cloud. Default categories will be restored.
    </p>
    {#if !resetConfirm}
      <button onclick={() => resetConfirm = true}
              class="flex items-center gap-2 w-full py-3 px-4 bg-[var(--color-expense)]/10
                     text-[var(--color-expense)] rounded-xl text-sm font-medium">
        <Trash2 size={16} />
        Reset All Data
      </button>
    {:else}
      <p class="text-xs text-[var(--color-expense)] font-medium mb-3">
        This cannot be undone. Are you sure?
      </p>
      <div class="flex gap-2">
        <button onclick={resetAll} disabled={resetting}
                class="flex-1 py-3 bg-[var(--color-expense)] text-white rounded-xl text-sm font-medium disabled:opacity-50">
          {resetting ? 'Clearing...' : 'Yes, delete everything'}
        </button>
        <button onclick={() => resetConfirm = false}
                class="px-4 py-3 bg-[var(--color-surface-2)] text-[var(--color-text-muted)] rounded-xl text-sm">
          Cancel
        </button>
      </div>
    {/if}
  </section>

</div>
