# Tester l'application complète sur Android — guide A→Z

Ce guide te mène à une **APK installable** avec **toutes** les fonctionnalités
(carte, géoloc, chat temps réel, notifications push).

## ✅ Déjà fait (par l'assistant, sur ton projet Supabase `vmnktijuxunnmjodfbxz`)

- Schéma complet + RLS + Realtime + Storage (région UE)
- 7 chaînes de salles + **27 salles de Strasbourg** importées et testées
- 2 Edge Functions déployées (`notify-message`, `delete-account`)

Il ne reste que des étapes qui nécessitent **tes** comptes (Expo, Google) — je ne
peux pas les faire à ta place, mais elles sont rapides.

---

## 1. Récupérer le code et le configurer

```bash
git clone https://github.com/omarbaouch/gym-partner.git
cd gym-partner
git checkout claude/gym-partner-app-plan-o2jkh4   # ou main si déjà fusionné
npm install
```

Crée le fichier `.env` :

```
EXPO_PUBLIC_SUPABASE_URL=https://vmnktijuxunnmjodfbxz.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<ta clé anon — dashboard → Settings → API>
```

## 2. Réglages Supabase (dashboard, 2 min)

- **Authentication → Providers → Email → décocher "Confirm email"**
  (pour tester sans valider d'e-mail ; à réactiver en production).
- **Database → Webhooks → Create hook** : table `messages`, event **Insert**,
  type **Supabase Edge Functions → notify-message**. *(Nécessaire uniquement pour
  recevoir les notifications push.)*

## 3. Clé Google Maps (gratuit, pour la carte sur Android)

1. https://console.cloud.google.com → crée un projet.
2. **APIs & Services → Library → "Maps SDK for Android"** → Enable.
3. **Credentials → Create credentials → API key**.
4. Colle la clé dans `app.json` à la place de
   `REMPLACER_PAR_VOTRE_CLE_GOOGLE_MAPS_ANDROID`.

> Sans clé, l'app fonctionne mais la **carte** s'affiche en gris (la liste des
> salles avec distances, elle, marche quand même).

## 4. Construire l'APK avec EAS

```bash
npm i -g eas-cli
eas login                 # ton compte Expo (gratuit)
eas init                  # crée le projet EAS + renseigne le projectId

# Variables disponibles au build (bundling côté EAS) :
eas env:create --environment preview --name EXPO_PUBLIC_SUPABASE_URL \
  --value "https://vmnktijuxunnmjodfbxz.supabase.co"
eas env:create --environment preview --name EXPO_PUBLIC_SUPABASE_ANON_KEY \
  --value "<ta clé anon>"

eas build -p android --profile preview
```

À la fin, EAS affiche une **URL de téléchargement de l'APK**. Installe-la sur ton
téléphone Android (autorise les "sources inconnues").

> 💡 Après ce premier `eas init`, tu peux relancer les builds **sans terminal**
> via GitHub Actions (workflow « Build app ») — voir `CICD.md`.

## 5. Tester le parcours complet

Crée **2 comptes** (2 e-mails) et mets-les sur **la même salle de Strasbourg** :

1. Inscription → onboarding (pseudo, niveau, objectifs, créneaux, photo)
2. Choix de la salle : **"Près de moi"** (autorise la localisation) ou **"Par
   ville" → Strasbourg** → la carte + la liste des 27 salles s'affichent
3. Onglet **Ma salle** → tu vois l'autre compte inscrit sur la même salle
4. Ouvre son profil → **Contacter** → **chat en temps réel**
5. Vérifie le **badge de messages non lus**, puis le **blocage/signalement**

> La géoloc te placera réellement là où est ton téléphone. Pour voir des salles,
> teste depuis Strasbourg, ou choisis la salle via **"Par ville"**.

---

## Récapitulatif des prérequis

| Étape | Qui | Indispensable pour |
|------|-----|--------------------|
| `.env` | toi | tout |
| Désactiver Confirm email | toi (dashboard) | inscription rapide |
| Clé Google Maps | toi (gratuit) | la **carte** |
| `eas build` | toi (compte Expo) | l'**APK** |
| Webhook `notify-message` | toi (dashboard) | les **notifications push** |

Tout le reste (base, données Strasbourg, fonctions, sécurité) est **déjà en place**.
