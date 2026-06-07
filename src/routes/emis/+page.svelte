<script lang="ts">
  import { app } from '$lib/stores/app.svelte';
  import { addEmi, markEmiPaid, deleteEmi } from '$lib/db/queries';
  import { formatINR, formatShortDate, daysUntil, today, currentMonth } from '$lib/utils';
  import { toast } from '$lib/stores/toast.svelte';
  import { validateAmount, validatePositiveInt, validateName } from '$lib/utils/validate';
  import { Plus, Check, Trash2, CalendarClock, X, AlertCircle, RefreshCw } from '@lucide/svelte';
  import NumberInput from '$lib/components/NumberInput.svelte';
  import type { EmiType } from '$lib/db/schema';

  let showForm  = $state(false);
  let attempted = $state(false);
  let formType  = $state<EmiType>('emi');
  let form = $state({
    name: '', principal: '', monthlyAmount: '',
    startDate: today(), totalMonths: '', categoryId: '', notes: ''
  });

  function resetForm() {
    showForm  = false;
    attempted = false;
    form = { name: '', principal: '', monthlyAmount: '', startDate: today(), totalMonths: '', categoryId: '', notes: '' };
  }

  // ── Validation ────────────────────────────────────────────────────────────
  const errors = $derived({
    name:          validateName(form.name, { min: 2, max: 50, label: formType === 'subscription' ? 'Subscription name' : 'EMI name' }),
    principal:     formType === 'emi' ? validateAmount(form.principal, { max: 100_000_000, label: 'Loan amount' }) : null,
    monthlyAmount: (() => {
      const base = validateAmount(form.monthlyAmount, { max: 10_000_000, label: formType === 'subscription' ? 'Monthly cost' : 'Monthly EMI' });
      if (base) return base;
      if (formType === 'emi') {
        const monthly   = parseFloat(form.monthlyAmount);
        const principal = parseFloat(form.principal);
        if (principal > 0 && monthly > principal) return 'Monthly EMI cannot exceed the loan amount';
      }
      return null;
    })(),
    totalMonths: formType === 'emi' ? validatePositiveInt(form.totalMonths, { min: 1, max: 360, label: 'Total months' }) : null,
    startDate:   form.startDate ? null : (formType === 'subscription' ? 'Next renewal date is required' : 'Start date is required'),
  });
  const hasErrors = $derived(Object.values(errors).some(Boolean));

  async function save() {
    attempted = true;
    if (hasErrors) return;
    await addEmi({
      type:          formType,
      name:          form.name.trim(),
      principal:     formType === 'emi' ? parseFloat(form.principal) : undefined,
      monthlyAmount: parseFloat(form.monthlyAmount),
      totalMonths:   formType === 'emi' ? parseInt(form.totalMonths) : undefined,
      startDate:     form.startDate,
      paidMonths:    0,
      nextDueDate:   form.startDate,
      categoryId:    form.categoryId || undefined,
      notes:         form.notes.trim()
    });
    await app.refreshEmis();
    resetForm();
  }

  async function paid(id: string) {
    const emi = app.emis.find(e => e.id === id);
    const txId = await markEmiPaid(id);
    await app.refreshEmis();
    if (txId) await app.refreshTransactions();
    const label = emi?.type === 'subscription' ? `${emi.name} marked paid` : 'EMI payment recorded';
    toast.show(label);
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

  function paidThisMonth(nextDueDate: string): boolean {
    return nextDueDate.slice(0, 7) > currentMonth();
  }

  const emis          = $derived(app.emis.filter(e => e.type === 'emi' || !e.type));
  const subscriptions = $derived(app.emis.filter(e => e.type === 'subscription'));
  const totalSubCost  = $derived(subscriptions.reduce((s, e) => s + e.monthlyAmount, 0));
</script>

<div class="px-4 pt-6 md:px-8 md:pt-8 animate-fade-in">
  <div class="flex items-center justify-between mb-5">
    <h1 class="text-xl font-bold">EMI & Subscriptions</h1>
    <button onclick={() => { showForm = true; attempted = false; }}
            class="flex items-center gap-1.5 bg-[var(--color-primary)]/20 text-[var(--color-primary)]
                   px-3 py-2 rounded-xl text-sm font-medium">
      <Plus size={16} /> Add
    </button>
  </div>

  {#if showForm}
    <div class="bg-[var(--color-surface)] rounded-2xl p-4 mb-5 animate-fade-in space-y-3">
      <div class="flex items-center justify-between">
        <p class="text-sm font-semibold">New {formType === 'subscription' ? 'Subscription' : 'EMI / Loan'}</p>
        <button onclick={resetForm} aria-label="Close">
          <X size={18} class="text-[var(--color-text-muted)]"/>
        </button>
      </div>

      <!-- Type toggle -->
      <div class="flex rounded-xl overflow-hidden border border-[var(--color-border)]">
        <button onclick={() => { formType = 'emi'; attempted = false; }}
                class="flex-1 py-2 text-sm font-medium transition-colors
                       {formType === 'emi'
                         ? 'bg-[var(--color-primary)] text-white'
                         : 'text-[var(--color-text-muted)]'}">
          EMI / Loan
        </button>
        <button onclick={() => { formType = 'subscription'; attempted = false; }}
                class="flex-1 py-2 text-sm font-medium transition-colors
                       {formType === 'subscription'
                         ? 'bg-[var(--color-primary)] text-white'
                         : 'text-[var(--color-text-muted)]'}">
          Subscription
        </button>
      </div>

      <!-- Name -->
      <div>
        <input type="text" bind:value={form.name}
               placeholder={formType === 'subscription' ? 'Subscription name (e.g. Netflix)' : 'EMI name (e.g. Phone EMI)'}
               class="w-full bg-[var(--color-surface-2)] rounded-xl px-4 py-3 text-sm
                      text-[var(--color-text)] placeholder-[var(--color-text-muted)]
                      focus:outline-none border transition-colors
                      {attempted && errors.name
                        ? 'border-[var(--color-expense)]'
                        : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'}" />
        {#if attempted && errors.name}
          <p class="text-xs text-[var(--color-expense)] mt-1 flex items-center gap-1">
            <AlertCircle size={11} /> {errors.name}
          </p>
        {/if}
      </div>

      {#if formType === 'emi'}
        <!-- Principal -->
        <div>
          <NumberInput bind:value={form.principal} min={0} step={1000} inputmode="decimal"
                       placeholder="Total loan amount (₹)" invalid={!!(attempted && errors.principal)} />
          {#if attempted && errors.principal}
            <p class="text-xs text-[var(--color-expense)] mt-1 flex items-center gap-1">
              <AlertCircle size={11} /> {errors.principal}
            </p>
          {/if}
        </div>
      {/if}

      <!-- Monthly amount -->
      <div>
        <NumberInput bind:value={form.monthlyAmount} min={0} step={formType === 'subscription' ? 10 : 100}
                     inputmode="decimal"
                     placeholder={formType === 'subscription' ? 'Monthly cost (₹)' : 'Monthly EMI (₹)'}
                     invalid={!!(attempted && errors.monthlyAmount)} />
        {#if attempted && errors.monthlyAmount}
          <p class="text-xs text-[var(--color-expense)] mt-1 flex items-center gap-1">
            <AlertCircle size={11} /> {errors.monthlyAmount}
          </p>
        {/if}
      </div>

      {#if formType === 'emi'}
        <!-- Total months -->
        <div>
          <NumberInput bind:value={form.totalMonths} min={1} max={360} step={1} inputmode="numeric"
                       placeholder="Total months (e.g. 24)" invalid={!!(attempted && errors.totalMonths)} />
          {#if attempted && errors.totalMonths}
            <p class="text-xs text-[var(--color-expense)] mt-1 flex items-center gap-1">
              <AlertCircle size={11} /> {errors.totalMonths}
            </p>
          {/if}
        </div>
      {/if}

      <!-- Date -->
      <div>
        <p class="text-xs text-[var(--color-text-muted)] mb-1">
          {formType === 'subscription' ? 'Next renewal date' : 'First due date'}
        </p>
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

      <!-- Category (for auto-logging payment as expense) -->
      <div>
        <p class="text-xs text-[var(--color-text-muted)] mb-1">
          Category <span class="opacity-60">(optional — logs an expense when you mark paid)</span>
        </p>
        <select bind:value={form.categoryId}
                class="w-full bg-[var(--color-surface-2)] rounded-xl px-4 py-3 text-sm text-[var(--color-text)]
                       focus:outline-none border border-[var(--color-border)] focus:border-[var(--color-primary)]">
          <option value="">Don't log as expense</option>
          {#each app.categories as cat}
            <option value={cat.id}>{cat.icon} {cat.name}</option>
          {/each}
        </select>
      </div>

      <!-- Notes -->
      <input bind:value={form.notes} placeholder="Notes (optional)" maxlength={200}
             class="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl
                    px-4 py-3 text-sm text-[var(--color-text)] placeholder-[var(--color-text-muted)]
                    focus:outline-none focus:border-[var(--color-primary)]" />

      <!-- EMI summary preview -->
      {#if formType === 'emi' && !hasErrors && form.principal && form.monthlyAmount && form.totalMonths}
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
        Save {formType === 'subscription' ? 'Subscription' : 'EMI'}
      </button>
    </div>
  {/if}

  {#if app.emis.length === 0 && !showForm}
    <div class="text-center py-16">
      <p class="text-4xl mb-3">🏦</p>
      <p class="text-[var(--color-text-muted)] text-sm">No EMIs or subscriptions tracked</p>
      <p class="text-xs text-[var(--color-text-muted)] mt-1">Add a loan or recurring subscription to track</p>
    </div>
  {:else}
    <div class="space-y-6 pb-28">

      <!-- ── Subscriptions ─────────────────────────────────────────────────── -->
      {#if subscriptions.length > 0}
        <div>
          <div class="flex items-center justify-between mb-3">
            <p class="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Subscriptions</p>
            <p class="text-xs text-[var(--color-text-muted)]">{formatINR(totalSubCost)}/mo total</p>
          </div>
          <div class="space-y-3">
            {#each subscriptions as sub}
              {@const days = daysUntil(sub.nextDueDate)}
              <div class="bg-[var(--color-surface)] rounded-2xl p-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
                    <RefreshCw size={18} class="text-[var(--color-primary)]" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <h3 class="font-semibold text-sm truncate">{sub.name}</h3>
                    <p class="text-xs text-[var(--color-text-muted)]">{formatINR(sub.monthlyAmount)}/month</p>
                  </div>
                  <button onclick={() => remove(sub.id)} aria-label="Delete subscription"
                          class="p-1.5 text-[var(--color-text-muted)] shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>

                <div class="flex items-center justify-between mt-3">
                  {#if paidThisMonth(sub.nextDueDate)}
                    <div class="flex items-center gap-1.5">
                      <Check size={14} class="text-[var(--color-income)]" />
                      <span class="text-xs font-medium text-[var(--color-income)]">Paid this month</span>
                      <span class="text-xs text-[var(--color-text-muted)]">
                        · renews {formatShortDate(sub.nextDueDate)}
                      </span>
                    </div>
                  {:else}
                    <div class="flex items-center gap-1.5">
                      <CalendarClock size={14} style="color:{urgencyColor(days)}" />
                      <span class="text-xs font-medium" style="color:{urgencyColor(days)}">
                        {urgencyLabel(days)}
                      </span>
                      <span class="text-xs text-[var(--color-text-muted)]">
                        · {formatShortDate(sub.nextDueDate)}
                      </span>
                    </div>
                    <button onclick={() => paid(sub.id)}
                            class="flex items-center gap-1 bg-[var(--color-income)]/20 text-[var(--color-income)]
                                   px-3 py-1.5 rounded-xl text-xs font-medium">
                      <Check size={12} /> Mark Paid
                    </button>
                  {/if}
                </div>

                {#if sub.notes}
                  <p class="text-xs text-[var(--color-text-muted)] mt-2">{sub.notes}</p>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- ── EMIs ──────────────────────────────────────────────────────────── -->
      {#if emis.length > 0}
        <div>
          {#if subscriptions.length > 0}
            <p class="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-3">EMI / Loans</p>
          {/if}
          <div class="space-y-3">
            {#each emis as emi}
              {@const days      = daysUntil(emi.nextDueDate)}
              {@const remaining = (emi.totalMonths ?? 0) - emi.paidMonths}
              {@const pct       = (emi.totalMonths ?? 0) > 0 ? emi.paidMonths / (emi.totalMonths ?? 1) : 0}
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
        </div>
      {/if}

    </div>
  {/if}
</div>
