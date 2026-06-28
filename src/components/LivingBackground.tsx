import {
  Blur,
  Canvas,
  Circle,
  Fill,
  Group,
  RadialGradient,
  vec,
} from '@shopify/react-native-skia';
import { useEffect } from 'react';
import { Dimensions } from 'react-native';
import {
  Easing,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

function Blob({
  color,
  from,
  to,
  r,
  duration,
}: {
  color: string;
  from: [number, number];
  to: [number, number];
  r: number;
  duration: number;
}) {
  const t = useSharedValue(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    // Reduce Motion : halos figés à mi-course (pas de dérive animée).
    if (reduced) {
      t.value = 0.5;
      return;
    }
    t.value = withRepeat(
      withTiming(1, { duration, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [t, duration, reduced]);

  const cx = useDerivedValue(() => from[0] + (to[0] - from[0]) * t.value);
  const cy = useDerivedValue(() => from[1] + (to[1] - from[1]) * t.value);
  const c = useDerivedValue(() => vec(cx.value, cy.value));

  return (
    <Circle cx={cx} cy={cy} r={r}>
      <RadialGradient c={c} r={r} colors={[color, `${color}00`]} />
    </Circle>
  );
}

// Fond "aurora" vivant : grands halos dégradés flous qui dérivent lentement.
export function LivingBackground() {
  return (
    <Canvas style={{ position: 'absolute', top: 0, left: 0, width, height }}>
      <Fill color="#160E0B" />
      <Group>
        <Blur blur={60} />
        <Blob
          color="#FF7A1A"
          from={[width * 0.2, height * 0.18]}
          to={[width * 0.42, height * 0.3]}
          r={width * 0.62}
          duration={9000}
        />
        <Blob
          color="#FF3D77"
          from={[width * 0.92, height * 0.1]}
          to={[width * 0.7, height * 0.26]}
          r={width * 0.55}
          duration={11000}
        />
        <Blob
          color="#9B6CFF"
          from={[width * 0.5, height * 0.06]}
          to={[width * 0.3, height * 0.02]}
          r={width * 0.5}
          duration={13000}
        />
      </Group>
    </Canvas>
  );
}
