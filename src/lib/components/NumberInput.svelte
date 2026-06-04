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

  function decrement() {
    const n = parseFloat(value) || 0;
    const next = Math.max(n - step, min);
    value = next === 0 && min === 0 ? '' : String(next);
  }

  function increment() {
    const n = parseFloat(value) || 0;
    const next = Math.min(n + step, max);
    value = String(next);
  }

  const atMin = $derived((parseFloat(value) || 0) <= min);
  const atMax = $derived(max < Infinity && (parseFloat(value) || 0) >= max);
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

  <input type="number"
         {inputmode}
         {min}
         {max}
         {placeholder}
         bind:value
         class="flex-1 min-w-0 bg-transparent py-3 text-sm text-center text-[var(--color-text)]
                placeholder-[var(--color-text-muted)] focus:outline-none
                [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />

  <button type="button" onclick={increment} disabled={atMax}
          class="w-11 h-11 flex items-center justify-center shrink-0 rounded-r-xl
                 text-lg font-medium transition-all select-none
                 {atMax
                   ? 'text-[var(--color-border)] cursor-not-allowed'
                   : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] active:bg-[var(--color-surface-3)]'}">
    +
  </button>
</div>
