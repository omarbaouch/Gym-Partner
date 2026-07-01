// Options du check-in « Je suis à la salle ».

export const FOCUS_OPTIONS = [
  'Push',
  'Pull',
  'Jambes',
  'Full body',
  'Cardio',
  'Autre',
] as const;

export const DURATIONS = [
  { label: '1 h', minutes: 60 },
  { label: '2 h', minutes: 120 },
  { label: '3 h', minutes: 180 },
] as const;
