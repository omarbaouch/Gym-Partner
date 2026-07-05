import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { showError } from '@/components/AppDialog';
import { ScalePressable } from '@/components/ScalePressable';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Counter } from '@/components/Counter';
import { formatRemaining, formatSince } from '@/lib/time';
import { colors } from '@/theme/colors';

import { DURATIONS, FOCUS_OPTIONS } from './constants';
import {
  useCheckIn,
  useCheckOut,
  useLiveAtGym,
  useMyCheckin,
  type LiveMember,
} from './useLive';

// Point lumineux qui « pulse » : signale l'état en direct (figé si Reduce Motion).
function PulseDot() {
  const opacity = useSharedValue(1);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return;
    opacity.value = withRepeat(
      withSequence(withTiming(0.25, { duration: 700 }), withTiming(1, { duration: 700 })),
      -1,
      true,
    );
  }, [opacity, reduced]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={style} className="h-2 w-2 rounded-full bg-ember" />;
}

function LiveCard({
  member,
  index,
  hasIntent,
  onPress,
}: {
  member: LiveMember;
  index: number;
  hasIntent?: boolean;
  onPress: () => void;
}) {
  const initials = member.display_name.slice(0, 2).toUpperCase();
  return (
    <Animated.View entering={FadeInDown.duration(300).delay(Math.min(index, 6) * 45)}>
      <ScalePressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${member.display_name}, ${member.focus}, ici depuis ${formatSince(member.since)}`}
        className="w-36 items-center gap-1.5 rounded-4xl border border-border bg-surface p-3"
      >
        {/* Anneau ember : LA marque visuelle du « live » (personne présente). */}
        <View
          style={{
            padding: 2.5,
            borderRadius: 28,
            borderWidth: 2,
            borderColor: colors.ember,
          }}
        >
          {member.avatar_url ? (
            <Image
              source={member.avatar_url}
              style={{ height: 48, width: 48, borderRadius: 24 }}
            />
          ) : (
            <View
              className="items-center justify-center rounded-full bg-surfaceHigh"
              style={{ height: 48, width: 48 }}
            >
              <Text className="font-head text-primary">{initials}</Text>
            </View>
          )}
        </View>
        <Text className="font-bold text-white" numberOfLines={1}>
          {member.display_name.split(' ')[0]}
        </Text>
        <View className="rounded-full bg-ember/20 px-2 py-0.5">
          <Text className="text-xs font-semibold text-ember">{member.focus}</Text>
        </View>
        <Text className="text-[11px] text-muted">
          ici depuis {formatSince(member.since)}
        </Text>
        {hasIntent && (
          <View className="rounded-full bg-primary/20 px-2 py-0.5">
            <Text className="text-[11px] font-bold text-primary">Partant·e</Text>
          </View>
        )}
      </ScalePressable>
    </Animated.View>
  );
}

// « Le Live » : check-in + tableau en direct des membres présents.
export function LiveSection({
  gymId,
  receivedIntents,
}: {
  gymId: string;
  receivedIntents?: Set<string>;
}) {
  const router = useRouter();
  const { data: live } = useLiveAtGym(gymId);
  const { data: mine } = useMyCheckin();
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();

  const [expanded, setExpanded] = useState(false);
  const [focus, setFocus] = useState<string | null>(null);
  const [minutes, setMinutes] = useState<number>(120);

  const count = live?.length ?? 0;
  const active = mine && new Date(mine.active_until) > new Date() ? mine : null;

  async function onConfirm() {
    if (!focus) return;
    try {
      await checkIn.mutateAsync({ gymId, focus, minutes });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setExpanded(false);
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Check-in impossible');
    }
  }

  return (
    <View className="gap-3 pb-2">
      {/* Titre + compteur vivant */}
      <View className="flex-row items-center gap-1.5">
        <Text className="font-head text-xs uppercase tracking-widest text-muted">
          En ce moment
        </Text>
        {count > 0 && (
          <>
            <Counter value={count} className="p-0 font-display text-base text-primary" />
            <Text className="text-xs font-bold text-muted">
              partenaire{count > 1 ? 's' : ''} là maintenant
            </Text>
          </>
        )}
      </View>

      {/* Mon état : CTA check-in ou carte « visible » */}
      {active ? (
        <View className="flex-row items-center gap-3 rounded-4xl border border-ember/40 bg-surface p-4">
          <PulseDot />
          <Text className="flex-1 font-semibold text-white" numberOfLines={1}>
            Tu es visible · {active.focus} · {formatRemaining(active.active_until)}
          </Text>
          <Pressable
            onPress={() => checkOut.mutate()}
            accessibilityRole="button"
            accessibilityLabel="Ne plus être visible"
          >
            <Text className="text-muted">Partir</Text>
          </Pressable>
        </View>
      ) : (
        <View className="rounded-4xl border border-border bg-surface p-4">
          <Pressable
            onPress={() => setExpanded((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel="Je suis à la salle"
            className="flex-row items-center gap-3"
          >
            <View
              className="items-center justify-center rounded-full bg-primary"
              style={{ height: 44, width: 44 }}
            >
              <Ionicons name="flash" size={22} color={colors.background} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-white">Je suis à la salle</Text>
              <Text className="text-sm text-muted">
                Affiche-toi pour trouver un partenaire, là, maintenant.
              </Text>
            </View>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.muted}
            />
          </Pressable>

          {expanded && (
            <Animated.View entering={FadeInDown.duration(250)} className="mt-4 gap-3">
              <Text className="font-head text-xs uppercase tracking-widest text-muted">
                Séance du jour
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {FOCUS_OPTIONS.map((f) => (
                  <Chip
                    key={f}
                    label={f}
                    active={focus === f}
                    onPress={() => setFocus(f)}
                  />
                ))}
              </View>
              <Text className="font-head text-xs uppercase tracking-widest text-muted">
                Durée
              </Text>
              <View className="flex-row gap-2">
                {DURATIONS.map((d) => (
                  <Chip
                    key={d.minutes}
                    label={d.label}
                    active={minutes === d.minutes}
                    onPress={() => setMinutes(d.minutes)}
                  />
                ))}
              </View>
              <Button
                label="Je m'affiche"
                icon="flash"
                onPress={onConfirm}
                loading={checkIn.isPending}
                disabled={!focus}
              />
            </Animated.View>
          )}
        </View>
      )}

      {/* Le tableau vivant */}
      {count > 0 ? (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={live}
          keyExtractor={(m) => m.user_id}
          contentContainerClassName="gap-2.5"
          renderItem={({ item, index }) => (
            <LiveCard
              member={item}
              index={index}
              hasIntent={receivedIntents?.has(item.user_id)}
              onPress={() =>
                router.push({ pathname: '/member/[id]', params: { id: item.user_id } })
              }
            />
          )}
        />
      ) : (
        <Text className="text-sm text-muted">
          Personne ne s'est encore signalé — sois le premier à t'afficher 🔥
        </Text>
      )}
    </View>
  );
}
