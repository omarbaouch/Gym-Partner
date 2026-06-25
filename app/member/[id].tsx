import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { supabase } from '@/lib/supabase';

export default function MemberProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, bio, avatar_url, level, goals')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  async function contact() {
    const { data, error } = await supabase.rpc('get_or_create_conversation', {
      _other: id,
    });
    if (error || !data) {
      Alert.alert('Erreur', error?.message ?? 'Impossible de démarrer la conversation.');
      return;
    }
    router.push({ pathname: '/chat/[id]', params: { id: data as string } });
  }

  if (isLoading || !profile) {
    return (
      <Screen>
        <ActivityIndicator className="mt-10" color="#7C5CFF" />
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: profile.display_name }} />
      <View className="items-center gap-3 py-6">
        <Image
          source={profile.avatar_url ?? undefined}
          className="h-24 w-24 rounded-full bg-surface"
        />
        <Text className="text-2xl font-bold text-white">{profile.display_name}</Text>
        <Text className="text-muted">{profile.level}</Text>
        <View className="flex-row flex-wrap justify-center gap-2">
          {profile.goals?.map((g: string) => (
            <Text
              key={g}
              className="rounded-full bg-surface px-3 py-1 text-sm text-accent"
            >
              {g}
            </Text>
          ))}
        </View>
        {profile.bio ? (
          <Text className="mt-2 text-center text-white">{profile.bio}</Text>
        ) : null}
      </View>

      <Button label="Contacter" onPress={contact} />
    </Screen>
  );
}
