# Plan design — état des lieux & backlog (v2, 04/07/2026)

> v1 (diagnostic « Tinder for gym », phases 0-5) : **exécutée**. Ce document
> la remplace : diagnostic frais du design réellement en place, et backlog
> priorisé de ce qui reste.

## 1. Ce qui est en place (vérifié dans le code)

| Système | État |
|---|---|
| **Concept** « Ta salle, en direct. » | ✅ Le Live (présence temps réel), match réciproque, séances |
| **Couleur** | ✅ palette « Ember Pop » sémantique (une couleur = un sens), dégradé de marque rationné à 3 moments, halos selon l'heure (`LivingBackground`) |
| **Typo** | ✅ Sora partout (display/head/body), blanc cassé chaud, jamais de blanc pur |
| **Interaction signature** | ✅ `ScalePressable` : toute surface tapable répond (échelle + haptique + ressort), une seule physique partout, Reduce Motion respecté |
| **Composants** | ✅ Button (dégradé + haptique), Chip, Counter animé, TabBar à indicateur ressort + badge non-lus, EmptyState flottant, Skeletons, dialogues thémés (AppDialog, retour Android géré) |
| **Moments** | ✅ match plein écran (confetti + haptique), PulseDot « live », cartes séance dans le chat |
| **Onboarding** | ✅ 3 écrans « pourquoi » avant le profil |
| **Accessibilité** | ✅ labels/roles systématiques, contrastes documentés (7.3:1, 4.9:1), Reduce Motion |

## 2. Ce qui manque (par ordre d'impact visuel)

1. **Icône & splash = placeholders** (générés en aplat, commentaire « à
   remplacer par le vrai design ») — c'est la première impression, sur
   l'écran d'accueil du téléphone et à chaque lancement. → **la priorité.**
   Direction : marque géométrique « haltère + point live », dégradé de marque
   (un des 3 moments autorisés : le logo), fond noir chaud. Lisible à 48 px.
2. **Transition élément partagé** carte → profil (l'avatar « grandit » vers le
   header). Reporté tant qu'on ne peut pas la valider sur appareil réel —
   règle : pas de motion complexe non testée sur device.
3. **Mascotte Skia** pour états vides/match (option personnalité, après 1-2).
4. **Passe device réelle** : espacements, rythme vertical, ressenti haptique —
   à faire sur captures/vidéos du vrai téléphone (impossible à juger en code).

## 3. Règles (inchangées, elles ont fait leurs preuves)

- Chaque animation **signifie** (guide, confirme, célèbre). Rien de décoratif.
- Le dégradé de marque reste rationné : logo, CTA primaire, match. C'est tout.
- Aucun hex hors de `theme/colors.ts`.
- Pas de nouvelle dépendance native sans build validé sur appareil.
- Une démo fiable bat une démo jolie qui crashe.
