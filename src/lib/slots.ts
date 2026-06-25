// Créneaux d'entraînement habituels.
export type Slot = { day: string; period: 'morning' | 'noon' | 'evening' };

const DAY_LABELS: Record<string, string> = {
  mon: 'Lun',
  tue: 'Mar',
  wed: 'Mer',
  thu: 'Jeu',
  fri: 'Ven',
  sat: 'Sam',
  sun: 'Dim',
};

const PERIOD_LABELS: Record<Slot['period'], string> = {
  morning: 'matin',
  noon: 'midi',
  evening: 'soir',
};

// Formate un créneau pour affichage : { day:'mon', period:'evening' } -> "Lun soir".
export function formatSlot(slot: Slot): string {
  const day = DAY_LABELS[slot.day] ?? slot.day;
  return `${day} ${PERIOD_LABELS[slot.period] ?? slot.period}`;
}

export function formatSlots(slots: Slot[]): string {
  return slots.map(formatSlot).join(' · ');
}
