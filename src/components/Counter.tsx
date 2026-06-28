import { useEffect } from 'react';
import { TextInput } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const AnimatedInput = Animated.createAnimatedComponent(TextInput);

// Nombre qui s'incrémente en douceur jusqu'à `value`.
export function Counter({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withTiming(value, { duration: 700 });
  }, [value, v]);

  const props = useAnimatedProps(
    () => ({ text: String(Math.round(v.value)) }) as object,
  );

  return (
    <AnimatedInput
      editable={false}
      underlineColorAndroid="transparent"
      value={String(value)}
      animatedProps={props}
      className={className}
    />
  );
}
