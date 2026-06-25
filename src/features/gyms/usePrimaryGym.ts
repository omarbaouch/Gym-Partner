import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/lib/supabase';

// Salle principale de l'utilisateur courant (is_primary), avec sa chaîne.
export function usePrimaryGym() {
  const { session } = useAuth();
  const userId = session?.user.id;

  return useQuery({
    queryKey: ['primary-gym', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_gyms')
        .select('gym_id, gyms ( id, name, city, chain_id, gym_chains ( name ) )')
        .eq('user_id', userId!)
        .eq('is_primary', true)
        .maybeSingle();
      if (error) throw error;
      return data?.gyms ?? null;
    },
  });
}
