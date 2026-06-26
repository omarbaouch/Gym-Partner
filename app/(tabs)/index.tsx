import { Image } from 'expo-image';
import { Link, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import {
  emptyFilters,
  filterMembers,
  isFilterActive,
  type MemberFilters,
} from '@/features/discovery/filters';
import { useGymMembers, type Member } from '@/features/discovery/useGymMembers';
import { chainLogoUrl } from '@/features/gyms/chainLogo';
import { usePrimaryGym } from '@/features/gyms/usePrimaryGym';
import { GOALS, LEVELS, PERIODS } from '@/features/profile/constants';

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full px-3 py-1.5 ${active ? 'bg-primary' : 'bg-surface'}`}
    >
      <Text className={active ? 'font-semibold text-white' : 'text-muted'}>{label}</Text>
    </Pressable>
  );
}

export default function Discover() {
  const router = useRouter();
  const { data: gym, isLoading: gymLoading } = usePrimaryGym();
  const { data: members, isLoading } = useGymMembers(gym?.id);
  const [filters, setFilters] = useState<MemberFilters>(emptyFilters);
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(
    () => filterMembers(members ?? [], filters),
    [members, filters],
  );

  function toggleGoal(g: string) {
    setFilters((f) => ({
      ...f,
      goals: f.goals.includes(g) ? f.goals.filter((x) => x !== g) : [...f.goals, g],
    }));
  }
  function togglePeriod(p: string) {
    setFilters((f) => ({
      ...f,
      periods: f.periods.includes(p)
        ? f.periods.filter((x) => x !== p)
        : [...f.periods, p],
    }));
  }

  if (gymLoading) {
    return (
      <Screen>
        <ActivityIndicator className="mt-10" color="#FF6A1A" />
      </Screen>
    );
  }

  if (!gym) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center gap-4">
          <Text className="text-center text-lg text-white">
            Choisis ta salle pour découvrir les membres qui s'y entraînent.
          </Text>
          <Button label="Choisir ma salle" onPress={() => router.push('/select-gym')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View className="flex-row items-center justify-between py-3">
        <View className="flex-1 flex-row items-center gap-3">
          {chainLogoUrl(gym.gym_chains?.name) && (
            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-white p-1.5">
              <Image
                source={chainLogoUrl(gym.gym_chains?.name)!}
                style={{ width: '100%', height: '100%' }}
                contentFit="contain"
              />
            </View>
          )}
          <View className="flex-1">
            <Text className="text-xl font-extrabold text-white" numberOfLines={1}>
              {gym.name}
            </Text>
            <Text className="text-muted">{gym.city}</Text>
          </View>
        </View>
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => setShowFilters((v) => !v)}>
            <Text className={isFilterActive(filters) ? 'text-accent' : 'text-primary'}>
              Filtres
            </Text>
          </Pressable>
          <Link href="/select-gym" className="text-primary">
            Changer
          </Link>
        </View>
      </View>

      {showFilters && (
        <View className="gap-3 pb-3">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {LEVELS.map((l) => (
                <Chip
                  key={l.value}
                  label={l.label}
                  active={filters.level === l.value}
                  onPress={() =>
                    setFilters((f) => ({
                      ...f,
                      level: f.level === l.value ? null : l.value,
                    }))
                  }
                />
              ))}
              {PERIODS.map((p) => (
                <Chip
                  key={p.value}
                  label={p.label}
                  active={filters.periods.includes(p.value)}
                  onPress={() => togglePeriod(p.value)}
                />
              ))}
            </View>
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {GOALS.map((g) => (
                <Chip
                  key={g}
                  label={g}
                  active={filters.goals.includes(g)}
                  onPress={() => toggleGoal(g)}
                />
              ))}
            </View>
          </ScrollView>
          {isFilterActive(filters) && (
            <Pressable onPress={() => setFilters(emptyFilters)}>
              <Text className="text-muted">Réinitialiser les filtres</Text>
            </Pressable>
          )}
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator className="mt-10" color="#FF6A1A" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(m) => m.id}
          ItemSeparatorComponent={() => <View className="h-3" />}
          ListEmptyComponent={
            <Text className="mt-10 text-center text-muted">
              {isFilterActive(filters)
                ? 'Aucun membre ne correspond à ces filtres.'
                : "Personne d'autre pour l'instant. Reviens bientôt !"}
            </Text>
          }
          renderItem={({ item, index }) => <MemberCard member={item} index={index} />}
        />
      )}
    </Screen>
  );
}

function MemberCard({ member, index }: { member: Member; index: number }) {
  const initials = member.display_name.slice(0, 2).toUpperCase();
  return (
    <Animated.View entering={FadeInDown.duration(350).delay(Math.min(index, 8) * 45)}>
    <Link href={{ pathname: '/member/[id]', params: { id: member.id } }} asChild>
      <Pressable className="flex-row items-center gap-3 rounded-4xl border border-border bg-surface p-4">
        <View className="rounded-full border-2 border-primary/60 p-0.5">
          {member.avatar_url ? (
            <Image
              source={member.avatar_url}
              className="h-14 w-14 rounded-full bg-background"
            />
          ) : (
            <View className="h-14 w-14 items-center justify-center rounded-full bg-surfaceHigh">
              <Text className="font-bold text-primary">{initials}</Text>
            </View>
          )}
        </View>
        <View className="flex-1 gap-1">
          <Text className="text-base font-bold text-white">{member.display_name}</Text>
          <View className="flex-row flex-wrap items-center gap-1.5">
            <View className="rounded-full bg-ember/20 px-2 py-0.5">
              <Text className="text-xs font-semibold capitalize text-ember">
                {member.level}
              </Text>
            </View>
            {member.goals.slice(0, 2).map((g) => (
              <View key={g} className="rounded-full bg-primary/15 px-2 py-0.5">
                <Text className="text-xs font-semibold text-primary">{g}</Text>
              </View>
            ))}
          </View>
        </View>
        <Text className="text-2xl text-muted">›</Text>
      </Pressable>
    </Link>
    </Animated.View>
  );
}
