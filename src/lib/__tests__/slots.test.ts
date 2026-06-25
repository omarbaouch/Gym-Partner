import { formatSlot, formatSlots } from '../slots';

describe('formatSlot', () => {
  it('formate un créneau connu', () => {
    expect(formatSlot({ day: 'mon', period: 'evening' })).toBe('Lun soir');
  });

  it('garde les valeurs inconnues telles quelles', () => {
    expect(formatSlot({ day: 'xyz', period: 'morning' })).toBe('xyz matin');
  });

  it('joint plusieurs créneaux', () => {
    expect(
      formatSlots([
        { day: 'mon', period: 'evening' },
        { day: 'wed', period: 'noon' },
      ]),
    ).toBe('Lun soir · Mer midi');
  });
});
