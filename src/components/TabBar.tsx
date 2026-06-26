import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useConversations } from '@/features/chat/useConversations';
import { colors } from '@/theme/colors';

const META: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  index: { label: 'Ma salle', icon: 'barbell' },
  chats: { label: 'Messages', icon: 'chatbubbles' },
  profile: { label: 'Profil', icon: 'person' },
};

function TabItem({
  focused,
  label,
  icon,
  badge,
  onPress,
}: {
  focused: boolean;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  badge?: number;
  onPress: () => void;
}) {
  const scale = useSharedValue(focused ? 1 : 0.9);
  useEffect(() => {
    scale.value = withSpring(focused ? 1.12 : 1, { damping: 12, stiffness: 180 });
  }, [focused, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable onPress={onPress} className="flex-1 items-center justify-center">
      <Animated.View style={style} className="items-center gap-1">
        <View
          className={`h-11 w-16 items-center justify-center rounded-full ${
            focused ? 'bg-primary/15' : ''
          }`}
        >
          <Ionicons
            name={focused ? icon : (`${icon}-outline` as keyof typeof Ionicons.glyphMap)}
            size={24}
            color={focused ? colors.primary : colors.muted}
          />
          {!!badge && badge > 0 && (
            <View className="absolute right-3 top-1 h-5 min-w-5 items-center justify-center rounded-full border-2 border-surface bg-ember px-1">
              <Text className="text-[10px] font-bold text-white">
                {badge > 9 ? '9+' : badge}
              </Text>
            </View>
          )}
        </View>
        <Text
          className={`text-[11px] font-bold ${focused ? 'text-primary' : 'text-muted'}`}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

// Barre d'onglets personnalisée : icônes Ionicons, item actif animé, badge non-lus.
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { data: conversations } = useConversations();
  const unread = (conversations ?? []).reduce(
    (n: number, c: { unread_count: number }) => n + (c.unread_count || 0),
    0,
  );

  return (
    <View
      style={{ paddingBottom: insets.bottom || 8 }}
      className="flex-row border-t border-border bg-surface pt-2"
    >
      {state.routes.map((route, index) => {
        const meta = META[route.name];
        if (!meta) return null;
        const focused = state.index === index;
        return (
          <TabItem
            key={route.key}
            focused={focused}
            label={meta.label}
            icon={meta.icon}
            badge={route.name === 'chats' ? unread : undefined}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            }}
          />
        );
      })}
    </View>
  );
}
