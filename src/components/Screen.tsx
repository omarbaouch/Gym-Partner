import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorBoundary } from './ErrorBoundary';
import { LivingBackground } from './LivingBackground';

// Repli sans Skia si le rendu du fond vivant échoue (évite tout écran figé).
function StaticBackground() {
  return (
    <LinearGradient
      colors={['#160E0B', '#231811', '#160E0B']}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
    />
  );
}

// Conteneur d'écran : fond "aurora" vivant (Skia) derrière le contenu.
export function Screen({ children }: { children: React.ReactNode }) {
  return (
    <View className="flex-1 bg-background">
      <ErrorBoundary fallback={<StaticBackground />}>
        <LivingBackground />
      </ErrorBoundary>
      <SafeAreaView className="flex-1">
        <View className="flex-1 px-5">{children}</View>
      </SafeAreaView>
    </View>
  );
}
