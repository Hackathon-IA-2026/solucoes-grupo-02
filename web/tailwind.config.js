/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    screens: { sm: '640px', md: '880px', lg: '1080px', xl: '1280px' },
    extend: {
      colors: {
        navy: { DEFAULT: 'var(--navy)', 2: 'var(--navy-2)' },
        brand: { DEFAULT: 'var(--brand)', soft: 'var(--brand-soft)' },
        paper: 'var(--paper)',
        surface: { DEFAULT: 'var(--surface)', 2: 'var(--surface-2)' },
        line: { DEFAULT: 'var(--line)', strong: 'var(--line-strong)' },
        ink: { DEFAULT: 'var(--text)', 2: 'var(--text-2)', 3: 'var(--text-3)' },
        danger: { DEFAULT: 'var(--danger)', soft: 'var(--danger-soft)' },
        warn: { DEFAULT: 'var(--warn)', soft: 'var(--warn-soft)' },
        ok: { DEFAULT: 'var(--ok)', soft: 'var(--ok-soft)' },
        accent: { DEFAULT: 'var(--accent)', on: 'var(--on-accent)' },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        display: ['Archivo', '"IBM Plex Sans"', '-apple-system', 'sans-serif'],
      },
      borderRadius: { sm: '4px', md: '8px', lg: '16px' },
      boxShadow: { pop: 'var(--shadow-pop)' },
      keyframes: {
        blink: { '0%,60%,100%': { opacity: '.25' }, '30%': { opacity: '1' } },
      },
      animation: { blink: 'blink 1.1s infinite' },
    },
  },
  plugins: [],
};
