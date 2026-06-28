import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { gradients } from '@/theme/colors';

// État vide premium : icône dans un disque dégradé qui flotte + titre/sous-titre + CTA.
export function EmptyState({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withRepeat(
      withSequence(withTiming(-7, { duration: 1100 }), withTiming(0, { duration: 1100 })),
      -1,
      true,
    );
  }, [y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  return (
    <View className="flex-1 items-center justify-center gap-4 px-8">
      <Animated.View style={style}>
        <LinearGradient
          colors={gradients.brand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            height: 104,
            width: 104,
            borderRadius: 36,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#FF7A1A',
            shadowOpacity: 0.5,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 10 },
            elevation: 12,
          }}
        >
          <Ionicons name={icon} size={48} color="#160E0B" />
        </LinearGradient>
      </Animated.View>
      <Text className="text-center text-2xl font-extrabold text-white">{title}</Text>
      {subtitle && (
        <Text className="text-center leading-5 text-muted">{subtitle}</Text>
      )}
      {children}
    </View>
  );
}
