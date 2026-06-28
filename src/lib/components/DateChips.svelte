<script lang="ts">
  import { CalendarDays } from '@lucide/svelte';

  let { value = $bindable() }: { value: string } = $props();

  let nativeInput = $state<HTMLInputElement | null>(null);

  function localStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  const chips = $derived(
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return {
        date: localStr(d),
        label: i === 0 ? 'Today' : i === 1 ? 'Yest' : DAY[d.getDay()],
        num: d.getDate(),
        isToday: i === 0,
      };
    })
  );

  const isOlderDate = $derived(!chips.some(c => c.date === value));

  const olderLabel = $derived(() => {
    if (!isOlderDate) return '';
    const d = new Date(value + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
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
