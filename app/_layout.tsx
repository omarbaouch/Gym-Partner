import '../global.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { useMyProfile } from '@/features/profile/useMyProfile';
import { useNotificationNavigation } from '@/lib/notifications';
import { registerPushToken } from '@/lib/push';
import { queryClient } from '@/lib/queryClient';

// Redirige selon l'état d'authentification et d'onboarding.
function RootNavigation() {
  const { session, loading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useMyProfile();
  const segments = useSegments() as string[];
  const router = useRouter();

  const onboarded = profile?.onboarded ?? false;

  // Ouvre la conversation quand l'utilisateur tape sur une notification.
  useNotificationNavigation();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(auth)';
    const onOnboarding = segments[1] === 'onboarding';

    if (!session) {
      if (!inAuthGroup) router.replace('/(auth)/sign-in');
      return;
    }
    // Connecté : on attend le profil avant de décider.
    if (profileLoading) return;

    if (!onboarded) {
      if (!onOnboarding) router.replace('/(auth)/onboarding');
    } else if (inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, loading, profileLoading, onboarded, segments, router]);

  // Enregistre le token de notifications push une fois l'onboarding terminé.
  useEffect(() => {
    if (session && onboarded) {
      registerPushToken(session.user.id).catch(() => {});
    }
  }, [session, onboarded]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="select-gym" options={{ presentation: 'modal' }} />
      <Stack.Screen name="member/[id]" />
      <Stack.Screen name="chat/[id]" />
    </Stack>
  );
}

export default function RootLayout() {
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
