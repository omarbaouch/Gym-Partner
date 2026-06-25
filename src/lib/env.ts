// Variables d'environnement publiques (préfixe EXPO_PUBLIC_ exposé au bundle).
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    'Supabase non configuré : copiez .env.example vers .env et renseignez vos clés.',
  );
}

export const env = {
  supabaseUrl: url ?? '',
  supabaseAnonKey: anonKey ?? '',
};
