<script lang="ts">
  import { X, Check, AlertCircle, ChevronDown } from '@lucide/svelte';
  import DateChips from '$lib/components/DateChips.svelte';
  import { addTransaction, updateTransaction } from '$lib/db/queries';
  import { app } from '$lib/stores/app.svelte';
  import { toast } from '$lib/stores/toast.svelte';
  import { today } from '$lib/utils';
  import { validateAmount, validateRequired } from '$lib/utils/validate';
  import { fly, fade } from 'svelte/transition';
  import { cubicOut, cubicIn } from 'svelte/easing';
  import type { TransactionType, PaymentMode } from '$lib/db/schema';

  type Panel = 'category' | 'date' | 'details';

  let amount      = $state('');
  let selectedCat = $state('');
  let note        = $state('');
  let paymentMode = $state<PaymentMode>('upi');
  let date        = $state(today());
  let type        = $state<TransactionType>('expense');
  let panel       = $state<Panel>('category');
  let saving      = $state(false);
  let saved       = $state(false);
  let attempted   = $state(false);

  const isEditing = $derived(!!app.editingTx);

  const MODES: { value: PaymentMode; label: string }[] = [
    { value: 'upi',        label: 'UPI'  },
    { value: 'cash',       label: 'Cash' },
    { value: 'card',       label: 'Card' },
    { value: 'netbanking', label: 'Net'  },
  ];
  const NUMPAD = ['1','2','3','4','5','6','7','8','9','.','0','⌫'];

  // ── Pill labels ───────────────────────────────────────────────────────────────

  const catObj      = $derived(app.getCategoryById(selectedCat));
  const catLabel    = $derived(catObj ? `${catObj.icon} ${catObj.name}` : 'Category');

  const dateLabel = $derived.by(() => {
    const t = today();
    if (date === t) return 'Today';
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const ys = `${y.getFullYear()}-${String(y.getMonth()+1).padStart(2,'0')}-${String(y.getDate()).padStart(2,'0')}`;
    if (date === ys) return 'Yesterday';
    return new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  });

  const detailsLabel = $derived.by(() => {
    const pm = MODES.find(m => m.value === paymentMode)?.label ?? 'UPI';
    const n  = note.trim();
    if (!n) return pm;
    const preview = n.length > 12 ? n.slice(0, 12) + '…' : n;
    return `${pm} · ${preview}`;
  });

  // ── Formatted save amount ─────────────────────────────────────────────────────

  const amountValid = $derived(!validateAmount(amount, { max: 100_000 }));
  const amountDisplay = $derived(
    amountValid ? `· ₹${parseFloat(amount).toLocaleString('en-IN')}` : ''
  );

  // ── Validation ────────────────────────────────────────────────────────────────

  const errors = $derived({
    amount:   validateAmount(amount, { max: 100_000, label: 'Amount' }),
    category: validateRequired(selectedCat, 'Category'),
  });
  const hasErrors = $derived(Object.values(errors).some(Boolean));

  // ── Reset on open ─────────────────────────────────────────────────────────────

  $effect(() => {
    if (!app.showQuickAdd) return;
    const tx = app.editingTx;
    if (tx) {
      amount = String(tx.amount); selectedCat = tx.categoryId;
      note = tx.note ?? '';       paymentMode  = tx.paymentMode;
      date = tx.date;             type         = tx.type;
    } else {
      amount = ''; selectedCat = ''; note = '';
      paymentMode = 'upi'; date = today(); type = 'expense';
    }
    panel = 'category'; attempted = false; saved = false; saving = false;
  });

  // ── Numpad ────────────────────────────────────────────────────────────────────

  function digit(d: string) {
    if (saved) return;
    if (d === '.' && amount.includes('.'))           return; // no double dot
    if (amount.split('.')[1]?.length >= 2)           return; // max 2 decimals
    if (amount === '' && d === '.') { amount = '0.'; return; } // leading dot → 0.
    if (amount === '0'  && d !== '.') { amount = d;  return; } // replace leading zero
    if (amount.replace('.','').length >= 8)          return; // cap at 8 significant digits
    amount += d;
  }

  function backspace() { if (!saved) amount = amount.slice(0, -1); }

  // ── Keyboard (desktop) ────────────────────────────────────────────────────────

  function onKeydown(e: KeyboardEvent) {
    if (!app.showQuickAdd) return;
    if (e.key === 'Escape')    { close();     return; }
    if (e.key === 'Enter')     { save();      return; }
    if (e.key === 'Backspace') { backspace(); return; }
    if (/^[0-9.]$/.test(e.key)) digit(e.key);
  }

  // ── Save ──────────────────────────────────────────────────────────────────────

  async function save() {
    attempted = true;
    if (errors.category && !errors.amount) panel = 'category'; // guide user
    if (hasErrors || saving) return;
    saving = true;
    const num = parseFloat(amount);
    const tx  = app.editingTx;
    try {
      if (tx) {
        await updateTransaction(tx.id, { amount: num, categoryId: selectedCat, note: note.trim(), paymentMode, date, type });
      } else {
        await addTransaction({ amount: num, categoryId: selectedCat, note: note.trim(), paymentMode, date, type });
      }
      await Promise.all([app.refreshTransactions(), app.refreshBudgets()]);
      saved = true;
      const label = tx ? 'Transaction updated' : type === 'income' ? 'Income saved' : 'Expense saved';
      setTimeout(() => { close(); toast.show(label); }, 500);
    } catch {
      saving = false;
      toast.show('Could not save — please try again.');
    }
  }

  function close() {
    if (saving && !saved) return; // block close mid-save
    app.showQuickAdd = false;
    app.editingTx   = null;
  }
</script>

<svelte:window onkeydown={onKeydown} />

{#if app.showQuickAdd}

  <!-- Backdrop -->
  <div transition:fade={{ duration: 180 }}
       class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
       onclick={close} role="presentation"></div>

  <!-- Sheet / Modal -->
  <div in:fly={{ y: 480, duration: 300, easing: cubicOut }}
       out:fly={{ y: 480, duration: 220, easing: cubicIn }}
       class="fixed z-50 bg-[var(--color-surface)]
              bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] rounded-t-3xl
              md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:max-w-[660px] md:rounded-3xl md:overflow-hidden
              flex flex-col md:flex-row"
       style="max-height:95dvh">

    <!-- ═══ LEFT COLUMN: amount + numpad + save ════════════════════════════════ -->
    <div class="flex flex-col shrink-0 md:w-[240px] md:border-r md:border-[var(--color-border)]/40">

      <!-- Drag handle (mobile only) -->
      <div class="md:hidden flex justify-center pt-2.5 pb-0 shrink-0">
        <div class="w-10 h-1 rounded-full bg-[var(--color-border)]"></div>
      </div>

      <!-- Top bar -->
      <div class="flex items-center justify-between px-5 pt-3 pb-2 shrink-0">
        <h2 class="text-sm font-semibold text-[var(--color-text-muted)]">
          {isEditing ? 'Edit' : 'Add'} Transaction
        </h2>
        <button onclick={close}
                class="p-1 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
          <X size={18} />
        </button>
      </div>

      <!-- Type toggle (mobile: here; desktop: in right column) -->
      <div class="md:hidden flex mx-4 mb-2 bg-[var(--color-surface-2)] rounded-xl p-1 shrink-0">
        {#each (['expense', 'income'] as TransactionType[]) as t}
          <button onclick={() => type = t}
                  class="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150
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
      <div class="px-5 pb-2 text-center shrink-0">
        <div class="text-5xl font-bold tracking-tight tabular-nums leading-none
                    {attempted && errors.amount ? 'text-[var(--color-expense)]' : 'text-[var(--color-text)]'}">
          ₹{amount || '0'}
        </div>
        {#if attempted && errors.amount}
          <p class="text-xs text-[var(--color-expense)] mt-1.5 flex items-center justify-center gap-1">
            <AlertCircle size={11} />{errors.amount}
          </p>
        {/if}
      </div>

      <!-- Pills (mobile only) -->
      <div class="md:hidden flex gap-1.5 px-4 mb-2 shrink-0">

        <!-- Category pill -->
        <button onclick={() => panel = 'category'}
                class="flex-1 flex items-center justify-between gap-1 px-3 py-2 rounded-xl text-xs font-medium
                       truncate transition-all active:scale-95
                       {panel === 'category'
                         ? 'bg-[var(--color-primary)] text-white'
                         : attempted && errors.category
                           ? 'bg-[var(--color-expense)]/10 text-[var(--color-expense)] ring-1 ring-[var(--color-expense)]'
                           : selectedCat
                             ? 'bg-[var(--color-primary)]/12 text-[var(--color-primary)]'
                             : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)]'}">
          <span class="truncate">{catLabel}</span>
          <ChevronDown size={11} class="shrink-0 opacity-60" />
        </button>

        <!-- Date pill -->
        <button onclick={() => panel = 'date'}
                class="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium
                       transition-all active:scale-95 shrink-0
                       {panel === 'date'
                         ? 'bg-[var(--color-primary)] text-white'
                         : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)]'}">
          {dateLabel}
          <ChevronDown size={11} class="opacity-60" />
        </button>

        <!-- Details pill -->
        <button onclick={() => panel = 'details'}
                class="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium
                       transition-all active:scale-95 shrink-0
                       {panel === 'details'
                         ? 'bg-[var(--color-primary)] text-white'
                         : note.trim()
                           ? 'bg-[var(--color-primary)]/12 text-[var(--color-primary)]'
                           : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)]'}">
          {detailsLabel}
          <ChevronDown size={11} class="opacity-60" />
        </button>

      </div>

      <!-- ── Mobile swap panel ─────────────────────────────────────────────── -->
      <div class="md:hidden h-[178px] overflow-y-auto overscroll-contain px-4 mb-1 shrink-0">

        {#if panel === 'category'}
          {#if app.categories.length === 0}
            <div class="flex flex-col items-center justify-center h-full gap-2 text-center">
              <p class="text-sm text-[var(--color-text-muted)]">No categories yet.</p>
              <a href="/categories" onclick={close}
                 class="text-xs text-[var(--color-primary)] underline underline-offset-2">
                Add in Settings
              </a>
            </div>
          {:else}
            <div class="grid grid-cols-4 gap-2 pb-1">
              {#each app.categories as cat (cat.id)}
                <button onclick={() => selectedCat = cat.id}
                        class="flex flex-col items-center gap-1 p-2 rounded-xl border transition-all active:scale-95
                               {selectedCat === cat.id
                                 ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                                 : 'border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-muted)]'}">
                  <span class="text-xl leading-none">{cat.icon}</span>
                  <span class="text-[9px] leading-tight line-clamp-1 text-center">{cat.name}</span>
                </button>
              {/each}
            </div>
          {/if}

        {:else if panel === 'date'}
          <div class="pt-2">
            <DateChips bind:value={date} />
          </div>

        {:else}
          <!-- Details: payment mode + note -->
          <div class="pt-2 space-y-3">
            <div class="grid grid-cols-4 gap-2">
              {#each MODES as m}
                <button onclick={() => paymentMode = m.value}
                        class="py-2.5 rounded-xl text-xs font-medium border transition-all active:scale-95
                               {paymentMode === m.value
                                 ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                                 : 'border-[var(--color-border)] text-[var(--color-text-muted)] bg-[var(--color-surface-2)]'}">
                  {m.label}
                </button>
              {/each}
            </div>
            <div class="relative">
              <input bind:value={note} placeholder="Note (optional)" maxlength={100}
                     class="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl
                            px-3 py-2.5 text-sm text-[var(--color-text)] placeholder-[var(--color-text-muted)]
                            focus:outline-none focus:border-[var(--color-primary)]
                            {note.length > 80 ? 'pr-10' : ''}" />
              {#if note.length > 80}
                <span class="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-text-muted)]
                             pointer-events-none">
                  {100 - note.length}
                </span>
              {/if}
            </div>
          </div>
        {/if}

      </div>

      <!-- Numpad -->
      <div class="grid grid-cols-3 gap-1.5 px-4 mb-2 shrink-0">
        {#each NUMPAD as key}
          <button onclick={() => key === '⌫' ? backspace() : digit(key)}
                  class="py-3.5 rounded-xl text-lg font-semibold select-none
                         transition-all duration-75 active:scale-95 active:brightness-90
                         {key === '⌫'
                           ? 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)]'
                           : 'bg-[var(--color-surface-2)] text-[var(--color-text)]'}">
            {key}
          </button>
        {/each}
      </div>

      <!-- Save -->
      <div class="px-4 pb-6 md:pb-4 shrink-0">
        <button onclick={save} disabled={saving}
                class="w-full py-4 rounded-2xl font-bold text-sm transition-all duration-200
                       flex items-center justify-center gap-1.5 disabled:opacity-60
                       {saved
                         ? 'bg-[var(--color-income)] text-white'
                         : 'bg-[var(--color-primary)] text-white active:scale-[0.98]'}">
          {#if saved}
            <Check size={18} /> Saved!
          {:else if saving}
            Saving…
          {:else}
            <span>{isEditing ? 'Update' : type === 'income' ? 'Save Income' : 'Save Expense'}</span>
            {#if amountDisplay}
              <span class="opacity-60 font-normal text-xs">{amountDisplay}</span>
            {/if}
          {/if}
        </button>
      </div>

    </div><!-- end left column -->


    <!-- ═══ RIGHT COLUMN: desktop panels (hidden on mobile) ═══════════════════ -->
    <div class="hidden md:flex flex-col flex-1 min-w-0 overflow-hidden">

      <!-- Type toggle -->
      <div class="px-5 pt-4 pb-3 border-b border-[var(--color-border)]/40 shrink-0">
        <div class="flex bg-[var(--color-surface-2)] rounded-xl p-1">
          {#each (['expense', 'income'] as TransactionType[]) as t}
            <button onclick={() => type = t}
                    class="flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-150
                           {type === t
                             ? t === 'expense'
                               ? 'bg-[var(--color-expense)] text-white shadow'
                               : 'bg-[var(--color-income)] text-white shadow'
                             : 'text-[var(--color-text-muted)]'}">
              {t === 'expense' ? '− Expense' : '+ Income'}
            </button>
          {/each}
        </div>
      </div>

      <!-- Scrollable panels -->
      <div class="flex-1 overflow-y-auto px-5 py-4 space-y-5">

        <!-- Category -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <p class="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Category
            </p>
            {#if attempted && errors.category}
              <p class="text-xs text-[var(--color-expense)] flex items-center gap-1">
                <AlertCircle size={10} /> Required
              </p>
            {/if}
          </div>
          {#if app.categories.length === 0}
            <p class="text-sm text-[var(--color-text-muted)]">
              No categories.
              <a href="/categories" onclick={close}
                 class="text-[var(--color-primary)] underline underline-offset-2">Add one</a>
            </p>
          {:else}
            <div class="grid grid-cols-5 gap-2">
              {#each app.categories as cat (cat.id)}
                <button onclick={() => selectedCat = cat.id}
                        class="flex flex-col items-center gap-1 p-2 rounded-xl border transition-all active:scale-95
                               {selectedCat === cat.id
                                 ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                                 : 'border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-muted)]'}">
                  <span class="text-lg leading-none">{cat.icon}</span>
                  <span class="text-[9px] leading-tight line-clamp-1 text-center">{cat.name}</span>
                </button>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Date -->
        <div>
          <p class="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">Date</p>
          <DateChips bind:value={date} />
        </div>

        <!-- Payment + Note -->
        <div>
          <p class="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
            Payment &amp; Note
          </p>
          <div class="grid grid-cols-4 gap-2 mb-3">
            {#each MODES as m}
              <button onclick={() => paymentMode = m.value}
                      class="py-2.5 rounded-xl text-xs font-medium border transition-all active:scale-95
                             {paymentMode === m.value
                               ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                               : 'border-[var(--color-border)] text-[var(--color-text-muted)] bg-[var(--color-surface-2)]'}">
                {m.label}
              </button>
            {/each}
          </div>
          <div class="relative">
            <input bind:value={note} placeholder="Note (optional)" maxlength={100}
                   class="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl
                          px-3 py-2.5 text-sm text-[var(--color-text)] placeholder-[var(--color-text-muted)]
                          focus:outline-none focus:border-[var(--color-primary)]
                          {note.length > 80 ? 'pr-10' : ''}" />
            {#if note.length > 80}
              <span class="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-text-muted)]
                           pointer-events-none">
                {100 - note.length}
              </span>
            {/if}
          </div>
        </div>

      </div>
    </div><!-- end right column -->

  </div>
{/if}
