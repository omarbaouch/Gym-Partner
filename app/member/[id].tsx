import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  FadeInDown,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { showDialog, showError, showInfo } from '@/components/AppDialog';
import { Button } from '@/components/Button';
import { Confetti } from '@/components/Confetti';
import { SkeletonList } from '@/components/Skeleton';
import { useExpressIntent, useIntentStatus } from '@/features/match/useIntents';
import {
  REPORT_REASONS,
  useBlockUser,
  useReportUser,
} from '@/features/moderation/useModeration';
import { supabase } from '@/lib/supabase';
import { colors, goalColor, gradients } from '@/theme/colors';

type Slot = { day: string; period: string };

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <View className="flex-1 items-center">
      <Text className="font-display text-2xl text-white">{value}</Text>
      <Text className="font-head text-xs uppercase tracking-widest text-muted">
        {label}
      </Text>
    </View>
  );
}

export default function MemberProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const blockUser = useBlockUser();
  const reportUser = useReportUser();
  const expressIntent = useExpressIntent();
  const { data: intent } = useIntentStatus(id);
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

  const firstName = profile?.display_name?.split(' ')[0] ?? 'ce membre';

  // « Partant·e pour s'entraîner » : intent, et match si c'est réciproque.
  async function sendIntent() {
    try {
      const result = await expressIntent.mutateAsync(id!);
      if (result.status === 'matched' && result.conversation_id) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
          () => {},
        );
        setCelebrating(true);
        setTimeout(
          () =>
            router.replace({
              pathname: '/chat/[id]',
              params: { id: result.conversation_id! },
            }),
          1800,
        );
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        showInfo('Demande envoyée', `On prévient ${firstName} !`);
      }
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Action impossible.');
    }
  }

  function onBlock() {
    showDialog({
      title: 'Bloquer',
      message: 'Cette personne ne pourra plus te voir ni te contacter.',
      actions: [
        { label: 'Annuler', style: 'cancel' },
        {
          label: 'Bloquer',
          style: 'destructive',
          onPress: async () => {
            try {
              await blockUser.mutateAsync(id!);
              router.back();
            } catch (e) {
              showError(e instanceof Error ? e.message : 'Échec du blocage');
            }
          },
        },
      ],
    });
  }

  function onReport() {
    showDialog({
      title: 'Signaler',
      message: 'Motif du signalement',
      actions: [
        ...REPORT_REASONS.map((reason) => ({
          label: reason,
          onPress: async () => {
            try {
              await reportUser.mutateAsync({ otherId: id!, reason });
              showInfo('Merci', 'Signalement transmis à la modération.');
            } catch (e) {
              showError(e instanceof Error ? e.message : 'Signalement impossible.');
            }
          },
        })),
        { label: 'Annuler', style: 'cancel' as const },
      ],
    });
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

      {/* Cover parallax : discret (le dégradé de marque est réservé au match) */}
      <Animated.View
        style={[
          { position: 'absolute', top: 0, left: 0, right: 0, height: 200 },
          coverStyle,
        ]}
      >
        <LinearGradient
          colors={gradients.dark}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ flex: 1 }}
        />
      </Animated.View>

      {/* Bouton retour flottant */}
      <Pressable
        onPress={() => router.back()}
        style={{ position: 'absolute', top: insets.top + 6, left: 16, zIndex: 10 }}
        className="h-10 w-10 items-center justify-center rounded-full bg-black/30"
      >
        <Ionicons name="chevron-back" size={22} color={colors.text} />
      </Pressable>

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 150, paddingBottom: 40 }}
      >
        <Animated.View entering={FadeInDown.duration(500)} className="items-center px-5">
          {/* Avatar : anneau sobre (le dégradé est réservé aux 3 moments de marque) */}
          <View
            style={{
              padding: 4,
              borderRadius: 64,
              borderWidth: 2,
              borderColor: colors.border,
              backgroundColor: colors.surface,
            }}
          >
            {profile.avatar_url ? (
              <Image
                source={profile.avatar_url}
                style={{ height: 112, width: 112, borderRadius: 56 }}
              />
            ) : (
              <View
                className="items-center justify-center rounded-full bg-surfaceHigh"
                style={{ height: 112, width: 112 }}
              >
                <Text className="font-display text-3xl text-primary">{initials}</Text>
              </View>
            )}
          </View>

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
        </Animated.View>

        {/* Highlights : objectifs en bulles */}
        {profile.goals?.length ? (
          <Animated.View
            entering={FadeInDown.duration(500).delay(120)}
            className="mt-6 px-5"
          >
            <Text className="mb-3 font-head text-xs uppercase tracking-widest text-muted">
              Objectifs
            </Text>
            <View className="flex-row flex-wrap gap-3">
              {profile.goals.map((g: string) => (
                <View key={g} className="items-center" style={{ width: 76 }}>
                  <LinearGradient
                    colors={[goalColor(g), `${goalColor(g)}55`]}
                    style={{
                      height: 64,
                      width: 64,
                      borderRadius: 24,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="flame" size={26} color={colors.background} />
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
          </Animated.View>
        ) : null}

        {/* CTA : état de la relation (none / sent / received / matched) */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(220)}
          className="mt-7 px-5"
        >
          {intent?.status === 'matched' ? (
            <Button
              label="Ouvrir la conversation"
              icon="chatbubble-ellipses"
              onPress={() =>
                intent.conversation_id &&
                router.push({
                  pathname: '/chat/[id]',
                  params: { id: intent.conversation_id },
                })
              }
            />
          ) : intent?.status === 'sent' ? (
            <View
              accessible
              accessibilityLabel={`En attente de ${firstName}`}
              className="h-14 flex-row items-center justify-center gap-2 rounded-4xl border border-border bg-surface px-5 opacity-70"
            >
              <Ionicons name="hourglass-outline" size={18} color={colors.muted} />
              <Text className="text-base font-semibold text-muted">
                En attente de {firstName}…
              </Text>
            </View>
          ) : intent?.status === 'received' ? (
            <Button
              label={`${firstName} est partant·e — Accepter`}
              icon="flash"
              onPress={sendIntent}
              loading={expressIntent.isPending}
            />
          ) : (
            <Button
              label="Partant·e pour s'entraîner"
              icon="flame"
              onPress={sendIntent}
              loading={expressIntent.isPending}
              disabled={!intent}
            />
          )}
          <View className="mt-4 flex-row justify-center gap-8">
            <Pressable onPress={onReport} className="flex-row items-center gap-1.5">
              <Ionicons name="flag-outline" size={15} color={colors.muted} />
              <Text className="text-muted">Signaler</Text>
            </Pressable>
            <Pressable onPress={onBlock} className="flex-row items-center gap-1.5">
              <Ionicons name="ban-outline" size={15} color={colors.muted} />
              <Text className="text-muted">Bloquer</Text>
            </Pressable>
          </View>
        </Animated.View>
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
            <Ionicons name="checkmark" size={64} color={colors.background} />
          </LinearGradient>
          <Text className="mt-2 font-display text-2xl text-white">Ça matche !</Text>
          <Text className="text-muted">Vous êtes partants tous les deux…</Text>
        </Animated.View>
      )}
    </View>
  );
}
