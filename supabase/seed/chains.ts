/**
 * Rattachement salle → enseigne partagé par les scripts d'import.
 * S'appuie sur la table `gym_chain_aliases` (migration 0012) : la liste des
 * enseignes et de leurs variantes vit en base, pas dans chaque script.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

// Miroir de `public.norm_gym_name()` : minuscules, sans accents, sans ponctuation.
export function normalizeName(name?: string | null): string {
  return (name ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export type ChainMatcher = {
  // chain_id pour un nom de salle/marque, ou null (salle indépendante).
  idFor: (name?: string | null) => string | null;
  // Noms canoniques des enseignes (pour construire des requêtes d'import).
  names: string[];
};

export async function loadChainMatcher(db: SupabaseClient): Promise<ChainMatcher> {
  const [{ data: chains, error: e1 }, { data: aliases, error: e2 }] = await Promise.all([
    db.from('gym_chains').select('id, name'),
    db.from('gym_chain_aliases').select('alias, chain_name'),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;

  const idByName = new Map((chains ?? []).map((c) => [c.name as string, c.id as string]));
  // Alias les plus longs d'abord : « onefitnessclub » avant « onefitness ».
  const rules = (aliases ?? [])
    .map((a) => ({ alias: a.alias as string, id: idByName.get(a.chain_name as string) }))
    .filter((r): r is { alias: string; id: string } => !!r.id)
    .sort((a, b) => b.alias.length - a.alias.length);
  // Le nom canonique de chaque enseigne est aussi un alias implicite.
  for (const [name, id] of idByName) {
    const alias = normalizeName(name);
    if (alias && !rules.some((r) => r.alias === alias)) rules.push({ alias, id });
  }

  return {
    idFor: (name) => {
      const n = normalizeName(name);
      if (!n) return null;
      return rules.find((r) => n.includes(r.alias))?.id ?? null;
    },
    names: [...idByName.keys()],
  };
}
