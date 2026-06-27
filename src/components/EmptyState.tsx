import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

// État vide animé : grand emoji qui "respire" + titre/sous-titre. Optionnel : enfant (CTA).
export function EmptyState({
  emoji,
  title,
  subtitle,
  children,
}: {
  emoji: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  const s = useSharedValue(1);
  const y = useSharedValue(0);
  useEffect(() => {
    s.value = withRepeat(withSequence(withTiming(1.12, { duration: 900 }), withTiming(1, { duration: 900 })), -1, true);
    y.value = withRepeat(withSequence(withTiming(-6, { duration: 900 }), withTiming(0, { duration: 900 })), -1, true);
  }, [s, y]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: s.value }, { translateY: y.value }],
  }));

  return (
    <View className="flex-1 items-center justify-center gap-3 px-6">
      <Animated.Text style={style} className="text-7xl">
        {emoji}
      </Animated.Text>
      <Text className="text-center text-xl font-extrabold text-white">{title}</Text>
      {subtitle && <Text className="text-center text-muted">{subtitle}</Text>}
      {children}
    </View>
  );
}
