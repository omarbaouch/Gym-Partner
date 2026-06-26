/**
 * Importe des salles de sport FIABLES depuis Google Places (NOUVELLE version)
 * vers `public.gyms`. Noms exacts + adresses + coordonnées, dédupliqués par place_id.
 *
 * Prérequis Google Cloud : activer **Places API (New)** + (pour la carte) **Maps SDK
 * for Android**, facturation activée, et la clé autorisée pour Places API (New).
 *
 * Usage :
 *   GOOGLE_MAPS_API_KEY=... \
 *   SUPABASE_URL=https://<ref>.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   CITIES="Strasbourg,Lyon,Paris" \
 *   npx tsx supabase/seed/import_places.ts
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

type Place = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function searchText(q: string): Promise<Place[]> {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': KEY,
      'X-Goog-FieldMask':
        'places.id,places.displayName,places.formattedAddress,places.location',
    },
    body: JSON.stringify({ textQuery: q, languageCode: 'fr', regionCode: 'FR' }),
  });
  const json = await res.json();
  if (json.error) throw new Error(`Places (New) ${json.error.status}: ${json.error.message}`);
  return json.places ?? [];
}

function chainIdFor(name: string, chains: Map<string, string>): string | null {
  const n = name.toLowerCase().replace(/[^a-z]/g, '');
  for (const [label, id] of chains) {
    if (n.includes(label.toLowerCase().replace(/[^a-z]/g, ''))) return id;
  }
  return null;
}

function parseAddress(addr?: string) {
  if (!addr) return { street: null, postal: null, city: null };
  const m = addr.match(/(\d{5})\s+([^,]+?)(?:,|$)/);
  return {
    street: addr.split(',')[0]?.trim() || null,
    postal: m?.[1] ?? null,
    city: m?.[2]?.trim() ?? null,
  };
}

async function main() {
  if (!KEY || !SUPABASE_URL || !SERVICE_ROLE) {
    throw new Error('GOOGLE_MAPS_API_KEY, SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis.');
  }
  const db = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: chainRows } = await db.from('gym_chains').select('id, name');
  const chains = new Map((chainRows ?? []).map((c) => [c.name as string, c.id as string]));

  const seen = new Map<string, Place>();
  for (const city of CITIES) {
    const queries = [
      ...CHAINS.map((c) => `${c} ${city}`),
      `salle de sport ${city}`,
      `fitness ${city}`,
      `musculation ${city}`,
    ];
    for (const q of queries) {
      (await searchText(q)).forEach((p) => seen.set(p.id, p));
      await sleep(150);
    }
  }

  // On écarte les non-salles évidentes et on garde la France métropolitaine.
  const rows = [...seen.values()]
    .filter((p) => p.location && !/c[ée]ramique|boutique/i.test(p.displayName?.text ?? ''))
    .map((p) => {
      const name = p.displayName?.text ?? 'Salle de sport';
      const a = parseAddress(p.formattedAddress);
      return {
        place_id: p.id,
        chain_id: chainIdFor(name, chains),
        name,
        address: a.street,
        postal_code: a.postal,
        city: a.city ?? CITIES[0],
        country: 'FR',
        latitude: p.location!.latitude,
        longitude: p.location!.longitude,
      };
    });

  const { error } = await db
    .from('gyms')
    .upsert(rows, { onConflict: 'place_id', ignoreDuplicates: false });
  if (error) throw error;
  console.log(`Importe/maj : ${rows.length} salles (${CITIES.join(', ')}).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
