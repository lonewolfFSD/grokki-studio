const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

function createSvg(size = 512) {
  const cx = size / 2;
  const cy = size / 2;
  // Radius of the main orb - enlarged to fill 97% of bounding box
  const r = size * 0.485;

  // Grok eyes center position
  // In the reference image, the eyes are in the upper-right quadrant
  const eyeX = cx + (r * 0.29);
  const eyeY = cy - (r * 0.16);
  // Tilt angle: ~ -21.8 degrees
  const angle = -21.8;

  // Dimensions of pills proportional to size (bolder & larger for high visibility)
  const scale = size / 512;
  const pw = 45 * scale;
  const ph1 = 118 * scale; // Left pill height
  const ph2 = 150 * scale; // Right pill height (taller)
  const gap = 18 * scale;
  const radius = pw / 2;

  // Pill positions relative to eye center
  const x1 = -(gap / 2 + pw);
  const y1 = -ph1 / 2 + (14 * scale);
  const x2 = gap / 2;
  const y2 = -ph2 / 2;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <!-- Soft outer aura filter -->
    <filter id="orbBloom" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="${14 * scale}" result="blur1" />
      <feGaussianBlur stdDeviation="${28 * scale}" result="blur2" />
      <feMerge>
        <feMergeNode in="blur2" />
        <feMergeNode in="blur1" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <!-- Eye soft white bloom -->
    <filter id="eyeGlow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="${5 * scale}" result="glow" />
      <feMerge>
        <feMergeNode in="glow" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <!-- Base cosmic sphere dark core -->
    <radialGradient id="baseGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#14172a" />
      <stop offset="70%" stop-color="#0a0c18" />
      <stop offset="100%" stop-color="#04050a" />
    </radialGradient>

    <!-- Left Cyan / Sky Blue Aura -->
    <radialGradient id="cyanAura" cx="12%" cy="46%" r="68%">
      <stop offset="0%" stop-color="#67e8f9" stop-opacity="1" />
      <stop offset="15%" stop-color="#38bdf8" stop-opacity="0.95" />
      <stop offset="35%" stop-color="#2563eb" stop-opacity="0.75" />
      <stop offset="65%" stop-color="#1e3a8a" stop-opacity="0.25" />
      <stop offset="100%" stop-color="#05060d" stop-opacity="0" />
    </radialGradient>

    <!-- Right Purple / Violet Aura -->
    <radialGradient id="purpleAura" cx="88%" cy="44%" r="62%">
      <stop offset="0%" stop-color="#c084fc" stop-opacity="0.95" />
      <stop offset="22%" stop-color="#a855f7" stop-opacity="0.88" />
      <stop offset="48%" stop-color="#7c3aed" stop-opacity="0.6" />
      <stop offset="75%" stop-color="#4c1d95" stop-opacity="0.2" />
      <stop offset="100%" stop-color="#05060d" stop-opacity="0" />
    </radialGradient>

    <!-- Top-left subtle specular rim sheen -->
    <radialGradient id="topSheen" cx="30%" cy="16%" r="48%">
      <stop offset="0%" stop-color="#93c5fd" stop-opacity="0.55" />
      <stop offset="50%" stop-color="#3b82f6" stop-opacity="0.15" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>

    <!-- Deep obsidian center depth to preserve high contrast behind eyes -->
    <radialGradient id="coreShadow" cx="52%" cy="54%" r="42%">
      <stop offset="0%" stop-color="#060710" stop-opacity="0.75" />
      <stop offset="70%" stop-color="#060710" stop-opacity="0.45" />
      <stop offset="100%" stop-color="#060710" stop-opacity="0" />
    </radialGradient>

    <!-- Thin glowing border ring -->
    <linearGradient id="rimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#67e8f9" stop-opacity="0.9" />
      <stop offset="25%" stop-color="#38bdf8" stop-opacity="0.85" />
      <stop offset="75%" stop-color="#c084fc" stop-opacity="0.85" />
      <stop offset="100%" stop-color="#a855f7" stop-opacity="0.9" />
    </linearGradient>

    <!-- Sphere Mask / Clip -->
    <clipPath id="sphereClip">
      <circle cx="${cx}" cy="${cy}" r="${r}" />
    </clipPath>
  </defs>

  <!-- Ambient Outer Glow -->
  <circle cx="${cx}" cy="${cy}" r="${r + 2}" fill="none" stroke="url(#rimGrad)" stroke-width="${10 * scale}" opacity="0.5" filter="url(#orbBloom)" />

  <!-- Sphere Internal Graphics -->
  <g clip-path="url(#sphereClip)">
    <!-- 1. Deep Space Base -->
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#baseGrad)" />

    <!-- 2. Electric Cyan / Sky Blue Left Aura -->
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#cyanAura)" />

    <!-- 3. Neon Purple Right Aura -->
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#purpleAura)" />

    <!-- 4. Top Rim Specular Ambient Sheen -->
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#topSheen)" />

    <!-- 5. Core Contrast Dimming (Behind eyes) -->
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#coreShadow)" />

    <!-- 6. Grok Signature Tilted Twin White Pill Eyes -->
    <g transform="translate(${eyeX}, ${eyeY}) rotate(${angle})">
      <!-- Glow under-layer -->
      <g filter="url(#eyeGlow)" opacity="0.9">
        <rect x="${x1}" y="${y1}" width="${pw}" height="${ph1}" rx="${radius}" ry="${radius}" fill="#ffffff" />
        <rect x="${x2}" y="${y2}" width="${pw}" height="${ph2}" rx="${radius}" ry="${radius}" fill="#ffffff" />
      </g>
      <!-- Crisp Foreground Pure White Pills -->
      <rect x="${x1}" y="${y1}" width="${pw}" height="${ph1}" rx="${radius}" ry="${radius}" fill="#ffffff" />
      <rect x="${x2}" y="${y2}" width="${pw}" height="${ph2}" rx="${radius}" ry="${radius}" fill="#ffffff" />
    </g>
  </g>

  <!-- 7. Crisp Perimeter Border Highlight -->
  <circle cx="${cx}" cy="${cy}" r="${r - 1}" fill="none" stroke="url(#rimGrad)" stroke-width="${2.2 * scale}" opacity="0.8" />
</svg>`;
}

// Minimal ICO encoder for multi-size Windows icon
function encodeIco(pngBuffers) {
  // pngBuffers: array of { width, height, buffer }
  const count = pngBuffers.length;
  const headerSize = 6;
  const entrySize = 16;
  let offset = headerSize + count * entrySize;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // 1 = ICO
  header.writeUInt16LE(count, 4); // Number of images

  const entries = [];
  for (const item of pngBuffers) {
    const entry = Buffer.alloc(entrySize);
    entry.writeUInt8(item.width >= 256 ? 0 : item.width, 0);
    entry.writeUInt8(item.height >= 256 ? 0 : item.height, 1);
    entry.writeUInt8(0, 2); // Color palette
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(item.buffer.length, 8); // Image size in bytes
    entry.writeUInt32LE(offset, 12); // Offset to image data
    entries.push(entry);
    offset += item.buffer.length;
  }

  return Buffer.concat([header, ...entries, ...pngBuffers.map(p => p.buffer)]);
}

async function run() {
  const assetsDir = path.join(__dirname, '..', 'assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  const svg512 = createSvg(512);
  fs.writeFileSync(path.join(assetsDir, 'grokki_icon.svg'), svg512, 'utf8');
  console.log('[+] Saved assets/grokki_icon.svg');

  const sharp512 = sharp(Buffer.from(svg512));

  // 1. Generate grokki_tray.png (32x32 crisp for Windows notification area)
  // For small tray icon, we render at 64 and resize with high-quality lanczos3, or render directly
  const traySvg = createSvg(256);
  const trayBuf = await sharp(Buffer.from(traySvg))
    .resize(32, 32, { kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(assetsDir, 'grokki_tray.png'), trayBuf);
  console.log('[+] Saved assets/grokki_tray.png (32x32)');

  // 2. Generate grokki_icon.png (64x64)
  const icon64Buf = await sharp512.clone().resize(64, 64, { kernel: sharp.kernel.lanczos3 }).png().toBuffer();
  fs.writeFileSync(path.join(assetsDir, 'grokki_icon.png'), icon64Buf);
  console.log('[+] Saved assets/grokki_icon.png (64x64)');

  // 3. Generate grokki_icon_large.png (256x256)
  const icon256Buf = await sharp512.clone().resize(256, 256, { kernel: sharp.kernel.lanczos3 }).png().toBuffer();
  fs.writeFileSync(path.join(assetsDir, 'grokki_icon_large.png'), icon256Buf);
  console.log('[+] Saved assets/grokki_icon_large.png (256x256)');

  // 4. Generate multi-resolution Windows ICO (16, 24, 32, 48, 64, 128, 256)
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const pngBuffers = [];
  for (const s of sizes) {
    const buf = await sharp512.clone().resize(s, s, { kernel: sharp.kernel.lanczos3 }).png().toBuffer();
    pngBuffers.push({ width: s, height: s, buffer: buf });
  }

  const icoBuf = encodeIco(pngBuffers);
  fs.writeFileSync(path.join(assetsDir, 'grokki_icon.ico'), icoBuf);
  console.log('[+] Saved assets/grokki_icon.ico (multi-resolution: 16 to 256)');

  console.log('Done! All Grokki assets successfully generated matching the reference.');
}

run().catch(console.error);
