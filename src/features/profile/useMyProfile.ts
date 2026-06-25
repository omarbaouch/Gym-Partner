import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/database';

// Profil de l'utilisateur courant.
export function useMyProfile() {
  const { session } = useAuth();
  const userId = session?.user.id;

  return useQuery({
    queryKey: ['my-profile', userId],
    enabled: !!userId,
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId!)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });
}

// Mise à jour du profil + invalidation du cache.
export function useUpdateProfile() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (patch: Partial<Profile>) => {
      const { error } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', userId!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-profile', userId] });
    },
  });
}
