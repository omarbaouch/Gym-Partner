import { useMutation } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';

// Bloque un utilisateur : il disparaît de la découverte et des conversations
// (la RLS masque les profils mutuellement bloqués).
export function useBlockUser() {
  const { session } = useAuth();
  const me = session?.user.id;

  return useMutation({
    mutationFn: async (otherId: string) => {
      if (!me) throw new Error('non connecté');
      const { error } = await supabase
        .from('blocks')
        .insert({ blocker_id: me, blocked_id: otherId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gym-members'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

// Signale un utilisateur (modération).
export function useReportUser() {
  const { session } = useAuth();
  const me = session?.user.id;

  return useMutation({
    mutationFn: async ({ otherId, reason }: { otherId: string; reason: string }) => {
      if (!me) throw new Error('non connecté');
      const { error } = await supabase
        .from('reports')
        .insert({ reporter_id: me, reported_id: otherId, reason });
      if (error) throw error;
    },
  });
}

export const REPORT_REASONS = [
  'Comportement inapproprié',
  'Spam / publicité',
  'Faux profil',
  'Harcèlement',
] as const;
