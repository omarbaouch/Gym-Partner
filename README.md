# Gym Partner 🏋️

**Ta salle, en direct.**

Application mobile qui montre **qui s'entraîne dans ta salle, maintenant** — et ce
qu'il vient bosser. On se signale présent (« Je suis à la salle · Jambes · 2 h »),
on voit le tableau vivant des membres présents, et si l'envie de s'entraîner
ensemble est **réciproque** (match), le chat s'ouvre pour organiser la séance.
Marché initial : **France**.

> **Android (APK) d'abord, iOS ensuite** — même base de code grâce à React Native / Expo.

▶️ **Tester l'app complète sur Android (A→Z) : voir [TEST_ANDROID.md](./TEST_ANDROID.md).**
📦 **Déploiement pas-à-pas (Supabase + APK) : voir [DEPLOYMENT.md](./DEPLOYMENT.md).**
⚙️ **Déploiement automatique (GitHub Actions) : voir [CICD.md](./CICD.md).**

## Stack

| Couche | Choix |
|--------|-------|
| App | React Native + **Expo** (SDK 52), **TypeScript**, **Expo Router** |
| UI | **NativeWind** (Tailwind), composants maison |
| Données | **TanStack Query** + **Zustand** |
| Backend | **Supabase** (Postgres, Auth, Realtime, Storage, RLS, Edge Functions), région UE |
| Push | **Expo Notifications** + Edge Function `notify-message` |
| Build | **EAS Build** (profil `preview` → APK) |
| Qualité | ESLint, Prettier, TypeScript strict, Jest + RNTL, CI GitHub Actions |

## Prérequis

- Node 20+
- Un projet **Supabase** (région UE recommandée pour le RGPD)
- Compte **Expo** / EAS CLI (`npm i -g eas-cli`) pour produire l'APK

## Démarrage

```bash
npm install
cp .env.example .env        # renseigner EXPO_PUBLIC_SUPABASE_URL et _ANON_KEY
npm run start               # puis 'a' pour ouvrir l'émulateur Android (ou Expo Go)
```

### Base de données

```bash
# Avec la CLI Supabase (https://supabase.com/docs/guides/cli)
supabase db push                              # applique supabase/migrations/0001_init.sql
psql "$DATABASE_URL" -f supabase/seed/seed.sql # chaînes de salles
# Importer les salles depuis OpenStreetMap :
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx supabase/seed/import_gyms.ts
npm run db:types                              # régénère src/types/database.ts
```

Notifications push : déployer la fonction puis brancher un Database Webhook
(INSERT sur `public.messages`) vers elle.

```bash
supabase functions deploy notify-message
supabase functions deploy delete-account      # suppression de compte (RGPD)
```

## Build APK (Android)

```bash
npm run icons                                 # (re)génère les icônes placeholder
eas login
eas init                                       # crée le projet EAS (renseigne extra.eas.projectId)
eas build -p android --profile preview         # produit un .apk installable
```

> Les icônes dans `assets/` sont des placeholders générés (`npm run icons`) ;
> remplace-les par le vrai design avant publication.

iOS plus tard : `eas build -p ios` (Sign in with Apple à ajouter) — aucune réécriture.

## Structure

```
app/            Écrans (Expo Router) : (auth), (tabs), chat/[id], member/[id], select-gym
src/
  components/   UI réutilisable (Button, Screen)
  features/     Logique par domaine (auth, gyms, discovery)
  lib/          supabase, queryClient, push, env, utils
  types/        Types DB (générés)
supabase/
  migrations/   Schéma SQL + RLS
  functions/    Edge Functions (push)
  seed/         Données de départ + import OSM des salles
```

## Sécurité & RGPD

- **RLS** activée partout : un profil n'est visible que par les membres d'une **salle
  commune**, hors utilisateurs bloqués ; les conversations/messages sont réservés à
  leurs participants.
- Fonctions de **blocage** et **signalement** intégrées au schéma.
- Hébergement **UE** côté Supabase ; prévoir politique de confidentialité, consentement
  et droit à l'effacement avant la mise en production.

## Feuille de route

- [x] Phase 0 — Fondations (scaffold, configs, schéma + RLS, squelette d'écrans, CI)
- [x] Phase 1 — Auth & profil (onboarding complet, upload avatar)
- [x] Phase 2 — Salles & découverte (import OSM, carte + géoloc, filtres)
- [x] Phase 3 — Chat & push (temps réel, accusés de lecture, non-lus, notifications)
- [x] Phase 4 — Sécurité & sortie Android (blocage/signalement, suppression RGPD, icônes, build APK)
- [x] Phase 5 — iOS (Sign in with Apple, config Expo iOS, build & TestFlight)
