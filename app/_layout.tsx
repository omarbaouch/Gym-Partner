import '../global.css';

import {
  Sora_400Regular,
  Sora_500Medium,
  Sora_600SemiBold,
  Sora_700Bold,
  Sora_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/sora';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Text, TextInput } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { useMyProfile } from '@/features/profile/useMyProfile';
import { useNotificationNavigation } from '@/lib/notifications';
import { registerPushToken } from '@/lib/push';
import { queryClient } from '@/lib/queryClient';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Police par défaut sur tous les Text/TextInput de l'app.
function setDefaultFont() {
  const T = Text as unknown as { defaultProps?: { style?: object } };
  T.defaultProps = T.defaultProps ?? {};
  T.defaultProps.style = [{ fontFamily: 'Sora_500Medium' }, T.defaultProps.style];
  const I = TextInput as unknown as { defaultProps?: { style?: object } };
  I.defaultProps = I.defaultProps ?? {};
  I.defaultProps.style = [{ fontFamily: 'Sora_500Medium' }, I.defaultProps.style];
}

// Redirige selon l'état d'authentification et d'onboarding.
function RootNavigation() {
  const { session, loading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useMyProfile();
  const segments = useSegments() as string[];
  const router = useRouter();

  const onboarded = profile?.onboarded ?? false;

  useNotificationNavigation();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(auth)';
    const onOnboarding = segments[1] === 'onboarding';

    if (!session) {
      if (!inAuthGroup) router.replace('/(auth)/sign-in');
      return;
    }
    if (profileLoading) return;

    if (!onboarded) {
      if (!onOnboarding) router.replace('/(auth)/onboarding');
    } else if (inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, loading, profileLoading, onboarded, segments, router]);

  useEffect(() => {
    if (session && onboarded) {
      registerPushToken(session.user.id).catch(() => {});
    }
  }, [session, onboarded]);

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: '#160E0B' } }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="select-gym" options={{ presentation: 'modal' }} />
      <Stack.Screen name="member/[id]" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="chat/[id]" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Sora_400Regular,
    Sora_500Medium,
    Sora_600SemiBold,
    Sora_700Bold,
    Sora_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      setDefaultFont();
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="light" />
          <RootNavigation />
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
