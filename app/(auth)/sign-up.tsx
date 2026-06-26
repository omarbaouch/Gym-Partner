import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { supabase } from '@/lib/supabase';

export default function SignUp() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSignUp() {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    setLoading(false);
    if (error) Alert.alert('Inscription impossible', error.message);
    else Alert.alert('Bienvenue', 'Vérifie ta boîte mail pour confirmer ton compte.');
  }

  return (
    <Screen>
      <View className="flex-1 justify-center gap-4">
        <Text className="mb-6 text-3xl font-bold text-white">Créer un compte</Text>

        <TextInput
          className="h-14 rounded-4xl border border-border bg-surface px-5 text-white"
          placeholder="Pseudo"
          placeholderTextColor="#8A8A99"
          value={displayName}
          onChangeText={setDisplayName}
        />
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

        <Button label="S'inscrire" onPress={onSignUp} loading={loading} />

        <Link href="/(auth)/sign-in" className="mt-4 text-center text-primary">
          J'ai déjà un compte
        </Link>
      </View>
    </Screen>
  );
}
