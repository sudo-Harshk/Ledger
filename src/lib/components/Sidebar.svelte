<script lang="ts">
  import { page } from '$app/stores';
  import { app } from '$lib/stores/app.svelte';
  import { themeStore } from '$lib/stores/theme.svelte';
  import {
    LayoutDashboard, ArrowLeftRight, PieChart,
    CreditCard, BarChart3, Plus, Settings, Wallet, Sun, Moon, Sparkles,
  } from '@lucide/svelte';

  const nav = [
    { href: '/',             label: 'Home',         Icon: LayoutDashboard },
    { href: '/transactions', label: 'Transactions', Icon: ArrowLeftRight  },
    { href: '/budgets',      label: 'Budgets',       Icon: PieChart        },
    { href: '/emis',         label: 'EMI & Loans',  Icon: CreditCard      },
    { href: '/reports',      label: 'Reports',       Icon: BarChart3       },
    { href: '/wrapped',      label: 'Spending DNA', Icon: Sparkles        },
  ];
</script>

<aside class="hidden md:flex flex-col w-[240px] shrink-0
              bg-[var(--color-surface)] border-r border-[var(--color-border)]
              sticky top-0 h-screen overflow-y-auto z-20">

  <!-- Logo -->
  <div class="px-5 py-5 border-b border-[var(--color-border)]">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-xl bg-[var(--color-primary)]/20 flex items-center justify-center">
          <Wallet size={16} class="text-[var(--color-primary)]" />
        </div>
        <span class="text-base font-bold">Ledger</span>
      </div>
      <button onclick={() => themeStore.toggle()}
              class="w-7 h-7 rounded-lg flex items-center justify-center
                     text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] transition-colors">
        {#if themeStore.current === 'dark'}
          <Sun size={14} />
        {:else}
          <Moon size={14} />
        {/if}
      </button>
    </div>
    <p class="text-[11px] text-[var(--color-text-muted)] mt-2 leading-snug">
      {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
    </p>
  </div>

  <!-- Nav -->
  <nav class="flex-1 px-3 py-4 space-y-0.5">
    {#each nav as item}
      {@const active = $page.url.pathname === item.href ||
                       (item.href === '/emis' && $page.url.pathname === '/subscriptions')}
      <a href={item.href}
         class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
                {active
                  ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
                  : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]'}">
        <item.Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
        {item.label}
      </a>
    {/each}
  </nav>

  <!-- Bottom -->
  <div class="px-3 py-4 border-t border-[var(--color-border)] space-y-1.5">
    <button onclick={() => app.showQuickAdd = true}
            class="w-full flex items-center justify-center gap-2 py-2.5 px-4
                   bg-[var(--color-primary)] text-white rounded-xl text-sm font-semibold
                   transition-colors hover:bg-[var(--color-primary-dim)] active:scale-95">
      <Plus size={16} strokeWidth={2.5} />
      Add Transaction
    </button>
    <a href="/settings"
       class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
              {$page.url.pathname === '/settings'
                ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
                : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]'}">
      <Settings size={18} strokeWidth={1.8} />
      Settings
    </a>
  </div>
</aside>
