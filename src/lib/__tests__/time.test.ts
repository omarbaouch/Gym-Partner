import { formatRemaining, formatSince, minutesBetween } from '../time';

const NOW = new Date('2026-07-01T18:00:00Z');
const iso = (minutesAgo: number) =>
  new Date(NOW.getTime() - minutesAgo * 60000).toISOString();

describe('minutesBetween', () => {
  it('compte les minutes écoulées', () => {
    expect(minutesBetween(iso(25), NOW)).toBe(25);
  });

  it('ne renvoie jamais de valeur négative', () => {
    expect(minutesBetween(iso(-10), NOW)).toBe(0);
  });
});

describe('formatSince', () => {
  it("affiche « à l'instant » sous 2 minutes", () => {
    expect(formatSince(iso(1), NOW)).toBe("à l'instant");
  });

  it('affiche les minutes sous une heure', () => {
    expect(formatSince(iso(25), NOW)).toBe('25 min');
  });

  it('affiche heures et minutes au-delà', () => {
    expect(formatSince(iso(65), NOW)).toBe('1 h 05');
    expect(formatSince(iso(120), NOW)).toBe('2 h');
  });
});

describe('formatRemaining', () => {
  it('affiche les minutes restantes', () => {
    expect(formatRemaining(iso(-45), NOW)).toBe('encore 45 min');
  });

  it('affiche heures et minutes restantes', () => {
    expect(formatRemaining(iso(-80), NOW)).toBe('encore 1 h 20');
    expect(formatRemaining(iso(-180), NOW)).toBe('encore 3 h');
  });

  it('plancher à 0 quand expiré', () => {
    expect(formatRemaining(iso(10), NOW)).toBe('encore 0 min');
  });
});
