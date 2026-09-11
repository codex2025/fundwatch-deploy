/** @type {import('tailwindcss').Config} */

// All values below resolve to CSS custom properties declared in src/index.css.
// Tokens live in exactly one place; nothing here should be a literal colour.
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          elevated: 'var(--bg-elevated)',
          sunken: 'var(--bg-sunken)',
          inset: 'var(--bg-inset)',
        },
        content: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          inverse: 'var(--text-inverse)',
        },
        line: {
          subtle: 'var(--border-subtle)',
          DEFAULT: 'var(--border-default)',
          strong: 'var(--border-strong)',
        },
        accent: {
          DEFAULT: 'var(--accent-primary)',
          hover: 'var(--accent-hover)',
          dim: 'var(--accent-dim)',
          surface: 'var(--accent-surface)',
          border: 'var(--accent-border)',
        },
        risk: {
          critical: 'var(--risk-critical)',
          high: 'var(--risk-high)',
          medium: 'var(--risk-medium)',
          low: 'var(--risk-low)',
          cold: 'var(--risk-cold)',
          info: 'var(--risk-info)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        // Restrained type scale -- no hero sizes inside application screens.
        '2xs': ['10px', { lineHeight: '14px', letterSpacing: '0.06em' }],
        'xs': ['11px', { lineHeight: '16px' }],
        'sm': ['12px', { lineHeight: '18px' }],
        'base': ['13px', { lineHeight: '20px' }],
        'md': ['14px', { lineHeight: '21px' }],
        'lg': ['16px', { lineHeight: '24px' }],
        'xl': ['19px', { lineHeight: '26px' }],
        '2xl': ['23px', { lineHeight: '30px' }],
        '3xl': ['28px', { lineHeight: '34px' }],
        '4xl': ['34px', { lineHeight: '40px' }],
      },
      spacing: {
        1: 'var(--space-1)',
        2: 'var(--space-2)',
        3: 'var(--space-3)',
        4: 'var(--space-4)',
        5: 'var(--space-5)',
        6: 'var(--space-6)',
        8: 'var(--space-8)',
        10: 'var(--space-10)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius-md)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        raised: 'var(--shadow-raised)',
        overlay: 'var(--shadow-overlay)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(12px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 160ms ease-out both',
        'slide-in-right': 'slideInRight 200ms cubic-bezier(0.16, 1, 0.3, 1) both',
      },
      zIndex: {
        header: '30',
        sidebar: '40',
        drawer: '50',
        modal: '60',
        palette: '70',
      },
    },
  },
  plugins: [],
}
