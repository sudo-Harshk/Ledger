<script lang="ts">
  interface Props {
    value: string;
    min?: number;
    max?: number;
    step?: number;
    placeholder?: string;
    invalid?: boolean;
    inputmode?: 'decimal' | 'numeric';
  }

  let {
    value = $bindable(''),
    min = 0,
    max = Infinity,
    step = 1,
    placeholder = '0',
    invalid = false,
    inputmode = 'decimal',
  }: Props = $props();

  // Local state drives the input; changes propagate out via value = local
  let local = $state(value);

  // Sync parent → local when parent resets the value (e.g. form clear, loadAll)
  $effect(() => {
    if (value !== local) local = value;
  });

  function decrement() {
    const n = parseFloat(local) || 0;
    const next = Math.max(n - step, min);
    local = next === 0 && min === 0 ? '' : String(next);
    value = local;
  }

  function increment() {
    const n = parseFloat(local) || 0;
    const next = Math.min(n + step, max);
    local = String(next);
    value = local;
  }

  // Filter non-numeric characters while typing; sync to parent on every keystroke
  function onInput() {
    local = local.replace(/[^\d.]/g, '').replace(/^(\d*\.?\d*).*$/, '$1');
    value = local;
  }

  const atMin = $derived((parseFloat(local) || 0) <= min);
  const atMax = $derived(max < Infinity && (parseFloat(local) || 0) >= max);
</script>

<div class="flex items-center bg-[var(--color-surface-2)] rounded-xl border transition-colors
            {invalid ? 'border-[var(--color-expense)]' : 'border-[var(--color-border)]'}">

  <button type="button" onclick={decrement} disabled={atMin}
          class="w-11 h-11 flex items-center justify-center shrink-0 rounded-l-xl
                 text-lg font-medium transition-all select-none
                 {atMin
                   ? 'text-[var(--color-border)] cursor-not-allowed'
                   : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] active:bg-[var(--color-surface-3)]'}">
    −
  </button>

  <input type="text"
         {inputmode}
         pattern="[0-9]*"
         {placeholder}
         bind:value={local}
         oninput={onInput}
         class="flex-1 min-w-0 bg-transparent py-3 text-sm text-center text-[var(--color-text)]
                placeholder-[var(--color-text-muted)] focus:outline-none" />

  <button type="button" onclick={increment} disabled={atMax}
          class="w-11 h-11 flex items-center justify-center shrink-0 rounded-r-xl
                 text-lg font-medium transition-all select-none
                 {atMax
                   ? 'text-[var(--color-border)] cursor-not-allowed'
                   : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] active:bg-[var(--color-surface-3)]'}">
    +
  </button>
</div>
