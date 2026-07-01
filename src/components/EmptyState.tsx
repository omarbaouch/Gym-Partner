import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/theme/colors';

// État vide : icône primaire sur disque sobre qui flotte + titre/sous-titre + CTA.
// (Le dégradé de marque est réservé au logo, au CTA et au match.)
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
        <View
          style={{
            height: 104,
            width: 104,
            borderRadius: 36,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surfaceHigh,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Ionicons name={icon} size={48} color={colors.primary} />
        </View>
      </Animated.View>
      <Text className="text-center text-2xl font-extrabold text-white">{title}</Text>
      {subtitle && (
        <Text className="text-center leading-5 text-muted">{subtitle}</Text>
      )}
      {children}
    </View>
  );
}
