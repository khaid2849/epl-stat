/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#0c0c0c', light: '#1a1a1a', border: '#2a2a2a' },
        surface: { DEFAULT: '#1a1a1a', hover: '#222222', muted: '#111111' },
        'pl-purple': { DEFAULT: '#37003C', light: '#5C0070' },
        gold: '#FFD700',
      },
      backgroundImage: {
        'hero-texture': "repeating-linear-gradient(135deg, transparent, transparent 40px, rgba(255,255,255,0.018) 40px, rgba(255,255,255,0.018) 80px)",
      },
    }
  },
  plugins: []
}
