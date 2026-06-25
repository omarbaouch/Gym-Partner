import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

// Bouton "Sign in with Apple" — affiché uniquement sur iOS (et si disponible).
// Obligatoire par Apple dès qu'une autre connexion sociale est proposée.
export function AppleSignInButton() {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setAvailable);
    }
  }, []);

  if (Platform.OS !== 'ios' || !available) return null;

  async function onPress() {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) throw new Error('Jeton Apple manquant');

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });
      if (error) throw error;

      // Apple ne renvoie le nom qu'à la première connexion : on l'enregistre.
      const given = credential.fullName?.givenName;
      if (given) {
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          await supabase
            .from('profiles')
            .update({ display_name: given })
            .eq('id', data.user.id);
        }
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes('canceled')) return;
      Alert.alert('Connexion Apple impossible', e instanceof Error ? e.message : '');
    }
  }

  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
      cornerRadius={16}
      style={{ height: 48, width: '100%' }}
      onPress={onPress}
    />
  );
}
