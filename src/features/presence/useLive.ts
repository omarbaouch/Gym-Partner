import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';
import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';

// Un membre présent à la salle en ce moment (résultat de live_at_gym).
export type LiveMember = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  level: string;
  focus: string;
  since: string;
  active_until: string;
};

export type MyCheckin = {
  id: string;
  gym_id: string;
  focus: string;
  active_until: string;
  created_at: string;
};

function invalidateLive() {
  queryClient.invalidateQueries({ queryKey: ['live'] });
  queryClient.invalidateQueries({ queryKey: ['my-checkin'] });
}

// Qui est là, maintenant — rafraîchi par Realtime + toutes les 60 s pour
// faire disparaître les check-ins expirés (aucun événement à l'expiration).
export function useLiveAtGym(gymId: string | undefined) {
  useEffect(() => {
    if (!gymId) return;
    const channel = supabase
      .channel(`live:${gymId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'checkins', filter: `gym_id=eq.${gymId}` },
        invalidateLive,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [gymId]);

  return useQuery({
    queryKey: ['live', gymId],
    enabled: !!gymId,
    refetchInterval: 60_000,
    queryFn: async (): Promise<LiveMember[]> => {
      const { data, error } = await supabase.rpc('live_at_gym', { _gym: gymId });
      if (error) throw error;
      return (data ?? []) as LiveMember[];
    },
  });
}

// Mon check-in actif (null si aucun ou expiré).
export function useMyCheckin() {
  const { session } = useAuth();
  const me = session?.user.id;

  return useQuery({
    queryKey: ['my-checkin', me],
    enabled: !!me,
    refetchInterval: 60_000,
    queryFn: async (): Promise<MyCheckin | null> => {
      const { data, error } = await supabase
        .from('checkins')
        .select('id, gym_id, focus, active_until, created_at')
        .eq('user_id', me!)
        .gt('active_until', new Date().toISOString())
        .maybeSingle();
      if (error) throw error;
      return (data as MyCheckin) ?? null;
    },
  });
}

export function useCheckIn() {
  return useMutation({
    mutationFn: async (args: { gymId: string; focus: string; minutes: number }) => {
      const { error } = await supabase.rpc('check_in', {
        _gym: args.gymId,
        _focus: args.focus,
        _minutes: args.minutes,
      });
      if (error) throw error;
    },
    onSuccess: invalidateLive,
  });
}

export function useCheckOut() {
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('check_out');
      if (error) throw error;
    },
    onSuccess: invalidateLive,
  });
}
