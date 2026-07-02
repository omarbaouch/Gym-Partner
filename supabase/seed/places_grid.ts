/**
 * Quadrillage adaptatif du territoire pour l'import Google Places (New).
 * Fonctions pures, testées dans __tests__/places_grid.test.ts.
 *
 * Principe : on ne quadrille que les cellules contenant au moins une commune
 * (pas de requêtes gaspillées en mer), puis chaque cellule est interrogée via
 * places:searchNearby ; si Google renvoie le maximum de résultats (20), la
 * cellule est subdivisée en 4 pour ne rien manquer dans les zones denses.
 */

export type Cell = {
  latitude: number;
  longitude: number;
  radiusM: number;
};

export type Point = { latitude: number; longitude: number };

// Taille initiale des cellules (en degrés). 0.25° ≈ 28 km N-S : le rayon
// couvre la cellule entière avec une marge de recouvrement.
export const CELL_DEG = 0.25;
// En dessous de ce rayon, on accepte la troncature à 20 résultats
// (un disque de 800 m avec plus de 20 salles est exceptionnel).
export const MIN_RADIUS_M = 800;

// Rayon (m) couvrant une cellule carrée de `deg` degrés centrée à `lat`.
export function cellRadiusM(deg: number, lat: number): number {
  const latM = deg * 111_320;
  const lngM = deg * 111_320 * Math.cos((lat * Math.PI) / 180);
  // demi-diagonale + 10 % de recouvrement
  return Math.ceil((Math.sqrt(latM ** 2 + lngM ** 2) / 2) * 1.1);
}

// Cellules initiales : une par carreau de `deg`° contenant au moins un point
// (les centres des communes françaises — métropole + outre-mer).
export function cellsFromPoints(points: Point[], deg = CELL_DEG): Cell[] {
  const seen = new Set<string>();
  const cells: Cell[] = [];
  for (const p of points) {
    const ky = Math.floor(p.latitude / deg);
    const kx = Math.floor(p.longitude / deg);
    const key = `${ky}:${kx}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const latitude = (ky + 0.5) * deg;
    const longitude = (kx + 0.5) * deg;
    cells.push({ latitude, longitude, radiusM: cellRadiusM(deg, latitude) });
  }
  return cells;
}

// Cellules « densification » : carreaux fins (`deg`°) contenant au moins
// `minPoints` salles déjà connues. Sert à compléter les zones urbaines après
// une première passe nationale, sans re-payer les zones rurales déjà
// exhaustives (un disque qui a renvoyé < 20 résultats était complet).
export function denseCellsFromPoints(
  points: Point[],
  deg: number,
  minPoints: number,
): Cell[] {
  const counts = new Map<string, number>();
  for (const p of points) {
    const key = `${Math.floor(p.latitude / deg)}:${Math.floor(p.longitude / deg)}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const cells: Cell[] = [];
  for (const [key, n] of counts) {
    if (n < minPoints) continue;
    const [ky, kx] = key.split(':').map(Number);
    const latitude = (ky + 0.5) * deg;
    const longitude = (kx + 0.5) * deg;
    cells.push({ latitude, longitude, radiusM: cellRadiusM(deg, latitude) });
  }
  return cells;
}

// Subdivision d'une cellule saturée (20 résultats) en 4 quadrants.
export function subdivideCell(cell: Cell): Cell[] {
  const r = cell.radiusM / 2;
  // Décalage du centre de chaque quadrant : la moitié du demi-côté.
  const dLat = cell.radiusM / 2 / 111_320;
  const dLng = cell.radiusM / 2 / (111_320 * Math.cos((cell.latitude * Math.PI) / 180));
  const out: Cell[] = [];
  for (const sy of [-1, 1]) {
    for (const sx of [-1, 1]) {
      out.push({
        latitude: cell.latitude + sy * dLat,
        longitude: cell.longitude + sx * dLng,
        radiusM: Math.ceil(r),
      });
    }
  }
  return out;
}

// --- Analyse des adresses Google (addressComponents) -----------------------

export type AddressComponent = {
  longText?: string;
  shortText?: string;
  types?: string[];
};

// Codes pays acceptés : métropole + départements/régions d'outre-mer.
const FR_COUNTRIES = new Set(['FR', 'RE', 'GP', 'MQ', 'GF', 'YT']);

export function parseGoogleAddress(components: AddressComponent[] | undefined): {
  city: string | null;
  postalCode: string | null;
  streetAddress: string | null;
  isFrance: boolean;
} {
  const byType = (t: string) => (components ?? []).find((c) => c.types?.includes(t));
  const city = byType('locality')?.longText ?? byType('postal_town')?.longText ?? null;
  const postalCode = byType('postal_code')?.longText ?? null;
  const num = byType('street_number')?.longText;
  const route = byType('route')?.longText;
  const streetAddress = [num, route].filter(Boolean).join(' ') || null;
  const country = byType('country')?.shortText ?? null;
  return {
    city,
    postalCode,
    streetAddress,
    isFrance: country !== null && FR_COUNTRIES.has(country),
  };
}
