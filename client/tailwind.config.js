/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ember: {
          50: '#fff8ed',
          100: '#ffedd1',
          200: '#ffd9a3',
          300: '#ffc06b',
          400: '#ff9d36',
          500: '#fb8113',
          600: '#ec6608',
          700: '#c34c09',
          800: '#9b3c10',
          900: '#7c3310',
          925: '#5c2410',
          950: '#3d180a',
        },
      },
      fontFamily: {
        display: ['Rubik', 'ui-sans-serif', 'system-ui', 'sans-serif'],
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
        'pop': {
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
      },
      animation: {
        'float-up': 'float-up 1s ease-out forwards',
        'toast-in': 'toast-in .35s ease-out forwards',
        pop: 'pop .35s ease-out forwards',
        'apple-bob': 'apple-bob 2s ease-in-out infinite',
        shimmer: 'shimmer 2.5s linear infinite',
      },
    },
  },
  plugins: [],
};
