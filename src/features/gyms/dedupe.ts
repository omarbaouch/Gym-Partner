import { normalizeChainName } from '@/features/gyms/chainLogo';

// Filet de sécurité côté client : même si la base dédoublonne (migration 0012),
// on écarte à l'affichage toute paire « même salle » restante — même nom
// normalisé OU même enseigne, à moins de DUPLICATE_RADIUS_M l'une de l'autre.
// Les listes font ≤ 50 éléments : le O(n²) est sans enjeu.

const DUPLICATE_RADIUS_M = 150;

type GymLike = {
  name: string;
  chain_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

// Distance haversine en mètres.
export function distanceMeters(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Conserve la première occurrence de chaque salle (l'appelant fournit les
// lignes déjà triées par pertinence — ex. distance croissante).
export function dedupeGyms<T extends GymLike>(rows: T[]): T[] {
  const kept: T[] = [];
  for (const row of rows) {
    const isDupe = kept.some((k) => {
      if (
        row.latitude == null ||
        row.longitude == null ||
        k.latitude == null ||
        k.longitude == null
      ) {
        return false;
      }
      const sameIdentity =
        normalizeChainName(k.name) === normalizeChainName(row.name) ||
        (!!k.chain_id && k.chain_id === row.chain_id);
      return (
        sameIdentity &&
        distanceMeters(k.latitude, k.longitude, row.latitude, row.longitude) <
          DUPLICATE_RADIUS_M
      );
    });
    if (!isDupe) kept.push(row);
  }
  return kept;
}
