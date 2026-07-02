/**
 * Importe les salles de sport françaises depuis OpenStreetMap (Overpass API)
 * vers la table `public.gyms`, en les rattachant à leur chaîne (`gym_chains`).
 *
 * Usage (une fois le projet Supabase prêt) :
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx supabase/seed/import_gyms.ts
 *
 * Robustesse :
 *  - IDEMPOTENT : chaque élément OSM est upserté sous `place_id = osm:<type>/<id>` ;
 *    relancer le script met à jour au lieu de dupliquer.
 *  - Le rattachement aux enseignes passe par `gym_chain_aliases` (base), avec
 *    normalisation des noms (accents/casse/ponctuation).
 *  - Le trigger `gyms_dedupe_on_insert` (migration 0012) fusionne tout doublon
 *    résiduel (ex. même salle déjà importée depuis Google Places).
 *  - Utilise la SERVICE ROLE key (jamais embarquée dans l'app) car cet import
 *    écrit en base en contournant la RLS.
 */
import { createClient } from '@supabase/supabase-js';

import { loadChainMatcher } from './chains';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

type OsmElement = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

async function fetchGyms(): Promise<OsmElement[]> {
  // Toutes les salles de fitness en France métropolitaine + DOM.
  const query = `
    [out:json][timeout:180];
    area["ISO3166-1"="FR"][admin_level=2]->.fr;
    (
      node["leisure"="fitness_centre"](area.fr);
      way["leisure"="fitness_centre"](area.fr);
    );
    out center tags;`;
  const res = await fetch(OVERPASS_URL, { method: 'POST', body: query });
  if (!res.ok) throw new Error(`Overpass ${res.status}`);
  const json = (await res.json()) as { elements: OsmElement[] };
  return json.elements;
}

async function main() {
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    throw new Error('SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.');
  }
  const db = createClient(SUPABASE_URL, SERVICE_ROLE);
  const chains = await loadChainMatcher(db);

  const elements = await fetchGyms();
  const rows = elements
    .map((el) => {
      const tags = el.tags ?? {};
      const brand = tags.brand ?? tags.operator ?? '';
      const name = tags.name ?? brand;
      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;
      if (!lat || !lon || !name) return null;
      return {
        // Clé d'idempotence : réutilise la colonne unique place_id.
        place_id: `osm:${el.type}/${el.id}`,
        chain_id: chains.idFor(brand) ?? chains.idFor(name),
        name,
        address:
          [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ') ||
          null,
        city: tags['addr:city'] ?? null,
        postal_code: tags['addr:postcode'] ?? null,
        country: 'FR',
        latitude: lat,
        longitude: lon,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  // Upsert par lots (idempotent grâce à place_id).
  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await db
      .from('gyms')
      .upsert(rows.slice(i, i + BATCH), { onConflict: 'place_id' });
    if (error) throw error;
    console.log(`Importé ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
  }
  console.log(`Terminé : ${rows.length} salles importées/mises à jour.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
