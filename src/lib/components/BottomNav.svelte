<script lang="ts">
  import { page } from '$app/stores';
  import { LayoutDashboard, ArrowLeftRight, PieChart, CreditCard, BarChart3, Handshake } from '@lucide/svelte';

  const nav = [
    { href: '/',             label: 'Home',    Icon: LayoutDashboard },
    { href: '/transactions', label: 'Spends',  Icon: ArrowLeftRight  },
    { href: '/budgets',      label: 'Budgets', Icon: PieChart        },
    { href: '/emis',         label: 'EMIs',    Icon: CreditCard      },
    { href: '/reports',      label: 'Reports', Icon: BarChart3       },
    { href: '/lent',         label: 'Lent',    Icon: Handshake       },
  ];
</script>

<nav class="md:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-40
            flex items-center justify-around
            bg-[var(--color-surface)] border-t border-[var(--color-border)]
            pb-[env(safe-area-inset-bottom)]">
  {#each nav as item}
    {@const active = $page.url.pathname === item.href ||
                     (item.href === '/emis' && $page.url.pathname === '/subscriptions')}
    <a href={item.href}
       class="flex flex-col items-center gap-1 py-3 px-2 min-w-0 flex-1 transition-colors duration-150
              {active ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}">
      <item.Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
      <span class="text-[9px] font-medium leading-none">{item.label}</span>
    </a>
  {/each}
</nav>
