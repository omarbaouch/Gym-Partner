// Identité visuelle "Ember" — chaude, orange/corail, moderne (sunset).
// Source unique de vérité : changer ces valeurs (et tailwind.config.js) suffit
// à re-thématiser toute l'application.
export const colors = {
  background: '#140D0A', // noir chaud
  surface: '#201610',
  surfaceHigh: '#2A1E16',
  border: '#38291E',
  primary: '#FF6A1A', // orange vif
  ember: '#FF2E63', // corail / rose chaud
  amber: '#FFB627',
  text: '#FFFFFF',
  muted: '#A89388',
  danger: '#FF4D6D',
};

// Dégradés chauds (expo-linear-gradient attend un tableau de couleurs).
export const gradients = {
  brand: ['#FFB02E', '#FF6A1A', '#FF2E63'] as const, // sunset ambre→orange→corail
  ember: ['#FF6A1A', '#FF2E63'] as const,
  dark: ['#201610', '#140D0A'] as const,
  glow: ['rgba(255,106,26,0.30)', 'rgba(20,13,10,0)'] as const,
};
