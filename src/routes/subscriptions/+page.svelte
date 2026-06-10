<script lang="ts">
  import { app } from '$lib/stores/app.svelte';
  import { addEmi, markEmiPaid, deleteEmi } from '$lib/db/queries';
  import { formatINR, formatShortDate, daysUntil, today, currentMonth } from '$lib/utils';
  import { toast } from '$lib/stores/toast.svelte';
  import { validateAmount, validateName } from '$lib/utils/validate';
  import { Plus, Check, Trash2, CalendarClock, X, AlertCircle, RefreshCw, CreditCard } from '@lucide/svelte';
  import NumberInput from '$lib/components/NumberInput.svelte';

  let showForm  = $state(false);
  let attempted = $state(false);
  let form = $state({
    name: '', monthlyAmount: '', startDate: today(), categoryId: '', notes: ''
  });

  function resetForm() {
    showForm  = false;
    attempted = false;
    form = { name: '', monthlyAmount: '', startDate: today(), categoryId: '', notes: '' };
  }

  const errors = $derived({
    name:          validateName(form.name, { min: 2, max: 50, label: 'Subscription name' }),
    monthlyAmount: validateAmount(form.monthlyAmount, { max: 10_000_000, label: 'Monthly cost' }),
    startDate:     form.startDate ? null : 'Next renewal date is required',
  });
  const hasErrors = $derived(Object.values(errors).some(Boolean));

  async function save() {
    attempted = true;
    if (hasErrors) return;
    await addEmi({
      type:          'subscription',
      name:          form.name.trim(),
      monthlyAmount: parseFloat(form.monthlyAmount),
      startDate:     form.startDate,
      paidMonths:    0,
      nextDueDate:   form.startDate,
      categoryId:    form.categoryId || undefined,
      notes:         form.notes.trim()
    });
    await app.refreshEmis();
    resetForm();
    toast.show('Subscription added');
  }

  async function paid(id: string) {
    const sub = app.emis.find(e => e.id === id);
    const txId = await markEmiPaid(id);
    await app.refreshEmis();
    if (txId) await app.refreshTransactions();
    toast.show(`${sub?.name ?? 'Subscription'} marked paid`);
  }

  async function remove(id: string) {
    await deleteEmi(id);
    await app.refreshEmis();
  }

  function urgencyColor(days: number) {
    if (days <= 0) return 'var(--color-expense)';
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
  function paidThisMonth(nextDueDate: string) {
    return nextDueDate.slice(0, 7) > currentMonth();
  }

  const subscriptions = $derived(app.emis.filter(e => !e.totalMonths || e.type === 'subscription'));
  const totalCost     = $derived(subscriptions.reduce((s, e) => s + e.monthlyAmount, 0));
</script>

<div class="px-4 pt-6 md:px-8 md:pt-8 pb-28 md:pb-8 animate-fade-in">

  <!-- Section toggle — same pattern as Wrapped month/year picker -->
  <div class="flex bg-[var(--color-surface-2)] rounded-xl p-1 mb-5">
    <a href="/emis"
       class="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all
              text-[var(--color-text-muted)]">
      <CreditCard size={14} /> EMI & Loans
    </a>
    <a href="/subscriptions"
       class="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all
              bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm">
      <RefreshCw size={14} /> Subscriptions
    </a>
  </div>

  <div class="flex items-center justify-between mb-5">
    <div>
      <h1 class="text-xl font-bold">Subscriptions</h1>
      {#if subscriptions.length > 0}
        <p class="text-xs text-[var(--color-text-muted)] mt-0.5">{formatINR(totalCost)}/month total</p>
      {/if}
    </div>
    <button onclick={() => { showForm = true; attempted = false; }}
            class="flex items-center gap-1.5 bg-[var(--color-primary)]/20 text-[var(--color-primary)]
                   px-3 py-2 rounded-xl text-sm font-medium">
      <Plus size={16} /> Add
    </button>
  </div>

  {#if showForm}
    <div class="bg-[var(--color-surface)] rounded-2xl p-4 mb-5 animate-fade-in space-y-3 md:max-w-lg">
      <div class="flex items-center justify-between">
        <p class="text-sm font-semibold">New Subscription</p>
        <button onclick={resetForm} aria-label="Close">
          <X size={18} class="text-[var(--color-text-muted)]"/>
        </button>
      </div>

      <div>
        <input type="text" bind:value={form.name} placeholder="Subscription name (e.g. Netflix)"
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

      <div>
        <NumberInput bind:value={form.monthlyAmount} min={0} step={10} inputmode="decimal"
                     placeholder="Monthly cost (₹)" invalid={!!(attempted && errors.monthlyAmount)} />
        {#if attempted && errors.monthlyAmount}
          <p class="text-xs text-[var(--color-expense)] mt-1 flex items-center gap-1">
            <AlertCircle size={11} /> {errors.monthlyAmount}
          </p>
        {/if}
      </div>

      <div>
        <p class="text-xs text-[var(--color-text-muted)] mb-1">Next renewal date</p>
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

      <input bind:value={form.notes} placeholder="Notes (optional)" maxlength={200}
             class="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl
                    px-4 py-3 text-sm text-[var(--color-text)] placeholder-[var(--color-text-muted)]
                    focus:outline-none focus:border-[var(--color-primary)]" />

      <button onclick={save}
              class="w-full py-3 rounded-xl text-sm font-semibold transition-colors
                     {attempted && hasErrors
                       ? 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)] cursor-not-allowed'
                       : 'bg-[var(--color-primary)] text-white'}">
        Save Subscription
      </button>
    </div>
  {/if}

  {#if subscriptions.length === 0 && !showForm}
    <div class="text-center py-16">
      <p class="text-4xl mb-3">🔄</p>
      <p class="text-[var(--color-text-muted)] text-sm">No subscriptions tracked</p>
      <p class="text-xs text-[var(--color-text-muted)] mt-1">Add Netflix, Spotify, or any recurring cost</p>
    </div>
  {:else}
    <div class="grid md:grid-cols-2 md:gap-4 gap-3">
      {#each subscriptions as sub}
        {@const days = daysUntil(sub.nextDueDate)}
        <div class="bg-[var(--color-surface)] rounded-2xl p-4 animate-fade-in">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
              <RefreshCw size={18} class="text-[var(--color-primary)]" />
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-semibold text-sm truncate">{sub.name}</h3>
              <p class="text-xs text-[var(--color-text-muted)]">{formatINR(sub.monthlyAmount)}/month</p>
            </div>
            <button onclick={() => remove(sub.id)} aria-label="Delete"
                    class="p-1.5 text-[var(--color-text-muted)] shrink-0">
              <Trash2 size={14} />
            </button>
          </div>

          <div class="flex items-center justify-between mt-3">
            {#if paidThisMonth(sub.nextDueDate)}
              <div class="flex items-center gap-1.5">
                <Check size={14} class="text-[var(--color-income)]" />
                <span class="text-xs font-medium text-[var(--color-income)]">Paid this month</span>
                <span class="text-xs text-[var(--color-text-muted)]">· renews {formatShortDate(sub.nextDueDate)}</span>
              </div>
            {:else}
              <div class="flex items-center gap-1.5">
                <CalendarClock size={14} style="color:{urgencyColor(days)}" />
                <span class="text-xs font-medium" style="color:{urgencyColor(days)}">{urgencyLabel(days)}</span>
                <span class="text-xs text-[var(--color-text-muted)]">· {formatShortDate(sub.nextDueDate)}</span>
              </div>
              <button onclick={() => paid(sub.id)}
                      class="flex items-center gap-1 bg-[var(--color-income)]/20 text-[var(--color-income)]
                             px-3 py-1.5 rounded-xl text-xs font-medium shrink-0">
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
  {/if}
</div>
