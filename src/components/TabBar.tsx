import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { useEffect } from 'react';
import { Dimensions, Platform, Pressable, Text, View } from 'react-native';
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

const SPRING = { damping: 15, stiffness: 170 };
const IND_W = 60;

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
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withSpring(focused ? 1.15 : 1, SPRING);
  }, [focused, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable onPress={onPress} className="flex-1 items-center justify-center">
      <Animated.View style={style} className="items-center gap-1">
        <View className="h-10 w-16 items-center justify-center">
          <Ionicons
            name={focused ? icon : (`${icon}-outline` as keyof typeof Ionicons.glyphMap)}
            size={24}
            color={focused ? colors.primary : colors.muted}
          />
          {!!badge && badge > 0 && (
            <View className="absolute right-3 top-0 h-5 min-w-5 items-center justify-center rounded-full border-2 border-surface bg-ember px-1">
              <Text className="text-[10px] font-bold text-white">
                {badge > 9 ? '9+' : badge}
              </Text>
            </View>
          )}
        </View>
        <Text
          className={`text-[11px] ${focused ? 'font-head text-primary' : 'text-muted'}`}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

// Barre d'onglets : indicateur glissant (ressort) + icônes animées + badge non-lus.
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { data: conversations } = useConversations();
  const unread = (conversations ?? []).reduce(
    (n: number, c: { unread_count: number }) => n + (c.unread_count || 0),
    0,
  );

  const tabW = Dimensions.get('window').width / state.routes.length;
  const tx = useSharedValue(state.index * tabW + (tabW - IND_W) / 2);
  useEffect(() => {
    tx.value = withSpring(state.index * tabW + (tabW - IND_W) / 2, SPRING);
  }, [state.index, tabW, tx]);
  const indStyle = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));

  return (
    <View style={{ paddingBottom: insets.bottom || 8 }} className="pt-2">
      {/* Matière verre dépoli (glassmorphism) en fond de barre */}
      <BlurView
        intensity={40}
        tint="dark"
        experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <View
        className="absolute left-0 right-0 top-0 bottom-0 border-t border-white/10"
        style={{ backgroundColor: 'rgba(35,24,17,0.55)' }}
      />
      {/* indicateur glissant */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 8,
            left: 0,
            width: IND_W,
            height: 40,
            borderRadius: 20,
            backgroundColor: 'rgba(255,122,26,0.16)',
          },
          indStyle,
        ]}
      />
      <View className="flex-row">
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
    </View>
  );
}
