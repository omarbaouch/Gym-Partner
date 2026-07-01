import { useMutation, useQuery } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';

// Relation avec un autre membre : none → sent/received → matched.
export type IntentStatus = {
  status: 'none' | 'sent' | 'received' | 'matched';
  conversation_id?: string;
};

export function useIntentStatus(otherId: string | undefined) {
  return useQuery({
    queryKey: ['intent-status', otherId],
    enabled: !!otherId,
    queryFn: async (): Promise<IntentStatus> => {
      const { data, error } = await supabase.rpc('intent_status', { _other: otherId });
      if (error) throw error;
      return data as IntentStatus;
    },
  });
}

// « Partant·e pour s'entraîner » : pose l'intent ; si réciproque → match
// (conversation créée + premier message 🤝, en un seul appel atomique).
export function useExpressIntent() {
  return useMutation({
    mutationFn: async (otherId: string): Promise<IntentStatus> => {
      const { data, error } = await supabase.rpc('express_intent', { _other: otherId });
      if (error) throw error;
      return data as IntentStatus;
    },
    onSuccess: (_data, otherId) => {
      queryClient.invalidateQueries({ queryKey: ['intent-status', otherId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['intents-received'] });
    },
  });
}

// Qui m'a déjà dit « partant·e » (badge sur les cartes membres/live).
export function useIntentsReceived() {
  const { session } = useAuth();
  const me = session?.user.id;

  return useQuery({
    queryKey: ['intents-received', me],
    enabled: !!me,
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase
        .from('intents')
        .select('from_user')
        .eq('to_user', me!);
      if (error) throw error;
      return new Set((data ?? []).map((r: { from_user: string }) => r.from_user));
    },
  });
}
