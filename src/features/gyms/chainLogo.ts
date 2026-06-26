// Logos officiels des enseignes, chargés à la volée via le service de favicons
// Google (usage d'identification ; aucun fichier copié dans le dépôt).
const DOMAINS: Record<string, string> = {
  'Basic-Fit': 'basic-fit.com',
  'Fitness Park': 'fitnesspark.fr',
  'On Air': 'onair-fitness.fr',
  'Keep Cool': 'keepcool.fr',
  "L'Orange Bleue": 'lorangebleue.fr',
  Neoness: 'neoness.fr',
  'Vita Liberté': 'vitaliberte.fr',
};

export function chainLogoUrl(name?: string | null, size = 128): string | null {
  if (!name) return null;
  const domain = DOMAINS[name];
  return domain
    ? `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`
    : null;
}
