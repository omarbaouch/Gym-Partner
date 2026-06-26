import { Image } from 'expo-image';
import { Link, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Screen } from '@/components/Screen';
import { SkeletonList } from '@/components/Skeleton';
import { useConversations } from '@/features/chat/useConversations';

export default function Chats() {
  const { data, isLoading, refetch } = useConversations();

  // Rafraîchit (compteurs non-lus, dernier message) au retour sur l'onglet.
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  return (
    <Screen>
      <Text className="py-3 text-3xl font-extrabold text-white">Messages</Text>
      {isLoading ? (
        <SkeletonList count={5} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(c) => c.conversation_id}
          ItemSeparatorComponent={() => <View className="h-3" />}
          ListEmptyComponent={
            <View className="mt-16 items-center gap-2">
              <Text className="text-5xl">💬</Text>
              <Text className="text-center text-muted">
                Aucune conversation pour l'instant.{'\n'}Contacte un membre depuis « Ma
                salle ».
              </Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.duration(320).delay(Math.min(index, 8) * 40)}>
              <Link
                href={{ pathname: '/chat/[id]', params: { id: item.conversation_id } }}
                asChild
              >
                <Pressable className="flex-row items-center gap-3 rounded-4xl border border-border bg-surface p-3.5">
                  {item.other_avatar ? (
                    <Image
                      source={item.other_avatar}
                      className="rounded-full bg-background"
                      style={{ height: 52, width: 52, borderRadius: 26 }}
                    />
                  ) : (
                    <View
                      className="items-center justify-center rounded-full bg-surfaceHigh"
                      style={{ height: 52, width: 52 }}
                    >
                      <Text className="font-bold text-primary">
                        {item.other_name.slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View className="flex-1">
                    <Text className="text-base font-bold text-white">
                      {item.other_name}
                    </Text>
                    <Text className="text-muted" numberOfLines={1}>
                      {item.last_message ?? 'Nouvelle conversation'}
                    </Text>
                  </View>
                  {item.unread_count > 0 && (
                    <View className="h-6 min-w-6 items-center justify-center rounded-full bg-ember px-2">
                      <Text className="text-xs font-bold text-white">
                        {item.unread_count}
                      </Text>
                    </View>
                  )}
                </Pressable>
              </Link>
            </Animated.View>
          )}
        />
      )}
    </Screen>
  );
}
