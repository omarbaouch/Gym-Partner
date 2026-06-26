import { ActivityIndicator, Alert, Linking, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { ProfileForm } from '@/features/profile/ProfileForm';
import { useMyProfile } from '@/features/profile/useMyProfile';
import { supabase } from '@/lib/supabase';

// À remplacer par l'URL réelle de la politique de confidentialité.
const PRIVACY_URL = 'https://gympartner.app/confidentialite';

export default function ProfileScreen() {
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
          onPress={() => Linking.openURL(PRIVACY_URL)}
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
      </View>
    </Screen>
  );
}
