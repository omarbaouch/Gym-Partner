// Construit une ligne secondaire lisible pour distinguer deux salles d'une
// même enseigne (ex. deux "Basic-Fit"). Combine adresse, code postal, ville.
export function gymSubtitle(g: {
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
}): string {
  const parts = [g.address, [g.postal_code, g.city].filter(Boolean).join(' ')]
    .map((p) => (p ?? '').trim())
    .filter(Boolean);
  return parts.join(' · ') || g.city || 'Adresse non renseignée';
}

// Distance lisible.
export function formatDistance(m?: number | null): string {
  if (m == null) return '';
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}
