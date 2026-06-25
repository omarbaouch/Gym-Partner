import { Image } from 'expo-image';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { useAuth } from '@/features/auth/AuthProvider';
import { pickAndUploadAvatar } from '@/lib/avatar';
import type { FitnessLevel, Profile } from '@/types/database';

import { DAYS, GOALS, LEVELS, PERIODS } from './constants';
import { useUpdateProfile } from './useMyProfile';

type Slot = { day: string; period: string };

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full px-4 py-2 ${active ? 'bg-primary' : 'bg-surface'}`}
    >
      <Text className={active ? 'font-semibold text-white' : 'text-muted'}>{label}</Text>
    </Pressable>
  );
}

type Props = {
  initial: Profile | null;
  submitLabel: string;
  markOnboarded?: boolean;
  onSubmitted: () => void;
};

// Formulaire de profil réutilisé par l'onboarding et l'édition du profil.
export function ProfileForm({
  initial,
  submitLabel,
  markOnboarded,
  onSubmitted,
}: Props) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const update = useUpdateProfile();

  const [displayName, setDisplayName] = useState(initial?.display_name ?? '');
  const [bio, setBio] = useState(initial?.bio ?? '');
  const [level, setLevel] = useState<FitnessLevel>(initial?.level ?? 'debutant');
  const [goals, setGoals] = useState<string[]>(initial?.goals ?? []);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initial?.avatar_url ?? null);
  const [days, setDays] = useState<string[]>(
    uniq((initial?.usual_slots ?? []).map((s: Slot) => s.day)),
  );
  const [periods, setPeriods] = useState<string[]>(
    uniq((initial?.usual_slots ?? []).map((s: Slot) => s.period)),
  );
  const [uploading, setUploading] = useState(false);

  function toggle(list: string[], value: string) {
    return list.includes(value)
      ? list.filter((v) => v !== value)
      : [...list, value];
  }

  async function onPickAvatar() {
    if (!userId) return;
    try {
      setUploading(true);
      const url = await pickAndUploadAvatar(userId);
      if (url) setAvatarUrl(url);
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Upload impossible');
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit() {
    if (!displayName.trim()) {
      Alert.alert('Pseudo requis', 'Choisis un pseudo pour continuer.');
      return;
    }
    const usual_slots: Slot[] = days.flatMap((day) =>
      periods.map((period) => ({ day, period })),
    );
    try {
      await update.mutateAsync({
        display_name: displayName.trim(),
        bio: bio.trim() || null,
        level,
        goals,
        avatar_url: avatarUrl,
        usual_slots,
        ...(markOnboarded ? { onboarded: true } : {}),
      } as Partial<Profile>);
      onSubmitted();
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Enregistrement impossible');
    }
  }

  return (
    <ScrollView contentContainerClassName="gap-5 py-4">
      <View className="items-center gap-2">
        <Pressable onPress={onPickAvatar}>
          <Image
            source={avatarUrl ?? undefined}
            className="h-24 w-24 rounded-full bg-surface"
          />
        </Pressable>
        <Text className="text-primary" onPress={onPickAvatar}>
          {uploading ? 'Envoi...' : 'Choisir une photo'}
        </Text>
      </View>

      <Field label="Pseudo">
        <TextInput
          className="h-12 rounded-2xl bg-surface px-4 text-white"
          placeholder="Ton pseudo"
          placeholderTextColor="#8A8A99"
          value={displayName}
          onChangeText={setDisplayName}
        />
      </Field>

      <Field label="Bio">
        <TextInput
          className="min-h-20 rounded-2xl bg-surface p-4 text-white"
          placeholder="Tes objectifs, ton expérience..."
          placeholderTextColor="#8A8A99"
          multiline
          value={bio}
          onChangeText={setBio}
        />
      </Field>

      <Field label="Niveau">
        <View className="flex-row flex-wrap gap-2">
          {LEVELS.map((l) => (
            <Chip
              key={l.value}
              label={l.label}
              active={level === l.value}
              onPress={() => setLevel(l.value)}
            />
          ))}
        </View>
      </Field>

      <Field label="Objectifs">
        <View className="flex-row flex-wrap gap-2">
          {GOALS.map((g) => (
            <Chip
              key={g}
              label={g}
              active={goals.includes(g)}
              onPress={() => setGoals((prev) => toggle(prev, g))}
            />
          ))}
        </View>
      </Field>

      <Field label="Jours d'entraînement">
        <View className="flex-row flex-wrap gap-2">
          {DAYS.map((d) => (
            <Chip
              key={d.value}
              label={d.label}
              active={days.includes(d.value)}
              onPress={() => setDays((prev) => toggle(prev, d.value))}
            />
          ))}
        </View>
      </Field>

      <Field label="Créneaux">
        <View className="flex-row flex-wrap gap-2">
          {PERIODS.map((p) => (
            <Chip
              key={p.value}
              label={p.label}
              active={periods.includes(p.value)}
              onPress={() => setPeriods((prev) => toggle(prev, p.value))}
            />
          ))}
        </View>
      </Field>

      <Button label={submitLabel} onPress={onSubmit} loading={update.isPending} />
    </ScrollView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="text-muted">{label}</Text>
      {children}
    </View>
  );
}

function uniq(arr: string[]): string[] {
  return Array.from(new Set(arr));
}
