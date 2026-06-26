import { useRouter } from 'expo-router';
import { ActivityIndicator, Text } from 'react-native';

import { Screen } from '@/components/Screen';
import { ProfileForm } from '@/features/profile/ProfileForm';
import { useMyProfile } from '@/features/profile/useMyProfile';

export default function Onboarding() {
  const router = useRouter();
  const { data: profile, isLoading } = useMyProfile();

  if (isLoading) {
    return (
      <Screen>
        <ActivityIndicator className="mt-10" color="#FF6A1A" />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text className="pt-4 text-2xl font-bold text-white">Bienvenue 👋</Text>
      <Text className="text-muted">Complète ton profil pour trouver des partenaires.</Text>
      <ProfileForm
        initial={profile}
        submitLabel="Continuer"
        markOnboarded
        onSubmitted={() => router.replace('/(tabs)')}
      />
    </Screen>
  );
}
