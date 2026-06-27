// Génère des icônes/splash placeholders valides (PNG 1024x1024) aux couleurs
// de la marque, pour que `eas build` ne bloque pas. À remplacer par le vrai
// design plus tard.
//
// Usage : node scripts/generate-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const SIZE = 1024;
const BG = [22, 14, 11]; // #160E0B (noir chaud)
const PRIMARY = [255, 122, 26]; // #FF7A1A (orange vif)

const crcTable = (() => {
  const t = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

// pixel(x, y) -> [r, g, b]
function makePng(pixel) {
  const raw = Buffer.alloc((SIZE * 3 + 1) * SIZE);
  let p = 0;
  for (let y = 0; y < SIZE; y++) {
    raw[p++] = 0; // filter type
    for (let x = 0; x < SIZE; x++) {
      const [r, g, b] = pixel(x, y);
      raw[p++] = r;
      raw[p++] = g;
      raw[p++] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0);
  ihdr.writeUInt32BE(SIZE, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const cx = SIZE / 2;
const cy = SIZE / 2;
const r2 = (SIZE * 0.32) ** 2;

// Icône : pastille primaire centrée sur fond sombre.
const icon = makePng((x, y) =>
  (x - cx) ** 2 + (y - cy) ** 2 < r2 ? PRIMARY : BG,
);
const splash = makePng(() => BG);
const adaptive = makePng((x, y) =>
  (x - cx) ** 2 + (y - cy) ** 2 < r2 ? PRIMARY : BG,
);

mkdirSync('assets', { recursive: true });
writeFileSync('assets/icon.png', icon);
writeFileSync('assets/splash.png', splash);
writeFileSync('assets/adaptive-icon.png', adaptive);
console.log('Icônes générées dans assets/.');
