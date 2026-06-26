import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { gradients } from '@/theme/colors';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
};

// Bouton principal : dégradé volt→violet, coins très arrondis.
export function Button({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
}: Props) {
  const isPrimary = variant === 'primary';
  const dim = disabled || loading;

  if (!isPrimary) {
    return (
      <Pressable
        onPress={onPress}
        disabled={dim}
        className={`h-14 items-center justify-center rounded-4xl border border-border px-5 ${
          dim ? 'opacity-50' : ''
        }`}
      >
        <Text className="text-base font-semibold text-muted">{label}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} disabled={dim} className={dim ? 'opacity-60' : ''}>
      <LinearGradient
        colors={gradients.brand}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 28 }}
      >
        <View className="h-14 items-center justify-center px-5">
          {loading ? (
            <ActivityIndicator color="#0A0A0F" />
          ) : (
            <Text className="text-base font-extrabold text-background">{label}</Text>
          )}
        </View>
      </LinearGradient>
    </Pressable>
  );
}
