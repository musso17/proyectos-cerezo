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
      colors: {
        background: '#F7F8FA',
        surface: '#FFFFFF',
        primary: '#2E2E2E',
        secondary: '#6B7280',
        accent: '#6C63FF',
        'accent-hover': '#5851D3',
        border: '#E5E7EB',
        'status-recording': '#4C8EF7',
        'status-editing': '#6C63FF',
        'status-review': '#FFB020',
        'status-delivered': '#4CAF50',
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
        'modal-pop': {
          '0%': { opacity: 0, transform: 'translateY(18px) scale(0.95)' },
          '60%': { opacity: 1, transform: 'translateY(-4px) scale(1.01)' },
          '100%': { opacity: 1, transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.35s var(--ease-ios-out)',
        'scale-in': 'scale-in 0.3s var(--ease-ios-out)',
        'modal-pop': 'modal-pop 0.22s var(--ease-ios-out)',
      },
    },
  },
  plugins: [],
}
