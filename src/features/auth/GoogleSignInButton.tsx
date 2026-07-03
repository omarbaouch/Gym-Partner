import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';

import { showError } from '@/components/AppDialog';
import { supabase } from '@/lib/supabase';

// Termine proprement une session d'authentification restée ouverte
// (retour dans l'app après le navigateur).
WebBrowser.maybeCompleteAuthSession();

// Deep link de retour vers l'app (schéma gympartner://, cf. app.json).
// À déclarer dans Supabase : Authentication → URL Configuration → Redirect URLs.
const redirectTo = Linking.createURL('auth-callback');

// Connexion Google via Supabase OAuth (flux PKCE) :
// 1. Supabase fournit l'URL d'autorisation Google ;
// 2. on l'ouvre dans le navigateur système (session éphémère) ;
// 3. au retour (deep link), on échange le code contre une session.
// L'AuthProvider écoute onAuthStateChange : la navigation suit toute seule.
async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw new Error("URL d'autorisation Google manquante");

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return; // annulé par l'utilisateur

  const params = new URL(result.url).searchParams;
  const oauthError = params.get('error_description') ?? params.get('error');
  if (oauthError) throw new Error(oauthError);
  const code = params.get('code');
  if (!code) throw new Error('Code d’autorisation manquant dans la redirection');

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) throw exchangeError;
}

export function GoogleSignInButton() {
  const [loading, setLoading] = useState(false);

  async function onPress() {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      showError(
        e instanceof Error ? e.message : 'Réessaie dans un instant.',
        'Connexion Google impossible',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel="Continuer avec Google"
      className="h-12 flex-row items-center justify-center gap-2.5 rounded-2xl bg-white"
    >
      {loading ? (
        <ActivityIndicator color="#1F1F1F" />
      ) : (
        <>
          <Ionicons name="logo-google" size={18} color="#1F1F1F" />
          <Text className="text-base font-bold" style={{ color: '#1F1F1F' }}>
            Continuer avec Google
          </Text>
        </>
      )}
    </Pressable>
  );
}
