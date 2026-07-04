import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { Mascot, type MascotVariant } from '@/components/Mascot';
import { Screen } from '@/components/Screen';
import { SkeletonList } from '@/components/Skeleton';
import { ProfileForm } from '@/features/profile/ProfileForm';
import { useMyProfile } from '@/features/profile/useMyProfile';
import { colors } from '@/theme/colors';

// 3 écrans qui vendent le POURQUOI avant de collecter le profil.
// La mascotte incarne l'accueil (slide 1) et la motivation (slide 3) ;
// le slide central garde une icône (respiration, pas de surcharge).
const SLIDES: {
  icon: keyof typeof Ionicons.glyphMap;
  mascot?: MascotVariant;
  title: string;
  text: string;
}[] = [
  {
    icon: 'flash',
    mascot: 'hello',
    title: 'Ta salle, en direct.',
    text: "Vois qui s'entraîne dans ta salle, maintenant — et ce qu'ils sont venus bosser.",
  },
  {
    icon: 'people',
    title: 'Zéro message non sollicité.',
    text: "Le chat ne s'ouvre que si l'envie de s'entraîner ensemble est réciproque. Un match, pas un annuaire.",
  },
  {
    icon: 'calendar',
    mascot: 'flex',
    title: 'De la rencontre à la séance.',
    text: 'Proposez un créneau, confirmez, retrouvez-vous sous la barre. On se motive mieux à deux.',
  },
];

export default function Onboarding() {
  const router = useRouter();
  const { data: profile, isLoading } = useMyProfile();
  const [step, setStep] = useState(0);

  if (isLoading) {
    return (
      <Screen>
        <SkeletonList count={4} />
      </Screen>
    );
  }

  // Après les 3 slides : le formulaire de profil habituel.
  if (step >= SLIDES.length) {
    return (
      <Screen>
        <Animated.View entering={FadeInDown.duration(450)}>
          <View className="mt-2 rounded-4xl border border-border bg-surfaceHigh p-5">
            <Text className="font-display text-3xl text-white">
              À toi<Text className="text-primary">.</Text>
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

  const slide = SLIDES[step];

  return (
    <Screen>
      <View className="flex-1 items-center justify-center gap-6 px-4">
        <Animated.View
          key={step}
          entering={FadeInDown.duration(400)}
          className="items-center gap-6"
        >
          {slide.mascot ? (
            <Mascot variant={slide.mascot} size={132} />
          ) : (
            <View
              className="items-center justify-center rounded-full border border-border bg-surfaceHigh"
              style={{ height: 120, width: 120 }}
            >
              <Ionicons name={slide.icon} size={56} color={colors.primary} />
            </View>
          )}
          <View className="items-center gap-3">
            <Text className="text-center font-display text-3xl text-white">
              {slide.title}
            </Text>
            <Text className="max-w-[300px] text-center text-base leading-6 text-muted">
              {slide.text}
            </Text>
          </View>
        </Animated.View>

        {/* Points de progression */}
        <View className="flex-row gap-2">
          {SLIDES.map((_, i) => (
            <View
              key={i}
              className={`h-2 rounded-full ${i === step ? 'w-6 bg-primary' : 'w-2 bg-border'}`}
            />
          ))}
        </View>
      </View>

      <View className="gap-3 pb-6">
        <Button
          label={step === SLIDES.length - 1 ? 'Créer mon profil' : 'Continuer'}
          icon={step === SLIDES.length - 1 ? 'person-add' : 'arrow-forward'}
          onPress={() => setStep((s) => s + 1)}
        />
        {step < SLIDES.length - 1 && (
          <Pressable
            onPress={() => setStep(SLIDES.length)}
            accessibilityRole="button"
            accessibilityLabel="Passer l'introduction"
          >
            <Text className="text-center text-muted">Passer</Text>
          </Pressable>
        )}
      </View>
    </Screen>
  );
}
