/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        background: '#0f0f0f',
        surface: '#1a1a1a',
        border: '#2a2a2a',
        gold: {
          DEFAULT: '#d4a017',
          light: '#e8c547',
          dark: '#a07812',
        },
        text: {
          primary: '#e8e8e8',
          secondary: '#9a9a9a',
          muted: '#5a5a5a',
        },
        success: '#22c55e',
        danger: '#ef4444',
        warning: '#f59e0b',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(212, 160, 23, 0.25), 0 10px 30px rgba(0, 0, 0, 0.35)',
      },
      backgroundImage: {
        'gold-radial': 'radial-gradient(circle at top, rgba(212,160,23,0.16), transparent 50%)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
