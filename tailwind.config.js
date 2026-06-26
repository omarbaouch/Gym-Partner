/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#0A0A0F',
        surface: '#14141C',
        surfaceHigh: '#1C1C28',
        border: '#23232F',
        primary: '#C6FF3A', // volt
        violet: '#7C3AED',
        accent: '#C6FF3A',
        muted: '#8A8A99',
        danger: '#FF4D6D',
      },
      borderRadius: {
        '4xl': '28px',
      },
    },
  },
  plugins: [],
};
