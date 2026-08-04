/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        mcode: {
          bg: '#0a0e0f',
          panel: '#0d1117',
          border: '#1f2937',
          green: '#3ecf6e',
          greenBright: '#4ade80',
          blue: '#5b9dff',
          purple: '#b18aff',
          amber: '#f5c04a',
          red: '#ff6b6b',
          teal: '#2dd4bf',
          gray: '#6b7280'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'IBM Plex Mono', 'ui-monospace', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      backgroundImage: {
        'grid-dots': 'radial-gradient(rgba(62,207,110,0.07) 1px, transparent 1px)'
      },
      backgroundSize: {
        dots: '24px 24px'
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        marquee: 'marquee 30s linear infinite',
        'toast-in': 'toastIn 0.25s ease-out'
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' }
        },
        toastIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      }
    }
  },
  plugins: []
};
