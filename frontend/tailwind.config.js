/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef3fb',
          100: '#d5e2f4',
          200: '#adc5e9',
          300: '#7aa1d7',
          400: '#4e7ec5',
          500: '#2c5f8f',
          600: '#1e3a5f',
          700: '#162c4a',
          800: '#0e1e33',
          900: '#070f1a',
        },
        gold: '#FFD700',
      },
    },
  },
  plugins: [],
};
