/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
		container: {
			center: true,
			padding: {
				DEFAULT: '1rem',
				sm: '1rem',
				md: '1.5rem',
				lg: '2rem',
				xl: '2rem',
				'2xl': '3rem'
			},
			screens: {
				'2xl': '1280px'
			}
		},
		extend: {
			fontFamily: {
				display: ['Blackflag', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'],
				sans: ['ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'],
				mono: ['Roboto Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace']
			},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			// New color palette
  			'palette-dark-teal': 'hsl(var(--palette-dark-teal))',
  			'palette-light-cream': 'hsl(var(--palette-light-cream))',
  			'palette-golden': 'hsl(var(--palette-golden))',
  			'palette-deep-red': 'hsl(var(--palette-deep-red))',
  			'palette-dark-red': 'hsl(var(--palette-dark-red))',
  			
  			// Color layering system
  			'bg-base': 'hsl(var(--background-base))',
  			'bg-1': 'hsl(var(--background-1))',
  			'bg-2': 'hsl(var(--background-2))',
  			'bg-3': 'hsl(var(--background-3))',
  			'card-elevated': 'hsl(var(--card-elevated))',
  			'card-base': 'hsl(var(--card-base))',
  			'card-deep': 'hsl(var(--card-deep))',
  			'input-elevated': 'hsl(var(--input-elevated))',
  			'input-base': 'hsl(var(--input-base))',
  			'input-deep': 'hsl(var(--input-deep))',
  			
  			// Confetti colors
  			'confetti-1': 'hsl(var(--confetti-1))',
  			'confetti-2': 'hsl(var(--confetti-2))',
  			'confetti-3': 'hsl(var(--confetti-3))',
  			'confetti-4': 'hsl(var(--confetti-4))',
  			
  			// Toast colors
  			'toast-bg': 'hsl(var(--toast-bg))',
  			'toast-text': 'hsl(var(--toast-text))',
  			'toast-success': 'hsl(var(--toast-success))',
  			'toast-error': 'hsl(var(--toast-error))',
  			
  			// Tooltip colors
  			'tooltip-bg': 'hsl(var(--tooltip-bg))',
  			'tooltip-text': 'hsl(var(--tooltip-text))'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
