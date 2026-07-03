import { useMutation } from '@tanstack/react-query';

import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';

// Définit la salle principale de l'utilisateur (une seule à la fois).
// Toute la logique vit dans la RPC transactionnelle set_primary_gym
// (migration 0016) : quitte l'ancienne salle, retire le check-in obsolète,
// pose la nouvelle — aucun état incohérent possible côté client.
export function useSetPrimaryGym() {
  return useMutation({
    mutationFn: async (gymId: string) => {
      const { error } = await supabase.rpc('set_primary_gym', { _gym: gymId });
      if (error) throw error;
    },
    onSuccess: () => {
      // Tout ce qui dépend de « ma salle » repart de zéro.
      queryClient.invalidateQueries({ queryKey: ['primary-gym'] });
      queryClient.invalidateQueries({ queryKey: ['gym-members'] });
      queryClient.invalidateQueries({ queryKey: ['live'] });
      queryClient.invalidateQueries({ queryKey: ['my-checkin'] });
      queryClient.invalidateQueries({ queryKey: ['intents-received'] });
    },
  });
}
