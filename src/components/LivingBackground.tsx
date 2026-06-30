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

import { getTimeOfDayColors } from '@/theme/colors';

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
      {/* Centre adouci (alpha) : un halo, pas un aplat saturé. */}
      <RadialGradient c={c} r={r} colors={[`${color}99`, `${color}00`]} />
    </Circle>
  );
}

// Fond vivant : deux halos chauds discrets, concentrés en haut, qui dérivent
// lentement et se fondent dans un fond profond (le corps de l'écran reste sombre).
// Les couleurs varient selon le moment de la journée (cf. getTimeOfDayColors).
export default function LivingBackground() {
  const [blob1Color, blob2Color, blob3Color] = getTimeOfDayColors();

  return (
    <Canvas style={{ position: 'absolute', top: 0, left: 0, width, height }}>
      <Fill color="#160E0B" />
      <Group opacity={0.7}>
        <Blur blur={80} />
        <Blob
          color={blob1Color}
          from={[width * 0.18, height * 0.12]}
          to={[width * 0.34, height * 0.2]}
          r={width * 0.5}
          duration={11000}
        />
        <Blob
          color={blob2Color}
          from={[width * 0.92, height * 0.06]}
          to={[width * 0.74, height * 0.18]}
          r={width * 0.46}
          duration={13000}
        />
        <Blob
          color={blob3Color}
          from={[width * 0.55, height * -0.02]}
          to={[width * 0.4, height * 0.02]}
          r={width * 0.36}
          duration={13000}
        />
      </Group>
    </Canvas>
  );
}
