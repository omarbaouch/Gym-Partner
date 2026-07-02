import { dedupeGyms, distanceMeters } from '../dedupe';
import { chainLogoUrl, gymLogoUrl, normalizeChainName } from '../chainLogo';

describe('distanceMeters', () => {
  it('mesure ~78 m pour 0.001° de longitude à Strasbourg', () => {
    const d = distanceMeters(48.58, 7.75, 48.58, 7.751);
    expect(d).toBeGreaterThan(60);
    expect(d).toBeLessThan(90);
  });
});

describe('dedupeGyms', () => {
  const base = {
    id: '1',
    name: 'Basic-Fit',
    chain_id: 'c1',
    latitude: 48.5896,
    longitude: 7.6998,
  };

  it('fusionne deux salles de même nom à moins de 150 m', () => {
    const rows = [
      base,
      { ...base, id: '2', name: 'Basic Fit', latitude: 48.59, longitude: 7.7 },
    ];
    expect(dedupeGyms(rows)).toHaveLength(1);
    expect(dedupeGyms(rows)[0].id).toBe('1');
  });

  it('fusionne deux salles de même enseigne à moins de 150 m malgré des noms différents', () => {
    const rows = [
      base,
      {
        ...base,
        id: '2',
        name: 'Basic-Fit Strasbourg Dumas',
        latitude: 48.5897,
        longitude: 7.6999,
      },
    ];
    expect(dedupeGyms(rows)).toHaveLength(1);
  });

  it('conserve deux salles de la même enseigne éloignées (deux clubs distincts)', () => {
    const rows = [base, { ...base, id: '2', latitude: 48.5526, longitude: 7.7435 }];
    expect(dedupeGyms(rows)).toHaveLength(2);
  });

  it('conserve deux salles indépendantes proches mais différentes', () => {
    const rows = [
      { ...base, id: '1', name: 'Panza Gym', chain_id: null },
      { ...base, id: '2', name: 'Body Hit', chain_id: null },
    ];
    expect(dedupeGyms(rows)).toHaveLength(2);
  });

  it('ne compare pas les salles sans coordonnées', () => {
    const rows = [
      { ...base, latitude: null, longitude: null },
      { ...base, id: '2', latitude: null, longitude: null },
    ];
    expect(dedupeGyms(rows)).toHaveLength(2);
  });
});

describe('normalizeChainName', () => {
  it.each([
    ['Basic-Fit', 'basicfit'],
    ['Basic Fit', 'basicfit'],
    ['KeepCool', 'keepcool'],
    ["L'Orange Bleue", 'lorangebleue'],
    ['Vita Liberté', 'vitaliberte'],
    [null, ''],
  ])('normalise %p en %p', (input, expected) => {
    expect(normalizeChainName(input)).toBe(expected);
  });
});

describe('chainLogoUrl', () => {
  it('retrouve le logo malgré la casse et la ponctuation', () => {
    expect(chainLogoUrl('KeepCool')).toContain('keepcool.fr');
    expect(chainLogoUrl('Basic Fit')).toContain('basic-fit.com');
  });

  it('retrouve le logo dans un libellé composé', () => {
    expect(chainLogoUrl('Keep Cool Neudorf Ribauvillé')).toContain('keepcool.fr');
  });

  it('retourne null pour une salle indépendante', () => {
    expect(chainLogoUrl('Panza Gym')).toBeNull();
    expect(chainLogoUrl(null)).toBeNull();
  });
});

describe('gymLogoUrl', () => {
  it('privilégie le logo_url stocké en base', () => {
    expect(
      gymLogoUrl({ chain_logo_url: 'https://x/logo.png', chain_name: 'Basic-Fit' }),
    ).toBe('https://x/logo.png');
  });

  it("reconstruit l'URL depuis le nom d'enseigne en secours", () => {
    expect(gymLogoUrl({ chain_logo_url: null, chain_name: 'Neoness' })).toContain(
      'neoness.fr',
    );
  });
});
