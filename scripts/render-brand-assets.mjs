// Renders the Tolitoli mark (docs/design/logo/*.svg) into the PNG assets the app needs:
// app icon, Android adaptive icon layers, splash, favicon and notification icons.
// The marks are plain rounded rectangles, so they are rasterised here with signed-distance
// anti-aliasing: no image tool or dependency is needed. Run: node scripts/render-brand-assets.mjs
import { Buffer } from 'node:buffer';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOGO = join(ROOT, 'docs/design/logo');

/** Rounded rectangles of an SVG mark, in viewBox units, with their fill colour. */
function readMark(file) {
  const svg = readFileSync(join(LOGO, file), 'utf8');
  const [, , , viewSize] = /viewBox="([\d.\s-]+)"/.exec(svg)[1].split(/\s+/).map(Number);
  const rootFill = /<svg[^>]*\sfill="([^"]+)"/.exec(svg)?.[1];
  const shapes = [];
  let groupFill = null;
  for (const [tag] of svg.matchAll(/<\/?(g|rect)\b[^>]*>/g)) {
    if (tag.startsWith('</g')) groupFill = null;
    else if (tag.startsWith('<g')) groupFill = /fill="([^"]+)"/.exec(tag)?.[1] ?? null;
    else {
      const attr = (name) => Number(new RegExp(`\\s${name}="([\\d.]+)"`).exec(tag)?.[1] ?? 0);
      shapes.push({
        x: attr('x'),
        y: attr('y'),
        w: attr('width'),
        h: attr('height'),
        r: attr('rx'),
        fill: /fill="([^"]+)"/.exec(tag)?.[1] ?? groupFill ?? rootFill,
      });
    }
  }
  return {
    viewSize,
    background: shapes.find((s) => s.w === viewSize),
    bars: shapes.filter((s) => s.w !== viewSize),
  };
}

function hex(color) {
  const v = parseInt(color.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

/** Signed distance from point to a rounded rectangle (negative inside). */
function distance(px, py, s) {
  const qx = Math.abs(px - (s.x + s.w / 2)) - (s.w / 2 - s.r);
  const qy = Math.abs(py - (s.y + s.h / 2)) - (s.h / 2 - s.r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - s.r;
}

/**
 * Draws shapes on a transparent `size` canvas. `scale` shrinks the drawing around the centre
 * (adaptive-icon safe zone); `color` overrides fills (silhouettes).
 */
function render(size, viewSize, shapes, { scale = 1, color = null } = {}) {
  const pixels = new Float64Array(size * size * 4);
  const unit = viewSize / size / scale;
  for (const shape of shapes) {
    const [r, g, b] = hex(color ?? shape.fill);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const vx = (x + 0.5 - size / 2) * unit + viewSize / 2;
        const vy = (y + 0.5 - size / 2) * unit + viewSize / 2;
        const coverage = Math.min(1, Math.max(0, 0.5 - distance(vx, vy, shape) / unit));
        if (coverage === 0) continue;
        const i = (y * size + x) * 4;
        const keep = 1 - coverage;
        pixels[i] = r * coverage + pixels[i] * keep;
        pixels[i + 1] = g * coverage + pixels[i + 1] * keep;
        pixels[i + 2] = b * coverage + pixels[i + 2] * keep;
        pixels[i + 3] = coverage + pixels[i + 3] * keep;
      }
    }
  }
  return { size, pixels };
}

function png({ size, pixels }) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      const alpha = pixels[i + 3];
      const o = y * (size * 4 + 1) + 1 + x * 4;
      // Colours are stored premultiplied while drawing; PNG wants straight alpha.
      for (let c = 0; c < 3; c += 1) raw[o + c] = alpha ? Math.round(pixels[i + c] / alpha) : 0;
      raw[o + 3] = Math.round(alpha * 255);
    }
  }
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 6, 0, 0, 0], 8); // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function save(path, image) {
  mkdirSync(dirname(join(ROOT, path)), { recursive: true });
  writeFileSync(join(ROOT, path), png(image));
  console.log(`${path} (${image.size} px)`);
}

const mark = readMark('tolitoli-mark.svg');
const dark = readMark('tolitoli-mark-dark.svg');
const mono = readMark('tolitoli-mark-mono.svg');
const fullBleed = { ...mark.background, r: 0 };
// Bars scaled so their corners stay inside the adaptive icon's 66 dp safe circle.
const ADAPTIVE_SCALE = 0.8;

// iOS rejects transparency in the app icon and applies its own mask: full-bleed square.
save('assets/icon.png', render(1024, mark.viewSize, [fullBleed, ...mark.bars]));
save(
  'assets/android-icon-foreground.png',
  render(1024, mark.viewSize, mark.bars, { scale: ADAPTIVE_SCALE }),
);
save(
  'assets/android-icon-monochrome.png',
  render(1024, mark.viewSize, mark.bars, { scale: ADAPTIVE_SCALE, color: '#ffffff' }),
);
save('assets/splash-icon.png', render(1024, mark.viewSize, [mark.background, ...mark.bars]));
save('assets/splash-icon-dark.png', render(1024, dark.viewSize, [dark.background, ...dark.bars]));
save('assets/favicon.png', render(48, mark.viewSize, [mark.background, ...mark.bars]));

// Android status bar and notification header keep only the silhouette (white on transparent).
const DENSITIES = { mdpi: 24, hdpi: 36, xhdpi: 48, xxhdpi: 72, xxxhdpi: 96 };
for (const [density, size] of Object.entries(DENSITIES)) {
  save(
    `assets/notification/ic_stat_tolitoli-${density}.png`,
    render(size, mono.viewSize, mono.bars),
  );
}
save(
  'assets/notification/tolitoli_notification_large.png',
  render(256, mark.viewSize, [mark.background, ...mark.bars]),
);
