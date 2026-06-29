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
  'One Fitness Club': 'onefitnessclub.fr',
};

export function chainLogoUrl(name?: string | null, size = 128): string | null {
  if (!name) return null;
  const domain = DOMAINS[name];
  if (!domain) return null;
  // URL d'image directe (PNG) : la cible du service faviconV2 de Google, servie
  // par gstatic. On l'appelle directement pour éviter la redirection 301 de
  // www.google.com/s2/favicons, moins fiable côté expo-image.
  return (
    `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON` +
    `&fallback_opts=TYPE,SIZE,URL&size=${size}&url=https://${domain}`
  );
}
