import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { gradients } from '@/theme/colors';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
};

// Bouton principal : dégradé chaud ambre→orange→corail, animation de pression.
export function Button({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
}: Props) {
  const isPrimary = variant === 'primary';
  const dim = disabled || loading;
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const press = {
    onPressIn: () => (scale.value = withTiming(0.96, { duration: 110 })),
    onPressOut: () => (scale.value = withTiming(1, { duration: 140 })),
  };

  if (!isPrimary) {
    return (
      <Animated.View style={animStyle}>
        <Pressable
          onPress={onPress}
          disabled={dim}
          {...press}
          className={`h-14 items-center justify-center rounded-4xl border border-border px-5 ${
            dim ? 'opacity-50' : ''
          }`}
        >
          <Text className="text-base font-semibold text-muted">{label}</Text>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={onPress}
        disabled={dim}
        {...press}
        className={dim ? 'opacity-60' : ''}
      >
        <LinearGradient
          colors={gradients.brand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 28 }}
        >
          <View className="h-14 items-center justify-center px-5">
            {loading ? (
              <ActivityIndicator color="#140D0A" />
            ) : (
              <Text className="text-base font-extrabold text-background">{label}</Text>
            )}
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}
