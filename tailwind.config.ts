import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        void: '#05060a',
        hull: '#0b0e17',
        plate: '#111524',
        seam: '#1e2438',
        quasar: { DEFAULT: '#ff8a3d', hot: '#ff5b2e', glow: '#ffc46b' },
        plasma: { DEFAULT: '#4de8ff', deep: '#1b9fbd' },
        horizon: { DEFAULT: '#8b6cff', deep: '#4a33b8' },
        ash: { DEFAULT: '#8f98b3', dim: '#5b6480' }
      },
      fontFamily: {
        display: ['var(--font-display)', 'ui-sans-serif', 'sans-serif'],
        body: ['var(--font-body)', 'ui-sans-serif', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace']
      },
      boxShadow: {
        rim: 'inset 0 1px 0 0 rgba(255,255,255,.06), 0 0 0 1px rgba(255,255,255,.04)',
        halo: '0 0 60px -12px rgba(255,138,61,.55)',
        cold: '0 0 44px -14px rgba(77,232,255,.6)'
      },
      keyframes: {
        drift: { '0%,100%': { transform: 'translate3d(0,0,0)' }, '50%': { transform: 'translate3d(0,-8px,0)' } },
        sweep: { '0%': { backgroundPosition: '0% 50%' }, '100%': { backgroundPosition: '200% 50%' } },
        pulseRing: { '0%': { opacity: '.9', transform: 'scale(.92)' }, '70%': { opacity: '0', transform: 'scale(1.5)' }, '100%': { opacity: '0' } },
        rise: { from: { opacity: '0', transform: 'translateY(14px)' }, to: { opacity: '1', transform: 'none' } },
        blink: { '0%,100%': { opacity: '1' }, '50%': { opacity: '.25' } }
      },
      animation: {
        drift: 'drift 7s ease-in-out infinite',
        sweep: 'sweep 6s linear infinite',
        pulseRing: 'pulseRing 2.4s cubic-bezier(.2,.7,.3,1) infinite',
        rise: 'rise .7s cubic-bezier(.16,1,.3,1) both',
        blink: 'blink 1.6s ease-in-out infinite'
      }
    }
  },
  plugins: []
};
export default config;
