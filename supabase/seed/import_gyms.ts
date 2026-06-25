/**
 * Importe les salles de sport françaises depuis OpenStreetMap (Overpass API)
 * vers la table `public.gyms`, en les rattachant à leur chaîne (`gym_chains`).
 *
 * Usage (une fois le projet Supabase prêt) :
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx supabase/seed/import_gyms.ts
 *
 * Remarques :
 *  - Utilise la SERVICE ROLE key (jamais embarquée dans l'app) car cet import
 *    écrit en base en contournant la RLS.
 *  - Overpass renvoie les `leisure=fitness_centre` avec un tag `brand`/`name`.
 *  - À lancer ponctuellement pour (re)peupler le référentiel des salles.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

// Correspondance "marque OSM" -> nom de chaîne dans gym_chains.
const BRAND_TO_CHAIN: Record<string, string> = {
  'Basic-Fit': 'Basic-Fit',
  'Basic Fit': 'Basic-Fit',
  'Fitness Park': 'Fitness Park',
  'On Air': 'On Air',
  'Keep Cool': 'Keep Cool',
  "L'Orange Bleue": "L'Orange Bleue",
  Neoness: 'Neoness',
  'Vita Liberté': 'Vita Liberté',
};

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

  const { data: chains } = await db.from('gym_chains').select('id, name');
  const chainId = new Map((chains ?? []).map((c) => [c.name, c.id as string]));

  const elements = await fetchGyms();
  const rows = elements
    .map((el) => {
      const tags = el.tags ?? {};
      const brand = tags.brand ?? tags.operator ?? '';
      const chainName = BRAND_TO_CHAIN[brand];
      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;
      if (!lat || !lon) return null;
      return {
        chain_id: chainName ? chainId.get(chainName) ?? null : null,
        name: tags.name ?? brand ?? 'Salle de sport',
        address: [tags['addr:housenumber'], tags['addr:street']]
          .filter(Boolean)
          .join(' '),
        city: tags['addr:city'] ?? null,
        postal_code: tags['addr:postcode'] ?? null,
        country: 'FR',
        latitude: lat,
        longitude: lon,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  // Insertion par lots.
  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await db.from('gyms').insert(rows.slice(i, i + BATCH));
    if (error) throw error;
    console.log(`Inséré ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
  }
  console.log(`Terminé : ${rows.length} salles importées.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
