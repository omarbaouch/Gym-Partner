import { Text } from 'react-native';

import { ScalePressable } from '@/components/ScalePressable';

// Puce sélectionnable (filtres, options) — état actif : texte SOMBRE sur
// primary (7.3:1), même règle que Button ; jamais de blanc sur orange (2.6:1).
// Retour tactile signature sans haptique (surfaces tapées en rafale).
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
    <ScalePressable
      onPress={onPress}
      haptic={false}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      className={`rounded-full px-4 py-2 ${active ? 'bg-primary' : 'bg-surface'}`}
    >
      <Text className={active ? 'font-semibold text-background' : 'text-muted'}>
        {label}
      </Text>
    </ScalePressable>
  );
}
