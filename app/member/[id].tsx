import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Button } from '@/components/Button';
import { Confetti } from '@/components/Confetti';
import { Screen } from '@/components/Screen';
import { SkeletonList } from '@/components/Skeleton';
import {
  REPORT_REASONS,
  useBlockUser,
  useReportUser,
} from '@/features/moderation/useModeration';
import { supabase } from '@/lib/supabase';
import { goalColor, gradients } from '@/theme/colors';

export default function MemberProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const blockUser = useBlockUser();
  const reportUser = useReportUser();
  const [celebrating, setCelebrating] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, bio, avatar_url, level, goals')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  async function contact() {
    const { data, error } = await supabase.rpc('get_or_create_conversation', {
      _other: id,
    });
    if (error || !data) {
      Alert.alert('Erreur', error?.message ?? 'Impossible de démarrer la conversation.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setCelebrating(true);
    setTimeout(
      () => router.replace({ pathname: '/chat/[id]', params: { id: data as string } }),
      1500,
    );
  }

  function onBlock() {
    Alert.alert('Bloquer', 'Cette personne ne pourra plus te voir ni te contacter.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Bloquer',
        style: 'destructive',
        onPress: async () => {
          try {
            await blockUser.mutateAsync(id!);
            router.back();
          } catch (e) {
            Alert.alert('Erreur', e instanceof Error ? e.message : 'Échec du blocage');
          }
        },
      },
    ]);
  }

  function onReport() {
    Alert.alert('Signaler', 'Motif du signalement', [
      ...REPORT_REASONS.map((reason) => ({
        text: reason,
        onPress: async () => {
          await reportUser.mutateAsync({ otherId: id!, reason });
          Alert.alert('Merci', 'Signalement transmis à la modération.');
        },
      })),
      { text: 'Annuler', style: 'cancel' as const },
    ]);
  }

  if (isLoading || !profile) {
    return (
      <Screen>
        <SkeletonList count={3} />
      </Screen>
    );
  }

  const initials = profile.display_name.slice(0, 2).toUpperCase();

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: profile.display_name }} />
      <View className="items-center gap-3 py-6">
        <View className="rounded-full border-2 border-primary/60 p-1">
          {profile.avatar_url ? (
            <Image
              source={profile.avatar_url}
              style={{ height: 104, width: 104, borderRadius: 52 }}
            />
          ) : (
            <View
              className="items-center justify-center rounded-full bg-surfaceHigh"
              style={{ height: 104, width: 104 }}
            >
              <Text className="text-2xl font-bold text-primary">{initials}</Text>
            </View>
          )}
        </View>
        <Text className="font-display text-2xl text-white">{profile.display_name}</Text>
        <View className="rounded-full bg-ember/20 px-3 py-1">
          <Text className="text-sm font-semibold capitalize text-ember">
            {profile.level}
          </Text>
        </View>
        <View className="flex-row flex-wrap justify-center gap-2">
          {profile.goals?.map((g: string) => (
            <View
              key={g}
              className="rounded-full px-3 py-1"
              style={{ backgroundColor: `${goalColor(g)}26` }}
            >
              <Text className="text-sm font-semibold" style={{ color: goalColor(g) }}>
                {g}
              </Text>
            </View>
          ))}
        </View>
        {profile.bio ? (
          <Text className="mt-2 text-center text-white">{profile.bio}</Text>
        ) : null}
      </View>

      <Button label="Contacter" icon="chatbubble-ellipses" onPress={contact} />

      <View className="flex-row justify-center gap-6 pt-4">
        <Text className="text-muted" onPress={onReport}>
          Signaler
        </Text>
        <Text className="text-muted" onPress={onBlock}>
          Bloquer
        </Text>
      </View>

      {celebrating && (
        <Animated.View
          entering={FadeIn.duration(200)}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(11,8,6,0.92)',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
          }}
        >
          <Confetti />
          <LinearGradient
            colors={gradients.brand}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              height: 112,
              width: 112,
              borderRadius: 56,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#FF3D77',
              shadowOpacity: 0.6,
              shadowRadius: 28,
              shadowOffset: { width: 0, height: 12 },
              elevation: 14,
            }}
          >
            <Ionicons name="checkmark" size={64} color="#160E0B" />
          </LinearGradient>
          <Text className="mt-2 font-display text-2xl text-white">C'est parti ! 🎉</Text>
          <Text className="text-muted">On vous met en relation…</Text>
        </Animated.View>
      )}
    </Screen>
  );
}
