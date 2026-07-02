import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Screen } from '@/components/Screen';
import { SkeletonList } from '@/components/Skeleton';
import { chainLogoUrl, gymLogoUrl, normalizeChainName } from '@/features/gyms/chainLogo';
import { GymMap } from '@/features/gyms/GymMap';
import { gymSubtitle, formatDistance } from '@/features/gyms/gymLabel';
import { useChains } from '@/features/gyms/useChains';
import { useCitySearch, type CitySuggestion } from '@/features/gyms/useCities';
import { useNearbyGyms, useUserLocation } from '@/features/gyms/useNearbyGyms';
import { useSetPrimaryGym } from '@/features/gyms/useSetPrimaryGym';

import { colors } from '@/theme/colors';

// Rayon de recherche autour du centre-ville sélectionné (couvre l'agglomération).
const CITY_RADIUS_M = 15_000;

export default function SelectGym() {
  const router = useRouter();
  const setPrimary = useSetPrimaryGym();
  const [mode, setMode] = useState<'city' | 'near'>('city');
  const [cityInput, setCityInput] = useState('');
  const [selectedCity, setSelectedCity] = useState<CitySuggestion | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [selectingId, setSelectingId] = useState<string | null>(null);

  const { data: chains } = useChains();
  const {
    data: location,
    isLoading: locLoading,
    isFetching: locFetching,
    refetch: retryLocation,
  } = useUserLocation();

  // Suggestions de villes pendant la frappe (tant que rien n'est sélectionné).
  const { data: citySuggestions } = useCitySearch(
    cityInput,
    mode === 'city' && !selectedCity,
  );

  // Sélection automatique quand la saisie correspond exactement à une ville.
  useEffect(() => {
    if (mode !== 'city' || selectedCity || !citySuggestions?.length) return;
    const exact = citySuggestions.find(
      (s: CitySuggestion) => normalizeChainName(s.city) === normalizeChainName(cityInput),
    );
    if (exact) {
      setSelectedCity(exact);
      setCityInput(exact.city);
    }
  }, [mode, selectedCity, citySuggestions, cityInput]);

  // Un seul moteur de recherche : proximité autour d'un point (position de
  // l'utilisateur ou centre de la ville choisie), dédupliqué en base + client.
  const searchCenter = useMemo(
    () =>
      mode === 'near'
        ? (location ?? null)
        : selectedCity
          ? { latitude: selectedCity.latitude, longitude: selectedCity.longitude }
          : null,
    [mode, location, selectedCity],
  );
  const { data: gyms, isLoading: gymsLoading } = useNearbyGyms(
    searchCenter,
    chainId,
    mode === 'near' ? 8000 : CITY_RADIUS_M,
  );

  function selectCity(s: CitySuggestion) {
    setSelectedCity(s);
    setCityInput(s.city);
    Keyboard.dismiss();
  }

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

  const loading =
    mode === 'near'
      ? locLoading || (!!location && gymsLoading)
      : !!selectedCity && gymsLoading;

  const region = useMemo(
    () =>
      searchCenter
        ? {
            latitude: searchCenter.latitude,
            longitude: searchCenter.longitude,
            latitudeDelta: 0.08,
            longitudeDelta: 0.08,
          }
        : undefined,
    [searchCenter],
  );

  return (
    <Screen>
      <View className="gap-3 py-3">
        <Text className="font-display text-3xl text-white">Choisis ta salle</Text>

        {/* Mode : ville d'abord, puis proximité */}
        <View className="flex-row gap-2 rounded-4xl bg-surface p-1">
          {(['city', 'near'] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              accessibilityRole="button"
              accessibilityLabel={m === 'city' ? 'Par ville' : 'Près de moi'}
              accessibilityState={{ selected: mode === m }}
              className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-4xl py-2.5 ${
                mode === m ? 'bg-primary' : ''
              }`}
            >
              <Ionicons
                name={m === 'city' ? 'search' : 'navigate'}
                size={15}
                color={mode === m ? colors.background : colors.muted}
              />
              <Text
                className={
                  mode === m ? 'font-bold text-background' : 'font-semibold text-muted'
                }
              >
                {m === 'city' ? 'Par ville' : 'Près de moi'}
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
          <View>
            <View className="h-14 flex-row items-center rounded-4xl border border-border bg-surface px-5">
              <TextInput
                className="flex-1 text-white"
                placeholder="Ville (ex : Strasbourg, Paris...)"
                placeholderTextColor={colors.placeholder}
                value={cityInput}
                onChangeText={(t) => {
                  setCityInput(t);
                  setSelectedCity(null);
                }}
                autoCorrect={false}
                accessibilityLabel="Ville"
              />
              {selectedCity ? (
                <Pressable
                  onPress={() => {
                    setCityInput('');
                    setSelectedCity(null);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Effacer la ville"
                  hitSlop={8}
                >
                  <Ionicons name="close-circle" size={20} color={colors.muted} />
                </Pressable>
              ) : (
                <Ionicons name="search" size={18} color={colors.muted} />
              )}
            </View>

            {/* Suggestions de villes pendant la frappe */}
            {!selectedCity && (citySuggestions?.length ?? 0) > 0 && (
              <View className="mt-2 overflow-hidden rounded-4xl border border-border bg-surface">
                {(citySuggestions ?? []).map((s: CitySuggestion, i: number) => (
                  <Pressable
                    key={`${s.city}-${s.dept ?? ''}`}
                    onPress={() => selectCity(s)}
                    accessibilityRole="button"
                    accessibilityLabel={`${s.city}${s.dept ? ` (${s.dept})` : ''}`}
                    className={`flex-row items-center gap-3 px-4 py-3 ${
                      i > 0 ? 'border-t border-border' : ''
                    }`}
                  >
                    <Ionicons name="location" size={16} color={colors.primary} />
                    <Text className="flex-1 font-semibold text-white" numberOfLines={1}>
                      {s.city}
                      {s.dept ? (
                        <Text className="font-normal text-muted"> ({s.dept})</Text>
                      ) : null}
                    </Text>
                    <Text className="text-xs font-semibold text-muted">
                      {s.gym_count} salle{s.gym_count > 1 ? 's' : ''}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}
      </View>

      {/* Carte des salles (autour de moi ou de la ville choisie) */}
      {region && (
        <View
          collapsable={false}
          className="mb-3 h-44 overflow-hidden rounded-4xl border border-border"
        >
          <GymMap region={region} gyms={gyms ?? []} onSelectGym={choose} />
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
          data={searchCenter ? (gyms ?? []) : []}
          keyExtractor={(g) => g.id}
          ItemSeparatorComponent={() => <View className="h-2.5" />}
          contentContainerClassName="pb-6"
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <Text className="mt-6 text-center text-muted">
              {mode === 'city'
                ? selectedCity
                  ? 'Aucune salle trouvée autour de cette ville.'
                  : 'Saisis une ville puis choisis-la dans les suggestions.'
                : 'Aucune salle proche (active la localisation ou élargis la recherche).'}
            </Text>
          }
          renderItem={({ item, index }) => {
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
                      style={{ backgroundColor: item.brand_color ?? colors.border }}
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
