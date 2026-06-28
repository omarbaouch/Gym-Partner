import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Text } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { Screen } from '@/components/Screen';
import { SkeletonList } from '@/components/Skeleton';
import { ProfileForm } from '@/features/profile/ProfileForm';
import { useMyProfile } from '@/features/profile/useMyProfile';
import { gradients } from '@/theme/colors';

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
        <LinearGradient
          colors={gradients.brand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 28, marginTop: 8, padding: 20 }}
        >
          <Text className="font-display text-3xl text-background">Bienvenue</Text>
          <Text className="mt-1 font-head text-background/80">
            Crée ton profil pour trouver ton binôme d'entraînement.
          </Text>
        </LinearGradient>
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
