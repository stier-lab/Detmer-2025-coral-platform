/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Primary ocean palette - deep, authoritative blues
        ocean: {
          50: '#f0f7fb',
          100: '#dceef7',
          200: '#b8dcef',
          300: '#7fc2e3',
          400: '#3ea3d4',
          500: '#2e86ab',
          600: '#1a6b8f',
          700: '#1a5276',
          800: '#0f3f5e',
          900: '#0a3d62',
          950: '#051b2c',
        },
        // Coral accent - warm, attention-drawing
        coral: {
          50: '#fef6f3',
          100: '#fdeae3',
          200: '#fbd4c7',
          300: '#f5ae97',
          400: '#e07a5f',
          500: '#d4603e',
          600: '#c04d2e',
          700: '#9f3f28',
          800: '#833627',
          900: '#6d3026',
        },
        // Teal accent - growth, positive outcomes
        teal: {
          50: '#f0fdf9',
          100: '#ccfbef',
          200: '#99f6e0',
          300: '#5ceacd',
          400: '#2dd4b5',
          500: '#2a9d8f',
          600: '#1a7a6e',
          700: '#186159',
          800: '#184e49',
          900: '#18413d',
        },
        // Amber - warnings, caution
        amber: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#f4a261',
          500: '#e09f3e',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        // Neutral sand - warm grays for backgrounds
        sand: {
          50: '#fdfcfb',
          100: '#faf8f5',
          200: '#f5f0e8',
          300: '#ebe4d8',
          400: '#d9cfc0',
          500: '#c4b9a8',
        },
        // Slate - for text hierarchy
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        body: ['Source Serif 4', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'display-xl': ['3.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display-lg': ['2.75rem', { lineHeight: '1.15', letterSpacing: '-0.015em' }],
        'display-md': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        'display-sm': ['1.75rem', { lineHeight: '1.25', letterSpacing: '-0.005em' }],
        'body-lg': ['1.125rem', { lineHeight: '1.75' }],
        'body-md': ['1rem', { lineHeight: '1.7' }],
        'body-sm': ['0.875rem', { lineHeight: '1.6' }],
        'caption': ['0.8125rem', { lineHeight: '1.5' }],
        'overline': ['0.75rem', { lineHeight: '1.5', letterSpacing: '0.08em' }],
      },
      spacing: {
        'section': '5rem',
        'section-lg': '7rem',
      },
      borderRadius: {
        'card': '1rem',
        'card-lg': '1.25rem',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(10, 61, 98, 0.04), 0 4px 12px rgba(10, 61, 98, 0.06)',
        'card-hover': '0 4px 12px rgba(10, 61, 98, 0.08), 0 12px 28px rgba(10, 61, 98, 0.1)',
        'elevated': '0 8px 24px rgba(10, 61, 98, 0.1), 0 2px 6px rgba(10, 61, 98, 0.05)',
        'inner-light': 'inset 0 1px 2px rgba(255, 255, 255, 0.1)',
      },
      animation: {
        'fade-up': 'fadeUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-in': 'slideIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
};
