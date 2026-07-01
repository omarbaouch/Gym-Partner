import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { Screen } from '@/components/Screen';
import { SkeletonList } from '@/components/Skeleton';
import { ProfileForm } from '@/features/profile/ProfileForm';
import { useMyProfile } from '@/features/profile/useMyProfile';

export default function Onboarding() {
  const router = useRouter();
  const { data: profile, isLoading } = useMyProfile();

  if (isLoading) {
    return (
      <Screen>
        <SkeletonList count={4} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Animated.View entering={FadeInDown.duration(450)}>
        <View className="mt-2 rounded-4xl border border-border bg-surfaceHigh p-5">
          <Text className="font-display text-3xl text-white">
            Bienvenue<Text className="text-primary">.</Text>
          </Text>
          <Text className="mt-1 font-head text-muted">
            Crée ton profil — ta salle t'attend, en direct.
          </Text>
        </View>
      </Animated.View>

      <Animated.View entering={FadeIn.delay(200)} className="flex-1">
        <ProfileForm
          initial={profile}
          submitLabel="Continuer"
          markOnboarded
          onSubmitted={() => router.replace('/(tabs)')}
        />
      </Animated.View>
    </Screen>
  );
}
