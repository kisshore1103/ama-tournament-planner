import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
// Repository-native geometric app icon. No external image or font dependency.
function crc32(data) {
  let crc = -1;
  for (const b of data) {
    crc ^= b;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ -1) >>> 0;
}
function chunk(type, body) {
  const data = Buffer.concat([Buffer.from(type), body]);
  const size = Buffer.alloc(4),
    crc = Buffer.alloc(4);
  size.writeUInt32BE(body.length);
  crc.writeUInt32BE(crc32(data));
  return Buffer.concat([size, data, crc]);
}
mkdirSync('public/icons', { recursive: true });
for (const size of [192, 512]) {
  const pixels = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const p = y * (size * 4 + 1) + 1 + x * 4;
      const stripe =
        x > size * 0.23 &&
        x < size * 0.77 &&
        [0.32, 0.47, 0.62].some(
          (v) =>
            y / size - (x / size - 0.5) * -0.12 > v &&
            y / size - (x / size - 0.5) * -0.12 < v + 0.065,
        );
      pixels.set(stripe ? [242, 192, 125, 255] : [16, 46, 43, 255], p);
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  writeFileSync(
    `public/icons/icon-${size}.png`,
    Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk('IHDR', header),
      chunk('IDAT', deflateSync(pixels)),
      chunk('IEND', Buffer.alloc(0)),
    ]),
  );
}
