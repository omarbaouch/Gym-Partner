import * as Haptics from 'expo-haptics';
import { forwardRef } from 'react';
import { Pressable, View, type PressableProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Interaction signature de l'app : TOUTE surface tapable « répond » sous le
// doigt — enfoncement léger (échelle 0.97) + haptique discrète, puis retour
// en ressort. Une seule physique, partout : cartes du Live, membres,
// conversations, salles, puces. Chaque animation signifie (ici : « je t'ai
// entendu »), rien de décoratif.
// Accessibilité : « Réduire les animations » neutralise l'échelle,
// l'haptique est conservée (elle remplace justement le retour visuel).
type Props = PressableProps & {
  // Haptique au toucher (désactivée pour les surfaces tapées en rafale, ex. puces).
  haptic?: boolean;
};

export const ScalePressable = forwardRef<View, Props>(function ScalePressable(
  { haptic = true, onPressIn, onPressOut, style, ...props },
  ref,
) {
  const scale = useSharedValue(1);
  const reduced = useReducedMotion();
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      ref={ref}
      {...props}
      style={[style as object, animStyle]}
      onPressIn={(e) => {
        if (!reduced) scale.value = withTiming(0.97, { duration: 110 });
        if (haptic)
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = reduced ? 1 : withSpring(1, { damping: 16, stiffness: 320 });
        onPressOut?.(e);
      }}
    />
  );
});
