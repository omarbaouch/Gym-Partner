import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { supabase } from '@/lib/supabase';
import { gradients } from '@/theme/colors';

export default function SignUp() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [focus, setFocus] = useState<string | null>(null);
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

  function field(name: string) {
    return `h-14 rounded-4xl border bg-surface px-5 text-white ${
      focus === name ? 'border-primary' : 'border-border'
    }`;
  }

  return (
    <Screen>
      <View className="flex-1 justify-center gap-3">
        <Animated.View entering={FadeInDown.duration(500)} className="mb-6 items-center gap-4">
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
              shadowColor: '#FF7A1A',
              shadowOpacity: 0.55,
              shadowRadius: 26,
              shadowOffset: { width: 0, height: 12 },
              elevation: 14,
            }}
          >
            <Ionicons name="person-add" size={40} color="#160E0B" />
          </LinearGradient>
          <View className="items-center">
            <Text className="font-display text-3xl text-white">Crée ton compte</Text>
            <Text className="mt-1 text-base text-muted">
              Rejoins les membres de ta salle
            </Text>
          </View>
        </Animated.View>

        <TextInput
          className={field('name')}
          placeholder="Pseudo"
          placeholderTextColor="#8A8A99"
          value={displayName}
          onChangeText={setDisplayName}
          onFocus={() => setFocus('name')}
          onBlur={() => setFocus(null)}
          accessibilityLabel="Pseudo"
        />
        <TextInput
          className={field('email')}
          placeholder="Email"
          placeholderTextColor="#8A8A99"
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
          placeholderTextColor="#8A8A99"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          onFocus={() => setFocus('pw')}
          onBlur={() => setFocus(null)}
          accessibilityLabel="Mot de passe"
        />

        <View className="mt-2">
          <Button label="S'inscrire" icon="person-add" onPress={onSignUp} loading={loading} />
        </View>

        <Link href="/(auth)/sign-in" className="mt-4 text-center font-head text-primary">
          J'ai déjà un compte
        </Link>
      </View>
    </Screen>
  );
}
