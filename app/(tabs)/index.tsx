import { Image } from 'expo-image';
import { Link, useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { useGymMembers, type Member } from '@/features/discovery/useGymMembers';
import { usePrimaryGym } from '@/features/gyms/usePrimaryGym';

export default function Discover() {
  const router = useRouter();
  const { data: gym, isLoading: gymLoading } = usePrimaryGym();
  const { data: members, isLoading } = useGymMembers(gym?.id);

  if (gymLoading) {
    return (
      <Screen>
        <ActivityIndicator className="mt-10" color="#7C5CFF" />
      </Screen>
    );
  }

  if (!gym) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center gap-4">
          <Text className="text-center text-lg text-white">
            Choisis ta salle pour découvrir les membres qui s'y entraînent.
          </Text>
          <Button label="Choisir ma salle" onPress={() => router.push('/select-gym')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View className="flex-row items-center justify-between py-3">
        <View>
          <Text className="text-xl font-bold text-white">{gym.name}</Text>
          <Text className="text-muted">{gym.city}</Text>
        </View>
        <Link href="/select-gym" className="text-primary">
          Changer
        </Link>
      </View>

      {isLoading ? (
        <ActivityIndicator className="mt-10" color="#7C5CFF" />
      ) : (
        <FlatList
          data={members ?? []}
          keyExtractor={(m) => m.id}
          ItemSeparatorComponent={() => <View className="h-3" />}
          ListEmptyComponent={
            <Text className="mt-10 text-center text-muted">
              Personne d'autre pour l'instant. Reviens bientôt !
            </Text>
          }
          renderItem={({ item }) => <MemberCard member={item} />}
        />
      )}
    </Screen>
  );
}

function MemberCard({ member }: { member: Member }) {
  return (
    <Link href={{ pathname: '/member/[id]', params: { id: member.id } }} asChild>
      <Pressable className="flex-row items-center gap-3 rounded-2xl bg-surface p-3">
        <Image
          source={member.avatar_url ?? undefined}
          className="h-12 w-12 rounded-full bg-background"
        />
        <View className="flex-1">
          <Text className="text-base font-semibold text-white">
            {member.display_name}
          </Text>
          <Text className="text-muted">
            {member.level} · {member.goals.join(', ') || 'Objectifs non renseignés'}
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}
