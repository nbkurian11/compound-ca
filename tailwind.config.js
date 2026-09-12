/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: { ink: '#071311', panel: '#0d201d', teal: '#31d3b2' },
      boxShadow: { glow: '0 0 45px rgba(49, 211, 178, 0.12)' },
    },
  },
  plugins: [],
}
