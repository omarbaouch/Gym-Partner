import { supabase } from '@/lib/supabase';

// Marque comme lus tous les messages reçus (non envoyés par moi) d'une conversation.
// La policy RLS "messages update read" autorise un participant à le faire.
export async function markConversationRead(conversationId: string, myId: string) {
  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .neq('sender_id', myId)
    .is('read_at', null);
}
