// Logos des enseignes.
// Source de vérité : `gym_chains.logo_url` (renseigné en base par la migration
// 0012). En secours, on reconstruit l'URL localement à partir du nom, via le
// service de favicons Google (usage d'identification ; aucun fichier copié
// dans le dépôt). La correspondance nom → domaine est NORMALISÉE (casse,
// accents, ponctuation) pour que « KeepCool », « Basic Fit » ou « L'ORANGE
// BLEUE » retrouvent leur logo.

// Clés = noms d'enseigne normalisés par normalizeChainName().
const DOMAINS: Record<string, string> = {
  basicfit: 'basic-fit.com',
  fitnesspark: 'fitnesspark.fr',
  onair: 'onair-fitness.fr',
  keepcool: 'keepcool.fr',
  lorangebleue: 'lorangebleue.fr',
  orangebleue: 'lorangebleue.fr',
  neoness: 'neoness.fr',
  vitaliberte: 'vitaliberte.fr',
  onefitnessclub: 'onefitnessclub.fr',
  onefitness: 'onefitnessclub.fr',
  magicform: 'magicform.fr',
  anytimefitness: 'anytimefitness.fr',
  gigafit: 'gigafit.fr',
  cmgsportsclub: 'cmgsportsclub.com',
  wellnesssportclub: 'wellness-sportclub.fr',
  libertygym: 'liberty-gym.com',
};

// Miroir TypeScript de `public.norm_gym_name()` (migration 0012) : minuscules,
// sans accents, sans ponctuation. Les deux implémentations doivent rester
// alignées pour que app et base dédupliquent/rattachent de la même façon.
export function normalizeChainName(name?: string | null): string {
  return (name ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

// URL d'image directe (PNG) : la cible du service faviconV2 de Google, servie
// par gstatic. On l'appelle directement pour éviter la redirection 301 de
// www.google.com/s2/favicons, moins fiable côté expo-image.
function faviconUrl(domain: string, size: number): string {
  return (
    `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON` +
    `&fallback_opts=TYPE,SIZE,URL&size=${size}&url=https://${domain}`
  );
}

export function chainLogoUrl(name?: string | null, size = 128): string | null {
  const key = normalizeChainName(name);
  if (!key) return null;
  const domain =
    DOMAINS[key] ??
    // Libellés composés (« Basic-Fit Strasbourg Dumas », « Keep Cool Neudorf »).
    Object.entries(DOMAINS).find(([alias]) => key.includes(alias))?.[1];
  return domain ? faviconUrl(domain, size) : null;
}

// Logo d'une salle : priorité au logo_url stocké en base sur gym_chains,
// sinon reconstruction locale depuis le nom d'enseigne.
export function gymLogoUrl(g: {
  chain_logo_url?: string | null;
  chain_name?: string | null;
}): string | null {
  return g.chain_logo_url ?? chainLogoUrl(g.chain_name);
}
