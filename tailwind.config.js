/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#4F6EF7',
          secondary: '#7C3AED',
          accent: '#10B981',
          warn: '#F59E0B',
          danger: '#EF4444',
        },
        surface: {
          DEFAULT: '#0A0E27',
          card: '#141832',
          elevated: '#1E2447',
          border: '#2A3060',
        },
        text: {
          primary: '#F1F5FF',
          secondary: '#8892B0',
          muted: '#4A5578',
        },
        konnect: {
          gold: '#F6C90E',
          silver: '#94A3B8',
          bronze: '#C97B3A',
        },
        gradient: {
          'from-navy': '#0A0E27',
          'via-navy': '#0F1535',
          'to-card': '#141832',
        },
        glass: {
          surface: 'rgba(255,255,255,0.04)',
          border: 'rgba(255,255,255,0.08)',
          highlight: 'rgba(255,255,255,0.12)',
        },
      },
      boxShadow: {
        'glow-primary': '0 0 20px rgba(79,110,247,0.3)',
        'glow-gold': '0 0 20px rgba(246,201,14,0.25)',
        'glow-accent': '0 0 20px rgba(16,185,129,0.25)',
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
        '4xl': '32px',
        'full': '9999px',
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px' }],
        'xs': ['12px', { lineHeight: '16px' }],
        'sm': ['14px', { lineHeight: '20px' }],
        'base': ['16px', { lineHeight: '24px' }],
        'lg': ['18px', { lineHeight: '28px' }],
        'xl': ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['30px', { lineHeight: '36px' }],
        '4xl': ['36px', { lineHeight: '40px' }],
      },
      spacing: {
        '18': '72px',
        '22': '88px',
      },
      fontFamily: {
        sans: ['Inter', 'System'],
        medium: ['Inter-Medium', 'System'],
        semibold: ['Inter-SemiBold', 'System'],
        bold: ['Inter-Bold', 'System'],
        heading: ['Inter-Bold', 'System'],
      },
    },
  },
  plugins: [],
};
