<script lang="ts">
  import { app } from '$lib/stores/app.svelte';
  import { setSetting, getSetting, getTransactions, getAllCategories, clearAllData } from '$lib/db/queries';
  import { currentMonth } from '$lib/utils';
  import { validateAmount } from '$lib/utils/validate';
  import { Download, AlertCircle, Sun, Moon, Trash2, Tag, ChevronRight, Wallet, Bell } from '@lucide/svelte';
  import { onMount } from 'svelte';
  import { themeStore } from '$lib/stores/theme.svelte';
  import NumberInput from '$lib/components/NumberInput.svelte';

  let income          = $state('');
  let savingIncome    = $state(false);
  let savedIncome     = $state(false);
  let incomeAttempted = $state(false);
  let resetConfirm    = $state(false);
  let resetting       = $state(false);
  let editingIncome   = $state(false);

  // Dashboard banner toggles (default: both enabled)
  let monthEndEnabled  = $state(true);
  let newMonthEnabled  = $state(true);

  onMount(async () => {
    const [me, nm] = await Promise.all([
      getSetting('banner_month_end'),
      getSetting('banner_new_month'),
    ]);
    if (me === 'false') monthEndEnabled = false;
    if (nm === 'false') newMonthEnabled = false;
  });

  async function toggleBanner(key: string, current: boolean): Promise<boolean> {
    const next = !current;
    await setSetting(key, String(next));
    return next;
  }

  $effect(() => { loadIncome(); });

  async function loadIncome() {
    const saved = await getSetting('monthlyIncome');
    const n = parseFloat(saved);
    income = n > 0 ? String(n) : '';
  }

  const incomeError = $derived((): string | null => {
    if (!incomeAttempted || income === '') return null;
    const n = parseFloat(income);
    if (isNaN(n) || n < 0) return 'Income must be a positive number';
    if (n > 1_000_000)     return "Income can't exceed ₹10L";
    return null;
  });

  async function saveIncome() {
    incomeAttempted = true;
    if (incomeError()) return;
    savingIncome = true;
    const val = income === '' ? 0 : parseFloat(income);
    await setSetting('monthlyIncome', String(val));
    app.monthlyIncome = val;
    income       = val > 0 ? String(val) : '';
    savingIncome = false;
    savedIncome  = true;
    editingIncome = false;
    setTimeout(() => savedIncome = false, 2000);
  }

  async function exportCSV() {
    const [txs, allCats] = await Promise.all([getTransactions(), getAllCategories()]);
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
    document.body.appendChild(a); a.click();
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

  import { formatINR } from '$lib/utils';
</script>

<div class="px-4 pt-6 pb-28 md:px-8 md:pt-8 md:max-w-2xl md:mx-auto animate-fade-in space-y-5">

  <!-- Header -->
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
  <section class="bg-[var(--color-surface)] rounded-2xl overflow-hidden">
    <button onclick={() => editingIncome = !editingIncome}
            class="w-full flex items-center gap-3 px-5 py-4 text-left">
      <div class="w-9 h-9 rounded-xl bg-[var(--color-income)]/15 flex items-center justify-center shrink-0">
        <Wallet size={17} class="text-[var(--color-income)]" />
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold">Monthly Income</p>
        <p class="text-xs text-[var(--color-text-muted)] mt-0.5">
          {app.monthlyIncome > 0 ? formatINR(app.monthlyIncome) : 'Not set'}
        </p>
      </div>
      <ChevronRight size={16} class="text-[var(--color-text-muted)] transition-transform duration-200
                                     {editingIncome ? 'rotate-90' : ''}" />
    </button>

    {#if editingIncome}
      <div class="px-5 pb-4 space-y-2 border-t border-[var(--color-border)]/50">
        <div class="flex gap-2 pt-3">
          <div class="flex-1">
            <NumberInput bind:value={income} min={0} max={1000000} step={1000}
                         placeholder="Enter monthly income" inputmode="numeric"
                         invalid={!!incomeError()} />
          </div>
          <button onclick={saveIncome} disabled={savingIncome}
                  class="px-4 py-3 rounded-xl text-sm font-medium transition-colors shrink-0 disabled:opacity-50
                         {savedIncome ? 'bg-[var(--color-income)] text-white' : 'bg-[var(--color-primary)] text-white'}">
            {savedIncome ? '✓ Saved' : 'Save'}
          </button>
        </div>
        {#if incomeError()}
          <p class="text-xs text-[var(--color-expense)] flex items-center gap-1">
            <AlertCircle size={11} /> {incomeError()}
          </p>
        {/if}
      </div>
    {/if}
  </section>

  <!-- Quick nav rows -->
  <section class="bg-[var(--color-surface)] rounded-2xl overflow-hidden divide-y divide-[var(--color-border)]/40">
    <a href="/categories" class="flex items-center gap-3 px-5 py-4">
      <div class="w-9 h-9 rounded-xl bg-[var(--color-primary)]/15 flex items-center justify-center shrink-0">
        <Tag size={17} class="text-[var(--color-primary)]" />
      </div>
      <div class="flex-1">
        <p class="text-sm font-semibold">Categories</p>
        <p class="text-xs text-[var(--color-text-muted)] mt-0.5">{app.categories.length} active</p>
      </div>
      <ChevronRight size={16} class="text-[var(--color-text-muted)]" />
    </a>
  </section>

  <!-- Dashboard banners -->
  <section class="bg-[var(--color-surface)] rounded-2xl overflow-hidden divide-y divide-[var(--color-border)]/40">

    <!-- Section header row (non-interactive) -->
    <div class="flex items-center gap-3 px-5 py-4">
      <div class="w-9 h-9 rounded-xl bg-[var(--color-warning)]/15 flex items-center justify-center shrink-0">
        <Bell size={17} style="color:var(--color-warning)" />
      </div>
      <div class="flex-1">
        <p class="text-sm font-semibold">Dashboard Banners</p>
        <p class="text-xs text-[var(--color-text-muted)] mt-0.5">Control contextual cards on the home screen</p>
      </div>
    </div>

    <!-- Month-end nudge toggle -->
    <div class="flex items-center gap-3 px-5 py-3.5">
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium">Month-end nudge</p>
        <p class="text-xs text-[var(--color-text-muted)] mt-0.5">Amber highlight in the last 3 days of the month</p>
      </div>
      <button
        onclick={async () => { monthEndEnabled = await toggleBanner('banner_month_end', monthEndEnabled); }}
        class="relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0
               {monthEndEnabled ? 'bg-[var(--color-income)]' : 'bg-[var(--color-border)]'}"
        aria-label="Toggle month-end nudge"
        role="switch" aria-checked={monthEndEnabled}>
        <span class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm
                     transition-transform duration-200
                     {monthEndEnabled ? 'translate-x-5' : 'translate-x-0'}"></span>
      </button>
    </div>

    <!-- New month welcome toggle -->
    <div class="flex items-center gap-3 px-5 py-3.5">
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium">New month welcome</p>
        <p class="text-xs text-[var(--color-text-muted)] mt-0.5">Previous month recap on the first 3 days</p>
      </div>
      <button
        onclick={async () => { newMonthEnabled = await toggleBanner('banner_new_month', newMonthEnabled); }}
        class="relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0
               {newMonthEnabled ? 'bg-[var(--color-income)]' : 'bg-[var(--color-border)]'}"
        aria-label="Toggle new month welcome"
        role="switch" aria-checked={newMonthEnabled}>
        <span class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm
                     transition-transform duration-200
                     {newMonthEnabled ? 'translate-x-5' : 'translate-x-0'}"></span>
      </button>
    </div>

  </section>

  <!-- Export -->
  <section class="bg-[var(--color-surface)] rounded-2xl overflow-hidden">
    <button onclick={exportCSV} class="w-full flex items-center gap-3 px-5 py-4 text-left">
      <div class="w-9 h-9 rounded-xl bg-[var(--color-primary)]/15 flex items-center justify-center shrink-0">
        <Download size={17} class="text-[var(--color-primary)]" />
      </div>
      <div class="flex-1">
        <p class="text-sm font-semibold">Export as CSV</p>
        <p class="text-xs text-[var(--color-text-muted)] mt-0.5">Download all transactions</p>
      </div>
      <ChevronRight size={16} class="text-[var(--color-text-muted)]" />
    </button>
  </section>

  <!-- Reset -->
  <section class="bg-[var(--color-surface)] rounded-2xl overflow-hidden">
    {#if !resetConfirm}
      <button onclick={() => resetConfirm = true}
              class="w-full flex items-center gap-3 px-5 py-4 text-left">
        <div class="w-9 h-9 rounded-xl bg-[var(--color-expense)]/15 flex items-center justify-center shrink-0">
          <Trash2 size={17} class="text-[var(--color-expense)]" />
        </div>
        <div class="flex-1">
          <p class="text-sm font-semibold text-[var(--color-expense)]">Reset All Data</p>
          <p class="text-xs text-[var(--color-text-muted)] mt-0.5">Delete everything and start fresh</p>
        </div>
        <ChevronRight size={16} class="text-[var(--color-text-muted)]" />
      </button>
    {:else}
      <div class="px-5 py-4 space-y-3">
        <p class="text-sm font-semibold text-[var(--color-expense)]">Are you sure?</p>
        <p class="text-xs text-[var(--color-text-muted)]">
          This permanently deletes all transactions, budgets, EMIs, lends, and settings. Default categories will be restored.
        </p>
        <div class="flex gap-2">
          <button onclick={resetAll} disabled={resetting}
                  class="flex-1 py-3 bg-[var(--color-expense)] text-white rounded-xl text-sm font-semibold disabled:opacity-50">
            {resetting ? 'Clearing...' : 'Yes, delete everything'}
          </button>
          <button onclick={() => resetConfirm = false}
                  class="px-4 py-3 bg-[var(--color-surface-2)] text-[var(--color-text-muted)] rounded-xl text-sm">
            Cancel
          </button>
        </div>
      </div>
    {/if}
  </section>

</div>
