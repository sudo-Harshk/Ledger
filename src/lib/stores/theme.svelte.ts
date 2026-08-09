const THEME_COLORS = {
  dark:  '#0F0F14',
  light: '#F2EEE8',
};

class ThemeStore {
  current = $state<'dark' | 'light'>('dark');

  private applyMeta() {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', THEME_COLORS[this.current]);
  }

  init() {
    if (typeof localStorage === 'undefined') return;
    const saved = localStorage.getItem('theme') as 'dark' | 'light' | null;
    this.current = saved ?? 'dark';
    document.documentElement.classList.toggle('light', this.current === 'light');
    this.applyMeta();
  }

  toggle() {
    this.current = this.current === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.toggle('light', this.current === 'light');
    localStorage.setItem('theme', this.current);
    this.applyMeta();
  }
}

export const themeStore = new ThemeStore();
