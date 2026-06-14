<script lang="ts">
  import type { Category, Transaction } from '$lib/db/schema';
  import { formatINR } from '$lib/utils';
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';

  interface Slice { categoryId: string; total: number; }
  let { slices, categories, transactions = [] }: {
    slices:        Slice[];
    categories:    Category[];
    transactions?: Transaction[];
  } = $props();

  const total = $derived(slices.reduce((s, x) => s + x.total, 0));

  const SIZE = 180;
  const R    = 70;
  const CX   = SIZE / 2;
  const CY   = SIZE / 2;

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
      const cat   = categories.find(c => c.id === s.categoryId);
      const angle = (s.total / total) * 360;
      const path  = arc(current, current + angle - 0.5);
      current += angle;
      return {
        path,
        color:      cat?.color ?? '#9B99B8',
        name:       cat?.name  ?? 'Unknown',
        icon:       cat?.icon  ?? '📌',
        pct:        Math.round((s.total / total) * 100),
        total:      s.total,
        categoryId: s.categoryId,
      };
    });
  });

  // Hover (desktop) + pinned (tap) — hover takes priority
  let hoverCatId  = $state<string | null>(null);
  let pinnedCatId = $state<string | null>(null);
  const activeCatId = $derived(hoverCatId ?? pinnedCatId);
  const activeSeg   = $derived(activeCatId ? (arcs().find(a => a.categoryId === activeCatId) ?? null) : null);

  // Drill-down: transactions for the pinned category, newest first
  const drillTxs = $derived(
    pinnedCatId
      ? [...transactions]
          .filter(t => t.categoryId === pinnedCatId && t.type === 'expense')
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 8)
      : []
  );

  function toggle(catId: string) {
    pinnedCatId = pinnedCatId === catId ? null : catId;
  }

  function fmtDate(dateStr: string): string {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }
</script>

{#if total === 0}
  <div class="flex items-center justify-center h-[180px] text-[var(--color-text-muted)] text-sm">
    No expenses yet
  </div>
{:else}
  <div class="flex items-center gap-4">

    <!-- Donut SVG + center overlay -->
    <div class="relative shrink-0" style="width:{SIZE}px; height:{SIZE}px;">
      <svg width={SIZE} height={SIZE} viewBox="0 0 {SIZE} {SIZE}">
        {#each arcs() as seg}
          <path d={seg.path}
                fill={seg.color}
                class="cursor-pointer transition-all duration-200"
                style="opacity:{activeCatId === null || activeCatId === seg.categoryId ? 0.9 : 0.25};
                       transform-origin:{CX}px {CY}px;
                       transform:{activeCatId === seg.categoryId ? 'scale(1.03)' : 'scale(1)'}"
                onclick={() => toggle(seg.categoryId)}
                onkeydown={(e) => e.key === 'Enter' && toggle(seg.categoryId)}
                onmouseenter={() => hoverCatId = seg.categoryId}
                onmouseleave={() => hoverCatId = null}
                role="button"
                tabindex="0"
                aria-label="{seg.name}: {formatINR(seg.total)} ({seg.pct}%)" />
        {/each}
        <!-- Centre hole -->
        <circle cx={CX} cy={CY} r={R * 0.55} fill="var(--color-surface)" />
      </svg>

      <!-- Center tooltip — shows inside the hole -->
      <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div class="text-center" style="width:{R * 1.05}px">
          {#if activeSeg}
            <p class="text-lg leading-none mb-0.5">{activeSeg.icon}</p>
            <p class="text-[10px] text-[var(--color-text-muted)] truncate leading-tight">
              {activeSeg.name}
            </p>
            <p class="text-sm font-bold text-[var(--color-text)] leading-tight mt-0.5">
              {formatINR(activeSeg.total)}
            </p>
            <p class="text-[9px] font-semibold leading-none mt-0.5"
               style="color:{activeSeg.color}">
              {activeSeg.pct}%
            </p>
          {:else}
            <p class="text-[9px] text-[var(--color-text-muted)] uppercase tracking-wide leading-none mb-1">
              Total
            </p>
            <p class="text-sm font-bold text-[var(--color-text)] leading-tight">
              {formatINR(total)}
            </p>
          {/if}
        </div>
      </div>
    </div>

    <!-- Legend — also interactive -->
    <div class="flex flex-col gap-1.5 min-w-0">
      {#each arcs().slice(0, 5) as seg}
        <button onclick={() => toggle(seg.categoryId)}
                onmouseenter={() => hoverCatId = seg.categoryId}
                onmouseleave={() => hoverCatId = null}
                class="flex items-center gap-2 text-xs text-left transition-opacity duration-150
                       {activeCatId && activeCatId !== seg.categoryId ? 'opacity-30' : 'opacity-100'}">
          <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:{seg.color}"></span>
          <span class="text-[var(--color-text-muted)] truncate">{seg.name}</span>
          <span class="ml-auto font-medium text-[var(--color-text)] shrink-0">{seg.pct}%</span>
        </button>
      {/each}
    </div>

  </div>

  <!-- Drill-down: transaction list for pinned category -->
  {#if drillTxs.length > 0 && activeSeg}
    <div in:fly={{ y: 8, duration: 180, easing: cubicOut }}
         class="mt-4 pt-4 border-t border-[var(--color-border)]/50">
      <p class="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
        {activeSeg.icon} {activeSeg.name} — recent transactions
      </p>
      <div class="space-y-2">
        {#each drillTxs as tx}
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <span class="text-[10px] text-[var(--color-text-muted)] shrink-0 w-12">
                {fmtDate(tx.date)}
              </span>
              <span class="text-xs text-[var(--color-text)] truncate">
                {tx.note || tx.paymentMode.toUpperCase()}
              </span>
            </div>
            <span class="text-xs font-semibold text-[var(--color-expense)] shrink-0">
              {formatINR(tx.amount)}
            </span>
          </div>
        {/each}
      </div>
    </div>
  {/if}
{/if}
