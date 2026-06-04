<script lang="ts">
  import type { Category } from '$lib/db/schema';

  let { category, size = 'md' }: { category: Category | undefined; size?: 'sm' | 'md' } = $props();
</script>

{#if category}
  <div class="flex items-center gap-1.5 {size === 'sm' ? 'text-xs' : 'text-sm'}">
    <span class="{size === 'sm' ? 'text-base' : 'text-lg'}">{category.icon}</span>
    <span class="text-[var(--color-text-muted)]">{category.name}</span>
  </div>
{:else}
  <span class="text-[var(--color-text-muted)] text-sm">—</span>
{/if}
