# Plan de transformation — gagner le prix Meilleur concept / design

## 1. Diagnostic sans complaisance (pourquoi l'app ne gagne pas aujourd'hui)

1. **Le concept est un cliché** : « Tinder for gym » — liste de profils → profil
   → DM. Le patron le plus vu en hackathon. Un jury l'identifie en 30 secondes.
2. **L'app ment sur sa promesse** : elle se présente comme du *matching*, mais il
   n'existe AUCUN mécanisme de match (vérifié dans le code : `get_or_create_conversation`
   permet à n'importe quel membre d'une salle commune d'écrire à n'importe qui).
   C'est un annuaire + messagerie ouverte. Problème de concept ET de sûreté
   (DM non sollicités).
3. **Rien n'exploite la salle** : aucune notion de présence (« qui est là
   maintenant »). L'app pourrait s'appeler « partenaire de sport dans ma ville »
   sans rien changer — donc aucune raison d'exister en tant qu'app *de salle*.
4. **Aucune rétention** : après le premier contact, plus aucune raison d'ouvrir
   l'app. Pas de séance planifiée, pas d'historique, pas de réputation.
5. **Design générique** : dégradé sunset + pilules arrondies + Ionicons = 40 %
   des apps de 2026. Aucun moment signature. Toutes les animations sont des
   `FadeInDown` de tutoriel. La mascotte « Gymo » a même été retirée à un moment
   (commit « design: retire la mascotte ») — la personnalité a régressé.
6. **Fiabilité fragile** : cette session a connu un crash au lancement (env
   manquantes), un build cassé (BlurView), un bug RLS corrigé en 3 tentatives.
   iOS n'a JAMAIS été buildé. Des comptes « Test » traînent dans les données.

## 2. L'étoile polaire (le repositionnement)

> **« Ta salle, en direct. »**
> Pas un catalogue de profils : un tableau vivant de **qui est à ta salle
> MAINTENANT et cherche un partenaire pour CETTE séance.**

Pourquoi c'est la bonne idée :
- **Différenciant** : une dating app générique ne peut pas le copier — ça exige
  l'ancrage salle + le temps réel. C'est la réponse à « pourquoi cette app existe ».
- **Vrai problème** : t'es à la salle, tu veux un pareur/un binôme *maintenant*,
  pas dans trois jours.
- **Rétention par construction** : on ouvre l'app à chaque séance (check-in),
  pas une fois pour toujours.
- **Sûreté par construction** : le chat ne s'ouvre que sur intérêt réciproque.
- **Démontrable en 60 secondes** avec deux téléphones — critère décisif en jury.

L'infra est déjà prête pour ça : Supabase Realtime est déjà branché (chat),
les push notifications existent, `Confetti.tsx` existe, le design system est
posé. On construit sur l'acquis, pas de nouvelle dépendance native (leçon des
échecs Lottie/BlurView de cette session).

---

## 3. Les phases

### PHASE 0 — Présence temps réel : « Le Live » (le cœur, non négociable)

**Backend — migration `0010_presence.sql`**
- Table `checkins` : `user_id`, `gym_id`, `focus text` (« Jambes », « Push »,
  « Cardio »…), `note text null`, `active_until timestamptz`, `created_at`.
- RPC `check_in(_gym uuid, _focus text, _minutes int default 120)` →
  upsert avec `active_until = now() + _minutes`. RPC `check_out()`.
- RPC `live_at_gym(_gym uuid)` → profils actifs (`active_until > now()`) de la
  salle, hors soi, hors bloqués (réutilise `is_blocked_with`), avec focus et
  heure d'arrivée. `security definer` + grants comme les RPC existantes.
- RLS : chacun ne gère que ses check-ins. Publier la table dans
  `supabase_realtime` (comme `messages`).

**App**
- `app/(tabs)/index.tsx` devient **« Le Live »** :
  - En haut : gros CTA *« Je suis à la salle »* → petit sheet (focus du jour +
    durée) → check-in. Une fois actif : carte « Tu es visible · Jambes · encore
    1 h 45 » avec bouton discret « Partir ».
  - En dessous : la liste **en direct** des membres présents (« ici depuis
    20 min · Pecs/Triceps »), triée par arrivée. Compteur vivant réutilisant
    `Counter.tsx` : « 3 partenaires là, maintenant ».
  - La liste « tous les membres » actuelle descend en section secondaire
    (« Aussi inscrits ici ») — on ne jette rien, on rehiérarchise.
- `src/features/presence/` : `useLiveAtGym(gymId)` (React Query + canal
  Realtime, même patron que le chat), `useCheckIn()`, `useMyCheckin()`.
- État vide qui donne envie : « Sois le premier — les autres verront que tu es
  là » + EmptyState animé existant.

**Critère de done** : deux appareils côte à côte, l'un check-in, l'autre voit la
carte apparaître sans rafraîchir.

### PHASE 1 — Match réciproque + moment de célébration

**Backend — migration `0011_match.sql`**
- Table `intents` : `from_user`, `to_user`, `created_at`, unique (from,to).
  RLS : j'écris les miens, je lis ceux qui me concernent.
- `get_or_create_conversation` modifiée : n'autorise la création QUE si
  l'intent existe dans les deux sens (le match). Les conversations existantes
  restent intactes.
- Trigger sur `intents` : si la réciproque existe → notifier les deux (push
  via l'edge function existante ou insert direct dans la conv créée).

**App**
- `member/[id].tsx` : le bouton « Message » devient *« Partant·e pour
  s'entraîner »*. États : rien → « En attente… » (intent envoyé) → match.
- **Moment de match** plein écran : `Confetti.tsx` (déjà là) + haptique +
  « Ça matche ! » + CTA « Planifier une séance / Ouvrir le chat ». C'est LE
  moment émotionnel de la démo (patron Focus Friend / grug, gagnants 2025-26).
- Sur « Le Live », badge « Partant·e » visible sur les cartes des gens qui ont
  déjà exprimé un intent vers toi (asymétrie assumée : tu vois qui te veut).

### PHASE 2 — La séance (la boucle de retour)

**Backend — `0012_sessions.sql`** : table `sessions` (`conversation_id`,
`gym_id`, `scheduled_at`, `status` proposé/confirmé/passé). RLS participants.

**App**
- Dans le chat : *« Proposer une séance »* → jour + créneau → carte de séance
  épinglée en haut de la conversation (accepter/décliner).
- Sur « Le Live » : bandeau « Séance avec Léa demain 18 h » tant qu'elle est à
  venir.
- (Bonus si temps) après la date passée : « C'était un bon partenaire ? » 👍 →
  compteur « X partenaires satisfaits » sur le profil. Réputation = confiance.

### PHASE 3 — UN moment de design signature

Une seule pièce de motion, parfaite, au lieu de dix `FadeInDown` :
- **Transition élément partagé** carte → profil : l'avatar de la carte du Live
  « grandit » vers le header du profil. 100 % Reanimated (déjà installé), zéro
  nouvelle dépendance native — leçon retenue des fiascos BlurView/Lottie.
- (Option personnalité) **Mascotte dessinée en Skia** — pas Lottie — pour les
  états vides et l'écran de match. Skia est déjà prouvé fiable ici
  (`LivingBackground`). Rétablit ce que le retrait de « Gymo » a perdu.
- Règle des gagnants ADA 2026 : chaque animation *signifie* (guide, confirme,
  célèbre). Rien de décoratif.

### PHASE 4 — Fiabilité & démo (ne pas perdre bêtement)

- **Nettoyage démo** : supprimer/rhabiller les comptes « Test »/« test2@gmail.com ».
  Refaire un seed où les 9 profils démo sont **check-in en live** sur One
  Fitness Club, avec focus variés — la démo ne doit JAMAIS montrer un écran vide.
- **Script de démo 60 s** (docs/DEMO.md) : ouvrir → check-in → l'autre appareil
  voit apparaître → intent réciproque → confetti → séance proposée. Chronométré.
- **iOS** : lancer au moins un build EAS iOS (il faut tes identifiants Apple).
  Si impossible → assumer Android-only et prévoir l'APK pré-installée sur DEUX
  téléphones de démo.
- **Règle d'or** : plus aucun build présenté sans avoir été lancé sur un
  appareil réel (cette session : 1 crash au lancement, 1 build cassé, 1 bug RLS).

### PHASE 5 — Narratif & marque

- Tagline partout : **« Ta salle, en direct. »** (splash, store, README, pitch).
- Onboarding en 3 écrans qui vend le POURQUOI (« Vois qui s'entraîne, là,
  maintenant ») avant de collecter les champs.
- Assumer la palette Ember dans le discours : chaude et accueillante pour
  désintimider les débutants — dit explicitement, sinon ça passe pour un
  dégradé de plus.
- Captures store propres + une phrase de concept. C'est le support du jury.

---

## 4. Séquence d'exécution

```
PHASE 0 (Live)  →  PHASE 1 (Match)  →  PHASE 4 (démo propre)
     →  PHASE 3 (signature)  →  PHASE 2 (séances)  →  PHASE 5 (narratif)
```

Le prix se gagne ou se perd sur 0 + 1 : même en s'arrêtant après la Phase 1,
l'app est déjà un produit différent, défendable et démontrable. 4 avant 3 :
une démo fiable bat une démo jolie qui crashe.

## 5. Décisions qu'il me faut de toi

1. **Check-in manuel** (bouton, recommandé pour commencer) ou géolocalisation
   automatique (plus magique, plus long/risqué) ?
2. **Verrouiller le chat derrière le match** (Phase 1) — changement de
   comportement produit : feu vert explicite requis.
3. **Nom** : on garde « Gym Partner » avec la tagline, ou je propose des noms ?
4. **iOS** : as-tu un compte Apple Developer pour un build iOS, ou on assume
   Android-only pour la démo ?

Réponds (ou dis « choix par défaut ») et j'attaque la Phase 0 immédiatement.
