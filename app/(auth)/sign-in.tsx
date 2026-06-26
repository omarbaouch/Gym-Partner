import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { AppleSignInButton } from '@/features/auth/AppleSignInButton';
import { supabase } from '@/lib/supabase';
import { gradients } from '@/theme/colors';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSignIn() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) Alert.alert('Connexion impossible', error.message);
  }

  return (
    <Screen>
      <View className="flex-1 justify-center gap-4">
        <View className="mb-2 flex-row items-center gap-3">
          <LinearGradient
            colors={gradients.brand}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ height: 44, width: 44, borderRadius: 14 }}
          />
          <Text className="text-4xl font-extrabold tracking-tight text-white">
            GYM<Text className="text-primary">PARTNER</Text>
          </Text>
        </View>
        <Text className="mb-6 text-lg text-muted">
          Trouve ton partenaire d'entraînement.
        </Text>

        <TextInput
          className="h-14 rounded-4xl border border-border bg-surface px-5 text-white"
          placeholder="Email"
          placeholderTextColor="#8A8A99"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          className="h-14 rounded-4xl border border-border bg-surface px-5 text-white"
          placeholder="Mot de passe"
          placeholderTextColor="#8A8A99"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Button label="Se connecter" onPress={onSignIn} loading={loading} />

        <AppleSignInButton />

        <Link href="/(auth)/sign-up" className="mt-4 text-center text-primary">
          Pas encore de compte ? Crée-en un
        </Link>
      </View>
    </Screen>
  );
}
