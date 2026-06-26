import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { gradients } from '@/theme/colors';

// Conteneur d'écran : fond sombre + lueur violette diffuse en haut.
export function Screen({ children }: { children: React.ReactNode }) {
  return (
    <View className="flex-1 bg-background">
      <LinearGradient
        colors={gradients.glow}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 320 }}
      />
      <SafeAreaView className="flex-1">
        <View className="flex-1 px-5">{children}</View>
      </SafeAreaView>
    </View>
  );
}
