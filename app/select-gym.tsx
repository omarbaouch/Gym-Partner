import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { Screen } from '@/components/Screen';
import { useChains } from '@/features/gyms/useChains';
import {
  useNearbyGyms,
  useUserLocation,
  type NearbyGym,
} from '@/features/gyms/useNearbyGyms';
import { useSetPrimaryGym } from '@/features/gyms/useSetPrimaryGym';
import { supabase } from '@/lib/supabase';

type GymRow = {
  id: string;
  name: string;
  city: string | null;
  address?: string | null;
  chain_name?: string | null;
  distance_m?: number;
};

function formatDistance(m?: number) {
  if (m == null) return '';
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

export default function SelectGym() {
  const router = useRouter();
  const setPrimary = useSetPrimaryGym();
  const [mode, setMode] = useState<'near' | 'city'>('near');
  const [city, setCity] = useState('');
  const [chainId, setChainId] = useState<string | null>(null);

  const { data: chains } = useChains();
  const { data: location, isLoading: locLoading } = useUserLocation();
  const { data: nearby, isLoading: nearbyLoading } = useNearbyGyms(
    mode === 'near' ? location : null,
    chainId,
  );

  const { data: cityGyms, isLoading: cityLoading } = useQuery({
    queryKey: ['gym-search', city, chainId],
    enabled: mode === 'city' && city.length >= 2,
    queryFn: async (): Promise<GymRow[]> => {
      let q = supabase
        .from('gyms')
        .select('id, name, city, address, gym_chains ( name )')
        .ilike('city', `%${city}%`)
        .limit(30);
      if (chainId) q = q.eq('chain_id', chainId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((g) => ({
        ...g,
        chain_name:
          (g.gym_chains as unknown as { name: string } | null)?.name ?? null,
      }));
    },
  });

  async function choose(gymId: string) {
    try {
      await setPrimary.mutateAsync(gymId);
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)');
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Sélection impossible');
    }
  }

  const rows: GymRow[] = mode === 'near' ? (nearby ?? []) : (cityGyms ?? []);
  const loading =
    mode === 'near' ? locLoading || nearbyLoading : cityLoading;

  const region = useMemo(
    () =>
      location
        ? {
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.08,
            longitudeDelta: 0.08,
          }
        : undefined,
    [location],
  );

  return (
    <Screen>
      <View className="gap-3 py-3">
        <Text className="text-2xl font-bold text-white">Choisis ta salle</Text>

        {/* Mode : proximité / ville */}
        <View className="flex-row gap-2">
          {(['near', 'city'] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              className={`flex-1 items-center rounded-2xl py-2 ${
                mode === m ? 'bg-primary' : 'bg-surface'
              }`}
            >
              <Text className={mode === m ? 'font-semibold text-white' : 'text-muted'}>
                {m === 'near' ? 'Près de moi' : 'Par ville'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Filtre par chaîne */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ id: null, name: 'Toutes' }, ...(chains ?? [])]}
          keyExtractor={(c) => c.id ?? 'all'}
          contentContainerClassName="gap-2"
          renderItem={({ item }) => {
            const active = chainId === item.id;
            return (
              <Pressable
                onPress={() => setChainId(item.id)}
                className={`rounded-full px-4 py-2 ${active ? 'bg-accent' : 'bg-surface'}`}
              >
                <Text className={active ? 'font-semibold text-background' : 'text-muted'}>
                  {item.name}
                </Text>
              </Pressable>
            );
          }}
        />

        {mode === 'city' && (
          <TextInput
            className="h-12 rounded-2xl bg-surface px-4 text-white"
            placeholder="Ville (ex : Paris, Lyon...)"
            placeholderTextColor="#8A8A99"
            value={city}
            onChangeText={setCity}
          />
        )}
      </View>

      {/* Carte des salles proches */}
      {mode === 'near' && region && (
        <View className="mb-3 h-48 overflow-hidden rounded-2xl">
          <MapView style={{ flex: 1 }} initialRegion={region}>
            {(nearby ?? []).map((g: NearbyGym) => (
              <Marker
                key={g.id}
                coordinate={{ latitude: g.latitude, longitude: g.longitude }}
                title={g.name}
                description={g.chain_name ?? undefined}
                onCalloutPress={() => choose(g.id)}
              />
            ))}
          </MapView>
        </View>
      )}

      {loading ? (
        <ActivityIndicator className="mt-6" color="#7C5CFF" />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(g) => g.id}
          ItemSeparatorComponent={() => <View className="h-2" />}
          ListEmptyComponent={
            <Text className="mt-6 text-center text-muted">
              {mode === 'near'
                ? 'Aucune salle proche (active la localisation ou élargis la recherche).'
                : 'Saisis une ville pour rechercher une salle.'}
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => choose(item.id)}
              className="flex-row items-center justify-between rounded-2xl bg-surface p-4"
            >
              <View className="flex-1 pr-2">
                <Text className="text-base font-semibold text-white">{item.name}</Text>
                <Text className="text-muted">
                  {item.chain_name ?? 'Indépendante'} · {item.city}
                </Text>
              </View>
              {item.distance_m != null && (
                <Text className="text-accent">{formatDistance(item.distance_m)}</Text>
              )}
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}
