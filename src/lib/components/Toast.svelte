<script lang="ts">
  import { toast } from '$lib/stores/toast.svelte';
  import { fly } from 'svelte/transition';
  import { cubicOut, cubicIn } from 'svelte/easing';
  import { Check, AlertCircle, Info } from '@lucide/svelte';
</script>

<div class="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center gap-2 pointer-events-none md:bottom-10">
  {#each toast.items as t (t.id)}
    <div in:fly={{ y: 12, duration: 220, easing: cubicOut }}
         out:fly={{ y: 8, duration: 180, easing: cubicIn }}
         class="flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-medium shadow-xl pointer-events-auto whitespace-nowrap
                {t.type === 'success' ? 'bg-[var(--color-income)] text-white'  :
                 t.type === 'error'   ? 'bg-[var(--color-expense)] text-white' :
                                        'bg-[var(--color-surface-3)] text-[var(--color-text)]'}">
      {#if t.type === 'success'}
        <Check size={15} strokeWidth={2.5} />
      {:else if t.type === 'error'}
        <AlertCircle size={15} />
      {:else}
        <Info size={15} />
      {/if}
      {t.message}
    </div>
  {/each}
</div>
