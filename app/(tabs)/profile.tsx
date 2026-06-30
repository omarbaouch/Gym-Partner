import { useRouter } from 'expo-router';
import { ActivityIndicator, Alert, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { ProfileForm } from '@/features/profile/ProfileForm';
import { useMyProfile } from '@/features/profile/useMyProfile';
import { supabase } from '@/lib/supabase';

// Identifiant de version visible (permet de confirmer le build installé).
const BUILD_LABEL = 'Gym Partner · v0.1.1 (build 23)';

export default function ProfileScreen() {
  const router = useRouter();
  const { data: profile, isLoading } = useMyProfile();

  function onDeleteAccount() {
    Alert.alert(
      'Supprimer mon compte',
      'Cette action est définitive : ton profil, tes salles et tes messages seront effacés.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.functions.invoke('delete-account');
            if (error) {
              Alert.alert('Erreur', 'Suppression impossible. Réessaie plus tard.');
              return;
            }
            await supabase.auth.signOut();
          },
        },
      ],
    );
  }

  if (isLoading) {
    return (
      <Screen>
        <ActivityIndicator className="mt-10" color="#FF6A1A" />
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
      <View className="gap-3 pb-6">
        <Text
          className="text-center text-muted"
          onPress={() => router.push('/privacy')}
          accessibilityRole="link"
        >
          Politique de confidentialité
        </Text>
        <Button
          label="Se déconnecter"
          variant="ghost"
          onPress={() => supabase.auth.signOut()}
        />
        <Text className="text-center text-muted" onPress={onDeleteAccount}>
          Supprimer mon compte
        </Text>
        <Text className="mt-1 text-center text-xs text-muted/60">{BUILD_LABEL}</Text>
      </View>
    </Screen>
  );
}
