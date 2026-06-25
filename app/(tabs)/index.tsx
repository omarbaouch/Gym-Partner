import { Image } from 'expo-image';
import { Link, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import {
  emptyFilters,
  filterMembers,
  isFilterActive,
  type MemberFilters,
} from '@/features/discovery/filters';
import { useGymMembers, type Member } from '@/features/discovery/useGymMembers';
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
        <ActivityIndicator className="mt-10" color="#7C5CFF" />
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
        <View>
          <Text className="text-xl font-bold text-white">{gym.name}</Text>
          <Text className="text-muted">{gym.city}</Text>
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
        <ActivityIndicator className="mt-10" color="#7C5CFF" />
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
          renderItem={({ item }) => <MemberCard member={item} />}
        />
      )}
    </Screen>
  );
}

function MemberCard({ member }: { member: Member }) {
  return (
    <Link href={{ pathname: '/member/[id]', params: { id: member.id } }} asChild>
      <Pressable className="flex-row items-center gap-3 rounded-2xl bg-surface p-3">
        <Image
          source={member.avatar_url ?? undefined}
          className="h-12 w-12 rounded-full bg-background"
        />
        <View className="flex-1">
          <Text className="text-base font-semibold text-white">
            {member.display_name}
          </Text>
          <Text className="text-muted">
            {member.level} · {member.goals.join(', ') || 'Objectifs non renseignés'}
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}
