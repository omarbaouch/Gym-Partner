/**
 * Importe TOUTES les salles de sport de France depuis **Google Places (New)**
 * vers `public.gyms`. Google est la source de vérité du référentiel : noms
 * exacts, adresses fiables, positions précises, salles fermées exclues.
 *
 * Méthode : quadrillage du territoire (une cellule par carreau de 0.25°
 * contenant au moins une commune — métropole + outre-mer, via geo.api.gouv.fr,
 * gratuit) puis `places:searchNearby` avec types gym/fitness_center. Les
 * cellules saturées (20 résultats) sont subdivisées automatiquement.
 *
 * Usage :
 *   GOOGLE_MAPS_API_KEY=... \
 *   SUPABASE_URL=https://<ref>.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   npx tsx supabase/seed/import_france_places.ts
 *
 * Options (variables d'environnement) :
 *   MAX_REQUESTS=6000     plafond de requêtes Places (garde-fou de coût)
 *   PURGE_NON_GOOGLE=1    supprime ensuite les salles non-Google sans utilisateur
 *   DENSIFY=1             2e passe : ne re-quadrille que les zones denses à
 *                         partir des salles déjà en base (complète les
 *                         centres-villes sans re-payer les zones rurales,
 *                         déjà exhaustives — un disque ayant renvoyé < 20
 *                         résultats était complet)
 *
 * Prérequis Google Cloud : **Places API (New)** activée + facturation.
 * Coût constaté (juillet 2026) : la France entière ≈ 12 000 requêtes Nearby
 * Search (SKU Pro, ~35 $/1 000, 5 000 gratuites/mois) : passe nationale
 * ~6 000 req + densification des villes ~6 000 req, pour ~24 000 salles.
 * Le script affiche le compteur en continu et s'arrête au plafond
 * MAX_REQUESTS ; pense aussi à fixer un quota journalier côté console Google.
 *
 * Robustesse :
 *  - IDEMPOTENT : upsert par place_id ; relancer met à jour au lieu de dupliquer.
 *  - Le trigger `gyms_dedupe_on_insert` (migrations 0012/0014) fusionne les
 *    doublons résiduels et fait prévaloir les données Google sur l'existant.
 *  - Rattachement aux enseignes via `gym_chain_aliases` (base).
 */
import { createClient } from '@supabase/supabase-js';

import { loadChainMatcher } from './chains';
import {
  MIN_RADIUS_M,
  cellsFromPoints,
  denseCellsFromPoints,
  parseGoogleAddress,
  subdivideCell,
  type AddressComponent,
  type Cell,
  type Point,
} from './places_grid';

const KEY = process.env.GOOGLE_MAPS_API_KEY!;
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const MAX_REQUESTS = Number(process.env.MAX_REQUESTS ?? 6000);
const PURGE_NON_GOOGLE = process.env.PURGE_NON_GOOGLE === '1';
const DENSIFY = process.env.DENSIFY === '1';

// Mode densification : carreaux de 0.1° (~9 km de rayon) contenant au moins
// 3 salles connues. Seuil bas volontaire : mieux vaut re-vérifier un carreau
// déjà complet (1 requête) que manquer un centre-ville saturé.
const DENSIFY_DEG = 0.1;
const DENSIFY_MIN_GYMS = 3;

const COMMUNES_URL = 'https://geo.api.gouv.fr/communes?fields=nom,centre&format=json';
const NEARBY_URL = 'https://places.googleapis.com/v1/places:searchNearby';
const FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,places.addressComponents,places.location,places.businessStatus';

type Place = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  addressComponents?: AddressComponent[];
  location?: { latitude: number; longitude: number };
  businessStatus?: string;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let requestCount = 0;

async function searchNearby(cell: Cell, attempt = 0): Promise<Place[]> {
  requestCount += 1;
  const res = await fetch(NEARBY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': KEY,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify({
      includedTypes: ['gym', 'fitness_center'],
      maxResultCount: 20,
      languageCode: 'fr',
      regionCode: 'FR',
      locationRestriction: {
        circle: {
          center: { latitude: cell.latitude, longitude: cell.longitude },
          radius: Math.min(cell.radiusM, 50_000),
        },
      },
    }),
  });

  if ((res.status === 429 || res.status >= 500) && attempt < 4) {
    await sleep(2000 * 2 ** attempt); // backoff : 2s, 4s, 8s, 16s
    return searchNearby(cell, attempt + 1);
  }
  const json = await res.json();
  if (json.error) {
    throw new Error(`Places (New) ${json.error.status}: ${json.error.message}`);
  }
  return (json.places ?? []) as Place[];
}

async function main() {
  if (!KEY || !SUPABASE_URL || !SERVICE_ROLE) {
    throw new Error(
      'GOOGLE_MAPS_API_KEY, SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis.',
    );
  }
  const db = createClient(SUPABASE_URL, SERVICE_ROLE);
  const chains = await loadChainMatcher(db);

  // 1. Cellules initiales.
  let queue: Cell[];
  if (DENSIFY) {
    // Densification : zones où la base contient déjà ≥ N salles (les zones
    // rurales de la 1re passe étaient complètes, inutile de les re-payer).
    const gymPoints: Point[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await db
        .from('gyms')
        .select('latitude, longitude')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .range(from, from + 999);
      if (error) throw error;
      for (const g of data ?? []) {
        gymPoints.push({
          latitude: g.latitude as number,
          longitude: g.longitude as number,
        });
      }
      if (!data || data.length < 1000) break;
    }
    queue = denseCellsFromPoints(gymPoints, DENSIFY_DEG, DENSIFY_MIN_GYMS);
    console.log(
      `Densification : ${queue.length} cellules denses (${gymPoints.length} salles en base, ` +
        `plafond ${MAX_REQUESTS} requêtes).`,
    );
  } else {
    // Passe nationale : uniquement là où il y a des communes.
    const communesRes = await fetch(COMMUNES_URL);
    if (!communesRes.ok) throw new Error(`geo.api.gouv.fr ${communesRes.status}`);
    const communes = (await communesRes.json()) as {
      centre?: { coordinates: [number, number] };
    }[];
    const points = communes
      .filter((c) => c.centre)
      .map((c) => ({
        latitude: c.centre!.coordinates[1],
        longitude: c.centre!.coordinates[0],
      }));
    queue = cellsFromPoints(points);
    console.log(
      `Quadrillage initial : ${queue.length} cellules (plafond ${MAX_REQUESTS} requêtes).`,
    );
  }

  // 2. Parcours du quadrillage, subdivision des cellules saturées.
  const found = new Map<string, Place>();
  let processed = 0;
  let truncated = false;
  while (queue.length > 0) {
    if (requestCount >= MAX_REQUESTS) {
      truncated = true;
      console.warn(
        `Plafond MAX_REQUESTS (${MAX_REQUESTS}) atteint : ${queue.length} cellules restantes. ` +
          `Relance le script (idempotent) avec un plafond plus haut pour compléter.`,
      );
      break;
    }
    const cell = queue.shift()!;
    const places = await searchNearby(cell);
    for (const p of places) {
      if (p.businessStatus === 'CLOSED_PERMANENTLY') continue;
      found.set(p.id, p);
    }
    if (places.length >= 20 && cell.radiusM / 2 >= MIN_RADIUS_M) {
      queue.push(...subdivideCell(cell));
    }
    processed += 1;
    if (processed % 100 === 0) {
      console.log(
        `${processed} cellules traitées, ${queue.length} en attente, ` +
          `${found.size} salles, ${requestCount} requêtes.`,
      );
    }
    await sleep(60); // ~15 req/s max
  }

  // 3. Lignes à upserter (France uniquement, coordonnées obligatoires).
  const rows = [...found.values()]
    .map((p) => {
      const name = p.displayName?.text;
      if (!name || !p.location) return null;
      const a = parseGoogleAddress(p.addressComponents);
      if (!a.isFrance) return null;
      return {
        place_id: p.id,
        chain_id: chains.idFor(name),
        name,
        address: a.streetAddress,
        postal_code: a.postalCode,
        city: a.city,
        country: 'FR',
        latitude: p.location.latitude,
        longitude: p.location.longitude,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  console.log(`Upsert de ${rows.length} salles (${requestCount} requêtes Places)...`);
  const BATCH = 200;
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await db
      .from('gyms')
      .upsert(rows.slice(i, i + BATCH), { onConflict: 'place_id' });
    if (error) throw error;
    if ((i / BATCH) % 5 === 0) {
      console.log(`  ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
    }
  }

  // 4. Purge optionnelle des salles non-Google devenues inutiles.
  if (PURGE_NON_GOOGLE) {
    if (truncated) {
      console.warn('Purge ignorée : import incomplet (plafond atteint).');
    } else {
      const { data, error } = await db.rpc('purge_non_google_gyms');
      if (error) throw error;
      console.log(`Purge : ${data} salle(s) non-Google supprimée(s).`);
    }
  }

  console.log(
    `Terminé : ${rows.length} salles Google importées/mises à jour` +
      (truncated ? ' (PARTIEL — relancer pour compléter).' : '.'),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
