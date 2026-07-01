import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, View } from 'react-native';

import { colors, gradients } from '@/theme/colors';

// Écran racine "/" : affiché le temps que l'auth se charge et que la
// redirection (sign-in / tabs) s'effectue. Évite tout écran vide figé.
export default function Index() {
  return (
    <View className="flex-1 items-center justify-center bg-background gap-6">
      <LinearGradient
        colors={gradients.brand}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          height: 84,
          width: 84,
          borderRadius: 28,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="barbell" size={42} color={colors.background} />
      </LinearGradient>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}
