import { Pressable, Text } from 'react-native';

// Puce sélectionnable (filtres, options) — état actif en couleur primaire.
export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      className={`rounded-full px-3 py-1.5 ${active ? 'bg-primary' : 'bg-surface'}`}
    >
      <Text className={active ? 'font-semibold text-white' : 'text-muted'}>{label}</Text>
    </Pressable>
  );
}
