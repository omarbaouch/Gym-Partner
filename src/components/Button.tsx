import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors, gradients } from '@/theme/colors';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
};

// Bouton principal : dégradé vif, icône optionnelle, animation + haptique au tap.
export function Button({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  icon,
}: Props) {
  const isPrimary = variant === 'primary';
  const dim = disabled || loading;
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const press = {
    onPressIn: () => {
      scale.value = withTiming(0.96, { duration: 110 });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    },
    onPressOut: () => (scale.value = withTiming(1, { duration: 140 })),
  };

  if (!isPrimary) {
    return (
      <Animated.View style={animStyle}>
        <Pressable
          onPress={onPress}
          disabled={dim}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ disabled: dim, busy: loading }}
          {...press}
          className={`h-14 flex-row items-center justify-center gap-2 rounded-4xl border border-border px-5 ${
            dim ? 'opacity-50' : ''
          }`}
        >
          {icon && <Ionicons name={icon} size={18} color={colors.muted} />}
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
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: dim, busy: loading }}
        {...press}
        className={dim ? 'opacity-60' : ''}
      >
        <LinearGradient
          colors={gradients.brand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 28,
            shadowColor: colors.primary,
            shadowOpacity: 0.45,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 8 },
            elevation: 8,
          }}
        >
          <View className="h-14 flex-row items-center justify-center gap-2 px-5">
            {loading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <>
                {icon && <Ionicons name={icon} size={20} color={colors.background} />}
                <Text className="font-display text-base text-background">{label}</Text>
              </>
            )}
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}
