// Identité visuelle "Ember Pop" — chaude, vive et joyeuse (sunset candy).
// Source unique de vérité : changer ces valeurs (et tailwind.config.js) suffit
// à re-thématiser toute l'application.
export const colors = {
  background: '#160E0B', // noir chaud
  surface: '#231811',
  surfaceHigh: '#2E2018',
  border: '#3D2C20',
  primary: '#FF7A1A', // orange vif
  ember: '#FF3D77', // rose corail
  amber: '#FFC53D', // jaune doré
  mint: '#2DE0C0', // menthe (contraste frais)
  violet: '#9B6CFF', // violet doux
  text: '#FFFFFF',
  muted: '#B5A192',
  danger: '#FF4D6D',
};

// Dégradés vifs (expo-linear-gradient attend un tableau de couleurs).
export const gradients = {
  brand: ['#FFC53D', '#FF7A1A', '#FF3D77'] as const, // jaune→orange→rose
  ember: ['#FF7A1A', '#FF3D77'] as const,
  candy: ['#FF3D77', '#9B6CFF'] as const, // rose→violet
  fresh: ['#2DE0C0', '#FF7A1A'] as const, // menthe→orange
  dark: ['#231811', '#160E0B'] as const,
  glow: ['rgba(255,122,26,0.34)', 'rgba(22,14,11,0)'] as const,
};

// Palette joyeuse multi-teintes pour les tags (objectifs, etc.).
export const accents = [
  '#FF7A1A', // orange
  '#FF3D77', // rose corail
  '#FFC53D', // jaune
  '#FF5FA2', // rose bonbon
  '#2DE0C0', // menthe
  '#9B6CFF', // violet
  '#4EA8FF', // bleu ciel
];

// Couleur stable et colorée pour un libellé (même objectif → même couleur).
export function goalColor(label: string): string {
  let h = 0;
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) >>> 0;
  return accents[h % accents.length];
}
