import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ─── Brand ──────────────────────────────────────────────
        green: {
          DEFAULT: '#0B5138',
          mid: '#10714E',
          tint: '#E8F6EF',
          dark: '#07341F',
          light: '#D6F0E2',
        },
        gold: {
          DEFAULT: '#D9A441',
          deep: '#93641A',
          tint: '#FEF6E4',
          bright: '#F0B84A',
        },
        stone: '#68776F',
        line: '#DFE7E2',
        paper: '#FAFCFB',
        ink: {
          DEFAULT: '#0E2A1E',
          2: '#46564D',
          3: '#68776F',
        },
        alert: '#C0392B',

        // ─── Shadcn aliases ─────────────────────────────────────
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        primary: {
          DEFAULT: '#0B5138',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#E8F6EF',
          foreground: '#0B5138',
        },
        muted: {
          DEFAULT: '#E8F6EF',
          foreground: '#68776F',
        },
        accent: {
          DEFAULT: '#FEF6E4',
          foreground: '#93641A',
        },
        destructive: {
          DEFAULT: '#C0392B',
          foreground: '#FFFFFF',
        },
        border: '#DFE7E2',
        input: '#DFE7E2',
        ring: '#D9A441',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        // `font-serif` now inherits rather than switching face — see the
        // .serif rule in globals.css. Kept as a token so existing markup
        // using font-serif keeps compiling.
        serif: ['unset'],
      },
      borderRadius: {
        sm: '8px',
        md: '14px',
        lg: '22px',
        xl: '28px',
        DEFAULT: '8px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(11,81,56,.06)',
        md: '0 6px 20px -8px rgba(11,81,56,.16)',
        lg: '0 24px 50px -30px rgba(11,81,56,.34)',
        card: '0 2px 12px -4px rgba(11,81,56,.13)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.35s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'marquee': 'marquee 20s linear infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideInRight: {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        slideUp: {
          from: { transform: 'translateY(20px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
      },
      screens: {
        xs: '400px',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
