// Identité visuelle de l'app : la marque « haltère + point live », dessinée en
// vecteur puis rendue en PNG (icône, icône adaptative Android, splash).
//
// Direction : fond noir chaud, haltère géométrique aux traits ronds rempli du
// dégradé de marque (l'un des TROIS usages autorisés du dégradé : le logo),
// point ember en haut à droite = « en direct ». Lisible à 48 px.
//
// Usage : node scripts/generate-icons.mjs   (npm run icons)
import { writeFileSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';

const BG = '#160E0B'; // noir chaud (colors.background)
const EMBER = '#FF3D77'; // point « live » (colors.ember)
const GRADIENT = ['#FFC53D', '#FF7A1A', '#FF3D77']; // gradients.brand

// La marque seule (haltère + point live), centrée dans un viewBox 1024.
// `withBackground` : fond plein (icône/splash) ou transparent (adaptive).
function markSvg({ withBackground, scale = 1 }) {
  const s = scale;
  // Géométrie autour du centre (512,512) — traits épais, bouts ronds.
  const g = `
    <g transform="translate(512 512) scale(${s}) translate(-512 -512)">
      <!-- barre -->
      <rect x="150" y="487" width="724" height="50" rx="25" fill="url(#brand)"/>
      <!-- plaques intérieures (hautes) -->
      <rect x="266" y="360" width="74" height="304" rx="37" fill="url(#brand)"/>
      <rect x="684" y="360" width="74" height="304" rx="37" fill="url(#brand)"/>
      <!-- plaques extérieures (basses) -->
      <rect x="168" y="408" width="66" height="208" rx="33" fill="url(#brand)"/>
      <rect x="790" y="408" width="66" height="208" rx="33" fill="url(#brand)"/>
      <!-- point « live » : halo puis cœur ember -->
      <circle cx="774" cy="290" r="64" fill="${EMBER}" opacity="0.28"/>
      <circle cx="774" cy="290" r="38" fill="${EMBER}"/>
    </g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="brand" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${GRADIENT[0]}"/>
      <stop offset="0.5" stop-color="${GRADIENT[1]}"/>
      <stop offset="1" stop-color="${GRADIENT[2]}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.42" r="0.75">
      <stop offset="0" stop-color="#2E2018"/>
      <stop offset="1" stop-color="${BG}"/>
    </radialGradient>
  </defs>
  ${withBackground ? `<rect width="1024" height="1024" fill="url(#glow)"/>` : ''}
  ${g}
</svg>`;
}

async function render(svg, path) {
  await sharp(Buffer.from(svg)).png().toFile(path);
  console.log('OK', path);
}

mkdirSync('assets', { recursive: true });

// Icône (iOS + fallback) : marque sur fond, légèrement réduite pour respirer.
await render(markSvg({ withBackground: true, scale: 0.78 }), 'assets/icon.png');

// Icône adaptative Android : marque SEULE sur transparent, dans la zone sûre
// (cercle central ~66 %) — le fond vient de app.json (backgroundColor).
await render(markSvg({ withBackground: false, scale: 0.58 }), 'assets/adaptive-icon.png');

// Splash (resizeMode contain, fond #160E0B via app.json) : marque discrète.
await render(markSvg({ withBackground: true, scale: 0.5 }), 'assets/splash.png');

writeFileSync(
  'assets/README.md',
  `# Assets de marque

Générés par \`npm run icons\` (scripts/generate-icons.mjs) : la marque
« haltère + point live » en vecteur → icon.png, adaptive-icon.png (Android,
transparent, zone sûre), splash.png. Modifier le SVG dans le script, jamais
les PNG à la main.
`,
);
console.log('Terminé.');
