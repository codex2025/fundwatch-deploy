/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0284c7',
          600: '#0369a1',
          700: '#075985',
          800: '#0c4a6e',
          900: '#082f49',
        },
        risk: {
          critical: '#ef4444',
          high: '#f97316',
          medium: '#eab308',
          low: '#22c55e',
          cold: '#94a3b8'
        },
        surface: {
          DEFAULT: '#0c1120',
          raised: '#121a2e',
          sunken: '#070a13',
          border: 'rgba(148,163,184,0.12)',
          borderHover: 'rgba(148,163,184,0.22)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Sora', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 0 0 rgba(255,255,255,0.03) inset, 0 12px 32px -12px rgba(0,0,0,0.55)',
        'card-hover': '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 20px 44px -14px rgba(0,0,0,0.65)',
        glow: '0 0 0 1px rgba(56,189,248,0.15), 0 8px 28px -6px rgba(56,189,248,0.35)',
        'glow-violet': '0 0 0 1px rgba(168,85,247,0.18), 0 8px 28px -6px rgba(168,85,247,0.35)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #38bdf8 0%, #6366f1 55%, #a855f7 100%)',
        'brand-gradient-soft': 'linear-gradient(135deg, rgba(56,189,248,0.16) 0%, rgba(99,102,241,0.16) 55%, rgba(168,85,247,0.16) 100%)',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
      },
    },
  },
  plugins: [],
}
