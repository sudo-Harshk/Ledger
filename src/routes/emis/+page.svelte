<script lang="ts">
  import { app } from '$lib/stores/app.svelte';
  import { addEmi, markEmiPaid, deleteEmi } from '$lib/db/queries';
  import { formatINR, formatShortDate, daysUntil, today } from '$lib/utils';
  import { validateAmount, validatePositiveInt, validateName } from '$lib/utils/validate';
  import { Plus, Check, Trash2, CalendarClock, X, AlertCircle } from '@lucide/svelte';
  import NumberInput from '$lib/components/NumberInput.svelte';

  let showForm  = $state(false);
  let attempted = $state(false);
  let form = $state({
    name: '', principal: '', monthlyAmount: '',
    startDate: today(), totalMonths: '', notes: ''
  });

  // ── Validation ────────────────────────────────────────────────────────────
  const errors = $derived({
    name:          validateName(form.name, { min: 2, max: 50, label: 'EMI name' }),
    principal:     validateAmount(form.principal, { max: 100_000_000, label: 'Loan amount' }),
    monthlyAmount: (() => {
      const base = validateAmount(form.monthlyAmount, { max: 10_000_000, label: 'Monthly EMI' });
      if (base) return base;
      const monthly   = parseFloat(form.monthlyAmount);
      const principal = parseFloat(form.principal);
      if (principal > 0 && monthly > principal) return 'Monthly EMI cannot exceed the loan amount';
      return null;
    })(),
    totalMonths: validatePositiveInt(form.totalMonths, { min: 1, max: 360, label: 'Total months' }),
    startDate:   form.startDate ? null : 'Start date is required',
  });
  const hasErrors = $derived(Object.values(errors).some(Boolean));

  async function save() {
    attempted = true;
    if (hasErrors) return;
    await addEmi({
      name:          form.name.trim(),
      principal:     parseFloat(form.principal),
      monthlyAmount: parseFloat(form.monthlyAmount),
      totalMonths:   parseInt(form.totalMonths),
      startDate:     form.startDate,
      paidMonths:    0,
      nextDueDate:   form.startDate,
      notes:         form.notes.trim()
    });
    await app.refreshEmis();
    showForm  = false;
    attempted = false;
    form = { name: '', principal: '', monthlyAmount: '', startDate: today(), totalMonths: '', notes: '' };
  }

  async function paid(id: string) {
    await markEmiPaid(id);
    await app.refreshEmis();
  }

  async function remove(id: string) {
    await deleteEmi(id);
    await app.refreshEmis();
  }

  function urgencyColor(days: number) {
    if (days < 0)  return 'var(--color-expense)';
    if (days <= 3) return 'var(--color-expense)';
    if (days <= 7) return 'var(--color-warning)';
    return 'var(--color-text-muted)';
  }
  function urgencyLabel(days: number) {
    if (days < 0)   return `${Math.abs(days)}d overdue!`;
    if (days === 0) return 'Due today!';
    if (days === 1) return 'Due tomorrow';
    return `${days} days left`;
  }

  // Field configs for the form loop
  type FieldKey = 'name' | 'principal' | 'monthlyAmount' | 'totalMonths';
  type InputMode = 'decimal' | 'numeric';
  const fields: { key: FieldKey; placeholder: string; type: string; inputmode?: InputMode; min?: number; step?: number }[] = [
    { key: 'name',          placeholder: 'EMI name (e.g. Phone EMI)',   type: 'text'   },
    { key: 'principal',     placeholder: 'Total loan amount (₹)',        type: 'number', inputmode: 'decimal',  min: 0,  step: 1000 },
    { key: 'monthlyAmount', placeholder: 'Monthly EMI (₹)',              type: 'number', inputmode: 'decimal',  min: 0,  step: 100  },
    { key: 'totalMonths',   placeholder: 'Total months (e.g. 24)',       type: 'number', inputmode: 'numeric',  min: 1,  step: 1    },
  ];
</script>

<div class="px-4 pt-6 animate-fade-in">
  <div class="flex items-center justify-between mb-5">
    <h1 class="text-xl font-bold">EMI Tracker</h1>
    <button onclick={() => { showForm = true; attempted = false; }}
            class="flex items-center gap-1.5 bg-[var(--color-primary)]/20 text-[var(--color-primary)]
                   px-3 py-2 rounded-xl text-sm font-medium">
      <Plus size={16} /> Add EMI
    </button>
  </div>

  {#if showForm}
    <div class="bg-[var(--color-surface)] rounded-2xl p-4 mb-5 animate-fade-in space-y-3">
      <div class="flex items-center justify-between">
        <p class="text-sm font-semibold">New EMI / Loan</p>
        <button onclick={() => { showForm = false; attempted = false; }} aria-label="Close">
          <X size={18} class="text-[var(--color-text-muted)]"/>
        </button>
      </div>

      {#each fields as f}
        <div>
          {#if f.type === 'number'}
            <NumberInput bind:value={form[f.key]} min={f.min ?? 0} step={f.step ?? 1}
                         inputmode={f.inputmode ?? 'decimal'} placeholder={f.placeholder}
                         invalid={!!(attempted && errors[f.key])} />
          {:else}
            <input type="text"
                   bind:value={form[f.key]}
                   placeholder={f.placeholder}
                   class="w-full bg-[var(--color-surface-2)] rounded-xl px-4 py-3 text-sm
                          text-[var(--color-text)] placeholder-[var(--color-text-muted)]
                          focus:outline-none border transition-colors
                          {attempted && errors[f.key]
                            ? 'border-[var(--color-expense)]'
                            : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'}" />
          {/if}
          {#if attempted && errors[f.key]}
            <p class="text-xs text-[var(--color-expense)] mt-1 flex items-center gap-1">
              <AlertCircle size={11} /> {errors[f.key]}
            </p>
          {/if}
        </div>
      {/each}

      <!-- Start date -->
      <div>
        <p class="text-xs text-[var(--color-text-muted)] mb-1">First due date</p>
        <input type="date" bind:value={form.startDate}
               class="w-full bg-[var(--color-surface-2)] rounded-xl px-4 py-3 text-sm text-[var(--color-text)]
                      focus:outline-none border transition-colors
                      {attempted && errors.startDate
                        ? 'border-[var(--color-expense)]'
                        : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'}" />
        {#if attempted && errors.startDate}
          <p class="text-xs text-[var(--color-expense)] mt-1 flex items-center gap-1">
            <AlertCircle size={11} /> {errors.startDate}
          </p>
        {/if}
      </div>

      <!-- Notes (optional) -->
      <input bind:value={form.notes} placeholder="Notes (optional)" maxlength={200}
             class="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl
                    px-4 py-3 text-sm text-[var(--color-text)] placeholder-[var(--color-text-muted)]
                    focus:outline-none focus:border-[var(--color-primary)]" />

      <!-- Summary preview (when valid) -->
      {#if !hasErrors && form.principal && form.monthlyAmount && form.totalMonths}
        {@const totalPayable = parseFloat(form.monthlyAmount) * parseInt(form.totalMonths)}
        {@const interest     = totalPayable - parseFloat(form.principal)}
        <div class="bg-[var(--color-surface-2)] rounded-xl px-4 py-3 space-y-1">
          <p class="text-xs text-[var(--color-text-muted)] font-medium">Summary</p>
          <div class="flex justify-between text-xs">
            <span class="text-[var(--color-text-muted)]">Total payable</span>
            <span class="font-medium">{formatINR(totalPayable)}</span>
          </div>
          {#if interest > 0}
            <div class="flex justify-between text-xs">
              <span class="text-[var(--color-text-muted)]">Interest</span>
              <span class="text-[var(--color-warning)]">{formatINR(interest)}</span>
            </div>
          {/if}
        </div>
      {/if}

      <button onclick={save}
              class="w-full py-3 rounded-xl text-sm font-semibold transition-colors
                     {attempted && hasErrors
                       ? 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)] cursor-not-allowed'
                       : 'bg-[var(--color-primary)] text-white'}">
        Save EMI
      </button>
    </div>
  {/if}

  {#if app.emis.length === 0 && !showForm}
    <div class="text-center py-16">
      <p class="text-4xl mb-3">🏦</p>
      <p class="text-[var(--color-text-muted)] text-sm">No EMIs tracked</p>
      <p class="text-xs text-[var(--color-text-muted)] mt-1">Add a loan or subscription to track</p>
    </div>
  {:else}
    <div class="space-y-3 pb-28">
      {#each app.emis as emi}
        {@const days      = daysUntil(emi.nextDueDate)}
        {@const remaining = emi.totalMonths - emi.paidMonths}
        {@const pct       = emi.totalMonths > 0 ? emi.paidMonths / emi.totalMonths : 0}
        <div class="bg-[var(--color-surface)] rounded-2xl p-4">
          <div class="flex items-start justify-between mb-3">
            <div class="flex-1 min-w-0">
              <h3 class="font-semibold text-sm truncate">{emi.name}</h3>
              <p class="text-xs text-[var(--color-text-muted)] mt-0.5">
                {formatINR(emi.monthlyAmount)}/mo · {remaining} months left
              </p>
            </div>
            <button onclick={() => remove(emi.id)} aria-label="Delete EMI"
                    class="p-1.5 text-[var(--color-text-muted)] shrink-0">
              <Trash2 size={14} />
            </button>
          </div>

          <div class="h-1.5 bg-[var(--color-border)] rounded-full mb-3">
            <div class="h-full rounded-full bg-[var(--color-primary)] transition-all duration-500"
                 style="width:{pct*100}%"></div>
          </div>

          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              <CalendarClock size={14} style="color:{urgencyColor(days)}" />
              <span class="text-xs font-medium" style="color:{urgencyColor(days)}">
                {urgencyLabel(days)}
              </span>
              <span class="text-xs text-[var(--color-text-muted)]">
                · {formatShortDate(emi.nextDueDate)}
              </span>
            </div>
            <button onclick={() => paid(emi.id)}
                    class="flex items-center gap-1 bg-[var(--color-income)]/20 text-[var(--color-income)]
                           px-3 py-1.5 rounded-xl text-xs font-medium">
              <Check size={12} /> Mark Paid
            </button>
          </div>

          {#if emi.notes}
            <p class="text-xs text-[var(--color-text-muted)] mt-2">{emi.notes}</p>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
