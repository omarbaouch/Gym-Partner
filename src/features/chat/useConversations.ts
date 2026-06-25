import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/lib/supabase';

export type ConversationSummary = {
  conversation_id: string;
  other_id: string;
  other_name: string;
  other_avatar: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
};

// Conversations de l'utilisateur courant (interlocuteur, dernier message, non-lus).
export function useConversations() {
  const { session } = useAuth();
  const userId = session?.user.id;

  return useQuery({
    queryKey: ['conversations', userId],
    enabled: !!userId,
    queryFn: async (): Promise<ConversationSummary[]> => {
      const { data, error } = await supabase.rpc('my_conversations');
      if (error) throw error;
      return (data ?? []) as ConversationSummary[];
    },
  });
}
