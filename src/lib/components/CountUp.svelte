<script lang="ts">
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import { formatINR } from '$lib/utils';

  interface Props {
    value: number;
    class?: string;
    style?: string;
  }

  let { value, class: cls = '', style = '' }: Props = $props();

  const display = tweened(0, { duration: 700, easing: cubicOut });

  $effect(() => {
    display.set(value);
  });
</script>

<span class={cls} {style}>{formatINR(Math.round($display))}</span>
