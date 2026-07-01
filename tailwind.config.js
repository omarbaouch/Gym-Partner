/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // Miroir de src/theme/colors.ts (sémantique documentée là-bas).
      colors: {
        background: '#160E0B',
        surface: '#231811',
        surfaceHigh: '#2E2018',
        border: '#3D2C20',
        primary: '#FF7A1A', // action & sélection
        ember: '#FF3D77', // live & activité
        amber: '#FFC53D', // atmosphère uniquement
        violet: '#9B6CFF', // atmosphère uniquement
        muted: '#B5A192',
        placeholder: '#9A8574',
        danger: '#FF453A', // destructif uniquement
      },
      fontFamily: {
        sans: ['Sora_500Medium'],
        head: ['Sora_700Bold'],
        display: ['Sora_800ExtraBold'],
      },
      borderRadius: {
        '4xl': '28px',
      },
    },
  },
  plugins: [],
};
