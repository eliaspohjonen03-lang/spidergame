// Taustan tunnistus ja poisto värin perusteella. Puhdasta laskentaa ilman DOM:ia.

export type RGB = [number, number, number];

export interface Pixels {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

const MAX_DIST = Math.sqrt(3 * 255 * 255);

function dist(d: Uint8ClampedArray, i: number, c: RGB): number {
  const r = d[i] - c[0];
  const g = d[i + 1] - c[1];
  const b = d[i + 2] - c[2];
  return Math.sqrt(r * r + g * g + b * b) / MAX_DIST;
}

export function colorAt(p: Pixels, x: number, y: number): RGB {
  const xi = Math.max(0, Math.min(p.width - 1, Math.round(x)));
  const yi = Math.max(0, Math.min(p.height - 1, Math.round(y)));
  const i = (yi * p.width + xi) * 4;
  return [p.data[i], p.data[i + 1], p.data[i + 2]];
}

/** Tunnistaa taustavärit kuvan reunoilta. Palauttaa yleisimmät (enintään 3) värit. */
export function detectBackground(p: Pixels): { colors: RGB[]; transparent: boolean } {
  const { width: w, height: h, data: d } = p;
  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
  let total = 0;
  let clear = 0;
  const visit = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    total++;
    if (d[i + 3] < 16) {
      clear++;
      return;
    }
    const key = ((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4);
    const b = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    b.n++;
    b.r += d[i];
    b.g += d[i + 1];
    b.b += d[i + 2];
    buckets.set(key, b);
  };
  for (let x = 0; x < w; x++) {
    visit(x, 0);
    visit(x, h - 1);
  }
  for (let y = 1; y < h - 1; y++) {
    visit(0, y);
    visit(w - 1, y);
  }
  const colors = [...buckets.values()]
    .filter((b) => b.n / total >= 0.08)
    .sort((a, b) => b.n - a.n)
    .slice(0, 3)
    .map((b) => [Math.round(b.r / b.n), Math.round(b.g / b.n), Math.round(b.b / b.n)] as RGB);
  return { colors, transparent: clear / total > 0.5 };
}

/**
 * Laskee jokaiselle pikselille näkyvyyden (0 = tausta, 255 = näkyy).
 * tolerance 0–1. Jos connected, poistetaan vain reunoihin yhteydessä oleva tausta.
 */
export function backgroundAlpha(p: Pixels, colors: RGB[], tolerance: number, connected: boolean): Uint8ClampedArray {
  const { width: w, height: h, data: d } = p;
  const n = w * h;
  const out = new Uint8ClampedArray(n).fill(255);
  if (!colors.length) return out;
  const thr = 0.02 + tolerance * 0.45;
  const soft = 0.05;
  const level = (px: number): number => {
    const i = px * 4;
    if (d[i + 3] < 16) return 0;
    let m = Infinity;
    for (const c of colors) m = Math.min(m, dist(d, i, c));
    if (m <= thr) return 0;
    if (m >= thr + soft) return 255;
    return Math.round(((m - thr) / soft) * 255);
  };
  if (!connected) {
    for (let px = 0; px < n; px++) out[px] = level(px);
    return out;
  }
  const seen = new Uint8Array(n);
  const stack: number[] = [];
  const push = (px: number) => {
    if (seen[px]) return;
    seen[px] = 1;
    const a = level(px);
    if (a < 255) {
      out[px] = a;
      stack.push(px);
    }
  };
  for (let x = 0; x < w; x++) {
    push(x);
    push((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    push(y * w);
    push(y * w + w - 1);
  }
  while (stack.length) {
    const px = stack.pop()!;
    // Pehmeän reunan pikseleistä ei jatketa, jotta täyttö ei vuoda kuvan sisään.
    if (out[px] > 0) continue;
    const x = px % w;
    if (x > 0) push(px - 1);
    if (x < w - 1) push(px + 1);
    if (px >= w) push(px - w);
    if (px < n - w) push(px + w);
  }
  return out;
}
