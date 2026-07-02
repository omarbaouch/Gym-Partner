import { keepPreviousData, useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';

import { dedupeGyms } from '@/features/gyms/dedupe';
import { supabase } from '@/lib/supabase';

export type NearbyGym = {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  postal_code: string | null;
  chain_id: string | null;
  chain_name: string | null;
  chain_logo_url: string | null;
  brand_color: string | null;
  latitude: number;
  longitude: number;
  distance_m: number;
};

export type Coords = { latitude: number; longitude: number };

function toCoords(pos: Location.LocationObject): Coords {
  return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
}

// `getCurrentPositionAsync` peut rester suspendu indéfiniment sur certains
// appareils Android : on borne l'attente et on retombe sur la dernière
// position connue plutôt que de bloquer l'écran.
const LOCATION_TIMEOUT_MS = 8000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('location timeout')), ms);
    p.then(
      (v) => (clearTimeout(t), resolve(v)),
      (e) => (clearTimeout(t), reject(e)),
    );
  });
}

// Position courante de l'appareil (demande la permission au besoin).
// Retourne null si la permission est refusée ou la position indisponible ;
// `refetch` permet de réessayer après activation de la localisation.
export function useUserLocation() {
  return useQuery({
    queryKey: ['user-location'],
    staleTime: 5 * 60_000,
    retry: 1,
    queryFn: async (): Promise<Coords | null> => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return null;

      const last = await Location.getLastKnownPositionAsync().catch(() => null);
      try {
        const pos = await withTimeout(
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          LOCATION_TIMEOUT_MS,
        );
        return toCoords(pos);
      } catch {
        return last ? toCoords(last) : null;
      }
    },
  });
}

// Salles proches de `coords`, éventuellement filtrées par chaîne.
// Dédoublonnées en base (RPC) ET côté client (filet de sécurité).
export function useNearbyGyms(
  coords: Coords | null | undefined,
  chainId?: string | null,
  radiusM = 8000,
) {
  return useQuery({
    queryKey: ['nearby-gyms', coords?.latitude, coords?.longitude, chainId, radiusM],
    enabled: !!coords,
    retry: 2,
    // Évite le clignotement carte/liste quand on change de filtre.
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<NearbyGym[]> => {
      const { data, error } = await supabase.rpc('nearby_gyms', {
        _lat: coords!.latitude,
        _lng: coords!.longitude,
        _radius_m: radiusM,
        _chain: chainId ?? null,
      });
      if (error) throw error;
      return dedupeGyms((data ?? []) as NearbyGym[]);
    },
  });
}
