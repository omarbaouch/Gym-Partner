import type { Member } from './useGymMembers';

export type MemberFilters = {
  level: string | null;
  goals: string[];
  periods: string[];
};

export const emptyFilters: MemberFilters = { level: null, goals: [], periods: [] };

// Filtre la liste des membres selon le niveau, les objectifs et les créneaux.
// Un membre passe s'il correspond à TOUS les filtres actifs (un filtre vide est ignoré).
export function filterMembers(members: Member[], f: MemberFilters): Member[] {
  return members.filter((m) => {
    if (f.level && m.level !== f.level) return false;
    if (f.goals.length && !f.goals.some((g) => m.goals.includes(g))) return false;
    if (
      f.periods.length &&
      !(m.usual_slots ?? []).some((s) => f.periods.includes(s.period))
    ) {
      return false;
    }
    return true;
  });
}

export function isFilterActive(f: MemberFilters): boolean {
  return !!f.level || f.goals.length > 0 || f.periods.length > 0;
}
