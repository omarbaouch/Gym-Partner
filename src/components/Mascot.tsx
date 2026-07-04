import { Image } from 'expo-image';
import { useReducedMotion } from 'react-native-reanimated';

// Mascotte de l'app (personnage 3D animé, fond transparent). Deux états
// d'émotion, chacun avec UN sens — comme les couleurs :
//   'hello' → accueil / invitation (salut de la main). Écrans d'accueil,
//             onboarding, « sois le premier ».
//   'flex'  → énergie / motivation (le personnage bombe le torse). Beats
//             « on se motive », récompense.
// Ce n'est PAS le logo (le logo reste l'haltère de marque) : la mascotte est
// un personnage de soutien pour les moments vides et émotionnels.
export type MascotVariant = 'hello' | 'flex';

const SOURCES = {
  hello: require('../../assets/mascot/hello.webp'),
  flex: require('../../assets/mascot/flex.webp'),
} as const;

export function Mascot({
  variant,
  size = 148,
}: {
  variant: MascotVariant;
  size?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <Image
      source={SOURCES[variant]}
      // « Réduire les animations » : on fige sur la première image.
      autoplay={!reduced}
      contentFit="contain"
      style={{ width: size, height: size }}
      accessibilityLabel="Mascotte Gym Partner"
      // Boucle propre : garde la dernière image décodée pendant le rechargement.
      recyclingKey={variant}
    />
  );
}
