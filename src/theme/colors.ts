// Identité visuelle "Volt" — néon sportif.
// Source unique de vérité : changer ces valeurs (et tailwind.config.js) suffit
// à re-thématiser toute l'application.
export const colors = {
  background: '#0A0A0F',
  surface: '#14141C',
  surfaceHigh: '#1C1C28',
  border: '#23232F',
  volt: '#C6FF3A',
  violet: '#7C3AED',
  text: '#FFFFFF',
  muted: '#8A8A99',
  danger: '#FF4D6D',
};

// Dégradés (expo-linear-gradient attend un tableau de couleurs).
export const gradients = {
  brand: ['#C6FF3A', '#7C3AED'] as const, // volt -> violet
  violet: ['#7C3AED', '#4C1D95'] as const,
  dark: ['#14141C', '#0A0A0F'] as const,
  glow: ['rgba(124,58,237,0.35)', 'rgba(10,10,15,0)'] as const,
};
