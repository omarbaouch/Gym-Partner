import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/lib/supabase';

export default function Chats() {
  const { session } = useAuth();
  const me = session?.user.id;

  const { data, isLoading } = useQuery({
    queryKey: ['conversations', me],
    enabled: !!me,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('id, user_a, user_b, last_message_at')
        .order('last_message_at', { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <Screen>
      {isLoading ? (
        <ActivityIndicator className="mt-10" color="#7C5CFF" />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(c) => c.id}
          ItemSeparatorComponent={() => <View className="h-3" />}
          ListEmptyComponent={
            <Text className="mt-10 text-center text-muted">
              Aucune conversation. Contacte un membre depuis « Ma salle ».
            </Text>
          }
          renderItem={({ item }) => (
            <Link href={{ pathname: '/chat/[id]', params: { id: item.id } }} asChild>
              <Pressable className="rounded-2xl bg-surface p-4">
                <Text className="text-white">Conversation</Text>
                <Text className="text-muted">
                  {item.last_message_at
                    ? new Date(item.last_message_at).toLocaleString('fr-FR')
                    : 'Nouveau'}
                </Text>
              </Pressable>
            </Link>
          )}
        />
      )}
    </Screen>
  );
}
