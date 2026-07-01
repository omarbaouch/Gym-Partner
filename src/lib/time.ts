// Formatage de durées relatives pour « Le Live » (français, court).

export function minutesBetween(fromIso: string, to: Date = new Date()): number {
  return Math.max(0, Math.floor((to.getTime() - new Date(fromIso).getTime()) / 60000));
}

// « ici depuis … » : à l'instant / 25 min / 1 h 05
export function formatSince(iso: string, now: Date = new Date()): string {
  const mins = minutesBetween(iso, now);
  if (mins < 2) return "à l'instant";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
}

// « encore … » avant expiration du check-in : encore 45 min / encore 1 h 20
export function formatRemaining(iso: string, now: Date = new Date()): string {
  const mins = Math.max(
    0,
    Math.ceil((new Date(iso).getTime() - now.getTime()) / 60000),
  );
  if (mins < 60) return `encore ${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `encore ${h} h` : `encore ${h} h ${String(m).padStart(2, '0')}`;
}
