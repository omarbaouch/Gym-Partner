import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';

import { colors } from '@/theme/colors';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-1.5">
      <Text className="font-head text-base text-white">{title}</Text>
      <Text className="leading-5 text-muted">{children}</Text>
    </View>
  );
}

// Politique de confidentialité affichée en local : évite de dépendre d'un
// domaine externe (souvent indisponible/cassé) pour un document obligatoire.
export default function Privacy() {
  const router = useRouter();

  return (
    <Screen>
      <View className="flex-row items-center gap-3 py-3">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Retour"
          className="h-10 w-10 items-center justify-center rounded-full bg-surface"
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text className="font-display text-xl text-white">Politique de confidentialité</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-5 pb-10">
        <Text className="text-muted">
          Gym Partner met en relation des personnes qui s'entraînent dans la même salle.
          Voici les données traitées et comment elles sont protégées.
        </Text>

        <Section title="Données collectées">
          Pseudo, bio, niveau, objectifs et créneaux d'entraînement ; photo de profil (si
          tu en ajoutes une) ; salle(s) fréquentée(s) ; messages échangés avec d'autres
          membres ; position approximative (uniquement pour proposer les salles proches,
          jamais stockée en continu) ; jeton de notification push (si activées).
        </Section>

        <Section title="Pourquoi">
          Ces données servent uniquement à te faire apparaître auprès des membres de ta
          salle, te proposer des partenaires pertinents et te permettre d'échanger avec
          eux. Aucune donnée n'est vendue ni partagée à des tiers publicitaires.
        </Section>

        <Section title="Qui peut voir ton profil">
          Seuls les membres d'une salle que tu fréquentes peuvent voir ton profil — sauf
          si tu as bloqué cette personne, auquel cas l'accès est immédiatement coupé dans
          les deux sens.
        </Section>

        <Section title="Hébergement & sécurité">
          Les données sont hébergées dans l'Union européenne. L'accès est protégé par des
          règles de sécurité au niveau de la base de données (chaque utilisateur ne peut
          lire/modifier que ce que ces règles autorisent), pas seulement par l'application.
        </Section>

        <Section title="Tes droits">
          Tu peux modifier ton profil à tout moment depuis l'onglet Profil. La suppression
          de compte (bouton « Supprimer mon compte ») efface définitivement ton profil, tes
          messages et tes données associées.
        </Section>

        <Section title="Modération">
          Tu peux bloquer ou signaler un autre membre depuis son profil. Un signalement est
          transmis pour examen ; un blocage est immédiat et réciproque.
        </Section>

        <Section title="Contact">
          Pour toute question sur tes données, contacte l'équipe Gym Partner via l'adresse
          indiquée sur la fiche de l'application.
        </Section>
      </ScrollView>
    </Screen>
  );
}
