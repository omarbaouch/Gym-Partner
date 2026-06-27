import { useEffect } from 'react';
import { Dimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { accents } from '@/theme/colors';

const { width, height } = Dimensions.get('window');

function Piece({ index }: { index: number }) {
  const startX = Math.random() * width;
  const drift = (Math.random() - 0.5) * 160;
  const size = 8 + Math.random() * 8;
  const color = accents[index % accents.length];
  const rotateEnd = (Math.random() - 0.5) * 720;

  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(
      Math.random() * 250,
      withTiming(1, { duration: 1600 + Math.random() * 900, easing: Easing.out(Easing.quad) }),
    );
  }, [p]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: startX + drift * p.value },
      { translateY: -40 + (height * 0.85) * p.value },
      { rotate: `${rotateEnd * p.value}deg` },
    ],
    opacity: 1 - p.value * 0.2,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          width: size,
          height: size * 0.6,
          backgroundColor: color,
          borderRadius: 2,
        },
        style,
      ]}
    />
  );
}

// Pluie de confettis colorés (one-shot).
export function Confetti({ count = 80 }: { count?: number }) {
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <Piece key={i} index={i} />
      ))}
    </View>
  );
}
