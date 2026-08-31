/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        /* Rampe ember statique (identité de marque, thémée via
           les variables de --accent pour les usages sémantiques) */
        ember: {
          50: '#fff8ed',
          100: '#fff0d3',
          200: '#ffdda6',
          300: '#ffc475',
          400: '#ffa03c',
          500: '#fb8113',
          600: '#ec6608',
          700: '#cc500a',
          800: '#a23e0d',
          900: '#7f3210',
          925: '#5e2611',
          950: '#421b0b',
        },

        /* Tokens thématiques (basculent jour/nuit via variables CSS) */
        base: 'rgb(var(--bg-app) / <alpha-value>)',
        panelbg: 'rgb(var(--panel-bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        void: 'rgb(var(--void) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        ink: {
          DEFAULT: 'rgb(var(--text-1) / <alpha-value>)',
          2: 'rgb(var(--text-2) / <alpha-value>)',
          3: 'rgb(var(--text-3) / <alpha-value>)',
          4: 'rgb(var(--text-4) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          strong: 'rgb(var(--accent-strong) / <alpha-value>)',
          deep: 'rgb(var(--accent-deep) / <alpha-value>)',
          soft: 'rgb(var(--accent-text) / <alpha-value>)',
          bright: 'rgb(var(--accent-text-strong) / <alpha-value>)',
          pale: 'rgb(var(--accent-display) / <alpha-value>)',
          overlay: 'rgb(var(--accent-overlay) / <alpha-value>)',
        },
        success: {
          DEFAULT: 'rgb(var(--success) / <alpha-value>)',
          bright: 'rgb(var(--success-bright) / <alpha-value>)',
          deep: 'rgb(var(--success-deep) / <alpha-value>)',
        },
        warning: {
          DEFAULT: 'rgb(var(--warning) / <alpha-value>)',
          bright: 'rgb(var(--warning-bright) / <alpha-value>)',
        },
        danger: {
          DEFAULT: 'rgb(var(--danger) / <alpha-value>)',
          bright: 'rgb(var(--danger-bright) / <alpha-value>)',
          strong: 'rgb(var(--danger-strong) / <alpha-value>)',
          deep: 'rgb(var(--danger-deep) / <alpha-value>)',
        },
        info: 'rgb(var(--info) / <alpha-value>)',
        storm: {
          DEFAULT: 'rgb(var(--storm) / <alpha-value>)',
          bright: 'rgb(var(--storm-bright) / <alpha-value>)',
        },
        rarity: {
          commun: 'rgb(var(--rarity-commun) / <alpha-value>)',
          rare: 'rgb(var(--rarity-rare) / <alpha-value>)',
          epique: 'rgb(var(--rarity-epique) / <alpha-value>)',
          legendaire: 'rgb(var(--rarity-legendaire) / <alpha-value>)',
        },
      },
      fontFamily: {
        display: ['Rubik', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Rubik', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1.35rem' }],
        '3xs': ['0.625rem', { lineHeight: '1.2rem' }],
        '4xs': ['0.5625rem', { lineHeight: '1.05rem' }],
      },
      boxShadow: {
        e1: 'var(--shadow-1)',
        e2: 'var(--shadow-2)',
        e3: 'var(--shadow-3)',
        glow: 'var(--glow-accent)',
      },
      keyframes: {
        'float-up': {
          '0%': { opacity: '1', transform: 'translate(-50%, 0) scale(1)' },
          '100%': { opacity: '0', transform: 'translate(-50%, -120px) scale(1.3)' },
        },
        'toast-in': {
          '0%': { opacity: '0', transform: 'translateX(40px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pop: {
          '0%': { transform: 'scale(.6)', opacity: '0' },
          '70%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'apple-bob': {
          '0%, 100%': { transform: 'translateY(0) rotate(-6deg)' },
          '50%': { transform: 'translateY(-14px) rotate(6deg)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'drop-in': {
          '0%': { opacity: '0', transform: 'translateY(-6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-1.2deg)' },
          '50%': { transform: 'rotate(1.2deg)' },
        },
      },
      animation: {
        'float-up': 'float-up 1s ease-out forwards',
        'toast-in': 'toast-in .35s ease-out forwards',
        pop: 'pop .35s ease-out forwards',
        'apple-bob': 'apple-bob 2s ease-in-out infinite',
        shimmer: 'shimmer 2.5s linear infinite',
        'drop-in': 'drop-in .18s ease-out forwards',
        wiggle: 'wiggle .4s ease-in-out',
      },
    },
  },
  plugins: [],
};
