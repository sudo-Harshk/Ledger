class ThemeStore {
  current = $state<'dark' | 'light'>('dark');

  init() {
    if (typeof localStorage === 'undefined') return;
    const saved = localStorage.getItem('theme') as 'dark' | 'light' | null;
    this.current = saved ?? 'dark';
    document.documentElement.classList.toggle('light', this.current === 'light');
  }

  toggle() {
    this.current = this.current === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.toggle('light', this.current === 'light');
    localStorage.setItem('theme', this.current);
  }
}

export const themeStore = new ThemeStore();
