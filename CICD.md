# CI/CD — déploiement automatique via GitHub Actions

Trois workflows dans `.github/workflows/` :

| Workflow | Fichier | Déclencheur | Rôle |
|----------|---------|-------------|------|
| **CI** | `ci.yml` | push / PR | lint + typecheck + tests |
| **Deploy backend** | `deploy-backend.yml` | push sur `main` (dossier `supabase/**`) ou manuel | migrations + Edge Functions sur Supabase |
| **Build app** | `build-app.yml` | manuel **ou** tag `vX.Y.Z` | build EAS Android/iOS |

> ⚠️ **Ne partage jamais tes clés dans le code ou le chat.** Elles vivent uniquement
> dans les **secrets GitHub** (chiffrés) et les variables d'environnement EAS.

---

## 1. Secrets à ajouter dans GitHub

Repo → **Settings → Secrets and variables → Actions → New repository secret** :

| Secret | Où le trouver |
|--------|---------------|
| `SUPABASE_ACCESS_TOKEN` | supabase.com → **Account → Access Tokens** |
| `SUPABASE_PROJECT_REF` | la `ref` dans l'URL du dashboard (`https://supabase.com/dashboard/project/<ref>`) |
| `SUPABASE_DB_PASSWORD` | mot de passe de la base, choisi à la création du projet |
| `EXPO_TOKEN` | expo.dev → **Account settings → Access tokens** |

C'est tout ce dont les workflows ont besoin — **aucun mot de passe ne transite par moi**.

## 2. Variables d'environnement EAS (côté Expo)

Le build est bundlé sur les serveurs EAS : les variables publiques doivent y être
définies (une seule fois) :

```bash
eas env:create --environment preview    --name EXPO_PUBLIC_SUPABASE_URL      --value "https://<ref>.supabase.co"
eas env:create --environment preview    --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<anon_public_key>"
eas env:create --environment production  --name EXPO_PUBLIC_SUPABASE_URL      --value "https://<ref>.supabase.co"
eas env:create --environment production  --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<anon_public_key>"
```

(ou via le dashboard Expo → Project → Environment variables.)

---

## 3. Comment ça marche au quotidien

**Backend** — à chaque fois que tu modifies `supabase/` (migration, fonction) et que
tu pousses sur `main`, GitHub Actions applique automatiquement le changement sur ta
base Supabase. Tu peux aussi le lancer à la main : onglet **Actions → Deploy backend →
Run workflow**.

**App** — pour produire un build :
- **Manuel** : onglet **Actions → Build app → Run workflow**, choisis la plateforme
  (`android` / `ios` / `all`) et le profil (`preview` = APK de test, `production` =
  bundle store).
- **Par version** : crée un tag, par exemple :
  ```bash
  git tag v1.0.0 && git push origin v1.0.0
  ```
  → déclenche un build `android` `preview` par défaut.

Le build s'exécute sur EAS ; le lien de téléchargement (APK) ou l'envoi au store
apparaît sur **expo.dev → Builds**.

---

## 4. Pré-requis avant le tout premier build

Une seule fois en local (génère les identifiants Android/iOS et le `projectId`) :

```bash
eas login
eas init
eas build -p android --profile preview   # 1er build interactif (crée les credentials)
```

Ensuite, tous les builds suivants peuvent passer par GitHub Actions.

## 5. (Optionnel) Soumission automatique aux stores

`eas submit` peut envoyer les builds à Google Play / App Store. Cela demande des
identifiants supplémentaires (clé de compte de service Google, identifiants App Store
Connect) à stocker en secrets — à activer quand tu seras prêt à publier.
