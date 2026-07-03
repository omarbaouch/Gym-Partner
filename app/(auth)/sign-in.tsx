import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { showError } from '@/components/AppDialog';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { AppleSignInButton } from '@/features/auth/AppleSignInButton';
import { GoogleSignInButton } from '@/features/auth/GoogleSignInButton';
import { supabase } from '@/lib/supabase';
import { colors, gradients } from '@/theme/colors';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [focus, setFocus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSignIn() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) showError(error.message, 'Connexion impossible');
  }

  function field(name: string) {
    return `h-14 rounded-4xl border bg-surface px-5 text-white ${
      focus === name ? 'border-primary' : 'border-border'
    }`;
  }

  return (
    <Screen>
      <View className="flex-1 justify-center gap-3">
        <Animated.View
          entering={FadeInDown.duration(500)}
          className="mb-6 items-center gap-4"
        >
          <LinearGradient
            colors={gradients.brand}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              height: 88,
              width: 88,
              borderRadius: 28,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: colors.primary,
              shadowOpacity: 0.55,
              shadowRadius: 26,
              shadowOffset: { width: 0, height: 12 },
              elevation: 14,
            }}
          >
            <Ionicons name="barbell" size={44} color={colors.background} />
          </LinearGradient>
          <View className="items-center">
            <Text className="font-display text-4xl tracking-tight text-white">
              GYM<Text className="text-primary">PARTNER</Text>
            </Text>
            <Text className="mt-1 text-base text-muted">Ta salle, en direct.</Text>
          </View>
        </Animated.View>

        <TextInput
          className={field('email')}
          placeholder="Email"
          placeholderTextColor={colors.placeholder}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          onFocus={() => setFocus('email')}
          onBlur={() => setFocus(null)}
          accessibilityLabel="Email"
        />
        <TextInput
          className={field('pw')}
          placeholder="Mot de passe"
          placeholderTextColor={colors.placeholder}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          onFocus={() => setFocus('pw')}
          onBlur={() => setFocus(null)}
          accessibilityLabel="Mot de passe"
        />

        <View className="mt-2">
          <Button
            label="Se connecter"
            icon="log-in"
            onPress={onSignIn}
            loading={loading}
          />
        </View>

        <GoogleSignInButton />
        <AppleSignInButton />

        <Link href="/(auth)/sign-up" className="mt-4 text-center font-head text-primary">
          Pas encore de compte ? Crée-en un
        </Link>
      </View>
    </Screen>
  );
}
