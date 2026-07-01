import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { ProfileForm } from '@/features/profile/ProfileForm';
import { useMyProfile } from '@/features/profile/useMyProfile';
import { supabase } from '@/lib/supabase';

import { colors } from '@/theme/colors';

// Identifiant de version visible (permet de confirmer le build installé).
const BUILD_LABEL = 'Gym Partner · v0.1.1 (build 23)';

function ActionRow({
  icon,
  label,
  danger,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="flex-row items-center gap-3 px-4 py-3.5"
    >
      <Ionicons name={icon} size={18} color={danger ? colors.danger : colors.muted} />
      <Text className={`flex-1 font-semibold ${danger ? 'text-danger' : 'text-white'}`}>
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={16} color={colors.muted} />
    </Pressable>
  );
}

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
        <ActivityIndicator className="mt-10" color={colors.primary} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text className="py-3 font-display text-3xl text-white">Ton profil</Text>
      <ProfileForm
        initial={profile}
        submitLabel="Enregistrer"
        onSubmitted={() => Alert.alert('Enregistré', 'Profil mis à jour.')}
      />
      <View className="gap-4 pb-6">
        <View className="overflow-hidden rounded-4xl border border-border bg-surface">
          <ActionRow
            icon="shield-checkmark-outline"
            label="Politique de confidentialité"
            onPress={() => router.push('/privacy')}
          />
          <View className="h-px bg-border" />
          <ActionRow
            icon="log-out-outline"
            label="Se déconnecter"
            onPress={() => supabase.auth.signOut()}
          />
          <View className="h-px bg-border" />
          <ActionRow
            icon="trash-outline"
            label="Supprimer mon compte"
            danger
            onPress={onDeleteAccount}
          />
        </View>
        <Text className="text-center text-xs text-muted/60">{BUILD_LABEL}</Text>
      </View>
    </Screen>
  );
}
