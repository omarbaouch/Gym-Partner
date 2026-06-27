/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#160E0B',
        surface: '#231811',
        surfaceHigh: '#2E2018',
        border: '#3D2C20',
        primary: '#FF7A1A', // orange vif
        ember: '#FF3D77', // rose corail
        amber: '#FFC53D',
        mint: '#2DE0C0',
        violet: '#9B6CFF',
        accent: '#FF7A1A',
        muted: '#B5A192',
        danger: '#FF4D6D',
      },
      borderRadius: {
        '4xl': '28px',
      },
    },
  },
  plugins: [],
};
