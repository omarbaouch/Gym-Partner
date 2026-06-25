# Guide de déploiement — Gym Partner

Ce guide te fait passer du code à une **APK Android installable**, étape par étape.
Compte ~1 à 2 h la première fois. Tout est gratuit jusqu'à la mise en production.

Sommaire :
1. [Prérequis](#1-prérequis)
2. [Backend Supabase](#2-backend-supabase-base-de-données--auth)
3. [Schéma + données](#3-schéma--données)
4. [Connecter l'app au backend](#4-connecter-lapp-au-backend)
5. [Lancer en local](#5-lancer-en-local-dev)
6. [Notifications push](#6-notifications-push)
7. [Suppression de compte (RGPD)](#7-suppression-de-compte-rgpd)
8. [Build de l'APK (EAS)](#8-build-de-lapk-eas)
9. [Test interne Google Play](#9-test-interne-google-play)
10. [Checklist avant production](#10-checklist-avant-production)

---

## 1. Prérequis

Installe :

```bash
node --version          # v20+
npm i -g eas-cli         # build EAS
npm i -g supabase        # CLI Supabase (ou: brew install supabase/tap/supabase)
```

Crée deux comptes gratuits :
- **Supabase** → https://supabase.com
- **Expo** (pour EAS Build) → https://expo.dev

Pour publier sur le Play Store (étape 9) : un **compte Google Play Console** (25 $ une fois).

---

## 2. Backend Supabase (base de données + auth)

1. Sur https://supabase.com/dashboard → **New project**.
2. **Region : choisis une région UE** (ex. *Frankfurt* ou *Paris*) → important pour le RGPD.
3. Note le **mot de passe** de la base (tu en auras besoin).
4. Une fois le projet créé, va dans **Project Settings → API** et récupère :
   - `Project URL` → `EXPO_PUBLIC_SUPABASE_URL`
   - `anon public` key → `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → **secrète**, uniquement pour les scripts serveur / Edge Functions.

### Activer l'authentification e-mail
- **Authentication → Providers → Email** : activé par défaut.
- Pour tester vite : **Authentication → Providers → Email → "Confirm email"** peut être
  désactivé temporairement (réactive-le en production).

---

## 3. Schéma + données

Lie la CLI à ton projet (récupère la `project-ref` dans l'URL du dashboard) :

```bash
supabase login
supabase link --project-ref <ton-project-ref>
```

Applique les migrations (tables, RLS, fonctions, vues) :

```bash
supabase db push
```

> Cela exécute, dans l'ordre, `supabase/migrations/0001 → 0004` :
> schéma + RLS, onboarding + bucket avatars, recherche par proximité, vue conversations.

Insère les **chaînes de salles** :

```bash
# Récupère la connection string : Dashboard → Project Settings → Database → Connection string (URI)
psql "postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres" \
  -f supabase/seed/seed.sql
```

Importe les **salles** depuis OpenStreetMap (peut prendre quelques minutes) :

```bash
SUPABASE_URL="https://<ref>.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<service_role_key>" \
npx tsx supabase/seed/import_gyms.ts
```

(Optionnel mais recommandé) régénère les types TypeScript depuis le vrai schéma :

```bash
supabase gen types typescript --project-id <ton-project-ref> > src/types/database.ts
```

---

## 4. Connecter l'app au backend

```bash
cp .env.example .env
```

Édite `.env` :

```
EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon_public_key>
```

> Seules les clés `EXPO_PUBLIC_*` sont embarquées dans l'app. **Ne mets jamais la
> `service_role` dans `.env`** : elle ne doit vivre que côté serveur / Edge Functions.

---

## 5. Lancer en local (dev)

```bash
npm install
npm run start
```

- Appuie sur **`a`** pour ouvrir l'émulateur Android (ou scanne le QR code avec
  **Expo Go** sur ton téléphone).
- Parcours de test : inscription → onboarding (profil) → choix de la salle →
  liste des membres → contacter → chat.

> ⚠️ La **carte** (react-native-maps) et les **notifications push** ne fonctionnent
> pas dans Expo Go : il faut un *development build* (`eas build --profile development`)
> ou l'APK `preview`. Le reste de l'app marche dans Expo Go.

Pour tester la mise en relation, crée **2 comptes** sur la **même salle**.

---

## 6. Notifications push

1. Déploie l'Edge Function :

   ```bash
   supabase functions deploy notify-message
   ```

2. Donne-lui les secrets (déjà fournis par défaut côté Supabase, mais vérifie) :

   ```bash
   supabase secrets set SUPABASE_URL="https://<ref>.supabase.co"
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY="<service_role_key>"
   ```

3. Crée le **Database Webhook** qui déclenche la fonction à chaque nouveau message :
   - Dashboard → **Database → Webhooks → Create a new hook**
   - Table : `messages`, Events : **Insert**
   - Type : **Supabase Edge Functions** → `notify-message`
   - Sauvegarde.

Désormais, un message inséré envoie une notif push au destinataire (via Expo).
Les tokens sont enregistrés automatiquement par l'app après l'onboarding.

---

## 7. Suppression de compte (RGPD)

```bash
supabase functions deploy delete-account
```

Le bouton **« Supprimer mon compte »** (onglet Profil) appelle cette fonction, qui
supprime l'utilisateur et toutes ses données en cascade. Pense à remplacer l'URL de
politique de confidentialité (`PRIVACY_URL` dans `app/(tabs)/profile.tsx`).

---

## 8. Build de l'APK (EAS)

```bash
npm run icons          # (re)génère les icônes placeholder si besoin
eas login
eas init               # crée le projet EAS et écrit extra.eas.projectId dans app.json
```

Rends les variables d'environnement disponibles au build (elles ne sont pas committées) :

```bash
eas env:create --environment preview --name EXPO_PUBLIC_SUPABASE_URL --value "https://<ref>.supabase.co"
eas env:create --environment preview --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<anon_public_key>"
```

Lance le build APK :

```bash
eas build -p android --profile preview
```

À la fin, EAS te donne une **URL de téléchargement de l'APK**. Installe-la sur un
téléphone Android (autorise les sources inconnues) et refais le parcours complet.

> `preview` produit un `.apk` (pratique pour partager/tester).
> `production` produit un `.aab` (App Bundle) requis par le Play Store.

---

## 9. Test interne Google Play

1. https://play.google.com/console → crée une **application**.
2. Build de production (App Bundle) :

   ```bash
   eas build -p android --profile production
   ```

3. **Release → Testing → Internal testing → Create new release** :
   téléverse le `.aab`, ajoute les e-mails des testeurs, publie.
4. Les testeurs reçoivent un lien d'installation via le Play Store.

> Optionnel : `eas submit -p android` automatise le téléversement (nécessite une clé
> de compte de service Google Play).

---

## 10. Checklist avant production

- [ ] Région Supabase **UE** confirmée, sauvegardes activées.
- [ ] `Confirm email` **réactivé** dans Supabase Auth.
- [ ] Politique de confidentialité **réelle** publiée + lien à jour (`PRIVACY_URL`).
- [ ] Vrai **design d'icônes** (remplacer les placeholders de `assets/`).
- [ ] Webhook `notify-message` testé (notif reçue sur un vrai appareil).
- [ ] Suppression de compte testée de bout en bout.
- [ ] Politiques **RLS** vérifiées : un compte d'une autre salle ne voit ni les membres
      ni les conversations d'une salle dont il n'est pas membre.
- [ ] Modération : flux de **signalement** surveillé (table `reports`).
- [ ] Mentions légales, CGU, et conformité **Google Play** (Data safety form).

---

Besoin d'aide sur une étape précise ? Indique laquelle et je détaille.
