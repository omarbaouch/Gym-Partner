// Identité visuelle « Ember Pop » — chaude, vive, sur noir profond.
// Source unique de vérité : AUCUN hex ne doit vivre dans les écrans.
//
// SÉMANTIQUE (une couleur = un sens, pas de double emploi) :
//   primary  → actions, sélection, liens. Rien d'autre.
//   ember    → le « live » : présence, activité temps réel, non-lus.
//   danger   → destructif uniquement (supprimer, bloquer). Vrai rouge,
//              toujours doublé d'une icône (jamais la couleur seule).
//   muted    → texte secondaire ; placeholder = sa version atténuée chaude.
//   amber / violet → atmosphère uniquement (fond vivant, dégradés). Pas d'UI.
export const colors = {
  background: '#160E0B', // noir chaud
  surface: '#231811',
  surfaceHigh: '#2E2018',
  border: '#3D2C20',
  primary: '#FF7A1A', // orange vif — action & sélection
  ember: '#FF3D77', // rose corail — live & activité
  amber: '#FFC53D', // atmosphère (fond, dégradés)
  violet: '#9B6CFF', // atmosphère (fond, dégradés)
  text: '#FFFFFF',
  muted: '#B5A192',
  placeholder: '#9A8574', // gris CHAUD (4.9:1 sur surface) — pas de gris froid
  danger: '#FF453A', // vrai rouge (5.6:1 sur fond), distinct d'ember
};

// Dégradés. RÈGLE : gradients.brand est réservé à TROIS moments —
// le logo, le CTA primaire (Button), et l'écran de match. Partout ailleurs,
// traitements solides (une signature se protège en ne la diluant pas).
export const gradients = {
  brand: ['#FFC53D', '#FF7A1A', '#FF3D77'] as const, // jaune→orange→rose
  dark: ['#231811', '#160E0B'] as const, // couvertures discrètes (profil)
  glow: ['rgba(255,122,26,0.34)', 'rgba(22,14,11,0)'] as const,
};

// Palette multi-teintes des tags d'objectifs (identité joyeuse des profils)
// et du confetti de match. C'est ICI que vivent les teintes secondaires.
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

// 3 couleurs de halo (Blob 1/2/3 de LivingBackground) selon le moment de la
// journée — réutilise uniquement les teintes existantes, aucune couleur nouvelle.
export type TimeOfDayColors = readonly [string, string, string];

export function getTimeOfDayColors(date: Date = new Date()): TimeOfDayColors {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return [colors.amber, colors.primary, colors.ember] as const; // matin
  if (hour >= 11 && hour < 18) return [colors.primary, colors.ember, colors.violet] as const; // jour
  return [colors.ember, colors.violet, colors.violet] as const; // soir/nuit
}
