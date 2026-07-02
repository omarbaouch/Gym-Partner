import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';

// Séance liée à une conversation (proposée ou confirmée).
export type Session = {
  id: string;
  conversation_id: string;
  proposer: string;
  scheduled_at: string;
  status: 'proposee' | 'confirmee' | 'annulee';
  created_at: string;
};

export type NextSession = {
  conversation_id: string;
  scheduled_at: string;
  other_name: string;
};

function invalidateSessions(conversationId?: string) {
  if (conversationId) {
    queryClient.invalidateQueries({ queryKey: ['session', conversationId] });
  }
  queryClient.invalidateQueries({ queryKey: ['next-session'] });
}

// Séance active de la conversation (carte épinglée du chat), en temps réel.
export function useConversationSession(conversationId: string | undefined) {
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`sessions:${conversationId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sessions', filter: `conversation_id=eq.${conversationId}` },
        () => invalidateSessions(conversationId),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  return useQuery({
    queryKey: ['session', conversationId],
    enabled: !!conversationId,
    queryFn: async (): Promise<Session | null> => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('conversation_id', conversationId!)
        .in('status', ['proposee', 'confirmee'])
        .gt('scheduled_at', new Date(Date.now() - 2 * 3_600_000).toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as Session) ?? null;
    },
  });
}

export function useProposeSession() {
  return useMutation({
    mutationFn: async (args: { conversationId: string; at: Date }) => {
      const { error } = await supabase.rpc('propose_session', {
        _conversation: args.conversationId,
        _at: args.at.toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: (_data, args) => invalidateSessions(args.conversationId),
  });
}

export function useRespondSession() {
  return useMutation({
    mutationFn: async (args: { sessionId: string; accept: boolean; conversationId: string }) => {
      const { error } = await supabase.rpc('respond_session', {
        _session: args.sessionId,
        _accept: args.accept,
      });
      if (error) throw error;
    },
    onSuccess: (_data, args) => invalidateSessions(args.conversationId),
  });
}

// Ma prochaine séance confirmée (bannière de l'écran Ma salle).
export function useMyNextSession() {
  return useQuery({
    queryKey: ['next-session'],
    refetchInterval: 60_000,
    queryFn: async (): Promise<NextSession | null> => {
      const { data, error } = await supabase.rpc('my_next_session');
      if (error) throw error;
      const rows = (data ?? []) as NextSession[];
      return rows[0] ?? null;
    },
  });
}
