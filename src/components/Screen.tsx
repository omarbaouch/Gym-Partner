import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LivingBackground } from './LivingBackground';

// Conteneur d'écran : fond "aurora" vivant (Skia) derrière le contenu.
export function Screen({ children }: { children: React.ReactNode }) {
  return (
    <View className="flex-1 bg-background">
      <LivingBackground />
      <SafeAreaView className="flex-1">
        <View className="flex-1 px-5">{children}</View>
      </SafeAreaView>
    </View>
  );
}
