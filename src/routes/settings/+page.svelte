<script lang="ts">
  import { app } from '$lib/stores/app.svelte';
  import { getAllCategories, addCategory, updateCategory, setSetting, getSetting, getTransactions } from '$lib/db/queries';
  import { syncToTurso, pullFromTurso, syncStore, tursoConfigured } from '$lib/db/sync.svelte';
  import { currentMonth } from '$lib/utils';
  import { Plus, RefreshCw, Download, Save, CloudDownload, Wifi, WifiOff, CloudOff } from '@lucide/svelte';
  import type { Category } from '$lib/db/schema';

  let allCats     = $state<Category[]>([]);
  let income      = $state(String(app.monthlyIncome));
  let tursoUrl    = $state('');
  let tursoToken  = $state('');
  let savingIncome = $state(false);
  let savedIncome  = $state(false);
  let addingCat    = $state(false);
  let newCat       = $state({ name: '', icon: '📌', color: '#9B99B8' });
  let savingTurso  = $state(false);
  let savedTurso   = $state(false);
  let pulling      = $state(false);

  $effect(() => { loadAll(); });

  async function loadAll() {
    allCats    = await getAllCategories();
    tursoUrl   = await getSetting('tursoUrl');
    tursoToken = await getSetting('tursoToken');
  }

  async function saveIncome() {
    const val = parseFloat(income);
    if (isNaN(val)) return;
    savingIncome = true;
    await setSetting('monthlyIncome', String(val));
    app.monthlyIncome = val;
    savingIncome = false;
    savedIncome = true;
    setTimeout(() => savedIncome = false, 2000);
  }

  async function saveTurso() {
    savingTurso = true;
    await setSetting('tursoUrl',   tursoUrl);
    await setSetting('tursoToken', tursoToken);
    savingTurso = false;
    savedTurso  = true;
    setTimeout(() => savedTurso = false, 2000);
  }

  async function pullCloud() {
    pulling = true;
    await pullFromTurso();
    await app.refreshAll();
    pulling = false;
  }

  async function addCat() {
    if (!newCat.name) return;
    await addCategory({ ...newCat, sortOrder: allCats.length, isActive: true });
    await loadAll();
    await app.refreshCategories();
    addingCat = false;
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
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `ledger-${currentMonth()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const isConfigured = $derived(!!(tursoUrl && tursoToken));
  const statusColor  = $derived(
    syncStore.status === 'success'      ? 'var(--color-income)'   :
    syncStore.status === 'error'        ? 'var(--color-expense)'  :
    syncStore.status === 'syncing'      ? 'var(--color-primary)'  :
                                          'var(--color-text-muted)'
  );
  const statusLabel = $derived(
    syncStore.status === 'success'      ? 'Connected & synced'   :
    syncStore.status === 'syncing'      ? 'Syncing…'              :
    syncStore.status === 'error'        ? 'Error'                 :
    isConfigured                        ? 'Credentials saved'     :
                                          'Not configured'
  );

  const EMOJI_OPTIONS = ['🏠','🍽️','🛒','🚗','📱','💆','🎬','🛍️','📦','💰','📌','💊','✈️','🎓','⚡','🏋️','🐾','🎮'];
  const COLOR_OPTIONS = ['#6C63FF','#F97316','#22C55E','#3B82F6','#8B5CF6','#EC4899','#EF4444','#F59E0B','#06B6D4','#9B99B8'];
</script>

<div class="px-4 pt-6 pb-28 animate-fade-in space-y-6">
  <h1 class="text-xl font-bold">Settings</h1>

  <!-- Monthly income -->
  <section class="bg-[var(--color-surface)] rounded-2xl p-5">
    <h2 class="text-sm font-semibold mb-3">Monthly Income</h2>
    <div class="flex gap-2">
      <div class="relative flex-1">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-sm">₹</span>
        <input type="number" bind:value={income} placeholder="0"
               class="w-full pl-7 pr-4 py-3 bg-[var(--color-surface-2)] border border-[var(--color-border)]
                      rounded-xl text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]" />
      </div>
      <button onclick={saveIncome}
              class="px-4 py-3 rounded-xl text-sm font-medium transition-colors
                     {savedIncome ? 'bg-[var(--color-income)] text-white' : 'bg-[var(--color-primary)] text-white'}">
        {savedIncome ? '✓ Saved' : 'Save'}
      </button>
    </div>
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
        <input bind:value={newCat.name} placeholder="Category name"
               class="w-full bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-lg
                      px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]" />
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

  <!-- ── Turso Cloud Sync ──────────────────────────────────────────────────── -->
  <section class="bg-[var(--color-surface)] rounded-2xl p-5 space-y-4">

    <!-- Header + status pill -->
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-semibold">Turso Cloud Sync</h2>
      <span class="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-[var(--color-surface-2)]"
            style="color:{statusColor}">
        {#if syncStore.status === 'syncing'}
          <RefreshCw size={10} class="animate-spin" />
        {:else if syncStore.status === 'success'}
          <span class="w-2 h-2 rounded-full bg-[var(--color-income)]"></span>
        {:else if syncStore.status === 'error'}
          <span class="w-2 h-2 rounded-full bg-[var(--color-expense)]"></span>
        {:else}
          <span class="w-2 h-2 rounded-full bg-[var(--color-border)]"></span>
        {/if}
        {statusLabel}
      </span>
    </div>

    <p class="text-xs text-[var(--color-text-muted)] leading-relaxed">
      Connect to <a href="https://turso.tech" target="_blank" rel="noopener"
                    class="text-[var(--color-primary)]">Turso Cloud</a> (free tier available)
      to sync your data across all your devices. Every transaction you add is automatically
      pushed to the cloud in the background.
    </p>

    <!-- Credentials -->
    <div class="space-y-2">
      <input bind:value={tursoUrl} placeholder="libsql://your-db-name.turso.io"
             class="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl
                    px-4 py-3 text-sm text-[var(--color-text)] placeholder-[var(--color-text-muted)]
                    focus:outline-none focus:border-[var(--color-primary)]" />
      <input type="password" bind:value={tursoToken} placeholder="Auth token (eyJ…)"
             class="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl
                    px-4 py-3 text-sm text-[var(--color-text)] placeholder-[var(--color-text-muted)]
                    focus:outline-none focus:border-[var(--color-primary)]" />
    </div>

    <!-- Action buttons -->
    <div class="grid grid-cols-3 gap-2">
      <!-- Save credentials -->
      <button onclick={saveTurso}
              class="flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-medium transition-colors
                     {savedTurso
                       ? 'bg-[var(--color-income)]/20 text-[var(--color-income)]'
                       : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)]'}">
        <Save size={13} />
        {savedTurso ? 'Saved!' : 'Save'}
      </button>

      <!-- Push local → cloud -->
      <button onclick={syncToTurso} disabled={!isConfigured || syncStore.status === 'syncing'}
              class="flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-medium transition-colors
                     {isConfigured
                       ? 'bg-[var(--color-primary)] text-white'
                       : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)] opacity-50 cursor-not-allowed'}">
        <RefreshCw size={13} class={syncStore.status === 'syncing' ? 'animate-spin' : ''} />
        Push
      </button>

      <!-- Pull cloud → local -->
      <button onclick={pullCloud} disabled={!isConfigured || pulling}
              class="flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-medium transition-colors
                     {isConfigured
                       ? 'bg-[var(--color-surface-2)] text-[var(--color-text)]'
                       : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)] opacity-50 cursor-not-allowed'}">
        <CloudDownload size={13} class={pulling ? 'animate-bounce' : ''} />
        Pull
      </button>
    </div>

    <!-- Status messages -->
    {#if syncStore.status === 'success' && syncStore.lastSyncAt}
      <p class="text-xs text-[var(--color-income)]">
        ✓ Synced at {new Date(syncStore.lastSyncAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
      </p>
    {:else if syncStore.status === 'error'}
      <div class="bg-[var(--color-expense)]/10 rounded-xl px-3 py-2">
        <p class="text-xs text-[var(--color-expense)]">⚠ {syncStore.error}</p>
        <p class="text-[10px] text-[var(--color-text-muted)] mt-1">Check your URL and token, then try again.</p>
      </div>
    {:else if !isConfigured}
      <div class="bg-[var(--color-surface-2)] rounded-xl px-3 py-2 space-y-1">
        <p class="text-xs text-[var(--color-text-muted)] font-medium">How to get your credentials:</p>
        <p class="text-[10px] text-[var(--color-text-muted)] font-mono leading-relaxed">
          turso db create ledger<br/>
          turso db show ledger --url<br/>
          turso db tokens create ledger
        </p>
      </div>
    {/if}

    <!-- New device tip -->
    {#if isConfigured}
      <p class="text-[10px] text-[var(--color-text-muted)] leading-relaxed">
        💡 On a new device? Tap <strong>Pull</strong> to restore all your data from the cloud.
        New transactions are pushed automatically.
      </p>
    {/if}
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

  <div class="text-center">
    <p class="text-xs text-[var(--color-text-muted)]">Ledger v1.0 · Built for PG life in Hyderabad 🌊</p>
  </div>
</div>
