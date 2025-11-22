import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

type Theme = 'default' | 'sage' | 'ocean' | 'vintage' | 'desert';

interface ThemeSwitcherProps {
  variant?: 'default' | 'footer';
}

const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ variant = 'default' }) => {
  const [currentTheme, setCurrentTheme] = useState<Theme>('default');

  const themes: { 
    value: Theme; 
    label: string;
    colors: string[];
  }[] = [
    {
      value: 'default',
      label: 'Warm Cream',
      colors: ['#FDF6F0', '#FFE1AF', '#F87171', '#F87171']
    },
    {
      value: 'sage',
      label: 'Sage Green',
      colors: ['#D9E9CF', '#B6CEB4', '#F0F0F0', '#96A78D']
    },
    {
      value: 'ocean',
      label: 'Ocean Breeze',
      colors: ['#E7F2EF', '#A1C2BD', '#708993', '#19183B']
    },
    {
      value: 'vintage',
      label: 'Vintage Warm',
      colors: ['#FBF3D1', '#DEDED1', '#C5C7BC', '#B6AE9F']
    },
    {
      value: 'desert',
      label: 'Desert Sunset',
      colors: ['#FFE1AF', '#E2B59A', '#957C62', '#B77466']
    }
  ];

  // Apply theme
  const applyTheme = (theme: Theme, showToast = true) => {
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

    // Show subtle toast notification only if explicitly requested
    if (showToast) {
      const themeLabel = themes.find(t => t.value === theme)?.label || 'Default';
      toast.success(`Switched to ${themeLabel}`, {
        duration: 1500,
        style: { fontSize: '14px' },
      });
    }
  };

  // On mount, load theme from localStorage (one-time, no double-set)
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme) {
      applyTheme(savedTheme, false); // Don't show toast initially
    }
  }, []);

  // Footer variant - compact vertical design
  if (variant === 'footer') {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 mb-1">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-3.5 w-3.5 text-palette-dark-teal" 
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
          <span className="text-xs font-semibold text-palette-dark-teal uppercase tracking-wide">
            Theme
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {themes.map((theme) => (
            <button
              key={theme.value}
              onClick={() => applyTheme(theme.value)}
              className="relative group transition-all duration-200"
              aria-label={`Switch to ${theme.label} theme`}
              title={theme.label}
            >
              {/* Color Swatch */}
              <div className={`
                relative w-8 h-8 rounded-md overflow-hidden
                ring-2 transition-all duration-200
                ${currentTheme === theme.value 
                  ? 'ring-palette-golden shadow-md ring-offset-1 ring-offset-white' 
                  : 'ring-transparent hover:ring-palette-golden/40'
                }
              `}>
                {/* Gradient Background */}
                <div 
                  className="absolute inset-0 flex"
                  style={{
                    background: `linear-gradient(135deg, ${theme.colors[0]}, ${theme.colors[1]})`
                  }}
                >
                  <div 
                    className="w-1/2 h-full"
                    style={{ backgroundColor: theme.colors[2] }}
                  />
                  <div 
                    className="w-1/2 h-full border-l border-white/30"
                    style={{ backgroundColor: theme.colors[3] }}
                  />
                </div>

                {/* Active Checkmark */}
                {currentTheme === theme.value && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                    <svg 
                      className="w-3.5 h-3.5 text-white drop-shadow-md" 
                      fill="currentColor" 
                      viewBox="0 0 20 20"
                    >
                      <path 
                        fillRule="evenodd" 
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                        clipRule="evenodd" 
                      />
                    </svg>
                  </div>
                )}

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-200" />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Default variant - original design
  return (
    <div className="flex items-center gap-3 bg-white/80 backdrop-blur-md rounded-xl px-3 py-2 border border-palette-golden/30 shadow-lg">
      {/* Label */}
      <div className="flex items-center gap-2">
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
        <span className="text-xs font-semibold text-palette-dark-teal uppercase tracking-wide hidden sm:inline">
          Theme
        </span>
      </div>

      {/* Divider */}
      <div className="h-8 w-px bg-palette-golden/40"></div>

      {/* Theme Swatches */}
      <div className="flex items-center gap-2">
        {themes.map((theme) => (
          <button
            key={theme.value}
            onClick={() => applyTheme(theme.value)}
            className={`
              relative group
              transition-all duration-300 ease-out
              ${currentTheme === theme.value 
                ? 'scale-110' 
                : 'hover:scale-105'
              }
            `}
            aria-label={`Switch to ${theme.label} theme`}
            title={theme.label}
          >
            {/* Color Swatch */}
            <div className={`
              relative w-10 h-10 rounded-lg overflow-hidden
              ring-2 ring-offset-2 ring-offset-white
              transition-all duration-300
              ${currentTheme === theme.value 
                ? 'ring-palette-golden shadow-xl' 
                : 'ring-transparent hover:ring-palette-golden/50'
              }
            `}>
              {/* Gradient Background */}
              <div 
                className="absolute inset-0 flex"
                style={{
                  background: `linear-gradient(135deg, ${theme.colors[0]}, ${theme.colors[1]})`
                }}
              >
                <div 
                  className="w-1/2 h-full"
                  style={{ backgroundColor: theme.colors[2] }}
                />
                <div 
                  className="w-1/2 h-full border-l-2 border-white/30"
                  style={{ backgroundColor: theme.colors[3] }}
                />
              </div>

              {/* Active Checkmark */}
              {currentTheme === theme.value && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <svg 
                    className="w-5 h-5 text-white drop-shadow-lg" 
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                  >
                    <path 
                      fillRule="evenodd" 
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                      clipRule="evenodd" 
                    />
                  </svg>
                </div>
              )}

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300" />
            </div>

            {/* Active Pulse Animation */}
            {currentTheme === theme.value && (
              <span className="absolute -inset-1 rounded-lg bg-palette-golden/30 animate-ping opacity-75 -z-10" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ThemeSwitcher;
