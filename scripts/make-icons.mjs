// Draws the app icons (a simple timeline mark) as PNG files with no image libraries.
// Run with: npm run icons
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};

function png(size, paint) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  const S = 4; // supersampling for smooth edges
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < S; sy++)
        for (let sx = 0; sx < S; sx++) {
          const [pr, pg, pb, pa] = paint((x + (sx + 0.5) / S) / size, (y + (sy + 0.5) / S) / size);
          r += pr * pa; g += pg * pa; b += pb * pa; a += pa;
        }
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = a ? Math.round(r / a) : 0;
      raw[o + 1] = a ? Math.round(g / a) : 0;
      raw[o + 2] = a ? Math.round(b / a) : 0;
      raw[o + 3] = Math.round((a / (S * S)) * 255);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const BG = [8, 145, 178];
const WHITE = [255, 255, 255];
const ORANGE = [249, 115, 22];

/** scale < 1 shrinks the mark towards the centre (maskable icons need a safe zone). */
const mark = (scale, rounded) => (u, v) => {
  if (rounded) {
    const r = 0.2, cx = Math.min(Math.max(u, r), 1 - r), cy = Math.min(Math.max(v, r), 1 - r);
    if (Math.hypot(u - cx, v - cy) > r) return [0, 0, 0, 0];
  }
  const x = 0.5 + (u - 0.5) / scale;
  const y = 0.5 + (v - 0.5) / scale;
  if (Math.abs(y - 0.62) < 0.035 && x > 0.14 && x < 0.86) return [...ORANGE, 1];
  for (const [cx, cy, rr] of [[0.28, 0.4, 0.085], [0.5, 0.33, 0.085], [0.72, 0.4, 0.085]]) {
    if (Math.hypot(x - cx, y - cy) < rr) return [...WHITE, 1];
    if (Math.abs(x - cx) < 0.018 && y > cy && y < 0.62) return [...WHITE, 1];
  }
  return [...BG, 1];
};

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon-192.png', png(192, mark(1, true)));
writeFileSync('public/icons/icon-512.png', png(512, mark(1, true)));
writeFileSync('public/icons/icon-maskable-512.png', png(512, mark(0.78, false)));
writeFileSync('public/icons/apple-touch-icon.png', png(180, mark(0.9, false)));
console.log('Icons written to public/icons');
