import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { Mascot } from '@/components/Mascot';
import { Screen } from '@/components/Screen';
import { AppleSignInButton } from '@/features/auth/AppleSignInButton';
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
        <Animated.View entering={FadeInDown.duration(500)} className="mb-1 items-center">
          <Mascot pose="flex" size={138} />
          <Text className="mt-2 text-4xl font-extrabold tracking-tight text-white">
            GYM<Text className="text-primary">PARTNER</Text>
          </Text>
          <Text className="text-lg text-muted">Trouve ton binôme d'entraînement 💪</Text>
        </Animated.View>

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
