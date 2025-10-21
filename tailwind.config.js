/** @type {import('tailwindcss').Config} */
import { fontFamily } from 'tailwindcss/defaultTheme';

export default {
  content: [
    './src/app/**/*.{js,jsx,ts,tsx}',
    './src/components/**/*.{js,jsx,ts,tsx}',
    './src/hooks/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', ...fontFamily.sans],
      },
      transitionTimingFunction: {
        'ios-in': 'cubic-bezier(0.32, 0.72, 0, 1)',
        'ios-out': 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: 0, transform: 'translateY(10px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: 0, transform: 'scale(0.96)' },
          '100%': { opacity: 1, transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.35s var(--ease-ios-out)',
        'scale-in': 'scale-in 0.3s var(--ease-ios-out)',
      },
      colors: {
        background: '#020617',
        surface: '#0f172a',
        primary: '#f8fafc',
        secondary: '#94a3b8',
        accent: '#38bdf8',
        'accent-hover': '#0ea5e9',
        border: '#1e293b',
      },
    },
  },
  plugins: [],
}
