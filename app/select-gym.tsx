import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Pressable, Text, TextInput, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { useAuth } from '@/features/auth/AuthProvider';
import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';

export default function SelectGym() {
  const router = useRouter();
  const { session } = useAuth();
  const me = session?.user.id;
  const [city, setCity] = useState('');

  const { data: gyms } = useQuery({
    queryKey: ['gym-search', city],
    enabled: city.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gyms')
        .select('id, name, city, address, gym_chains ( name )')
        .ilike('city', `%${city}%`)
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });

  async function choose(gymId: string) {
    if (!me) return;
    // Une seule salle principale : on retire l'ancienne puis on pose la nouvelle.
    await supabase
      .from('user_gyms')
      .update({ is_primary: false })
      .eq('user_id', me)
      .eq('is_primary', true);
    const { error } = await supabase
      .from('user_gyms')
      .upsert({ user_id: me, gym_id: gymId, is_primary: true });
    if (error) {
      Alert.alert('Erreur', error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['primary-gym'] });
    router.back();
  }

  return (
    <Screen>
      <View className="gap-4 py-4">
        <Text className="text-2xl font-bold text-white">Choisis ta salle</Text>
        <TextInput
          className="h-12 rounded-2xl bg-surface px-4 text-white"
          placeholder="Ville (ex : Paris, Lyon...)"
          placeholderTextColor="#8A8A99"
          value={city}
          onChangeText={setCity}
        />
      </View>

      <FlatList
        data={gyms ?? []}
        keyExtractor={(g) => g.id}
        ItemSeparatorComponent={() => <View className="h-2" />}
        ListEmptyComponent={
          <Text className="mt-6 text-center text-muted">
            Saisis une ville pour rechercher une salle.
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => choose(item.id)}
            className="rounded-2xl bg-surface p-4"
          >
            <Text className="text-base font-semibold text-white">{item.name}</Text>
            <Text className="text-muted">
              {(item.gym_chains as { name: string } | null)?.name ?? 'Indépendante'} ·{' '}
              {item.city}
            </Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}
