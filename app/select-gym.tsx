import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Screen } from '@/components/Screen';
import { SkeletonList } from '@/components/Skeleton';
import { chainLogoUrl, gymLogoUrl } from '@/features/gyms/chainLogo';
import { dedupeGyms } from '@/features/gyms/dedupe';
import { GymMap } from '@/features/gyms/GymMap';
import { gymSubtitle, formatDistance } from '@/features/gyms/gymLabel';
import { useChains } from '@/features/gyms/useChains';
import { useNearbyGyms, useUserLocation } from '@/features/gyms/useNearbyGyms';
import { useSetPrimaryGym } from '@/features/gyms/useSetPrimaryGym';
import { supabase } from '@/lib/supabase';

import { colors } from '@/theme/colors';

type GymRow = {
  id: string;
  name: string;
  city: string | null;
  address?: string | null;
  postal_code?: string | null;
  chain_id?: string | null;
  chain_name?: string | null;
  chain_logo_url?: string | null;
  brand_color?: string | null;
  distance_m?: number;
  latitude?: number | null;
  longitude?: number | null;
};

export default function SelectGym() {
  const router = useRouter();
  const setPrimary = useSetPrimaryGym();
  const [mode, setMode] = useState<'near' | 'city'>('near');
  const [city, setCity] = useState('');
  const [chainId, setChainId] = useState<string | null>(null);
  const [selectingId, setSelectingId] = useState<string | null>(null);

  const { data: chains } = useChains();
  const {
    data: location,
    isLoading: locLoading,
    isFetching: locFetching,
    refetch: retryLocation,
  } = useUserLocation();
  const { data: nearby, isLoading: nearbyLoading } = useNearbyGyms(
    mode === 'near' ? location : null,
    chainId,
  );

  const chainColor = useMemo(() => {
    const m = new Map<string, string>();
    (chains ?? []).forEach((c: { id: string; brand_color: string | null }) =>
      m.set(c.id, c.brand_color ?? colors.primary),
    );
    return m;
  }, [chains]);

  const { data: cityGyms, isLoading: cityLoading } = useQuery({
    queryKey: ['gym-search', city, chainId],
    enabled: mode === 'city' && city.length >= 2,
    queryFn: async (): Promise<GymRow[]> => {
      let q = supabase
        .from('gyms')
        .select(
          'id, name, city, address, postal_code, chain_id, latitude, longitude, gym_chains ( name, logo_url, brand_color )',
        )
        .ilike('city', `%${city}%`)
        .order('name')
        .limit(40);
      if (chainId) q = q.eq('chain_id', chainId);
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []).map((g) => {
        const chain = g.gym_chains as unknown as {
          name: string;
          logo_url: string | null;
          brand_color: string | null;
        } | null;
        return {
          ...g,
          chain_name: chain?.name ?? null,
          chain_logo_url: chain?.logo_url ?? null,
          brand_color: chain?.brand_color ?? null,
        };
      });
      return dedupeGyms(rows);
    },
  });

  async function choose(gymId: string) {
    setSelectingId(gymId);
    try {
      await setPrimary.mutateAsync(gymId);
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)');
    } catch (e) {
      setSelectingId(null);
      alert(e instanceof Error ? e.message : 'Sélection impossible');
    }
  }

  const rows: GymRow[] = mode === 'near' ? (nearby ?? []) : (cityGyms ?? []);
  const loading = mode === 'near' ? locLoading || nearbyLoading : cityLoading;

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
        <Text className="font-display text-3xl text-white">Choisis ta salle</Text>

        {/* Mode : proximité / ville */}
        <View className="flex-row gap-2 rounded-4xl bg-surface p-1">
          {(['near', 'city'] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              accessibilityRole="button"
              accessibilityLabel={m === 'near' ? 'Près de moi' : 'Par ville'}
              accessibilityState={{ selected: mode === m }}
              className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-4xl py-2.5 ${
                mode === m ? 'bg-primary' : ''
              }`}
            >
              <Ionicons
                name={m === 'near' ? 'navigate' : 'search'}
                size={15}
                color={mode === m ? colors.background : colors.muted}
              />
              <Text
                className={
                  mode === m ? 'font-bold text-background' : 'font-semibold text-muted'
                }
              >
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
            const logo = item.id
              ? ((item as { logo_url?: string | null }).logo_url ??
                chainLogoUrl(item.name))
              : null;
            return (
              <Pressable
                onPress={() => setChainId(item.id)}
                accessibilityRole="button"
                accessibilityLabel={item.name}
                accessibilityState={{ selected: active }}
                className={`flex-row items-center gap-2 rounded-full border px-3 py-2 ${
                  active ? 'border-primary bg-primary/20' : 'border-border bg-surface'
                }`}
              >
                {logo && (
                  <Image
                    source={logo}
                    style={{ width: 18, height: 18, borderRadius: 4 }}
                  />
                )}
                <Text className={active ? 'font-bold text-primary' : 'text-muted'}>
                  {item.name}
                </Text>
              </Pressable>
            );
          }}
        />

        {mode === 'city' && (
          <TextInput
            className="h-14 rounded-4xl border border-border bg-surface px-5 text-white"
            placeholder="Ville (ex : Strasbourg, Paris...)"
            placeholderTextColor={colors.placeholder}
            value={city}
            onChangeText={setCity}
            accessibilityLabel="Ville"
          />
        )}
      </View>

      {/* Carte des salles proches */}
      {mode === 'near' && region && (
        <View
          collapsable={false}
          className="mb-3 h-44 overflow-hidden rounded-4xl border border-border"
        >
          <GymMap region={region} gyms={nearby ?? []} onSelectGym={choose} />
        </View>
      )}

      {/* Localisation refusée ou indisponible : proposer de réessayer */}
      {mode === 'near' && !locLoading && !location && (
        <View className="mb-3 items-center gap-2 rounded-4xl border border-border bg-surface p-4">
          <Text className="text-center text-sm text-muted">
            Position indisponible. Active la localisation dans les réglages puis réessaie,
            ou passe en recherche par ville.
          </Text>
          <Pressable
            onPress={() => retryLocation()}
            disabled={locFetching}
            accessibilityRole="button"
            accessibilityLabel="Réessayer la localisation"
            className="flex-row items-center gap-1.5 rounded-full bg-primary/20 px-4 py-2"
          >
            {locFetching ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="refresh" size={14} color={colors.primary} />
            )}
            <Text className="font-bold text-primary">Réessayer</Text>
          </Pressable>
        </View>
      )}

      {loading ? (
        <SkeletonList count={6} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(g) => g.id}
          ItemSeparatorComponent={() => <View className="h-2.5" />}
          contentContainerClassName="pb-6"
          ListEmptyComponent={
            <Text className="mt-6 text-center text-muted">
              {mode === 'near'
                ? 'Aucune salle proche (active la localisation ou élargis la recherche).'
                : 'Saisis une ville pour rechercher une salle.'}
            </Text>
          }
          renderItem={({ item, index }) => {
            const color =
              item.brand_color ??
              (item.chain_id ? chainColor.get(item.chain_id) : undefined);
            const logo = gymLogoUrl(item);
            const selecting = selectingId === item.id;
            return (
              <Animated.View
                entering={FadeInDown.duration(300).delay(Math.min(index, 8) * 35)}
              >
                <Pressable
                  onPress={() => choose(item.id)}
                  disabled={!!selectingId}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.name}, ${item.chain_name ?? 'salle indépendante'}`}
                  className="flex-row items-center gap-3 rounded-4xl border border-border bg-surface p-4"
                >
                  {logo ? (
                    <View className="h-11 w-11 items-center justify-center rounded-full bg-surfaceHigh p-2">
                      <Image
                        source={logo}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="contain"
                      />
                    </View>
                  ) : (
                    <View
                      className="h-11 w-1.5 rounded-full"
                      style={{ backgroundColor: color ?? colors.border }}
                    />
                  )}
                  <View className="flex-1 pr-2">
                    <Text className="text-base font-bold text-white" numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text className="text-xs font-semibold text-muted">
                      {item.chain_name ?? 'Salle indépendante'}
                    </Text>
                    <Text className="text-sm text-muted" numberOfLines={1}>
                      {gymSubtitle(item)}
                    </Text>
                  </View>
                  {selecting ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : item.distance_m != null ? (
                    <View className="items-end">
                      <Text className="font-bold text-primary">
                        {formatDistance(item.distance_m)}
                      </Text>
                    </View>
                  ) : (
                    <Text className="text-2xl text-muted">›</Text>
                  )}
                </Pressable>
              </Animated.View>
            );
          }}
        />
      )}
    </Screen>
  );
}
