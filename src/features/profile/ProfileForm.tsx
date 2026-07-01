import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { useAuth } from '@/features/auth/AuthProvider';
import { pickAndUploadAvatar } from '@/lib/avatar';
import { colors } from '@/theme/colors';
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
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
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
        <Pressable
          onPress={onPickAvatar}
          disabled={uploading}
          accessibilityRole="button"
          accessibilityLabel="Changer la photo de profil"
        >
          <View
            style={{
              padding: 4,
              borderRadius: 56,
              borderWidth: 2,
              borderColor: colors.border,
              backgroundColor: colors.surface,
            }}
          >
            <Image
              source={avatarUrl ?? undefined}
              style={{
                height: 104,
                width: 104,
                borderRadius: 52,
                backgroundColor: colors.surfaceHigh,
              }}
            />
          </View>
          <View
            className="absolute bottom-0 right-0 h-9 w-9 items-center justify-center rounded-full border-2 border-background bg-primary"
          >
            {uploading ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <Ionicons name="camera" size={16} color={colors.background} />
            )}
          </View>
        </Pressable>
        <Text className="text-sm text-muted">
          {uploading ? 'Envoi...' : 'Changer la photo'}
        </Text>
      </View>

      <Field label="Pseudo">
        <TextInput
          className="h-14 rounded-4xl border border-border bg-surface px-5 text-white"
          placeholder="Ton pseudo"
          placeholderTextColor={colors.placeholder}
          value={displayName}
          onChangeText={setDisplayName}
        />
      </Field>

      <Field label="Bio">
        <TextInput
          className="min-h-24 rounded-4xl border border-border bg-surface p-5 text-white"
          placeholder="Tes objectifs, ton expérience..."
          placeholderTextColor={colors.placeholder}
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
