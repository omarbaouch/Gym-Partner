import { Image } from 'expo-image';
import { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

// Les 8 poses de Gymo (illustrations détourées).
const POSES = {
  idle: require('../../assets/mascot/idle.png'),
  wave: require('../../assets/mascot/wave.png'),
  thumbsup: require('../../assets/mascot/thumbsup.png'),
  flex: require('../../assets/mascot/flex.png'),
  jump: require('../../assets/mascot/jump.png'),
  wink: require('../../assets/mascot/wink.png'),
  lift: require('../../assets/mascot/lift.png'),
  celebrate: require('../../assets/mascot/celebrate.png'),
} as const;

export type MascotPose = keyof typeof POSES;

// Gymo, la mascotte : illustration qui rebondit doucement (Reanimated).
export function Mascot({
  pose = 'idle',
  size = 140,
}: {
  pose?: MascotPose;
  size?: number;
}) {
  const bounce = useSharedValue(0);
  useEffect(() => {
    bounce.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 900 }),
        withTiming(0, { duration: 900 }),
      ),
      -1,
      true,
    );
  }, [bounce]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: bounce.value }] }));

  return (
    <Animated.View style={style}>
      <Image
        source={POSES[pose]}
        style={{ width: size, height: size }}
        contentFit="contain"
      />
    </Animated.View>
  );
}
