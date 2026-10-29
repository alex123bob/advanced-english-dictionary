// Minimal PNG reader/writer (8-bit, non-interlaced) so the generator needs no
// image dependencies. Chrome's headless screenshots are RGBA; the store wants
// 24-bit RGB for everything except the icon.
const zlib = require('zlib');

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const CHANNELS = { 0: 1, 2: 3, 4: 2, 6: 4 };

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function readInfo(buffer) {
  if (!buffer.subarray(0, 8).equals(SIGNATURE)) throw new Error('Not a PNG file');
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    bitDepth: buffer[24],
    colorType: buffer[25],
    interlace: buffer[28],
  };
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

function decode(buffer) {
  const info = readInfo(buffer);
  const channels = CHANNELS[info.colorType];
  if (info.bitDepth !== 8 || !channels || info.interlace !== 0) {
    throw new Error(`Unsupported PNG (bitDepth ${info.bitDepth}, colorType ${info.colorType}, interlace ${info.interlace})`);
  }

  const idat = [];
  for (let offset = 8; offset < buffer.length;) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    if (type === 'IDAT') idat.push(buffer.subarray(offset + 8, offset + 8 + length));
    if (type === 'IEND') break;
    offset += 12 + length;
  }

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = info.width * channels;
  const pixels = Buffer.alloc(stride * info.height);
  for (let y = 0; y < info.height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = y * stride;
    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? pixels[out + x - channels] : 0;
      const up = y > 0 ? pixels[out + x - stride] : 0;
      const upLeft = y > 0 && x >= channels ? pixels[out + x - stride - channels] : 0;
      let value = line[x];
      if (filter === 1) value += left;
      else if (filter === 2) value += up;
      else if (filter === 3) value += (left + up) >> 1;
      else if (filter === 4) value += paeth(left, up, upLeft);
      pixels[out + x] = value & 0xff;
    }
  }
  return { ...info, channels, pixels };
}

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodeRgb(width, height, rgb) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // colour type: truecolour, no alpha
  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  return Buffer.concat([
    SIGNATURE,
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Flattens any 8-bit PNG onto `background` ([r, g, b]) and returns a 24-bit PNG.
function toRgbPng(buffer, background = [255, 255, 255]) {
  const image = decode(buffer);
  const { width, height, channels, pixels } = image;
  const rgb = Buffer.alloc(width * height * 3);
  for (let i = 0; i < width * height; i++) {
    const p = i * channels;
    const gray = channels <= 2;
    const color = gray ? [pixels[p], pixels[p], pixels[p]] : [pixels[p], pixels[p + 1], pixels[p + 2]];
    const alpha = channels === 2 ? pixels[p + 1] : channels === 4 ? pixels[p + 3] : 255;
    for (let c = 0; c < 3; c++) {
      rgb[i * 3 + c] = Math.round((color[c] * alpha + background[c] * (255 - alpha)) / 255);
    }
  }
  return encodeRgb(width, height, rgb);
}

module.exports = { readInfo, toRgbPng };
