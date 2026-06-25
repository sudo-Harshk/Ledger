<script lang="ts">
  import { app } from '$lib/stores/app.svelte';
  import { getAllCategories, addCategory, updateCategory } from '$lib/db/queries';
  import { validateName } from '$lib/utils/validate';
  import { Plus, AlertCircle, ChevronLeft, Pencil } from '@lucide/svelte';
  import type { Category } from '$lib/db/schema';

  let allCats      = $state<Category[]>([]);
  let addingCat    = $state(false);
  let catAttempted = $state(false);
  let newCat       = $state({ name: '', icon: '📌', color: '#9B99B8' });

  // Edit state
  let editingId      = $state<string | null>(null);
  let editAttempted  = $state(false);
  let editCat        = $state({ name: '', icon: '📌', color: '#9B99B8' });

  $effect(() => { load(); });

  async function load() {
    allCats = await getAllCategories();
  }

  const catNameError = $derived((): string | null => {
    if (!catAttempted) return null;
    const base = validateName(newCat.name, { min: 2, max: 30, label: 'Category name' });
    if (base) return base;
    const dup = allCats.find(c => c.name.toLowerCase() === newCat.name.trim().toLowerCase());
    if (dup) return 'A category with this name already exists';
    return null;
  });

  const editNameError = $derived((): string | null => {
    if (!editAttempted) return null;
    const base = validateName(editCat.name, { min: 2, max: 30, label: 'Category name' });
    if (base) return base;
    const dup = allCats.find(c => c.id !== editingId && c.name.toLowerCase() === editCat.name.trim().toLowerCase());
    if (dup) return 'A category with this name already exists';
    return null;
  });

  async function addCat() {
    catAttempted = true;
    if (catNameError()) return;
    await addCategory({ ...newCat, name: newCat.name.trim(), sortOrder: allCats.length, isActive: true });
    await load();
    await app.refreshCategories();
    addingCat    = false;
    catAttempted = false;
    newCat = { name: '', icon: '📌', color: '#9B99B8' };
  }

  function startEdit(cat: Category) {
    editingId     = cat.id;
    editAttempted = false;
    editCat       = { name: cat.name, icon: cat.icon, color: cat.color };
    addingCat     = false;
  }

  function cancelEdit() {
    editingId     = null;
    editAttempted = false;
  }

  async function saveEdit() {
    editAttempted = true;
    if (editNameError()) return;
    await updateCategory(editingId!, { name: editCat.name.trim(), icon: editCat.icon, color: editCat.color });
    await load();
    await app.refreshCategories();
    editingId     = null;
    editAttempted = false;
  }

  async function toggleCat(cat: Category) {
    await updateCategory(cat.id, { isActive: !cat.isActive });
    await load();
    await app.refreshCategories();
  }

  const active   = $derived(allCats.filter(c => c.isActive));
  const inactive = $derived(allCats.filter(c => !c.isActive));

  const EMOJI_OPTIONS = ['🏠','🍽️','🛒','🚗','📱','💆','🎬','🛍️','📦','💰','📌','💊','✈️','🎓','⚡','🏋️','🐾','🎮','🧃','🌐','🤝','🍕','☕','🏥'];
  const COLOR_OPTIONS = ['#6C63FF','#F97316','#22C55E','#3B82F6','#8B5CF6','#EC4899','#EF4444','#F59E0B','#06B6D4','#14B8A6','#6366F1','#9B99B8'];
</script>

<div class="px-4 pt-6 pb-28 md:px-8 md:pt-8 md:max-w-2xl md:mx-auto animate-fade-in">

  <!-- Header -->
  <div class="flex items-center gap-3 mb-6">
    <a href="/settings"
       class="w-8 h-8 rounded-full bg-[var(--color-surface)] flex items-center justify-center">
      <ChevronLeft size={18} class="text-[var(--color-text-muted)]" />
    </a>
    <div class="flex-1">
      <h1 class="text-xl font-bold">Categories</h1>
      <p class="text-xs text-[var(--color-text-muted)]">{active.length} active</p>
    </div>
    <button onclick={() => { addingCat = true; catAttempted = false; editingId = null; }}
            class="flex items-center gap-1.5 bg-[var(--color-primary)]/20 text-[var(--color-primary)]
                   px-3 py-2 rounded-xl text-sm font-medium">
      <Plus size={15} /> New
    </button>
  </div>

  <!-- Add form -->
  {#if addingCat}
    <div class="bg-[var(--color-surface)] rounded-2xl p-4 mb-5 space-y-3 animate-fade-in">
      <p class="text-sm font-semibold">New Category</p>

      <div>
        <input bind:value={newCat.name} placeholder="Category name" maxlength={30}
               class="w-full bg-[var(--color-surface-2)] rounded-xl px-3 py-2.5 text-sm
                      border transition-colors focus:outline-none text-[var(--color-text)]
                      {catAttempted && catNameError()
                        ? 'border-[var(--color-expense)]'
                        : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'}" />
        {#if catAttempted && catNameError()}
          <p class="text-xs text-[var(--color-expense)] mt-1 flex items-center gap-1">
            <AlertCircle size={11} /> {catNameError()}
          </p>
        {/if}
      </div>

      <div>
        <p class="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide mb-1.5">Icon</p>
        <div class="flex flex-wrap gap-1.5">
          {#each EMOJI_OPTIONS as e}
            <button onclick={() => newCat.icon = e}
                    class="text-xl p-1.5 rounded-xl transition-colors
                           {newCat.icon === e ? 'bg-[var(--color-primary)]/20' : 'hover:bg-[var(--color-surface-2)]'}">
              {e}
            </button>
          {/each}
        </div>
      </div>

      <div>
        <p class="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide mb-1.5">Color</p>
        <div class="flex flex-wrap gap-2">
          {#each COLOR_OPTIONS as c}
            <button onclick={() => newCat.color = c}
                    class="w-7 h-7 rounded-full border-2 transition-all
                           {newCat.color === c ? 'border-white scale-110' : 'border-transparent'}"
                    style="background:{c}" aria-label="Color {c}"></button>
          {/each}
        </div>
      </div>

      <div class="flex items-center gap-3 bg-[var(--color-surface-2)] rounded-xl px-3 py-2.5">
        <span class="text-xl">{newCat.icon}</span>
        <span class="text-sm font-medium" style="color:{newCat.color}">{newCat.name || 'Preview'}</span>
      </div>

      <div class="flex gap-2">
        <button onclick={addCat}
                class="flex-1 py-3 bg-[var(--color-primary)] text-white rounded-xl text-sm font-semibold">
          Save
        </button>
        <button onclick={() => { addingCat = false; catAttempted = false; newCat = { name:'', icon:'📌', color:'#9B99B8' }; }}
                class="px-4 py-3 bg-[var(--color-surface-2)] text-[var(--color-text-muted)] rounded-xl text-sm">
          Cancel
        </button>
      </div>
    </div>
  {/if}

  <!-- Active categories -->
  <div class="bg-[var(--color-surface)] rounded-2xl overflow-hidden mb-4">
    <p class="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide px-4 pt-4 pb-2">
      Active ({active.length})
    </p>
    <div class="divide-y divide-[var(--color-border)]/40">
      {#each active as cat (cat.id)}
        <div>
          <!-- Row -->
          <div class="flex items-center gap-3 px-4 py-3">
            <div class="w-9 h-9 rounded-xl flex items-center justify-center text-xl shrink-0"
                 style="background:{cat.color}18">
              {cat.icon}
            </div>
            <span class="flex-1 text-sm font-medium">{cat.name}</span>
            <div class="w-3 h-3 rounded-full shrink-0" style="background:{cat.color}"></div>
            <button onclick={() => editingId === cat.id ? cancelEdit() : startEdit(cat)}
                    class="p-1.5 rounded-lg transition-colors
                           {editingId === cat.id
                             ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
                             : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}">
              <Pencil size={14} />
            </button>
            <button onclick={() => toggleCat(cat)}
                    class="text-xs px-2.5 py-1 rounded-lg
                           bg-[var(--color-surface-2)] text-[var(--color-text-muted)]
                           hover:text-[var(--color-expense)] transition-colors">
              Hide
            </button>
          </div>

          <!-- Inline edit form -->
          {#if editingId === cat.id}
            <div class="px-4 pb-4 space-y-3 border-t border-[var(--color-border)]/40 animate-fade-in">
              <div class="pt-3">
                <input bind:value={editCat.name} placeholder="Category name" maxlength={30}
                       class="w-full bg-[var(--color-surface-2)] rounded-xl px-3 py-2.5 text-sm
                              border transition-colors focus:outline-none text-[var(--color-text)]
                              {editAttempted && editNameError()
                                ? 'border-[var(--color-expense)]'
                                : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'}" />
                {#if editAttempted && editNameError()}
                  <p class="text-xs text-[var(--color-expense)] mt-1 flex items-center gap-1">
                    <AlertCircle size={11} /> {editNameError()}
                  </p>
                {/if}
              </div>

              <div>
                <p class="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide mb-1.5">Icon</p>
                <div class="flex flex-wrap gap-1.5">
                  {#each EMOJI_OPTIONS as e}
                    <button onclick={() => editCat.icon = e}
                            class="text-xl p-1.5 rounded-xl transition-colors
                                   {editCat.icon === e ? 'bg-[var(--color-primary)]/20' : 'hover:bg-[var(--color-surface-2)]'}">
                      {e}
                    </button>
                  {/each}
                </div>
              </div>

              <div>
                <p class="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide mb-1.5">Color</p>
                <div class="flex flex-wrap gap-2">
                  {#each COLOR_OPTIONS as c}
                    <button onclick={() => editCat.color = c}
                            class="w-7 h-7 rounded-full border-2 transition-all
                                   {editCat.color === c ? 'border-white scale-110' : 'border-transparent'}"
                            style="background:{c}" aria-label="Color {c}"></button>
                  {/each}
                </div>
              </div>

              <div class="flex items-center gap-3 bg-[var(--color-surface-2)] rounded-xl px-3 py-2.5">
                <span class="text-xl">{editCat.icon}</span>
                <span class="text-sm font-medium" style="color:{editCat.color}">{editCat.name || 'Preview'}</span>
              </div>

              <div class="flex gap-2">
                <button onclick={saveEdit}
                        class="flex-1 py-2.5 bg-[var(--color-primary)] text-white rounded-xl text-sm font-semibold">
                  Save
                </button>
                <button onclick={cancelEdit}
                        class="px-4 py-2.5 bg-[var(--color-surface-2)] text-[var(--color-text-muted)] rounded-xl text-sm">
                  Cancel
                </button>
              </div>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>

  <!-- Hidden categories -->
  {#if inactive.length > 0}
    <div class="bg-[var(--color-surface)] rounded-2xl overflow-hidden opacity-60">
      <p class="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide px-4 pt-4 pb-2">
        Hidden ({inactive.length})
      </p>
      <div class="divide-y divide-[var(--color-border)]/40">
        {#each inactive as cat (cat.id)}
          <div class="flex items-center gap-3 px-4 py-3">
            <div class="w-9 h-9 rounded-xl flex items-center justify-center text-xl shrink-0 grayscale">
              {cat.icon}
            </div>
            <span class="flex-1 text-sm text-[var(--color-text-muted)]">{cat.name}</span>
            <button onclick={() => toggleCat(cat)}
                    class="text-xs px-2.5 py-1 rounded-lg
                           bg-[var(--color-income)]/10 text-[var(--color-income)]
                           hover:bg-[var(--color-income)]/20 transition-colors">
              Show
            </button>
          </div>
        {/each}
      </div>
    </div>
  {/if}

</div>
