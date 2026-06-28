<script lang="ts">
  import { X, Check, AlertCircle } from '@lucide/svelte';
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

  // ── Form state ────────────────────────────────────────────────────────────────
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

  // ── Swipe-to-close ────────────────────────────────────────────────────────────
  let dragY     = $state(0);
  let dragging  = $state(false);
  let dragStart = 0;

  function onHandleTouchStart(e: TouchEvent) {
    dragStart = e.touches[0].clientY;
    dragging  = true;
  }
  function onHandleTouchMove(e: TouchEvent) {
    if (!dragging) return;
    const dy = e.touches[0].clientY - dragStart;
    if (dy > 0) { dragY = dy; e.preventDefault(); }
  }
  function onHandleTouchEnd() {
    dragging = false;
    if (dragY > 120) { dragY = 0; close(); }
    else             { dragY = 0; }
  }

  // ── Derived ───────────────────────────────────────────────────────────────────
  const isEditing = $derived(!!app.editingTx);
  const catObj    = $derived(app.getCategoryById(selectedCat));
  const catLabel  = $derived(catObj ? `${catObj.icon} ${catObj.name}` : 'Category');

  const dateLabel = $derived.by(() => {
    const t = today();
    if (date === t) return 'Today';
    const y = new Date(); y.setDate(y.getDate() - 1);
    const ys = `${y.getFullYear()}-${String(y.getMonth()+1).padStart(2,'0')}-${String(y.getDate()).padStart(2,'0')}`;
    if (date === ys) return 'Yesterday';
    return new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  });

  const detailsLabel = $derived.by(() => {
    const pm = MODES.find(m => m.value === paymentMode)?.label ?? 'UPI';
    const n  = note.trim();
    return n ? `${pm} · ${n.length > 10 ? n.slice(0, 10) + '…' : n}` : pm;
  });

  const selectedDateFull = $derived(
    new Date(date + 'T00:00:00').toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long'
    })
  );

  const amountValid   = $derived(!validateAmount(amount, { max: 100_000 }));
  const amountSuffix  = $derived(amountValid ? `· ₹${parseFloat(amount).toLocaleString('en-IN')}` : '');

  const errors    = $derived({ amount: validateAmount(amount, { max: 100_000 }), category: validateRequired(selectedCat, 'Category') });
  const hasErrors = $derived(Object.values(errors).some(Boolean));

  // ── Constants ─────────────────────────────────────────────────────────────────
  const MODES: { value: PaymentMode; label: string }[] = [
    { value: 'upi', label: 'UPI' }, { value: 'cash', label: 'Cash' },
    { value: 'card', label: 'Card' }, { value: 'netbanking', label: 'Net' },
  ];
  const NUMPAD = ['1','2','3','4','5','6','7','8','9','.','0','⌫'];

  // ── Reset on open ─────────────────────────────────────────────────────────────
  $effect(() => {
    if (!app.showQuickAdd) return;
    const tx = app.editingTx;
    if (tx) {
      amount = String(tx.amount); selectedCat = tx.categoryId;
      note = tx.note ?? '';       paymentMode = tx.paymentMode;
      date = tx.date;             type = tx.type;
    } else {
      amount = ''; selectedCat = ''; note = '';
      paymentMode = 'upi'; date = today(); type = 'expense';
    }
    panel = 'category'; attempted = false; saved = false; saving = false;
  });

  // ── Numpad ────────────────────────────────────────────────────────────────────
  function digit(d: string) {
    if (saved) return;
    if (d === '.' && amount.includes('.'))          return;
    if (amount.split('.')[1]?.length >= 2)          return;
    if (amount === '' && d === '.') { amount = '0.'; return; }
    if (amount === '0' && d !== '.') { amount = d;   return; }
    if (amount.replace('.', '').length >= 8)        return;
    amount += d;
  }
  function backspace() { if (!saved) amount = amount.slice(0, -1); }

  // ── Keyboard ──────────────────────────────────────────────────────────────────
  function onKeydown(e: KeyboardEvent) {
    if (!app.showQuickAdd) return;
    if (e.key === 'Escape')    { close(); return; }
    if (e.key === 'Enter')     { save();  return; }
    if (e.key === 'Backspace') { backspace(); return; }
    if (/^[0-9.]$/.test(e.key)) digit(e.key);
  }

  // ── Save ──────────────────────────────────────────────────────────────────────
  async function save() {
    attempted = true;
    if (errors.category && !errors.amount) panel = 'category';
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
      setTimeout(() => {
        close();
        toast.show(tx ? 'Transaction updated' : type === 'income' ? 'Income saved' : 'Expense saved');
      }, 500);
    } catch {
      saving = false;
      toast.show('Could not save — please try again.');
    }
  }

  function close() {
    if (saving && !saved) return;
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

<!--
  Outer: fly transition for mount/unmount.
  Uses left-0 right-0 mx-auto (no transform) for centering → no conflict with fly's transform.
-->
<div in:fly={{ y: 520, duration: 300, easing: cubicOut }}
     out:fly={{ y: 520, duration: 220, easing: cubicIn }}
     class="fixed left-0 right-0 bottom-0 mx-auto w-full max-w-[480px] z-50
            md:bottom-auto md:top-[6vh] md:max-w-[700px]">

  <!--
    Inner: handles drag translation separately from fly (no conflict).
    On desktop this becomes the visible modal card with two columns.
  -->
  <div class="bg-[var(--color-surface)] rounded-t-3xl md:rounded-3xl overflow-hidden
              flex flex-col md:flex-col"
       style="max-height:95dvh;
              transform:translateY({Math.max(0, dragY)}px);
              transition:transform {dragging ? '0ms' : '300ms'} cubic-bezier(0.34,1.56,0.64,1)">

    <!-- ── Drag handle (mobile only) ────────────────────────────────────────── -->
    <div class="md:hidden pt-2.5 pb-1 touch-none cursor-grab"
         ontouchstart={onHandleTouchStart}
         ontouchmove={onHandleTouchMove}
         ontouchend={onHandleTouchEnd}
         role="button" aria-label="Drag to close" tabindex="-1">
      <div class="w-10 h-1 rounded-full bg-[var(--color-border)] mx-auto pointer-events-none"></div>
    </div>

    <!-- ── Header: type toggle + close ──────────────────────────────────────── -->
    <div class="flex items-center gap-2 px-4 pt-1 pb-3 md:pt-4 md:pb-4
                md:border-b md:border-[var(--color-border)]/40 shrink-0">
      <div class="flex flex-1 bg-[var(--color-surface-2)] rounded-xl p-1">
        {#each (['expense', 'income'] as TransactionType[]) as t}
          <button onclick={() => type = t}
                  class="flex-1 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-semibold
                         transition-all duration-150
                         {type === t
                           ? t === 'expense'
                             ? 'bg-[var(--color-expense)] text-white shadow'
                             : 'bg-[var(--color-income)] text-white shadow'
                           : 'text-[var(--color-text-muted)]'}">
            {t === 'expense' ? '− Expense' : '+ Income'}
          </button>
        {/each}
      </div>
      <button onclick={close}
              class="w-8 h-8 rounded-xl bg-[var(--color-surface-2)] flex items-center justify-center
                     text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors shrink-0">
        <X size={15} />
      </button>
    </div>

    <!-- ── Body: flex-col on mobile, flex-row on desktop ────────────────────── -->
    <div class="flex flex-col md:flex-row flex-1 min-h-0">

      <!-- LEFT: full width on mobile / 240px on desktop -->
      <div class="flex flex-col md:w-[240px] md:shrink-0
                  md:border-r md:border-[var(--color-border)]/40
                  flex-1 min-h-0 md:flex-none">

        <!-- Amount -->
        <div class="px-5 pt-2 pb-2 text-center shrink-0">
          <div class="text-[52px] md:text-6xl font-bold tracking-tight tabular-nums leading-none
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
        <div class="md:hidden flex gap-1.5 px-4 pb-2 shrink-0">
          <button onclick={() => panel = 'category'}
                  class="flex-1 py-2 px-3 rounded-xl text-xs font-semibold truncate transition-all active:scale-95
                         {panel === 'category'
                           ? 'bg-[var(--color-primary)] text-white'
                           : attempted && errors.category
                             ? 'bg-[var(--color-expense)]/10 text-[var(--color-expense)] ring-1 ring-[var(--color-expense)]'
                             : selectedCat
                               ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                               : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)]'}">
            {catLabel}
          </button>
          <button onclick={() => panel = 'date'}
                  class="py-2 px-3 rounded-xl text-xs font-semibold shrink-0 transition-all active:scale-95
                         {panel === 'date'
                           ? 'bg-[var(--color-primary)] text-white'
                           : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)]'}">
            {dateLabel}
          </button>
          <button onclick={() => panel = 'details'}
                  class="py-2 px-3 rounded-xl text-xs font-semibold shrink-0 transition-all active:scale-95
                         {panel === 'details'
                           ? 'bg-[var(--color-primary)] text-white'
                           : note.trim()
                             ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                             : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)]'}">
            {detailsLabel}
          </button>
        </div>

        <!-- Swap panel (mobile only, flex-1 fills remaining height) -->
        <div class="md:hidden flex-1 overflow-y-auto overscroll-contain px-4 min-h-0">

          {#if panel === 'category'}
            {#if app.categories.length === 0}
              <div class="h-full flex flex-col items-center justify-center gap-2 text-center">
                <p class="text-sm text-[var(--color-text-muted)]">No categories yet.</p>
                <a href="/categories" onclick={close}
                   class="text-xs text-[var(--color-primary)] underline underline-offset-2">
                  Add in Settings
                </a>
              </div>
            {:else}
              <div class="grid grid-cols-4 gap-2 py-1">
                {#each app.categories as cat (cat.id)}
                  <button onclick={() => selectedCat = cat.id}
                          class="flex flex-col items-center gap-1 p-2 rounded-xl border
                                 transition-all active:scale-95
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
            <div class="py-2 space-y-4">
              <DateChips bind:value={date} />
              <!-- Selected date display fills remaining space -->
              <div class="bg-[var(--color-surface-2)] rounded-2xl px-4 py-5 text-center">
                <p class="text-4xl font-bold text-[var(--color-text)] leading-none mb-1">
                  {new Date(date + 'T00:00:00').getDate()}
                </p>
                <p class="text-sm text-[var(--color-text-muted)]">{selectedDateFull}</p>
              </div>
            </div>

          {:else}
            <div class="py-2 space-y-3">
              <div class="grid grid-cols-4 gap-2">
                {#each MODES as m}
                  <button onclick={() => paymentMode = m.value}
                          class="py-3 rounded-xl text-xs font-semibold border transition-all active:scale-95
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
                              px-3 py-3 text-sm text-[var(--color-text)] placeholder-[var(--color-text-muted)]
                              focus:outline-none focus:border-[var(--color-primary)]
                              {note.length > 80 ? 'pr-10' : ''}" />
                {#if note.length > 80}
                  <span class="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-text-muted)] pointer-events-none">
                    {100 - note.length}
                  </span>
                {/if}
              </div>
            </div>
          {/if}

        </div><!-- end swap panel -->

        <!-- Numpad -->
        <div class="grid grid-cols-3 gap-1.5 px-4 pt-2 pb-1 shrink-0">
          {#each NUMPAD as key}
            <button onclick={() => key === '⌫' ? backspace() : digit(key)}
                    class="py-2.5 rounded-xl text-lg font-semibold select-none
                           transition-all duration-75 active:scale-95
                           {key === '⌫'
                             ? 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)]'
                             : 'bg-[var(--color-surface-2)] text-[var(--color-text)]'}">
              {key}
            </button>
          {/each}
        </div>

      </div><!-- end LEFT -->

      <!-- RIGHT: desktop only, all panels always visible -->
      <div class="hidden md:flex flex-col flex-1 min-h-0 overflow-y-auto">
        <div class="px-5 py-4 space-y-5">

          <!-- Category -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <p class="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Category</p>
              {#if attempted && errors.category}
                <p class="text-[11px] text-[var(--color-expense)] flex items-center gap-1">
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
                          class="flex flex-col items-center gap-1 p-2 rounded-xl border
                                 transition-all active:scale-95
                                 {selectedCat === cat.id
                                   ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                                   : 'border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-muted)]'}">
                    <span class="text-base leading-none">{cat.icon}</span>
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
            <p class="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">Payment &amp; Note</p>
            <div class="grid grid-cols-4 gap-2 mb-3">
              {#each MODES as m}
                <button onclick={() => paymentMode = m.value}
                        class="py-2.5 rounded-xl text-xs font-semibold border transition-all active:scale-95
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
                <span class="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-text-muted)] pointer-events-none">
                  {100 - note.length}
                </span>
              {/if}
            </div>
          </div>

        </div>
      </div><!-- end RIGHT -->

    </div><!-- end BODY -->

    <!-- ── Footer: save button ───────────────────────────────────────────────── -->
    <div class="px-4 pb-6 md:pb-5 pt-2 md:pt-3
                md:border-t md:border-[var(--color-border)]/40 shrink-0">
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
          {isEditing ? 'Update' : type === 'income' ? 'Save Income' : 'Save Expense'}
          {#if amountSuffix}
            <span class="opacity-60 font-normal text-xs">{amountSuffix}</span>
          {/if}
        {/if}
      </button>
    </div>

  </div><!-- end INNER -->
</div><!-- end OUTER -->

{/if}
