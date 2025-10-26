import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

type Theme = 'default' | 'sage' | 'ocean' | 'vintage' | 'desert';

const ThemeSwitcher: React.FC = () => {
  const [currentTheme, setCurrentTheme] = useState<Theme>('default');

  const themes: { 
    value: Theme; 
    label: string; 
    emoji: string;
    gradient: string;
  }[] = [
    {
      value: 'default',
      label: 'Warm Cream',
      emoji: '☀️',
      gradient: 'from-yellow-200 to-orange-200'
    },
    {
      value: 'sage',
      label: 'Sage Green',
      emoji: '🌿',
      gradient: 'from-green-200 to-emerald-200'
    },
    {
      value: 'ocean',
      label: 'Ocean Breeze',
      emoji: '🌊',
      gradient: 'from-cyan-200 to-blue-200'
    },
    {
      value: 'vintage',
      label: 'Vintage Warm',
      emoji: '📜',
      gradient: 'from-amber-200 to-stone-200'
    },
    {
      value: 'desert',
      label: 'Desert Sunset',
      emoji: '🏜️',
      gradient: 'from-orange-200 to-rose-200'
    }
  ];

  // Get current theme from HTML class
  useEffect(() => {
    const htmlEl = document.documentElement;
    if (htmlEl.classList.contains('theme-desert')) {
      setCurrentTheme('desert');
    } else if (htmlEl.classList.contains('theme-vintage')) {
      setCurrentTheme('vintage');
    } else if (htmlEl.classList.contains('theme-ocean')) {
      setCurrentTheme('ocean');
    } else if (htmlEl.classList.contains('theme-sage')) {
      setCurrentTheme('sage');
    } else {
      setCurrentTheme('default');
    }
  }, []);

  // Apply theme
  const applyTheme = (theme: Theme) => {
    const htmlEl = document.documentElement;
    
    // Remove all theme classes
    htmlEl.classList.remove('theme-sage', 'theme-ocean', 'theme-vintage', 'theme-desert');
    
    // Add the selected theme class
    if (theme === 'sage') {
      htmlEl.classList.add('theme-sage');
    } else if (theme === 'ocean') {
      htmlEl.classList.add('theme-ocean');
    } else if (theme === 'vintage') {
      htmlEl.classList.add('theme-vintage');
    } else if (theme === 'desert') {
      htmlEl.classList.add('theme-desert');
    }
    
    setCurrentTheme(theme);
    
    // Save to localStorage
    localStorage.setItem('theme', theme);
    
    // Show subtle toast notification
    const themeLabel = themes.find(t => t.value === theme)?.label || 'Default';
    toast.success(`Switched to ${themeLabel}`, {
      duration: 1500,
      style: { fontSize: '14px' }
    });
  };

  // Load saved theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme) {
      const htmlEl = document.documentElement;
      htmlEl.classList.remove('theme-sage', 'theme-ocean', 'theme-vintage', 'theme-desert');
      
      if (savedTheme === 'sage') {
        htmlEl.classList.add('theme-sage');
      } else if (savedTheme === 'ocean') {
        htmlEl.classList.add('theme-ocean');
      } else if (savedTheme === 'vintage') {
        htmlEl.classList.add('theme-vintage');
      } else if (savedTheme === 'desert') {
        htmlEl.classList.add('theme-desert');
      }
      
      setCurrentTheme(savedTheme);
    }
  }, []);

  return (
    <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm rounded-full px-2 py-1.5 border border-palette-golden/20 shadow-sm">
      {/* Tooltip/Icon */}
      <div className="flex items-center gap-1.5 px-2">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-4 w-4 text-palette-dark-teal" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" 
          />
        </svg>
        <span className="text-xs font-medium text-palette-dark-teal hidden sm:inline">
          Theme
        </span>
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-palette-golden/30"></div>

      {/* Theme Buttons */}
      <div className="flex items-center gap-1">
        {themes.map((theme) => (
          <button
            key={theme.value}
            onClick={() => applyTheme(theme.value)}
            className={`
              relative w-9 h-9 rounded-full flex items-center justify-center
              transition-all duration-300 ease-out
              group
              ${currentTheme === theme.value 
                ? 'scale-110 ring-2 ring-palette-golden shadow-lg' 
                : 'hover:scale-105 hover:ring-2 hover:ring-palette-golden/50'
              }
            `}
            style={{
              background: currentTheme === theme.value
                ? `linear-gradient(135deg, hsl(var(--palette-golden) / 0.8), hsl(var(--palette-deep-red) / 0.8))`
                : 'white'
            }}
            aria-label={`Switch to ${theme.label} theme`}
            title={theme.label}
          >
            {/* Emoji */}
            <span className="text-lg leading-none transition-transform duration-300 group-hover:scale-110">
              {theme.emoji}
            </span>

            {/* Active indicator pulse */}
            {currentTheme === theme.value && (
              <span className="absolute inset-0 rounded-full bg-palette-golden opacity-20 animate-ping"></span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ThemeSwitcher;
