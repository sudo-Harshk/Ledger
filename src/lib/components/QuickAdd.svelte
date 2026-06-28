<script lang="ts">
  import { X, ChevronDown, ChevronUp, Check, AlertCircle } from '@lucide/svelte';
  import DateChips from '$lib/components/DateChips.svelte';
  import { addTransaction, updateTransaction } from '$lib/db/queries';
  import { app } from '$lib/stores/app.svelte';
  import { toast } from '$lib/stores/toast.svelte';
  import { today } from '$lib/utils';
  import { validateAmount, validateRequired } from '$lib/utils/validate';
  import { fly, fade } from 'svelte/transition';
  import { cubicOut, cubicIn } from 'svelte/easing';
  import type { TransactionType, PaymentMode } from '$lib/db/schema';

  let amount      = $state('');
  let selectedCat = $state('');
  let note        = $state('');
  let paymentMode = $state<PaymentMode>('upi');
  let date        = $state(today());
  let type        = $state<TransactionType>('expense');
  let expanded    = $state(false);
  let saving      = $state(false);
  let saved       = $state(false);
  let attempted   = $state(false);

  const isEditing = $derived(!!app.editingTx);

  const paymentModes: { value: PaymentMode; label: string }[] = [
    { value: 'upi',        label: 'UPI'    },
    { value: 'cash',       label: 'Cash'   },
    { value: 'card',       label: 'Card'   },
    { value: 'netbanking', label: 'Net'    },
  ];

  const errors = $derived({
    amount:   validateAmount(amount, { max: 100_000, label: 'Amount' }),
    category: validateRequired(selectedCat, 'Category'),
  });
  const hasErrors = $derived(Object.values(errors).some(Boolean));

  $effect(() => {
    if (app.showQuickAdd) {
      const tx = app.editingTx;
      if (tx) {
        amount      = String(tx.amount);
        selectedCat = tx.categoryId;
        note        = tx.note ?? '';
        paymentMode = tx.paymentMode;
        date        = tx.date;
        type        = tx.type;
        expanded    = false;
      } else {
        amount = ''; selectedCat = ''; note = '';
        paymentMode = 'upi'; date = today(); type = 'expense';
        expanded = false;
      }
      attempted = false;
      saved     = false;
    }
  });

  function appendDigit(d: string) {
    if (d === '.' && amount.includes('.')) return;
    if (amount.split('.')[1]?.length >= 2) return;
    if (amount === '0' && d !== '.') { amount = d; return; }
    amount += d;
  }
  function backspace() { amount = amount.slice(0, -1); }

  async function save() {
    attempted = true;
    if (hasErrors) return;
    saving = true;
    const num = parseFloat(amount);
    const tx  = app.editingTx;
    if (tx) {
      await updateTransaction(tx.id, { amount: num, categoryId: selectedCat, note, paymentMode, date, type });
    } else {
      await addTransaction({ amount: num, categoryId: selectedCat, note, paymentMode, date, type });
    }
    await Promise.all([app.refreshTransactions(), app.refreshBudgets()]);
    saving = false;
    saved  = true;
    const label = app.editingTx ? 'Transaction updated' : `${type === 'income' ? 'Income' : 'Expense'} saved`;
    setTimeout(() => {
      close();
      toast.show(label);
    }, 500);
  }

  function close() {
    app.showQuickAdd = false;
    app.editingTx   = null;
  }

  const numpad = ['1','2','3','4','5','6','7','8','9','.','0','⌫'];
</script>

{#if app.showQuickAdd}
  <div transition:fade={{ duration: 180 }}
       class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onclick={close} role="presentation"></div>

  <div in:fly={{ y: 420, duration: 280, easing: cubicOut }}
       out:fly={{ y: 420, duration: 220, easing: cubicIn }}
       class="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-50
              bg-[var(--color-surface)] rounded-t-3xl flex flex-col"
       style="max-height: 95dvh;">

    <!-- Scrollable content area -->
    <div class="flex-1 overflow-y-auto overscroll-contain">

      <!-- Handle + Header -->
      <div class="flex items-center justify-between px-5 pt-4 pb-2">
        <div class="w-10 h-1 rounded-full bg-[var(--color-border)] mx-auto absolute left-1/2 -translate-x-1/2 top-3"></div>
        <h2 class="text-base font-semibold mt-2">
          {isEditing ? 'Edit' : 'Add'} {type === 'income' ? 'Income' : 'Expense'}
        </h2>
        <button onclick={close} class="p-1 text-[var(--color-text-muted)]"><X size={20}/></button>
      </div>

      <!-- Type toggle -->
      <div class="flex mx-5 mb-3 bg-[var(--color-surface-2)] rounded-xl p-1">
        {#each (['expense', 'income'] as TransactionType[]) as t}
          <button onclick={() => type = t}
                  class="flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-150
                         {type === t
                           ? t === 'expense'
                             ? 'bg-[var(--color-expense)] text-white shadow'
                             : 'bg-[var(--color-income)] text-white shadow'
                           : 'text-[var(--color-text-muted)]'}">
            {t === 'expense' ? '− Expense' : '+ Income'}
          </button>
        {/each}
      </div>

      <!-- Amount display -->
      <div class="px-5 mb-1">
        <div class="text-center">
          <span class="text-5xl font-bold tracking-tight
                       {attempted && errors.amount ? 'text-[var(--color-expense)]' : 'text-[var(--color-text)]'}">
            ₹{amount || '0'}
          </span>
        </div>
        {#if attempted && errors.amount}
          <p class="text-xs text-[var(--color-expense)] text-center mt-1 flex items-center justify-center gap-1">
            <AlertCircle size={11} /> {errors.amount}
          </p>
        {/if}
      </div>

      <!-- Category grid -->
      <div class="px-5 mb-3 mt-3">
        <div class="flex items-center justify-between mb-2">
          <p class="text-xs text-[var(--color-text-muted)] font-medium uppercase tracking-wide">Category</p>
          {#if attempted && errors.category}
            <p class="text-xs text-[var(--color-expense)] flex items-center gap-1">
              <AlertCircle size={11} /> Pick one
            </p>
          {/if}
        </div>
        <div class="grid grid-cols-4 gap-2
                    {attempted && errors.category ? 'rounded-xl ring-1 ring-[var(--color-expense)] p-1' : ''}">
          {#each app.categories.slice(0, 8) as cat}
            <button onclick={() => selectedCat = cat.id}
                    class="flex flex-col items-center gap-1 p-2 rounded-xl border transition-all duration-100 active:scale-95
                           {selectedCat === cat.id
                             ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                             : 'border-[var(--color-border)] bg-[var(--color-surface-2)]'}">
              <span class="text-xl">{cat.icon}</span>
              <span class="text-[10px] text-center leading-tight text-[var(--color-text-muted)] line-clamp-1">{cat.name}</span>
            </button>
          {/each}
        </div>
        {#if app.categories.length > 8}
          <div class="grid grid-cols-4 gap-2 mt-2">
            {#each app.categories.slice(8) as cat}
              <button onclick={() => selectedCat = cat.id}
                      class="flex flex-col items-center gap-1 p-2 rounded-xl border transition-all duration-100 active:scale-95
                             {selectedCat === cat.id
                               ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                               : 'border-[var(--color-border)] bg-[var(--color-surface-2)]'}">
                <span class="text-xl">{cat.icon}</span>
                <span class="text-[10px] text-center leading-tight text-[var(--color-text-muted)] line-clamp-1">{cat.name}</span>
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Date chips -->
      <div class="px-5 mb-3">
        <DateChips bind:value={date} />
      </div>

      <!-- Note + payment mode: collapsible in add mode, always shown in edit mode -->
      {#if isEditing}
        <div class="px-5 mb-3 space-y-3">
          <input bind:value={note} placeholder="Note (optional)" maxlength={100}
                 class="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl
                        px-4 py-3 text-sm text-[var(--color-text)] placeholder-[var(--color-text-muted)]
                        focus:outline-none focus:border-[var(--color-primary)]" />
          <div class="grid grid-cols-4 gap-2">
            {#each paymentModes as pm}
              <button onclick={() => paymentMode = pm.value}
                      class="py-2 rounded-xl text-xs font-medium border transition-all
                             {paymentMode === pm.value
                               ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                               : 'border-[var(--color-border)] text-[var(--color-text-muted)] bg-[var(--color-surface-2)]'}">
                {pm.label}
              </button>
            {/each}
          </div>
        </div>
      {:else}
        <button onclick={() => expanded = !expanded}
                class="flex items-center gap-1 mx-5 mb-2 text-xs text-[var(--color-text-muted)]">
          {#if expanded}<ChevronUp size={14}/>{:else}<ChevronDown size={14}/>{/if}
          {expanded ? 'Less details' : 'Add note & payment mode'}
        </button>
        {#if expanded}
          <div class="px-5 mb-3 space-y-3 animate-fade-in">
            <input bind:value={note} placeholder="Note (optional)" maxlength={100}
                   class="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl
                          px-4 py-3 text-sm text-[var(--color-text)] placeholder-[var(--color-text-muted)]
                          focus:outline-none focus:border-[var(--color-primary)]" />
            <div class="grid grid-cols-4 gap-2">
              {#each paymentModes as pm}
                <button onclick={() => paymentMode = pm.value}
                        class="py-2 rounded-xl text-xs font-medium border transition-all
                               {paymentMode === pm.value
                                 ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                                 : 'border-[var(--color-border)] text-[var(--color-text-muted)] bg-[var(--color-surface-2)]'}">
                  {pm.label}
                </button>
              {/each}
            </div>
          </div>
        {/if}
      {/if}

      <!-- Numpad -->
      <div class="grid grid-cols-3 gap-1 px-5 mb-3">
        {#each numpad as key}
          <button onclick={() => key === '⌫' ? backspace() : appendDigit(key)}
                  class="py-4 rounded-xl text-lg font-semibold transition-all active:scale-95
                         {key === '⌫'
                           ? 'text-[var(--color-text-muted)] bg-[var(--color-surface-2)]'
                           : 'text-[var(--color-text)] bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)]'}">
            {key}
          </button>
        {/each}
      </div>

    </div><!-- end scrollable -->

    <!-- Sticky save button — always visible at the bottom (Fitts's Law) -->
    <div class="px-5 pt-2 pb-6 bg-[var(--color-surface)] border-t border-[var(--color-border)]/40 shrink-0">
      <button onclick={save} disabled={saving}
              class="w-full py-4 rounded-2xl font-bold text-base transition-all duration-200
                     flex items-center justify-center gap-2
                     {saved
                       ? 'bg-[var(--color-income)] text-white'
                       : 'bg-[var(--color-primary)] text-white active:scale-[0.98]'}">
        {#if saved}
          <Check size={20} class="animate-pop" /> Saved!
        {:else if saving}
          Saving…
        {:else}
          {isEditing ? 'Update' : 'Save'} {type === 'income' ? 'Income' : 'Expense'}
        {/if}
      </button>
    </div>

  </div>
{/if}
