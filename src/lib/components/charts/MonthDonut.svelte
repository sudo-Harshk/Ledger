<script lang="ts">
  import type { Category } from '$lib/db/schema';

  interface Slice { categoryId: string; total: number; }
  let { slices, categories }: { slices: Slice[]; categories: Category[] } = $props();

  const total = $derived(slices.reduce((s, x) => s + x.total, 0));

  // Build SVG arcs
  const SIZE = 180;
  const R = 70;
  const CX = SIZE / 2;
  const CY = SIZE / 2;

  function polarToCartesian(angle: number, r = R) {
    const a = (angle - 90) * (Math.PI / 180);
    return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
  }

  function arc(startAngle: number, endAngle: number): string {
    const s = polarToCartesian(startAngle);
    const e = polarToCartesian(endAngle);
    const large = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${CX} ${CY} L ${s.x} ${s.y} A ${R} ${R} 0 ${large} 1 ${e.x} ${e.y} Z`;
  }

  const arcs = $derived(() => {
    if (total === 0) return [];
    let current = 0;
    return slices.map(s => {
      const cat = categories.find(c => c.id === s.categoryId);
      const angle = (s.total / total) * 360;
      const path = arc(current, current + angle - 0.5);
      current += angle;
      return { path, color: cat?.color ?? '#9B99B8', name: cat?.name ?? '', pct: Math.round((s.total / total) * 100) };
    });
  });
</script>

{#if total === 0}
  <div class="flex items-center justify-center h-[180px] text-[var(--color-text-muted)] text-sm">
    No expenses yet
  </div>
{:else}
  <div class="flex items-center gap-4">
    <svg width={SIZE} height={SIZE} viewBox="0 0 {SIZE} {SIZE}" class="shrink-0">
      {#each arcs() as segment}
        <path d={segment.path} fill={segment.color} opacity="0.9" />
      {/each}
      <!-- Centre hole -->
      <circle cx={CX} cy={CY} r={R * 0.55} fill="var(--color-surface)" />
    </svg>
    <div class="flex flex-col gap-1.5 min-w-0">
      {#each arcs().slice(0, 5) as s}
        <div class="flex items-center gap-2 text-xs">
          <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:{s.color}"></span>
          <span class="text-[var(--color-text-muted)] truncate">{s.name}</span>
          <span class="ml-auto font-medium">{s.pct}%</span>
        </div>
      {/each}
    </div>
  </div>
{/if}
