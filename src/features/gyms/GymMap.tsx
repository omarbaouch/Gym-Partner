import { useRef, useState } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, type Region } from 'react-native-maps';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { gymSubtitle } from '@/features/gyms/gymLabel';
import type { NearbyGym } from '@/features/gyms/useNearbyGyms';
import { colors } from '@/theme/colors';
import { darkMapStyle } from '@/theme/mapStyle';

type Props = {
  region: Region;
  gyms: NearbyGym[];
  onSelectGym: (gymId: string) => void;
};

// Google Maps exige une clé API native : dispo côté Android (injectée au
// build, cf. app.config.js), mais absente des builds iOS type Expo Go où
// PROVIDER_GOOGLE rend une carte blanche. Sur iOS on garde Apple Maps
// (fournisseur par défaut), toujours disponible.
const MAP_PROVIDER = Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined;

function MapFallback() {
  return (
    <View className="flex-1 items-center justify-center bg-surface px-4">
      <Text className="text-center text-xs text-muted">
        Carte indisponible sur cet appareil — la liste ci-dessous reste utilisable.
      </Text>
    </View>
  );
}

function InnerMap({ region, gyms, onSelectGym }: Props) {
  const [ready, setReady] = useState(false);
  const mapRef = useRef<MapView>(null);

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        provider={MAP_PROVIDER}
        style={{ flex: 1 }}
        initialRegion={region}
        customMapStyle={MAP_PROVIDER ? darkMapStyle : undefined}
        onMapReady={() => setReady(true)}
        showsUserLocation
        toolbarEnabled={false}
      >
        {gyms.map((g) => (
          <Marker
            key={g.id}
            coordinate={{ latitude: g.latitude, longitude: g.longitude }}
            title={g.name}
            description={gymSubtitle(g)}
            pinColor={g.brand_color ?? colors.primary}
            onCalloutPress={() => onSelectGym(g.id)}
          />
        ))}
      </MapView>
      {!ready && (
        <View
          pointerEvents="none"
          className="absolute inset-0 items-center justify-center bg-surface"
        >
          <ActivityIndicator color={colors.primary} />
        </View>
      )}
    </View>
  );
}

// Carte des salles proches. Robuste par construction :
//  - fournisseur adapté à la plateforme (pas de carte blanche iOS) ;
//  - indicateur de chargement tant que la carte n'est pas prête ;
//  - ErrorBoundary : si le module natif échoue (simulateur, Expo Go sans
//    maps), on affiche un repli au lieu de faire planter l'écran.
export function GymMap(props: Props) {
  return (
    <ErrorBoundary fallback={<MapFallback />}>
      <InnerMap {...props} />
    </ErrorBoundary>
  );
}
