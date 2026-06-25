import { emptyFilters, filterMembers, isFilterActive } from '../filters';
import type { Member } from '../useGymMembers';

const base: Omit<Member, 'id'> = {
  display_name: 'X',
  level: 'intermediaire',
  goals: ['Cardio / Endurance'],
  avatar_url: null,
  usual_slots: [{ day: 'mon', period: 'evening' }],
};

const members: Member[] = [
  { ...base, id: '1', level: 'debutant', goals: ['Prise de masse'], usual_slots: [{ day: 'tue', period: 'morning' }] },
  { ...base, id: '2', level: 'avance', goals: ['Cardio / Endurance'], usual_slots: [{ day: 'mon', period: 'evening' }] },
  { ...base, id: '3', level: 'avance', goals: ['Force / Powerlifting'], usual_slots: [{ day: 'wed', period: 'noon' }] },
];

describe('filterMembers', () => {
  it('renvoie tout sans filtre', () => {
    expect(filterMembers(members, emptyFilters)).toHaveLength(3);
  });

  it('filtre par niveau', () => {
    const r = filterMembers(members, { ...emptyFilters, level: 'avance' });
    expect(r.map((m) => m.id)).toEqual(['2', '3']);
  });

  it('filtre par objectif (au moins un)', () => {
    const r = filterMembers(members, {
      ...emptyFilters,
      goals: ['Cardio / Endurance'],
    });
    expect(r.map((m) => m.id)).toEqual(['2']);
  });

  it('combine niveau + créneau', () => {
    const r = filterMembers(members, {
      ...emptyFilters,
      level: 'avance',
      periods: ['evening'],
    });
    expect(r.map((m) => m.id)).toEqual(['2']);
  });
});

describe('isFilterActive', () => {
  it('faux pour les filtres vides', () => {
    expect(isFilterActive(emptyFilters)).toBe(false);
  });
  it('vrai dès qu un filtre est posé', () => {
    expect(isFilterActive({ ...emptyFilters, level: 'avance' })).toBe(true);
  });
});
