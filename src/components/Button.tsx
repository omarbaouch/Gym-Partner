import { ActivityIndicator, Pressable, Text } from 'react-native';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
}: Props) {
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={`h-12 items-center justify-center rounded-2xl px-5 ${
        isPrimary ? 'bg-primary' : 'border border-muted'
      } ${disabled || loading ? 'opacity-50' : ''}`}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text
          className={`text-base font-semibold ${isPrimary ? 'text-white' : 'text-muted'}`}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
