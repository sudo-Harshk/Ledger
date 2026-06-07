<script lang="ts">
  import { app } from '$lib/stores/app.svelte';
  import { deleteTransaction, getTransactions } from '$lib/db/queries';
  import { formatINR, formatDate, currentMonth, prevMonth, nextMonth, monthLabel } from '$lib/utils';
  import { Search, Trash2, Pencil, ChevronLeft, ChevronRight } from '@lucide/svelte';
  import type { Transaction } from '$lib/db/schema';

  const APP_START_MONTH = '2026-06';

  let search      = $state('');
  let month       = $state(currentMonth());
  let allForMonth = $state<Transaction[]>([]);
  let loading     = $state(false);

  $effect(() => {
    loading = true;
    getTransactions({ month }).then(txs => { allForMonth = txs; loading = false; });
  });

  const filtered = $derived(
    allForMonth.filter(t => {
      if (!search) return true;
      const cat = app.getCategoryById(t.categoryId);
      return (
        cat?.name.toLowerCase().includes(search.toLowerCase()) ||
        t.note?.toLowerCase().includes(search.toLowerCase()) ||
        String(t.amount).includes(search)
      );
    })
  );

  const grouped = $derived(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of filtered) {
      if (!map.has(t.date)) map.set(t.date, []);
      map.get(t.date)!.push(t);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  });

  async function remove(id: string) {
    await deleteTransaction(id);
    allForMonth = await getTransactions({ month });
    await app.refreshTransactions(month);
  }

  function edit(tx: Transaction) {
    app.editingTx = tx;
    app.showQuickAdd = true;
  }

  const totalExpenses = $derived(allForMonth.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0));
  const totalIncome   = $derived(allForMonth.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0));
</script>

<div class="px-4 pt-6 md:px-8 md:pt-8 animate-fade-in">
  <div class="flex items-center justify-between mb-4">
    <h1 class="text-xl font-bold">Transactions</h1>
  </div>

  <div class="flex items-center justify-between bg-[var(--color-surface)] rounded-2xl p-3 mb-4">
    <button onclick={() => month = prevMonth(month)}
            disabled={month <= APP_START_MONTH}
            class="p-2 text-[var(--color-text-muted)] disabled:opacity-30">
      <ChevronLeft size={20} />
    </button>
    <span class="text-sm font-semibold">{monthLabel(month)}</span>
    <button onclick={() => month = nextMonth(month)}
            disabled={month >= currentMonth()}
            class="p-2 text-[var(--color-text-muted)] disabled:opacity-30">
      <ChevronRight size={20} />
    </button>
  </div>

  <!-- Summary row -->
  <div class="grid grid-cols-2 gap-3 mb-4">
    <div class="bg-[var(--color-surface)] rounded-xl p-3">
      <p class="text-[10px] text-[var(--color-text-muted)] uppercase">Expenses</p>
      <p class="font-bold text-[var(--color-expense)]">{formatINR(totalExpenses)}</p>
    </div>
    <div class="bg-[var(--color-surface)] rounded-xl p-3">
      <p class="text-[10px] text-[var(--color-text-muted)] uppercase">Income</p>
      <p class="font-bold text-[var(--color-income)]">{formatINR(totalIncome)}</p>
    </div>
  </div>

  <!-- Search -->
  <div class="relative mb-4">
    <Search size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
    <input bind:value={search} placeholder="Search transactions…"
           class="w-full pl-9 pr-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)]
                  rounded-xl text-sm text-[var(--color-text)] placeholder-[var(--color-text-muted)]
                  focus:outline-none focus:border-[var(--color-primary)]" />
  </div>

  {#if loading}
    <div class="space-y-3">
      {#each [1,2,3] as _}
        <div class="h-16 bg-[var(--color-surface)] rounded-xl animate-pulse"></div>
      {/each}
    </div>
  {:else if grouped().length === 0}
    <div class="text-center py-16">
      <p class="text-4xl mb-3">📭</p>
      <p class="text-[var(--color-text-muted)]">No transactions found</p>
    </div>
  {:else}
    <div class="space-y-5 pb-28">
      {#each grouped() as [date, txs]}
        <div>
          <div class="flex justify-between items-baseline mb-2">
            <p class="text-xs font-semibold text-[var(--color-text-muted)] uppercase">{formatDate(date)}</p>
            <p class="text-xs text-[var(--color-text-muted)]">
              -{formatINR(txs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0))}
            </p>
          </div>
          <div class="space-y-2">
            {#each txs.sort((a,b) => b.createdAt.localeCompare(a.createdAt)) as tx}
              {@const cat = app.getCategoryById(tx.categoryId)}
              <div class="flex items-center gap-3 bg-[var(--color-surface)] rounded-xl px-4 py-3">
                <div class="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                     style="background:{cat?.color ?? '#9B99B8'}22">
                  {cat?.icon ?? '📌'}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium truncate">{cat?.name ?? 'Unknown'}</p>
                  <p class="text-xs text-[var(--color-text-muted)]">
                    {tx.note || ''}{tx.note ? ' · ' : ''}{tx.paymentMode.toUpperCase()}
                  </p>
                </div>
                <span class="font-bold text-sm shrink-0
                             {tx.type === 'income' ? 'text-[var(--color-income)]' : 'text-[var(--color-expense)]'}">
                  {tx.type === 'income' ? '+' : '-'}{formatINR(tx.amount)}
                </span>
                <div class="flex gap-1 shrink-0 ml-1">
                  <button onclick={() => edit(tx)} class="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">
                    <Pencil size={14} />
                  </button>
                  <button onclick={() => remove(tx.id)} class="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-expense)]">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
