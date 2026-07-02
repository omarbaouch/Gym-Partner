import {
  CELL_DEG,
  cellRadiusM,
  cellsFromPoints,
  denseCellsFromPoints,
  parseGoogleAddress,
  subdivideCell,
} from '../places_grid';

describe('cellsFromPoints', () => {
  it('crée une seule cellule pour des points du même carreau', () => {
    const cells = cellsFromPoints([
      { latitude: 48.58, longitude: 7.76 },
      { latitude: 48.6, longitude: 7.8 },
    ]);
    expect(cells).toHaveLength(1);
  });

  it('crée des cellules distinctes pour des points éloignés', () => {
    const cells = cellsFromPoints([
      { latitude: 48.58, longitude: 7.75 }, // Strasbourg
      { latitude: 43.3, longitude: 5.37 }, // Marseille
      { latitude: -20.88, longitude: 55.45 }, // Saint-Denis (La Réunion)
    ]);
    expect(cells).toHaveLength(3);
  });

  it('centre la cellule sur son carreau et couvre tout le carreau', () => {
    const [cell] = cellsFromPoints([{ latitude: 48.58, longitude: 7.75 }]);
    // Le point d'origine est bien dans la cellule.
    expect(Math.abs(cell.latitude - 48.58)).toBeLessThan(CELL_DEG);
    expect(Math.abs(cell.longitude - 7.75)).toBeLessThan(CELL_DEG);
    // Rayon ≥ demi-diagonale du carreau (≈ 16 km à cette latitude).
    expect(cell.radiusM).toBeGreaterThan(15_000);
    expect(cell.radiusM).toBeLessThan(25_000);
  });
});

describe('denseCellsFromPoints', () => {
  it('ne retient que les carreaux atteignant le seuil de salles', () => {
    const dense = [
      { latitude: 48.851, longitude: 2.341 },
      { latitude: 48.852, longitude: 2.342 },
      { latitude: 48.853, longitude: 2.343 },
    ];
    const sparse = [{ latitude: 45.05, longitude: 3.05 }];
    const cells = denseCellsFromPoints([...dense, ...sparse], 0.1, 3);
    expect(cells).toHaveLength(1);
    expect(Math.abs(cells[0].latitude - 48.85)).toBeLessThan(0.1);
  });

  it('retourne vide sous le seuil', () => {
    expect(
      denseCellsFromPoints([{ latitude: 48.85, longitude: 2.34 }], 0.1, 3),
    ).toHaveLength(0);
  });
});

describe('subdivideCell', () => {
  it('découpe en 4 quadrants de rayon moitié', () => {
    const cell = { latitude: 48.58, longitude: 7.75, radiusM: 16_000 };
    const quads = subdivideCell(cell);
    expect(quads).toHaveLength(4);
    for (const q of quads) {
      expect(q.radiusM).toBe(8000);
      // Les centres restent proches de la cellule mère.
      expect(Math.abs(q.latitude - cell.latitude)).toBeLessThan(0.15);
      expect(Math.abs(q.longitude - cell.longitude)).toBeLessThan(0.2);
    }
    // 4 centres distincts.
    expect(new Set(quads.map((q) => `${q.latitude}:${q.longitude}`)).size).toBe(4);
  });
});

describe('cellRadiusM', () => {
  it('diminue avec la latitude (convergence des méridiens)', () => {
    expect(cellRadiusM(0.25, 51)).toBeLessThan(cellRadiusM(0.25, 42));
  });
});

describe('parseGoogleAddress', () => {
  const components = [
    { longText: '10', types: ['street_number'] },
    { longText: 'Rue Alexandre Dumas', types: ['route'] },
    { longText: 'Strasbourg', types: ['locality'] },
    { longText: '67200', types: ['postal_code'] },
    { longText: 'France', shortText: 'FR', types: ['country'] },
  ];

  it('extrait ville, code postal et adresse', () => {
    expect(parseGoogleAddress(components)).toEqual({
      city: 'Strasbourg',
      postalCode: '67200',
      streetAddress: '10 Rue Alexandre Dumas',
      isFrance: true,
    });
  });

  it("accepte les codes pays d'outre-mer", () => {
    const dom = [
      { longText: 'Saint-Denis', types: ['locality'] },
      { longText: 'La Réunion', shortText: 'RE', types: ['country'] },
    ];
    expect(parseGoogleAddress(dom).isFrance).toBe(true);
  });

  it('rejette les pays hors France', () => {
    const de = [{ longText: 'Deutschland', shortText: 'DE', types: ['country'] }];
    expect(parseGoogleAddress(de).isFrance).toBe(false);
  });

  it('tolère une adresse vide', () => {
    expect(parseGoogleAddress(undefined)).toEqual({
      city: null,
      postalCode: null,
      streetAddress: null,
      isFrance: false,
    });
  });
});
