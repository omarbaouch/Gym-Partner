import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/lib/supabase';

export type Member = {
  id: string;
  display_name: string;
  level: string;
  goals: string[];
  avatar_url: string | null;
};

// Membres qui fréquentent une salle donnée (hors utilisateur courant).
// La RLS garantit qu'on ne reçoit que les profils de salles partagées et non bloqués.
export function useGymMembers(gymId: string | undefined) {
  const { session } = useAuth();
  const me = session?.user.id;

  return useQuery({
    queryKey: ['gym-members', gymId],
    enabled: !!gymId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_gyms')
        .select('profiles ( id, display_name, level, goals, avatar_url )')
        .eq('gym_id', gymId!);
      if (error) throw error;
      return (data ?? [])
        .map((row) => row.profiles as unknown as Member)
        .filter((p) => p && p.id !== me);
    },
  });
}
