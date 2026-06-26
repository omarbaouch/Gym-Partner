/**
 * Importe des salles de sport FIABLES depuis Google Places vers `public.gyms`.
 *
 * Prérequis : activer **Places API** + **Maps SDK for Android** sur le projet Google,
 * et autoriser la clé pour Places API.
 *
 * Usage :
 *   GOOGLE_MAPS_API_KEY=... \
 *   SUPABASE_URL=https://<ref>.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   CITIES="Strasbourg" \
 *   npx tsx supabase/seed/import_places.ts
 *
 * - Recherche par enseigne ("Basic-Fit Strasbourg") + recherche générique
 *   ("salle de sport Strasbourg") avec pagination.
 * - Normalise nom/adresse/code postal/ville/coordonnées, rattache la chaîne,
 *   et upsert sur `place_id` (pas de doublon).
 */
import { createClient } from '@supabase/supabase-js';

const KEY = process.env.GOOGLE_MAPS_API_KEY!;
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CITIES = (process.env.CITIES ?? 'Strasbourg').split(',').map((c) => c.trim());

const CHAINS = [
  'Basic-Fit',
  'Fitness Park',
  'On Air',
  'Keep Cool',
  "L'Orange Bleue",
  'Neoness',
  'Vita Liberté',
];

type PlaceResult = {
  place_id: string;
  name: string;
  formatted_address?: string;
  geometry?: { location?: { lat: number; lng: number } };
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function textSearch(query: string): Promise<PlaceResult[]> {
  const out: PlaceResult[] = [];
  let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
    query,
  )}&language=fr&region=fr&type=gym&key=${KEY}`;
  for (let page = 0; page < 3; page++) {
    const res = await fetch(url);
    const json = await res.json();
    if (json.status !== 'OK' && json.status !== 'ZERO_RESULTS') {
      throw new Error(`Places ${json.status}: ${json.error_message ?? ''}`);
    }
    out.push(...(json.results ?? []));
    if (!json.next_page_token) break;
    await sleep(2000); // le token n'est actif qu'après un court délai
    url = `https://maps.googleapis.com/maps/api/place/textsearch/json?pagetoken=${json.next_page_token}&key=${KEY}`;
  }
  return out;
}

function chainIdFor(name: string, chains: Map<string, string>): string | null {
  const n = name.toLowerCase();
  for (const [label, id] of chains) {
    const key = label.toLowerCase().replace(/[^a-z]/g, '');
    if (n.replace(/[^a-z]/g, '').includes(key)) return id;
  }
  return null;
}

function splitAddress(addr?: string): { address: string | null; postal: string | null; city: string | null } {
  if (!addr) return { address: null, postal: null, city: null };
  const m = addr.match(/(\d{5})\s+([^,]+)/);
  return {
    address: addr.split(',')[0]?.trim() || null,
    postal: m?.[1] ?? null,
    city: m?.[2]?.trim() ?? null,
  };
}

async function main() {
  if (!KEY || !SUPABASE_URL || !SERVICE_ROLE) {
    throw new Error('GOOGLE_MAPS_API_KEY, SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis.');
  }
  const db = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: chainsRows } = await db.from('gym_chains').select('id, name');
  const chains = new Map((chainsRows ?? []).map((c) => [c.name as string, c.id as string]));

  const seen = new Map<string, PlaceResult>();
  for (const city of CITIES) {
    for (const q of [...CHAINS.map((c) => `${c} ${city}`), `salle de sport ${city}`]) {
      const results = await textSearch(q);
      results.forEach((r) => seen.set(r.place_id, r));
      await sleep(200);
    }
  }

  const rows = [...seen.values()]
    .filter((r) => r.geometry?.location)
    .map((r) => {
      const a = splitAddress(r.formatted_address);
      return {
        place_id: r.place_id,
        chain_id: chainIdFor(r.name, chains),
        name: r.name,
        address: a.address,
        postal_code: a.postal,
        city: a.city ?? CITIES[0],
        country: 'FR',
        latitude: r.geometry!.location!.lat,
        longitude: r.geometry!.location!.lng,
      };
    });

  const { error } = await db.from('gyms').upsert(rows, { onConflict: 'place_id' });
  if (error) throw error;
  console.log(`Importe/maj : ${rows.length} salles (${CITIES.join(', ')}).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
