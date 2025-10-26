import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

type Theme = 'default' | 'sage' | 'ocean' | 'vintage' | 'desert';

const ThemeSwitcher: React.FC = () => {
  const [currentTheme, setCurrentTheme] = useState<Theme>('default');
  const [isOpen, setIsOpen] = useState(false);

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
    setIsOpen(false);
    
    // Save to localStorage
    localStorage.setItem('theme', theme);
  };

  // Load saved theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme) {
      applyTheme(savedTheme);
    }
  }, []);

  const themes: { value: Theme; label: string; description: string; color: string }[] = [
    {
      value: 'default',
      label: 'Warm Cream',
      description: 'Japanese-inspired warm palette',
      color: '#e09f3e'
    },
    {
      value: 'sage',
      label: 'Sage Green',
      description: 'Calm sage green palette',
      color: '#96A78D'
    },
    {
      value: 'ocean',
      label: 'Ocean Breeze',
      description: 'Calm teal and mint palette',
      color: '#708993'
    },
    {
      value: 'vintage',
      label: 'Vintage Warm',
      description: 'Muted earth tones palette',
      color: '#B6AE9F'
    },
    {
      value: 'desert',
      label: 'Desert Sunset',
      description: 'Warm terracotta palette',
      color: '#B77466'
    }
  ];

  const currentThemeLabel = themes.find(t => t.value === currentTheme)?.label || 'Default';

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 min-w-[140px] justify-between"
        aria-label="Switch theme"
      >
        <span className="flex items-center gap-2">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-4 w-4" 
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
          {currentThemeLabel}
        </span>
        <svg 
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-64 bg-card-elevated border border-border rounded-lg shadow-lg z-20">
            <div className="p-2">
              {themes.map((theme) => (
                <button
                  key={theme.value}
                  onClick={() => applyTheme(theme.value)}
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors flex items-start gap-3 ${
                    currentTheme === theme.value
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-accent/50 text-foreground'
                  }`}
                >
                                     {/* Theme color preview */}
                   <div 
                     className="w-4 h-4 rounded-full mt-0.5 flex-shrink-0"
                     style={{ backgroundColor: theme.color }}
                     aria-hidden="true"
                   />
                  
                  <div className="flex-1">
                    <div className="font-medium">{theme.label}</div>
                    <div className="text-xs opacity-70">{theme.description}</div>
                  </div>

                  {/* Checkmark */}
                  {currentTheme === theme.value && (
                    <svg 
                      className="h-5 w-5 flex-shrink-0" 
                      fill="currentColor" 
                      viewBox="0 0 20 20"
                    >
                      <path 
                        fillRule="evenodd" 
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                        clipRule="evenodd" 
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ThemeSwitcher;
