/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#140D0A',
        surface: '#201610',
        surfaceHigh: '#2A1E16',
        border: '#38291E',
        primary: '#FF6A1A', // orange
        ember: '#FF2E63', // corail
        amber: '#FFB627',
        accent: '#FF6A1A',
        muted: '#A89388',
        danger: '#FF4D6D',
      },
      borderRadius: {
        '4xl': '28px',
      },
    },
  },
  plugins: [],
};
