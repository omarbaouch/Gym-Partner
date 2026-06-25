// Edge Function (Deno) — suppression de compte (RGPD / droit à l'effacement).
// L'utilisateur authentifié supprime son propre compte : profil (cascade sur
// user_gyms, messages, conversations, blocks, reports, push_tokens) puis
// l'entrée auth.users via la service role.
//
// Déploiement : supabase functions deploy delete-account
// Appel côté app : supabase.functions.invoke('delete-account')

import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response('unauthorized', { status: 401, headers: corsHeaders });
    }

    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Identifie l'appelant à partir de son JWT.
    const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await asUser.auth.getUser();
    if (!user) {
      return new Response('unauthorized', { status: 401, headers: corsHeaders });
    }

    // Supprime le compte avec les droits admin (cascade sur les données liées).
    const admin = createClient(url, serviceRole);
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw error;

    return new Response(JSON.stringify({ deleted: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error(e);
    return new Response('error', { status: 500, headers: corsHeaders });
  }
});
