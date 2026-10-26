// Original fixed-size decorative illustrations. No file or network input.
import { deflateSync } from 'node:zlib';
import { createHash } from 'node:crypto';
const colors = Object.freeze({ scope: 0x147D92, prepare: 0xB45B20, evidence: 0xA63D72 });
function crc(bytes) {
  let value = 0xFFFFFFFF;
  for (const byte of bytes) { value ^= byte; for (let bit = 0; bit < 8; bit++) value = value & 1 ? (value >>> 1) ^ 0xEDB88320 : value >>> 1; }
  return (value ^ 0xFFFFFFFF) >>> 0;
}
function chunk(type, data) {
  const name = Buffer.from(type), size = Buffer.alloc(4), checksum = Buffer.alloc(4);
  size.writeUInt32BE(data.length); checksum.writeUInt32BE(crc(Buffer.concat([name, data])));
  return Buffer.concat([size, name, data, checksum]);
}
export function createCardArt(key) {
  if (!Object.hasOwn(colors, key)) throw new Error('Unknown illustration');
  const color = colors[key], pixels = Buffer.alloc(96 * 96 * 3);
  for (let i = 0; i < pixels.length; i += 3) { pixels[i] = color >> 16; pixels[i + 1] = color >> 8 & 255; pixels[i + 2] = color & 255; }
  const dot = (x, y) => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && xx < 96 && yy >= 0 && yy < 96) pixels.fill(255, (yy * 96 + xx) * 3, (yy * 96 + xx) * 3 + 3);
    }
  };
  const line = (x, y, xx, yy) => {
    const count = Math.max(Math.abs(xx - x), Math.abs(yy - y));
    for (let i = 0; i <= count; i++) dot(Math.round(x + (xx - x) * i / (count || 1)), Math.round(y + (yy - y) * i / (count || 1)));
  };
  const path = points => { for (let i = 1; i < points.length; i++) line(...points[i - 1], ...points[i]); };
  if (key === 'scope') {
    path([[48,16],[73,26],[69,57],[59,71],[48,80],[37,71],[27,57],[23,26],[48,16]]);
    path([[34,46],[44,57],[63,35]]);
  } else if (key === 'prepare') {
    for (let angle = 0; angle < 360; angle++) dot(Math.round(48 + 30 * Math.cos(angle * Math.PI / 180)), Math.round(48 + 30 * Math.sin(angle * Math.PI / 180)));
    path([[59,29],[52,53],[35,67],[42,43],[59,29]]);
  } else {
    path([[48,28],[34,22],[19,24],[19,70],[34,68],[48,74],[62,68],[77,70],[77,24],[62,22],[48,28],[48,74]]);
    for (const y of [36,45,54]) { line(26,y,39,y+1); line(57,y+1,70,y); }
  }
  const raw = Buffer.alloc(96 * 289);
  for (let y = 0; y < 96; y++) pixels.copy(raw, y * 289 + 1, y * 288, (y + 1) * 288);
  const header = Buffer.alloc(13); header.writeUInt32BE(96); header.writeUInt32BE(96, 4); header[8] = 8; header[9] = 2;
  const png = Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'), chunk('IHDR',header), chunk('IDAT',deflateSync(raw)), chunk('IEND',Buffer.alloc(0))]);
  return { color, base64: png.toString('base64'), sha256: createHash('sha256').update(png).digest('hex') };
}
