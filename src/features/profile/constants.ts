import type { FitnessLevel } from '@/types/database';

export const LEVELS: { value: FitnessLevel; label: string }[] = [
  { value: 'debutant', label: 'Débutant' },
  { value: 'intermediaire', label: 'Intermédiaire' },
  { value: 'avance', label: 'Avancé' },
];

// Objectifs d'entraînement proposés (multi-sélection).
export const GOALS = [
  'Prise de masse',
  'Perte de poids',
  'Force / Powerlifting',
  'Cardio / Endurance',
  'Crossfit',
  'Remise en forme',
  'Préparation physique',
] as const;

export const DAYS: { value: string; label: string }[] = [
  { value: 'mon', label: 'Lun' },
  { value: 'tue', label: 'Mar' },
  { value: 'wed', label: 'Mer' },
  { value: 'thu', label: 'Jeu' },
  { value: 'fri', label: 'Ven' },
  { value: 'sat', label: 'Sam' },
  { value: 'sun', label: 'Dim' },
];

export const PERIODS: { value: 'morning' | 'noon' | 'evening'; label: string }[] = [
  { value: 'morning', label: 'Matin' },
  { value: 'noon', label: 'Midi' },
  { value: 'evening', label: 'Soir' },
];
