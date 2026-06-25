import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';

import { supabase } from '@/lib/supabase';

export type NearbyGym = {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  chain_id: string | null;
  chain_name: string | null;
  latitude: number;
  longitude: number;
  distance_m: number;
};

export type Coords = { latitude: number; longitude: number };

// Position courante de l'appareil (demande la permission au besoin).
export function useUserLocation() {
  return useQuery({
    queryKey: ['user-location'],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Coords | null> => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return null;
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    },
  });
}

// Salles proches de `coords`, éventuellement filtrées par chaîne.
export function useNearbyGyms(
  coords: Coords | null | undefined,
  chainId?: string | null,
  radiusM = 8000,
) {
  return useQuery({
    queryKey: ['nearby-gyms', coords?.latitude, coords?.longitude, chainId, radiusM],
    enabled: !!coords,
    queryFn: async (): Promise<NearbyGym[]> => {
      const { data, error } = await supabase.rpc('nearby_gyms', {
        _lat: coords!.latitude,
        _lng: coords!.longitude,
        _radius_m: radiusM,
        _chain: chainId ?? null,
      });
      if (error) throw error;
      return (data ?? []) as NearbyGym[];
    },
  });
}
