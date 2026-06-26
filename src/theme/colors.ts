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

// Palette joyeuse multi-teintes pour les tags (objectifs, etc.).
export const accents = [
  '#FF6A1A', // orange
  '#FF2E63', // corail
  '#FFB627', // ambre
  '#FF4D9D', // rose
  '#22C7B8', // turquoise chaud
  '#8B5CF6', // violet doux
];

// Couleur stable et colorée pour un libellé (même objectif → même couleur).
export function goalColor(label: string): string {
  let h = 0;
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) >>> 0;
  return accents[h % accents.length];
}
