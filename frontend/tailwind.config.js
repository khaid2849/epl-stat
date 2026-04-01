/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#0D1117', light: '#161B22', border: '#21262D' },
        'pl-purple': { DEFAULT: '#37003C', light: '#5C0070' },
        gold: '#FFD700',
      }
    }
  },
  plugins: []
}
