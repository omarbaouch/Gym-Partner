import { ActivityIndicator, Alert, View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { ProfileForm } from '@/features/profile/ProfileForm';
import { useMyProfile } from '@/features/profile/useMyProfile';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const { data: profile, isLoading } = useMyProfile();

  if (isLoading) {
    return (
      <Screen>
        <ActivityIndicator className="mt-10" color="#7C5CFF" />
      </Screen>
    );
  }

  return (
    <Screen>
      <ProfileForm
        initial={profile}
        submitLabel="Enregistrer"
        onSubmitted={() => Alert.alert('Enregistré', 'Profil mis à jour.')}
      />
      <View className="pb-4">
        <Button
          label="Se déconnecter"
          variant="ghost"
          onPress={() => supabase.auth.signOut()}
        />
      </View>
    </Screen>
  );
}
