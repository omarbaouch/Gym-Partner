import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export type CitySuggestion = {
  city: string;
  dept: string | null;
  gym_count: number;
  latitude: number;
  longitude: number;
};

// Suggestions de villes (préfixe, insensible aux accents/casse) à partir des
// salles connues, avec le centroïde de leurs salles : la sélection déclenche
// une recherche de proximité autour de ce point.
export function useCitySearch(q: string, enabled = true) {
  const query = q.trim();
  return useQuery<CitySuggestion[]>({
    queryKey: ['city-search', query.toLowerCase()],
    enabled: enabled && query.length >= 2,
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<CitySuggestion[]> => {
      const { data, error } = await supabase.rpc('search_cities', { _q: query });
      if (error) throw error;
      return (data ?? []) as CitySuggestion[];
    },
  });
}
