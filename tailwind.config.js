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
