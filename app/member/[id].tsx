import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Confetti } from '@/components/Confetti';
import { SkeletonList } from '@/components/Skeleton';
import {
  REPORT_REASONS,
  useBlockUser,
  useReportUser,
} from '@/features/moderation/useModeration';
import { supabase } from '@/lib/supabase';
import { goalColor, gradients } from '@/theme/colors';

type Slot = { day: string; period: string };

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <View className="flex-1 items-center">
      <Text className="font-display text-2xl text-white">{value}</Text>
      <Text className="text-xs uppercase tracking-wide text-muted">{label}</Text>
    </View>
  );
}

export default function MemberProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const blockUser = useBlockUser();
  const reportUser = useReportUser();
  const [celebrating, setCelebrating] = useState(false);
  const scrollY = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  const coverStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(scrollY.value, [-200, 0], [-100, 0], 'clamp') },
      { scale: interpolate(scrollY.value, [-200, 0], [1.6, 1], 'clamp') },
    ],
  }));

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, bio, avatar_url, level, goals, usual_slots')
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
      <View className="flex-1 bg-background pt-20">
        <SkeletonList count={3} />
      </View>
    );
  }

  const initials = profile.display_name.slice(0, 2).toUpperCase();
  const slots = (profile.usual_slots ?? []) as Slot[];
  const days = new Set(slots.map((s) => s.day)).size;

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Cover parallax */}
      <Animated.View
        style={[{ position: 'absolute', top: 0, left: 0, right: 0, height: 200 }, coverStyle]}
      >
        <LinearGradient
          colors={gradients.candy}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1 }}
        />
      </Animated.View>

      {/* Bouton retour flottant */}
      <Pressable
        onPress={() => router.back()}
        style={{ position: 'absolute', top: insets.top + 6, left: 16, zIndex: 10 }}
        className="h-10 w-10 items-center justify-center rounded-full bg-black/30"
      >
        <Ionicons name="chevron-back" size={22} color="#fff" />
      </Pressable>

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 150, paddingBottom: 40 }}
      >
        <View className="items-center px-5">
          {/* Avatar à anneau dégradé */}
          <LinearGradient
            colors={gradients.brand}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ padding: 4, borderRadius: 64 }}
          >
            {profile.avatar_url ? (
              <Image
                source={profile.avatar_url}
                style={{ height: 112, width: 112, borderRadius: 56, borderWidth: 4, borderColor: '#160E0B' }}
              />
            ) : (
              <View
                className="items-center justify-center rounded-full bg-surfaceHigh"
                style={{ height: 112, width: 112, borderWidth: 4, borderColor: '#160E0B' }}
              >
                <Text className="font-display text-3xl text-primary">{initials}</Text>
              </View>
            )}
          </LinearGradient>

          <Text className="mt-3 font-display text-2xl text-white">
            {profile.display_name}
          </Text>

          {/* Stats row */}
          <View className="mt-4 w-full flex-row items-center rounded-4xl border border-border bg-surface py-4">
            <Stat value={profile.level} label="Niveau" />
            <View className="h-8 w-px bg-border" />
            <Stat value={profile.goals?.length ?? 0} label="Objectifs" />
            <View className="h-8 w-px bg-border" />
            <Stat value={`${days}j`} label="Par sem." />
          </View>

          {profile.bio ? (
            <Text className="mt-4 text-center leading-5 text-white">{profile.bio}</Text>
          ) : null}
        </View>

        {/* Highlights : objectifs en bulles */}
        {profile.goals?.length ? (
          <View className="mt-6 px-5">
            <Text className="mb-3 font-head text-xs uppercase tracking-widest text-muted">
              Objectifs
            </Text>
            <View className="flex-row flex-wrap gap-3">
              {profile.goals.map((g: string) => (
                <View key={g} className="items-center" style={{ width: 76 }}>
                  <LinearGradient
                    colors={[goalColor(g), `${goalColor(g)}55`]}
                    style={{ height: 64, width: 64, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Ionicons name="flame" size={26} color="#160E0B" />
                  </LinearGradient>
                  <Text
                    numberOfLines={1}
                    className="mt-1 text-center text-[11px] text-muted"
                  >
                    {g}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* CTA */}
        <View className="mt-7 px-5">
          <Button label="Message" icon="chatbubble-ellipses" onPress={contact} />
          <View className="mt-4 flex-row justify-center gap-8">
            <Pressable onPress={onReport} className="flex-row items-center gap-1.5">
              <Ionicons name="flag-outline" size={15} color="#B5A192" />
              <Text className="text-muted">Signaler</Text>
            </Pressable>
            <Pressable onPress={onBlock} className="flex-row items-center gap-1.5">
              <Ionicons name="ban-outline" size={15} color="#B5A192" />
              <Text className="text-muted">Bloquer</Text>
            </Pressable>
          </View>
        </View>
      </Animated.ScrollView>

      {celebrating && (
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(11,8,6,0.94)',
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
            }}
          >
            <Ionicons name="checkmark" size={64} color="#160E0B" />
          </LinearGradient>
          <Text className="mt-2 font-display text-2xl text-white">C'est parti !</Text>
          <Text className="text-muted">On vous met en relation…</Text>
        </Animated.View>
      )}
    </View>
  );
}
