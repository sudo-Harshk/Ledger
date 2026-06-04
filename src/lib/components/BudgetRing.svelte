<script lang="ts">
  let { spent, budget, size = 80 }: { spent: number; budget: number; size?: number } = $props();

  const r            = $derived((size - 10) / 2);
  const circumference = $derived(2 * Math.PI * r);
  const pct          = $derived(budget > 0 ? Math.min(spent / budget, 1) : 0);
  const dash         = $derived(circumference * pct);
  const cx           = $derived(size / 2);
  const color        = $derived(
    pct >= 1   ? 'var(--color-expense)'  :
    pct >= 0.9 ? 'var(--color-warning)'  :
    pct >= 0.7 ? 'var(--color-warning)'  :
                 'var(--color-income)'
  );
</script>

<svg width={size} height={size} viewBox="0 0 {size} {size}" class="rotate-[-90deg]">
  <circle cx={cx} cy={cx} r={r}
          fill="none" stroke="var(--color-border)" stroke-width="6" />
  <circle cx={cx} cy={cx} r={r}
          fill="none" stroke={color} stroke-width="6"
          stroke-linecap="round"
          stroke-dasharray="{dash} {circumference}"
          style="transition: stroke-dasharray 0.5s ease" />
</svg>
