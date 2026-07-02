import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import { env } from './env';
import type { Database } from '@/types/database';

// Client Supabase partagé. AsyncStorage conserve la session entre les lancements.
// flowType pkce : requis par l'OAuth Google (échange code → session côté app,
// cf. GoogleSignInButton) ; sans effet sur email/mot de passe et Apple (idToken).
export const supabase = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});
