<script lang="ts">
  import { app } from '$lib/stores/app.svelte';
  import { addLend, addRepayment, deleteLend } from '$lib/db/queries';
  import { formatINR, today } from '$lib/utils';
  import { Plus, Trash2, ChevronDown, ChevronUp, Check } from '@lucide/svelte';
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';

  // ── Add lend form ─────────────────────────────────────────────────────────
  let adding        = $state(false);
  let newName       = $state('');
  let newAmount     = $state('');
  let newNote       = $state('');
  let newDate       = $state(today());
  let addAttempted  = $state(false);

  const newErrors = $derived({
    name:   !newName.trim()               ? 'Name is required'   : '',
    amount: !newAmount || +newAmount <= 0 ? 'Enter a valid amount' : '',
  });
  const newHasErrors = $derived(Object.values(newErrors).some(Boolean));

  async function saveLend() {
    addAttempted = true;
    if (newHasErrors) return;
    await addLend({ personName: newName.trim(), amount: +newAmount, date: newDate, note: newNote.trim() || undefined });
    await app.refreshLends();
    adding = false; addAttempted = false;
    newName = ''; newAmount = ''; newNote = ''; newDate = today();
  }

  // ── Repayment form per card ───────────────────────────────────────────────
  let repayingId     = $state<string | null>(null);
  let repayAmount    = $state('');
  let repayDate      = $state(today());
  let repayAttempted = $state(false);

  function openRepay(id: string) {
    repayingId = id; repayAmount = ''; repayDate = today(); repayAttempted = false;
  }

  async function saveRepayment() {
    repayAttempted = true;
    if (!repayAmount || +repayAmount <= 0) return;
    await addRepayment(repayingId!, { amount: +repayAmount, date: repayDate });
    await app.refreshLends();
    repayingId = null;
  }

  async function remove(id: string) {
    await deleteLend(id);
    await app.refreshLends();
  }

  // ── Derived totals ────────────────────────────────────────────────────────
  const totalLent      = $derived(app.lends.reduce((s, l) => s + l.amount, 0));
  const totalRecovered = $derived(app.lends.reduce((s, l) => s + l.repayments.reduce((r, p) => r + p.amount, 0), 0));
  const totalOutstanding = $derived(totalLent - totalRecovered);

  const active   = $derived(app.lends.filter(l => l.repayments.reduce((s, r) => s + r.amount, 0) < l.amount));
  const settled  = $derived(app.lends.filter(l => l.repayments.reduce((s, r) => s + r.amount, 0) >= l.amount));

  let showSettled = $state(false);

  function outstanding(lend: typeof app.lends[0]) {
    return lend.amount - lend.repayments.reduce((s, r) => s + r.amount, 0);
  }

  function fmtDate(d: string) {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
  }
</script>

<div class="px-4 pt-6 pb-32 md:px-8 md:pt-8 animate-fade-in">

  <!-- Header -->
  <div class="flex items-center justify-between mb-5">
    <div>
      <h1 class="text-xl font-bold">Lent Money</h1>
      {#if totalOutstanding > 0}
        <p class="text-xs text-[var(--color-text-muted)] mt-0.5">
          <span class="text-[var(--color-warning)] font-semibold">{formatINR(totalOutstanding)}</span> outstanding
        </p>
      {:else if totalLent > 0}
        <p class="text-xs text-[var(--color-income)] font-medium mt-0.5">All settled up!</p>
      {/if}
    </div>
    <button onclick={() => { adding = true; addAttempted = false; }}
            class="flex items-center gap-1.5 bg-[var(--color-primary)]/20 text-[var(--color-primary)]
                   px-3 py-2 rounded-xl text-sm font-medium">
      <Plus size={16} /> Lend
    </button>
  </div>

  <!-- Summary card -->
  {#if totalLent > 0}
    <div class="bg-[var(--color-surface)] rounded-2xl p-4 mb-5 grid grid-cols-3 gap-2 text-center">
      <div>
        <p class="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide mb-1">Total Lent</p>
        <p class="text-sm font-bold text-[var(--color-text)]">{formatINR(totalLent)}</p>
      </div>
      <div>
        <p class="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide mb-1">Recovered</p>
        <p class="text-sm font-bold text-[var(--color-income)]">{formatINR(totalRecovered)}</p>
      </div>
      <div>
        <p class="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide mb-1">Outstanding</p>
        <p class="text-sm font-bold {totalOutstanding > 0 ? 'text-[var(--color-warning)]' : 'text-[var(--color-income)]'}">
          {formatINR(totalOutstanding)}
        </p>
      </div>
    </div>
  {/if}

  <!-- Add form -->
  {#if adding}
    <div class="bg-[var(--color-surface)] rounded-2xl p-4 mb-4 space-y-3 animate-fade-in">
      <p class="text-sm font-semibold">New Lend</p>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <input bind:value={newName} placeholder="Person's name"
                 class="w-full bg-[var(--color-surface-2)] rounded-xl px-3 py-2.5 text-sm
                        border transition-colors focus:outline-none
                        {addAttempted && newErrors.name
                          ? 'border-[var(--color-expense)]'
                          : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'}" />
          {#if addAttempted && newErrors.name}
            <p class="text-[10px] text-[var(--color-expense)] mt-1">{newErrors.name}</p>
          {/if}
        </div>
        <div>
          <input bind:value={newAmount} type="number" min="0" placeholder="Amount (₹)"
                 class="w-full bg-[var(--color-surface-2)] rounded-xl px-3 py-2.5 text-sm
                        border transition-colors focus:outline-none
                        {addAttempted && newErrors.amount
                          ? 'border-[var(--color-expense)]'
                          : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'}" />
          {#if addAttempted && newErrors.amount}
            <p class="text-[10px] text-[var(--color-expense)] mt-1">{newErrors.amount}</p>
          {/if}
        </div>
      </div>

      <input bind:value={newNote} placeholder="Note (optional, e.g. for dinner)"
             class="w-full bg-[var(--color-surface-2)] rounded-xl px-3 py-2.5 text-sm
                    border border-[var(--color-border)] focus:border-[var(--color-primary)]
                    focus:outline-none transition-colors" />

      <input bind:value={newDate} type="date"
             class="w-full bg-[var(--color-surface-2)] rounded-xl px-3 py-2.5 text-sm
                    border border-[var(--color-border)] focus:border-[var(--color-primary)]
                    focus:outline-none transition-colors text-[var(--color-text)]" />

      <div class="flex gap-2">
        <button onclick={saveLend}
                class="flex-1 py-3 bg-[var(--color-primary)] text-white rounded-xl text-sm font-semibold">
          Save
        </button>
        <button onclick={() => { adding = false; addAttempted = false; }}
                class="py-3 px-4 bg-[var(--color-surface-2)] text-[var(--color-text-muted)] rounded-xl text-sm">
          Cancel
        </button>
      </div>
    </div>
  {/if}

  <!-- Empty state -->
  {#if app.lends.length === 0 && !adding}
    <div class="text-center py-16">
      <p class="text-4xl mb-3">🤝</p>
      <p class="text-[var(--color-text-muted)] text-sm">No lends recorded</p>
      <p class="text-xs text-[var(--color-text-muted)] mt-1">Tap "Lend" to track money you've given out</p>
    </div>
  {/if}

  <!-- Active lends -->
  {#if active.length > 0}
    <div class="space-y-3 mb-4">
      {#each active as lend (lend.id)}
        {@const owed      = outstanding(lend)}
        {@const recovered = lend.amount - owed}
        {@const pct       = lend.amount > 0 ? recovered / lend.amount : 0}

        <div class="bg-[var(--color-surface)] rounded-2xl p-4"
             in:fly={{ y: 8, duration: 180, easing: cubicOut }}>

          <!-- Top row -->
          <div class="flex items-start justify-between gap-2 mb-2">
            <div class="min-w-0">
              <p class="text-sm font-semibold truncate">{lend.personName}</p>
              <p class="text-[10px] text-[var(--color-text-muted)]">{fmtDate(lend.date)}</p>
              {#if lend.note}
                <p class="text-xs text-[var(--color-text-muted)] italic mt-0.5">{lend.note}</p>
              {/if}
            </div>
            <button onclick={() => remove(lend.id)}
                    class="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-expense)] transition-colors shrink-0">
              <Trash2 size={14} />
            </button>
          </div>

          <!-- Amounts -->
          <div class="grid grid-cols-3 gap-2 text-center mb-3">
            <div class="bg-[var(--color-surface-2)] rounded-xl py-2">
              <p class="text-[9px] text-[var(--color-text-muted)] uppercase tracking-wide">Lent</p>
              <p class="text-xs font-bold text-[var(--color-text)]">{formatINR(lend.amount)}</p>
            </div>
            <div class="bg-[var(--color-surface-2)] rounded-xl py-2">
              <p class="text-[9px] text-[var(--color-text-muted)] uppercase tracking-wide">Back</p>
              <p class="text-xs font-bold text-[var(--color-income)]">{formatINR(recovered)}</p>
            </div>
            <div class="bg-[var(--color-surface-2)] rounded-xl py-2">
              <p class="text-[9px] text-[var(--color-text-muted)] uppercase tracking-wide">Owed</p>
              <p class="text-xs font-bold text-[var(--color-warning)]">{formatINR(owed)}</p>
            </div>
          </div>

          <!-- Progress bar -->
          <div class="h-1.5 bg-[var(--color-border)] rounded-full mb-3">
            <div class="h-full rounded-full transition-all duration-500 bg-[var(--color-income)]"
                 style="width:{pct * 100}%"></div>
          </div>

          <!-- Repayments list -->
          {#if lend.repayments.length > 0}
            <div class="space-y-1 mb-3">
              {#each lend.repayments as r}
                <div class="flex items-center justify-between text-xs">
                  <span class="text-[var(--color-text-muted)]">Returned on {fmtDate(r.date)}</span>
                  <span class="font-medium text-[var(--color-income)]">+{formatINR(r.amount)}</span>
                </div>
              {/each}
            </div>
          {/if}

          <!-- Repayment form -->
          {#if repayingId === lend.id}
            <div class="flex gap-2 items-center" in:fly={{ y: 4, duration: 140 }}>
              <input bind:value={repayAmount} type="number" min="0" placeholder="Amount returned (₹)"
                     class="flex-1 bg-[var(--color-surface-2)] rounded-xl px-3 py-2 text-sm
                            border transition-colors focus:outline-none
                            {repayAttempted && (!repayAmount || +repayAmount <= 0)
                              ? 'border-[var(--color-expense)]'
                              : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'}" />
              <input bind:value={repayDate} type="date"
                     class="bg-[var(--color-surface-2)] rounded-xl px-2 py-2 text-xs
                            border border-[var(--color-border)] focus:outline-none text-[var(--color-text)]" />
              <button onclick={saveRepayment}
                      class="p-2 bg-[var(--color-income)]/20 text-[var(--color-income)] rounded-xl">
                <Check size={16} />
              </button>
              <button onclick={() => repayingId = null}
                      class="p-2 bg-[var(--color-surface-2)] text-[var(--color-text-muted)] rounded-xl text-xs">
                ✕
              </button>
            </div>
          {:else}
            <button onclick={() => openRepay(lend.id)}
                    class="w-full py-2 rounded-xl text-xs font-medium
                           bg-[var(--color-income)]/10 text-[var(--color-income)]
                           hover:bg-[var(--color-income)]/20 transition-colors">
              + Mark repayment
            </button>
          {/if}

        </div>
      {/each}
    </div>
  {/if}

  <!-- Settled lends -->
  {#if settled.length > 0}
    <button onclick={() => showSettled = !showSettled}
            class="flex items-center gap-2 text-xs text-[var(--color-text-muted)] mb-3 w-full">
      {#if showSettled}<ChevronUp size={14} />{:else}<ChevronDown size={14} />{/if}
      <span>Settled ({settled.length})</span>
    </button>

    {#if showSettled}
      <div class="space-y-2" in:fly={{ y: 6, duration: 160 }}>
        {#each settled as lend (lend.id)}
          <div class="bg-[var(--color-surface)] rounded-2xl p-4 opacity-60">
            <div class="flex items-center justify-between">
              <div>
                <div class="flex items-center gap-2">
                  <p class="text-sm font-semibold">{lend.personName}</p>
                  <span class="text-[10px] bg-[var(--color-income)]/20 text-[var(--color-income)]
                               px-1.5 py-0.5 rounded-full font-medium">Settled</span>
                </div>
                <p class="text-xs text-[var(--color-text-muted)]">{formatINR(lend.amount)} · {fmtDate(lend.date)}</p>
              </div>
              <button onclick={() => remove(lend.id)}
                      class="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-expense)] transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  {/if}

</div>
