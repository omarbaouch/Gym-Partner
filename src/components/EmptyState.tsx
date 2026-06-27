import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Mascot } from './Mascot';

// État vide animé : mascotte ou emoji qui "respire" + titre/sous-titre + CTA optionnel.
export function EmptyState({
  emoji,
  mascot,
  title,
  subtitle,
  children,
}: {
  emoji?: string;
  mascot?: boolean;
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
      {mascot ? (
        <Mascot size={150} />
      ) : (
        <Animated.Text style={style} className="text-7xl">
          {emoji}
        </Animated.Text>
      )}
      <Text className="text-center text-xl font-extrabold text-white">{title}</Text>
      {subtitle && <Text className="text-center text-muted">{subtitle}</Text>}
      {children}
    </View>
  );
}
