<script lang="ts">
  import './layout.css';
  import { onMount } from 'svelte';
  import { dev } from '$app/environment';
  import { injectAnalytics } from '@vercel/analytics/sveltekit';

  injectAnalytics({ mode: dev ? 'development' : 'production' });
  import BottomNav from '$lib/components/BottomNav.svelte';
  import QuickAdd from '$lib/components/QuickAdd.svelte';
  import { app } from '$lib/stores/app.svelte';
  import { Plus } from '@lucide/svelte';

  let { children } = $props();

  onMount(() => { app.init(); });
</script>

<svelte:head>
  <title>Ledger</title>
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
</svelte:head>

{#if app.isLoading}
  <div class="flex items-center justify-center h-dvh">
    <div class="flex flex-col items-center gap-3">
      <div class="w-10 h-10 rounded-full border-2 border-[var(--color-primary)] border-t-transparent animate-spin"></div>
      <p class="text-sm text-[var(--color-text-muted)]">Loading Ledger…</p>
    </div>
  </div>
{:else}
  <main class="min-h-dvh pb-safe">
    {@render children()}
  </main>

  <!-- FAB -->
  <button onclick={() => app.showQuickAdd = true}
          class="fixed bottom-20 right-4 z-30 w-14 h-14 rounded-full
                 bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/40
                 flex items-center justify-center transition-transform active:scale-90">
    <Plus size={28} strokeWidth={2.5} />
  </button>

  <BottomNav />
  <QuickAdd />
{/if}
