import fs from 'node:fs';
import zlib from 'node:zlib';

function createPng(width, height, colorFn) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8);
  ihdrData.writeUInt8(6, 9);
  ihdrData.writeUInt8(0, 10);
  ihdrData.writeUInt8(0, 11);
  ihdrData.writeUInt8(0, 12);

  const ihdrChunk = makeChunk('IHDR', ihdrData);
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = colorFn(x, y, width, height);
      const pixelOffset = rowOffset + 1 + x * 4;
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const length = data.length;
  const buffer = Buffer.alloc(8 + length + 4);
  buffer.writeUInt32BE(length, 0);
  buffer.write(type, 4, 4, 'ascii');
  data.copy(buffer, 8);
  const crc = crc32(buffer.subarray(4, 8 + length));
  buffer.writeInt32BE(crc, 8 + length);
  return buffer;
}

const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return crc ^ -1;
}

// MIXERO Neon Fade (Sky #38bdf8 -> Teal #2dd4bf -> Warm Gold #fbbf24) Cassette Icon
function mixeroPixel(x, y, w, h, scale = 1, fullBleed = false) {
  const cx = w / 2;
  const cy = h / 2;
  const dx = (x - cx) / (w / 2);
  const dy = (y - cy) / (h / 2);

  if (!fullBleed) {
    const r = 0.92;
    if (Math.abs(dx) > r || Math.abs(dy) > r) {
      return [0, 0, 0, 0];
    }
  }

  const sx = dx / scale;
  const sy = dy / scale;

  // Cassette outer frame
  const inFrame = Math.abs(sx) <= 0.68 && Math.abs(sy) <= 0.44;
  const isBorder =
    inFrame &&
    (Math.abs(sx) >= 0.61 || Math.abs(sy) >= 0.37);

  // Top label stripe
  const isStripe = Math.abs(sx) <= 0.52 && sy >= -0.30 && sy <= -0.20;

  // Reels
  const leftDist = Math.hypot(sx + 0.28, sy - 0.06);
  const rightDist = Math.hypot(sx - 0.28, sy - 0.06);
  const isLeftReel = leftDist <= 0.14 && leftDist >= 0.06;
  const isRightReel = rightDist <= 0.14 && rightDist >= 0.06;
  const isLeftCore = leftDist <= 0.04;
  const isRightCore = rightDist <= 0.04;
  const isBridge = Math.abs(sx) <= 0.20 && Math.abs(sy - 0.06) <= 0.025;

  if (isBorder || isStripe || isBridge || isLeftReel || isRightReel || isLeftCore || isRightCore) {
    const t = Math.min(1, Math.max(0, (sx + 0.68) / 1.36));
    let r, g, b;
    if (t < 0.5) {
      const k = t * 2;
      r = Math.round(56 * (1 - k) + 45 * k);
      g = Math.round(189 * (1 - k) + 212 * k);
      b = Math.round(248 * (1 - k) + 191 * k);
    } else {
      const k = (t - 0.5) * 2;
      r = Math.round(45 * (1 - k) + 251 * k);
      g = Math.round(212 * (1 - k) + 191 * k);
      b = Math.round(191 * (1 - k) + 36 * k);
    }
    return [r, g, b, 255];
  }

  const dist = Math.hypot(dx, dy);
  const glow = Math.max(0, 1 - dist * 0.85);
  return [
    Math.round(6 + 10 * glow),
    Math.round(9 + 16 * glow),
    Math.round(14 + 22 * glow),
    255,
  ];
}

fs.mkdirSync('public', { recursive: true });
fs.writeFileSync('public/pwa-192x192.png', createPng(192, 192, (x, y, w, h) => mixeroPixel(x, y, w, h, 1, false)));
fs.writeFileSync('public/pwa-512x512.png', createPng(512, 512, (x, y, w, h) => mixeroPixel(x, y, w, h, 1, false)));
fs.writeFileSync('public/apple-touch-icon.png', createPng(180, 180, (x, y, w, h) => mixeroPixel(x, y, w, h, 1, true)));
fs.writeFileSync('public/apple-touch-icon-180x180.png', createPng(180, 180, (x, y, w, h) => mixeroPixel(x, y, w, h, 1, true)));
fs.writeFileSync('public/apple-touch-icon-152x152.png', createPng(152, 152, (x, y, w, h) => mixeroPixel(x, y, w, h, 1, true)));
fs.writeFileSync('public/apple-touch-icon-120x120.png', createPng(120, 120, (x, y, w, h) => mixeroPixel(x, y, w, h, 1, true)));
fs.writeFileSync('public/apple-touch-icon-precomposed.png', createPng(180, 180, (x, y, w, h) => mixeroPixel(x, y, w, h, 1, true)));
fs.writeFileSync('public/pwa-maskable-512x512.png', createPng(512, 512, (x, y, w, h) => mixeroPixel(x, y, w, h, 0.72, true)));
console.log('MIXERO PWA icons generated.');
