/** @type {import('tailwindcss').Config} */
import { fontFamily } from 'tailwindcss/defaultTheme';

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', ...fontFamily.sans],
      },
      colors: {
        background: '#0A0A0A',
        surface: '#1A1A1A',
        primary: '#FFFFFF',
        secondary: '#858585',
        accent: '#00A3FF',
        'accent-hover': '#008FE6',
        border: '#2A2A2A',
      },
    },
  },
  plugins: [],
}