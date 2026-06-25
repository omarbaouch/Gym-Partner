// Types de la base — version manuelle de départ.
// À régénérer avec : npm run db:types (supabase gen types typescript).
export type FitnessLevel = 'debutant' | 'intermediaire' | 'avance';

export interface Profile {
  id: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  birth_year: number | null;
  gender: string | null;
  level: FitnessLevel;
  goals: string[];
  usual_slots: { day: string; period: string }[];
  onboarded: boolean;
  created_at: string;
  updated_at: string;
}

export interface GymChain {
  id: string;
  name: string;
  logo_url: string | null;
  brand_color: string | null;
}

export interface Gym {
  id: string;
  chain_id: string | null;
  name: string;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
}

export interface Conversation {
  id: string;
  user_a: string;
  user_b: string;
  last_message_at: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
}

// Type Database minimal accepté par supabase-js (sera remplacé par la génération).
export type Database = any;
