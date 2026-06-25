import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { GymChain } from '@/types/database';

// Liste des chaînes de salles (pour le filtre).
export function useChains() {
  return useQuery({
    queryKey: ['gym-chains'],
    queryFn: async (): Promise<GymChain[]> => {
      const { data, error } = await supabase
        .from('gym_chains')
        .select('id, name, logo_url, brand_color')
        .order('name');
      if (error) throw error;
      return (data ?? []) as GymChain[];
    },
  });
}
