<script lang="ts">
  import { app } from '$lib/stores/app.svelte';
  import { getPgNeeds, addPgNeed, togglePgNeed, deletePgNeed } from '$lib/db/queries';
  import { currentMonth, prevMonth, nextMonth, monthLabel } from '$lib/utils';
  import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Plus, Trash2, Check, AlertCircle } from '@lucide/svelte';
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import type { PgNeed } from '$lib/db/schema';

  let month        = $state(currentMonth());
  let histNeeds    = $state<PgNeed[]>([]);
  let newName      = $state('');
  let addAttempted = $state(false);
  let showBought   = $state(false);
  let inputEl      = $state<HTMLInputElement>();

  const isCurrentMonth = $derived(month === currentMonth());

  // Current month is live from the store; past months are queried on demand
  $effect(() => {
    const m = month;
    if (m === currentMonth()) return;
    getPgNeeds(m).then(list => { histNeeds = list; });
  });

  const needs  = $derived(isCurrentMonth ? app.pgneeds : histNeeds);
  const pending = $derived(needs.filter(n => !n.done));
  const bought  = $derived(needs.filter(n => n.done));
  const pct     = $derived(needs.length > 0 ? bought.length / needs.length : 0);

  const addError = $derived((): string | null => {
    if (!addAttempted) return null;
    const name = newName.trim();
    if (!name) return 'Enter an item name';
    if (needs.some(n => n.name.toLowerCase() === name.toLowerCase())) return 'Already on the list';
    return null;
  });

  async function saveItem() {
    addAttempted = true;
    if (addError()) return;
    await addPgNeed({ name: newName.trim(), month });
    await app.refreshPgNeeds(month);
    newName = ''; addAttempted = false;
    inputEl?.focus();
  }

  async function toggle(id: string) {
    await togglePgNeed(id);
    await app.refreshPgNeeds(month);
  }

  async function remove(id: string) {
    await deletePgNeed(id);
    await app.refreshPgNeeds(month);
  }
</script>

<div class="px-4 pt-6 pb-32 md:px-8 md:pt-8 md:max-w-2xl md:mx-auto animate-fade-in">

  <!-- Header -->
  <div class="flex items-center justify-between mb-5">
    <div>
      <h1 class="text-xl font-bold">PG Needs</h1>
      <p class="text-xs text-[var(--color-text-muted)] mt-0.5">
        {#if needs.length > 0}
          {bought.length} of {needs.length} bought
        {:else}
          Plan what to buy this month
        {/if}
      </p>
    </div>
    <div class="flex items-center gap-2 bg-[var(--color-surface)] rounded-2xl px-2">
      <button onclick={() => month = prevMonth(month)}
              class="p-2 text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]">
        <ChevronLeft size={18} />
      </button>
      <span class="text-sm font-semibold min-w-24 text-center">{monthLabel(month)}</span>
      <button onclick={() => month = nextMonth(month)}
              disabled={month >= currentMonth()}
              class="p-2 text-[var(--color-text-muted)] disabled:opacity-30 transition-colors hover:text-[var(--color-text)]">
        <ChevronRight size={18} />
      </button>
    </div>
  </div>

  <!-- Progress bar -->
  {#if needs.length > 0}
    <div class="bg-[var(--color-surface)] rounded-2xl p-4 mb-4">
      <div class="flex items-center justify-between text-xs mb-2">
        <span class="text-[var(--color-text-muted)] font-medium">Progress</span>
        <span class="font-semibold text-[var(--color-income)]">{Math.round(pct * 100)}%</span>
      </div>
      <div class="h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
        <div class="h-full rounded-full bg-[var(--color-income)] transition-all duration-500"
             style="width:{pct * 100}%"></div>
      </div>
    </div>
  {/if}

  <!-- Add box (current month only) -->
  {#if isCurrentMonth}
    <div class="flex gap-2 mb-3">
      <input bind:value={newName} bind:this={inputEl} placeholder="Add something you need to buy…" maxlength={60}
             class="flex-1 bg-[var(--color-surface)] rounded-xl px-3.5 py-3 text-sm border transition-colors
                    focus:outline-none text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]
                    {addAttempted && addError()
                      ? 'border-[var(--color-expense)]'
                      : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'}"
             onkeydown={(e) => { if (e.key === 'Enter') saveItem(); }} />
      <button onclick={saveItem}
              class="w-11 h-11 rounded-xl bg-[var(--color-primary)] text-white flex items-center justify-center shrink-0
                     transition-transform active:scale-95">
        <Plus size={20} strokeWidth={2.5} />
      </button>
    </div>
    {#if addAttempted && addError()}
      <p class="text-xs text-[var(--color-expense)] mb-3 flex items-center gap-1">
        <AlertCircle size={11} /> {addError()}
      </p>
    {/if}
  {/if}

  <!-- Pending items -->
  {#if pending.length > 0}
    <div class="space-y-2 mb-3">
      {#each pending as need (need.id)}
        <div class="flex items-center gap-3 bg-[var(--color-surface)] rounded-2xl px-4 py-3.5"
             in:fly={{ y: 6, duration: 160, easing: cubicOut }}>
          <button onclick={() => toggle(need.id)} aria-label="Mark bought"
                  class="w-6 h-6 rounded-full border-2 border-[var(--color-border)] shrink-0
                         transition-colors hover:border-[var(--color-income)]"></button>
          <button onclick={() => toggle(need.id)} class="flex-1 text-left min-w-0">
            <span class="text-sm font-medium truncate">{need.name}</span>
          </button>
          <button onclick={() => remove(need.id)} aria-label="Delete"
                  class="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-expense)] transition-colors shrink-0">
            <Trash2 size={14} />
          </button>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Bought items -->
  {#if bought.length > 0}
    <button onclick={() => showBought = !showBought}
            class="flex items-center gap-2 text-xs text-[var(--color-text-muted)] mb-3 w-full">
      {#if showBought}<ChevronUp size={14} />{:else}<ChevronDown size={14} />{/if}
      <span>Bought ({bought.length})</span>
    </button>

    {#if showBought}
      <div class="space-y-2">
        {#each bought as need (need.id)}
          <div class="flex items-center gap-3 bg-[var(--color-surface)] rounded-2xl px-4 py-3.5 opacity-60"
               in:fly={{ y: 6, duration: 160, easing: cubicOut }}>
            <span class="w-6 h-6 rounded-full bg-[var(--color-income)] text-white flex items-center justify-center shrink-0 animate-pop">
              <Check size={13} strokeWidth={3} />
            </span>
            <span class="flex-1 text-sm line-through text-[var(--color-text-muted)] truncate">{need.name}</span>
            <button onclick={() => remove(need.id)} aria-label="Delete"
                    class="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-expense)] transition-colors shrink-0">
              <Trash2 size={14} />
            </button>
          </div>
        {/each}
      </div>
    {/if}
  {/if}

  <!-- Empty states -->
  {#if needs.length === 0}
    <div class="text-center py-16">
      <p class="text-4xl mb-3">🛒</p>
      <p class="text-[var(--color-text-muted)] text-sm">
        {isCurrentMonth ? 'Nothing planned yet' : 'Nothing planned for ' + monthLabel(month)}
      </p>
      {#if isCurrentMonth}
        <p class="text-xs text-[var(--color-text-muted)] mt-1">Add things you need to buy for the PG this month</p>
      {/if}
    </div>
  {/if}

</div>
