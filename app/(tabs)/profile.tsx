import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, ScrollView, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const { session } = useAuth();
  const me = session?.user.id;
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);

  useQuery({
    queryKey: ['my-profile', me],
    enabled: !!me,
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('display_name, bio, level')
        .eq('id', me!)
        .single();
      setBio(data?.bio ?? '');
      return data;
    },
  });

  async function save() {
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ bio }).eq('id', me!);
    setSaving(false);
    Alert.alert(error ? 'Erreur' : 'Enregistré', error?.message ?? 'Profil mis à jour.');
  }

  return (
    <Screen>
      <ScrollView contentContainerClassName="gap-4 py-4">
        <Text className="text-2xl font-bold text-white">Mon profil</Text>

        <View className="gap-2">
          <Text className="text-muted">Bio</Text>
          <TextInput
            className="min-h-24 rounded-2xl bg-surface p-4 text-white"
            placeholder="Parle de tes objectifs, de ton niveau, de tes créneaux..."
            placeholderTextColor="#8A8A99"
            multiline
            value={bio}
            onChangeText={setBio}
          />
        </View>

        <Button label="Enregistrer" onPress={save} loading={saving} />
        <Button
          label="Se déconnecter"
          variant="ghost"
          onPress={() => supabase.auth.signOut()}
        />
      </ScrollView>
    </Screen>
  );
}
