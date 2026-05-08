const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const sourcePath = path.join(
  __dirname,
  "../../mobile/feature/auth/impl/src/commonMain/composeResources/drawable/ic_app_logo.png",
);
const outputPath = path.join(__dirname, "../app/icon.png");
const cornerRadiusRatio = 0.18;

const pngSignature = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function readChunks(buffer) {
  if (!buffer.subarray(0, 8).equals(pngSignature)) {
    throw new Error("Source logo is not a PNG file");
  }

  const chunks = [];
  let offset = 8;
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    chunks.push({ type, data });
    offset += 12 + length;
    if (type === "IEND") {
      break;
    }
  }
  return chunks;
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

function unfilter(raw, width, height, bytesPerPixel, stride) {
  const pixels = Buffer.alloc(height * stride);
  let inputOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[inputOffset];
    inputOffset += 1;
    const rowOffset = y * stride;
    const previousRowOffset = rowOffset - stride;

    for (let x = 0; x < stride; x += 1) {
      const left =
        x >= bytesPerPixel ? pixels[rowOffset + x - bytesPerPixel] : 0;
      const up = y > 0 ? pixels[previousRowOffset + x] : 0;
      const upperLeft =
        y > 0 && x >= bytesPerPixel
          ? pixels[previousRowOffset + x - bytesPerPixel]
          : 0;
      const value = raw[inputOffset + x];

      if (filter === 0) pixels[rowOffset + x] = value;
      else if (filter === 1) pixels[rowOffset + x] = (value + left) & 0xff;
      else if (filter === 2) pixels[rowOffset + x] = (value + up) & 0xff;
      else if (filter === 3)
        pixels[rowOffset + x] = (value + Math.floor((left + up) / 2)) & 0xff;
      else if (filter === 4)
        pixels[rowOffset + x] = (value + paeth(left, up, upperLeft)) & 0xff;
      else throw new Error(`Unsupported PNG filter: ${filter}`);
    }
    inputOffset += stride;
  }
  return pixels;
}

function writeChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  typeBuffer.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(
    crc32(Buffer.concat([typeBuffer, data])),
    8 + data.length,
  );
  return chunk;
}

function roundedRectCoverage(x, y, width, height, radius) {
  const samples = [
    [0.25, 0.25],
    [0.75, 0.25],
    [0.25, 0.75],
    [0.75, 0.75],
  ];
  let inside = 0;

  for (const [offsetX, offsetY] of samples) {
    const sampleX = x + offsetX;
    const sampleY = y + offsetY;
    const centerX = Math.min(Math.max(sampleX, radius), width - radius);
    const centerY = Math.min(Math.max(sampleY, radius), height - radius);
    const distanceX = sampleX - centerX;
    const distanceY = sampleY - centerY;
    if (distanceX * distanceX + distanceY * distanceY <= radius * radius) {
      inside += 1;
    }
  }

  return inside / samples.length;
}

const chunks = readChunks(fs.readFileSync(sourcePath));
const ihdr = chunks.find((chunk) => chunk.type === "IHDR")?.data;
if (!ihdr) throw new Error("PNG IHDR chunk is missing");

const width = ihdr.readUInt32BE(0);
const height = ihdr.readUInt32BE(4);
const bitDepth = ihdr[8];
const colorType = ihdr[9];
const interlace = ihdr[12];

if (bitDepth !== 8 || colorType !== 6 || interlace !== 0) {
  throw new Error("Expected an 8-bit non-interlaced RGBA mobile logo PNG");
}

const rgba = unfilter(
  zlib.inflateSync(
    Buffer.concat(
      chunks
        .filter((chunk) => chunk.type === "IDAT")
        .map((chunk) => chunk.data),
    ),
  ),
  width,
  height,
  4,
  width * 4,
);

const radius = Math.round(Math.min(width, height) * cornerRadiusRatio);
const outputRows = Buffer.alloc(height * (1 + width * 4));
for (let y = 0; y < height; y += 1) {
  const rowOffset = y * (1 + width * 4);
  outputRows[rowOffset] = 0;
  for (let x = 0; x < width; x += 1) {
    const sourceOffset = (y * width + x) * 4;
    const targetOffset = rowOffset + 1 + x * 4;
    const backgroundAlpha = roundedRectCoverage(x, y, width, height, radius);
    const sourceAlpha = (rgba[sourceOffset + 3] / 255) * backgroundAlpha;
    const outputAlpha = sourceAlpha + backgroundAlpha * (1 - sourceAlpha);

    if (outputAlpha === 0) {
      outputRows[targetOffset] = 255;
      outputRows[targetOffset + 1] = 255;
      outputRows[targetOffset + 2] = 255;
      outputRows[targetOffset + 3] = 0;
      continue;
    }

    outputRows[targetOffset] = Math.round(
      (rgba[sourceOffset] * sourceAlpha +
        255 * backgroundAlpha * (1 - sourceAlpha)) /
        outputAlpha,
    );
    outputRows[targetOffset + 1] = Math.round(
      (rgba[sourceOffset + 1] * sourceAlpha +
        255 * backgroundAlpha * (1 - sourceAlpha)) /
        outputAlpha,
    );
    outputRows[targetOffset + 2] = Math.round(
      (rgba[sourceOffset + 2] * sourceAlpha +
        255 * backgroundAlpha * (1 - sourceAlpha)) /
        outputAlpha,
    );
    outputRows[targetOffset + 3] = Math.round(outputAlpha * 255);
  }
}

const outputIhdr = Buffer.from(ihdr);
outputIhdr[9] = 6;
fs.writeFileSync(
  outputPath,
  Buffer.concat([
    pngSignature,
    writeChunk("IHDR", outputIhdr),
    writeChunk("IDAT", zlib.deflateSync(outputRows)),
    writeChunk("IEND", Buffer.alloc(0)),
  ]),
);

console.log(
  `favicon written with rounded white background: ${path.relative(process.cwd(), outputPath)}`,
);
