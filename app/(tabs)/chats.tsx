import { Image } from 'expo-image';
import { Link, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
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
      {isLoading ? (
        <ActivityIndicator className="mt-10" color="#7C5CFF" />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(c) => c.conversation_id}
          contentContainerClassName="py-3"
          ItemSeparatorComponent={() => <View className="h-3" />}
          ListEmptyComponent={
            <Text className="mt-10 text-center text-muted">
              Aucune conversation. Contacte un membre depuis « Ma salle ».
            </Text>
          }
          renderItem={({ item }) => (
            <Link
              href={{ pathname: '/chat/[id]', params: { id: item.conversation_id } }}
              asChild
            >
              <Pressable className="flex-row items-center gap-3 rounded-2xl bg-surface p-3">
                <Image
                  source={item.other_avatar ?? undefined}
                  className="h-12 w-12 rounded-full bg-background"
                />
                <View className="flex-1">
                  <Text className="text-base font-semibold text-white">
                    {item.other_name}
                  </Text>
                  <Text className="text-muted" numberOfLines={1}>
                    {item.last_message ?? 'Nouvelle conversation'}
                  </Text>
                </View>
                {item.unread_count > 0 && (
                  <View className="h-6 min-w-6 items-center justify-center rounded-full bg-primary px-2">
                    <Text className="text-xs font-bold text-white">
                      {item.unread_count}
                    </Text>
                  </View>
                )}
              </Pressable>
            </Link>
          )}
        />
      )}
    </Screen>
  );
}
