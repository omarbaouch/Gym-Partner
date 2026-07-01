import { LinearGradient } from 'expo-linear-gradient';
import { lazy, Suspense } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorBoundary } from './ErrorBoundary';

import { colors } from '@/theme/colors';

// Import paresseux : si Skia échoue à se lier nativement, l'erreur survient
// au rendu (et non au chargement du module) → on peut la rattraper et replier
// sur un dégradé statique au lieu de figer toute l'app.
const LivingBackground = lazy(() => import('./LivingBackground'));

// Repli sans Skia (fond statique) en cas d'échec/chargement du fond vivant.
function StaticBackground() {
  return (
    <LinearGradient
      colors={[colors.background, colors.surface, colors.background]}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
    />
  );
}

// Conteneur d'écran : fond "aurora" vivant (Skia) derrière le contenu.
export function Screen({ children }: { children: React.ReactNode }) {
  return (
    <View className="flex-1 bg-background">
      <ErrorBoundary fallback={<StaticBackground />}>
        <Suspense fallback={<StaticBackground />}>
          <LivingBackground />
        </Suspense>
      </ErrorBoundary>
      <SafeAreaView className="flex-1">
        <View className="flex-1 px-5">{children}</View>
      </SafeAreaView>
    </View>
  );
}
