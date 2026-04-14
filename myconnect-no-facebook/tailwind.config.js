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
          primary: '#4F6EF7',   // Royal blue — AI intelligence
          secondary: '#7C3AED', // Deep violet — trust/premium
          accent: '#10B981',    // Emerald — success/completion
          warn: '#F59E0B',      // Amber — urgency
          danger: '#EF4444',    // Red — error
        },
        surface: {
          DEFAULT: '#0A0E27',   // Deep navy bg
          card: '#141832',      // Card bg
          elevated: '#1E2447',  // Elevated card
          border: '#2A3060',    // Border
        },
        text: {
          primary: '#F1F5FF',
          secondary: '#8892B0',
          muted: '#4A5578',
        },
        konnect: {
          gold: '#F6C90E',      // Konnect Points color
          silver: '#94A3B8',
          bronze: '#C97B3A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'System'],
        heading: ['InterBold', 'System'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      },
    },
  },
  plugins: [],
};
