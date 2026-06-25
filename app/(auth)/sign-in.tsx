import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { supabase } from '@/lib/supabase';

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
        <Text className="mb-2 text-3xl font-bold text-white">Gym Partner</Text>
        <Text className="mb-6 text-muted">Trouve ton partenaire d'entraînement.</Text>

        <TextInput
          className="h-12 rounded-2xl bg-surface px-4 text-white"
          placeholder="Email"
          placeholderTextColor="#8A8A99"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          className="h-12 rounded-2xl bg-surface px-4 text-white"
          placeholder="Mot de passe"
          placeholderTextColor="#8A8A99"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Button label="Se connecter" onPress={onSignIn} loading={loading} />

        <Link href="/(auth)/sign-up" className="mt-4 text-center text-primary">
          Pas encore de compte ? Crée-en un
        </Link>
      </View>
    </Screen>
  );
}
