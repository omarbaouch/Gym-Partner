import { useMutation } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';

// Définit la salle principale de l'utilisateur (une seule à la fois).
export function useSetPrimaryGym() {
  const { session } = useAuth();
  const userId = session?.user.id;

  return useMutation({
    mutationFn: async (gymId: string) => {
      if (!userId) throw new Error('non connecté');
      // Retire l'ancienne salle principale puis pose la nouvelle.
      await supabase
        .from('user_gyms')
        .update({ is_primary: false })
        .eq('user_id', userId)
        .eq('is_primary', true);
      const { error } = await supabase
        .from('user_gyms')
        .upsert({ user_id: userId, gym_id: gymId, is_primary: true });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['primary-gym'] });
      queryClient.invalidateQueries({ queryKey: ['gym-members'] });
    },
  });
}
