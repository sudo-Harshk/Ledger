<script lang="ts">
  import { CalendarDays } from '@lucide/svelte';
  import { today, addDays, weekDayLabel, formatShortDate } from '$lib/utils';

  let { value = $bindable() }: { value: string } = $props();

  let nativeInput = $state<HTMLInputElement | null>(null);

  const chips = $derived(
    Array.from({ length: 7 }, (_, i) => {
      const date = addDays(today(), -i);
      return {
        date,
        label: i === 0 ? 'Today' : i === 1 ? 'Yest' : weekDayLabel(date),
        num: Number(date.slice(8, 10)),
        isToday: i === 0,
      };
    })
  );

  const isOlderDate = $derived(!chips.some(c => c.date === value));

  const olderLabel = $derived(() => {
    if (!isOlderDate) return '';
    return formatShortDate(value);
  });

  function openNative() {
    if (nativeInput) {
      try { nativeInput.showPicker(); } catch { nativeInput.click(); }
    }
  }
</script>

<div class="flex gap-2 overflow-x-auto pb-1" style="scrollbar-width:none">
  {#each chips as chip (chip.date)}
    {@const active = value === chip.date}
    <button
      type="button"
      onclick={() => value = chip.date}
      class="flex flex-col items-center gap-0.5 min-w-[52px] py-2.5 rounded-2xl shrink-0
             transition-all duration-200 active:scale-95
             {active
               ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/30 scale-105'
               : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)]'}">
      <span class="text-[10px] font-semibold tracking-wide leading-none
                   {active ? 'text-white/80' : ''}">
        {chip.label}
      </span>
      <span class="text-lg font-bold leading-tight">{chip.num}</span>
      {#if chip.isToday && !active}
        <span class="w-1 h-1 rounded-full bg-[var(--color-primary)] mt-0.5"></span>
      {/if}
    </button>
  {/each}

  <!-- Older date trigger -->
  <button
    type="button"
    onclick={openNative}
    class="flex flex-col items-center justify-center gap-0.5 min-w-[52px] py-2.5 px-2 rounded-2xl shrink-0
           transition-all duration-200 active:scale-95
           {isOlderDate
             ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/30 scale-105'
             : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)]'}">
    {#if isOlderDate}
      <CalendarDays size={16} class="mb-0.5" />
      <span class="text-[10px] font-semibold leading-none whitespace-nowrap">{olderLabel()}</span>
    {:else}
      <CalendarDays size={18} />
      <span class="text-[9px] leading-none mt-0.5">Older</span>
    {/if}
  </button>

  <!-- Hidden native input — only used to open OS date picker for older dates -->
  <input
    type="date"
    bind:this={nativeInput}
    bind:value
    class="sr-only"
    tabindex="-1"
    aria-hidden="true"
  />
</div>
