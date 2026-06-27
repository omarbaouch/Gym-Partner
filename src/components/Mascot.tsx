import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import { colors } from '@/theme/colors';

const AEllipse = Animated.createAnimatedComponent(Ellipse);

// Gymo — la mascotte de Gym Partner. Rebondit doucement et cligne des yeux.
export function Mascot({ size = 140 }: { size?: number }) {
  const bounce = useSharedValue(0);
  const blink = useSharedValue(1);

  useEffect(() => {
    bounce.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 850 }),
        withTiming(0, { duration: 850 }),
      ),
      -1,
      true,
    );
    blink.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2400 }),
        withTiming(0.1, { duration: 90 }),
        withTiming(1, { duration: 90 }),
      ),
      -1,
    );
  }, [bounce, blink]);

  const wrap = useAnimatedStyle(() => ({ transform: [{ translateY: bounce.value }] }));
  const eyeProps = useAnimatedProps(() => ({ ry: 8 * blink.value }));

  return (
    <Animated.View style={wrap}>
      <View style={{ width: size, height: size }}>
        <Svg viewBox="0 0 120 128" width={size} height={size}>
          {/* ombre */}
          <Ellipse cx="60" cy="120" rx="34" ry="6" fill="rgba(0,0,0,0.35)" />
          {/* bras */}
          <Ellipse cx="16" cy="74" rx="10" ry="14" fill={colors.primary} />
          <Ellipse cx="104" cy="74" rx="10" ry="14" fill={colors.primary} />
          {/* petit haltère */}
          <G>
            <Rect x="98" y="86" width="20" height="6" rx="3" fill={colors.muted} />
            <Circle cx="98" cy="89" r="7" fill={colors.violet} />
            <Circle cx="118" cy="89" r="7" fill={colors.violet} />
          </G>
          {/* corps */}
          <Ellipse cx="60" cy="68" rx="42" ry="46" fill={colors.primary} />
          {/* ventre clair */}
          <Ellipse cx="60" cy="78" rx="26" ry="28" fill="#FFD0A6" opacity={0.55} />
          {/* bandeau */}
          <Path d="M22 44 Q60 30 98 44 L98 54 Q60 40 22 54 Z" fill={colors.ember} />
          <Circle cx="20" cy="49" r="5" fill={colors.ember} />
          {/* joues */}
          <Circle cx="36" cy="74" r="7" fill={colors.ember} opacity={0.5} />
          <Circle cx="84" cy="74" r="7" fill={colors.ember} opacity={0.5} />
          {/* yeux (clignent) */}
          <AEllipse cx="46" cy="64" rx="6" animatedProps={eyeProps} fill="#1c1108" />
          <AEllipse cx="74" cy="64" rx="6" animatedProps={eyeProps} fill="#1c1108" />
          {/* sourire */}
          <Path
            d="M48 82 Q60 94 72 82"
            stroke="#1c1108"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
        </Svg>
      </View>
    </Animated.View>
  );
}
