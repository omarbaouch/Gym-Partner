// Edge Function (Deno) — envoie une notification push Expo au destinataire
// d'un nouveau message. À brancher sur un Database Webhook : INSERT sur
// public.messages -> appelle cette fonction.
//
// Déploiement :
//   supabase functions deploy notify-message
// Puis créer le webhook (Dashboard > Database > Webhooks) vers cette fonction.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const message = payload.record; // ligne insérée dans messages

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Déterminer le destinataire (l'autre participant de la conversation).
    const { data: conv } = await supabase
      .from('conversations')
      .select('user_a, user_b')
      .eq('id', message.conversation_id)
      .single();
    if (!conv) return new Response('no conversation', { status: 200 });

    const recipientId = conv.user_a === message.sender_id ? conv.user_b : conv.user_a;

    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('expo_push_token')
      .eq('user_id', recipientId);
    if (!tokens?.length) return new Response('no tokens', { status: 200 });

    const { data: sender } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', message.sender_id)
      .single();

    const notifications = tokens.map((t) => ({
      to: t.expo_push_token,
      sound: 'default',
      title: sender?.display_name ?? 'Nouveau message',
      body: message.content,
      data: { conversationId: message.conversation_id },
    }));

    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notifications),
    });

    return new Response('ok', { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response('error', { status: 500 });
  }
});
