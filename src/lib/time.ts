// Formatage de durées relatives (« Le Live ») et de dates de séance —
// français, sans dépendre d'Intl (déterministe sur tous les appareils).

const DAYS_FR = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const MONTHS_FR = [
  'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
];

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

// « aujourd'hui » / « demain » / « jeu. 4 juil. »
export function formatDayLabel(date: Date, now: Date = new Date()): string {
  const diff = Math.round((startOfDay(date) - startOfDay(now)) / 86_400_000);
  if (diff === 0) return "aujourd'hui";
  if (diff === 1) return 'demain';
  return `${DAYS_FR[date.getDay()]} ${date.getDate()} ${MONTHS_FR[date.getMonth()]}`;
}

// « demain · 18 h » / « jeu. 4 juil. · 18 h 30 » (carte de séance, bannière)
export function formatSessionDate(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const mins = d.getMinutes();
  const time = mins === 0 ? `${d.getHours()} h` : `${d.getHours()} h ${String(mins).padStart(2, '0')}`;
  return `${formatDayLabel(d, now)} · ${time}`;
}

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
