import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

// Bloc animé (pulsation) pour les états de chargement.
export function Skeleton({ className }: { className?: string }) {
  const opacity = useSharedValue(0.4);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.9, { duration: 800 }), -1, true);
  }, [opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={style} className={`bg-surfaceHigh ${className ?? ''}`} />;
}

// Liste de cartes fantômes (pour découverte / chats / salles).
export function SkeletonList({ count = 6 }: { count?: number }) {
  return (
    <View className="gap-3 pt-2">
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          className="flex-row items-center gap-3 rounded-4xl border border-border bg-surface p-4"
        >
          <Skeleton className="h-14 w-14 rounded-full" />
          <View className="flex-1 gap-2">
            <Skeleton className="h-4 w-1/2 rounded-full" />
            <Skeleton className="h-3 w-3/4 rounded-full" />
          </View>
        </View>
      ))}
    </View>
  );
}
