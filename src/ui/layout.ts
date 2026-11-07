// Pelipöydän asettelu: korttien koot ja paikat näytön koon mukaan.
import type { GameState } from '../game/engine';

export interface Pos {
  x: number;
  y: number;
  s: number; // skaalaus
  flat?: boolean; // ei varjoa (pinon alemmat kortit)
  z: number;
}

export interface Layout {
  portrait: boolean;
  w: number; // kortin leveys
  h: number;
  gap: number;
  colsX: number;
  colsY: number;
  colsH: number;
  stock: { x: number; y: number; w: number };
  found: { x: number; y: number; w: number; cols: number; gap: number };
  web: { cx: number; cy: number; R: number };
}

export const DOWN_OFF = 0.2;
export const UP_OFF = 0.58;
const ASPECT = 1.42;

export function computeLayout(W: number, H: number, hudH: number, safeB: number, leftHanded: boolean): Layout {
  const portrait = W < H;
  const pad = portrait ? 6 : 10;
  if (portrait) {
    const gap = Math.max(3, Math.round(W * 0.008));
    let w = (W - pad * 2 - 9 * gap) / 10;
    const fw = Math.min(30, (W * 0.55 - 7 * 4) / 8);
    const sw = Math.max(w * 1.1, 38);
    const trayH = Math.max(sw, fw) * ASPECT + 22 + safeB;
    const colsY = hudH + 6;
    const colsH = H - colsY - trayH - 6;
    w = Math.min(w, colsH / 4.2);
    const colsW = w * 10 + gap * 9;
    const colsX = (W - colsW) / 2;
    const trayY = H - trayH;
    const foundW = fw * 8 + 4 * 7;
    return {
      portrait,
      w,
      h: w * ASPECT,
      gap,
      colsX,
      colsY,
      colsH,
      stock: { x: leftHanded ? pad + 4 : W - pad - sw - 16, y: trayY + (sw * ASPECT < fw * ASPECT ? 0 : 0), w: sw },
      found: { x: leftHanded ? W - pad - foundW - 4 : pad + 4, y: trayY + (sw - fw) * ASPECT, w: fw, cols: 8, gap: 4 },
      web: { cx: W * 0.92, cy: H * 0.06, R: Math.max(W, H) * 0.75 },
    };
  }
  const sideW = Math.min(150, Math.max(96, W * 0.12));
  const gap = Math.max(4, Math.round(W * 0.007));
  const colsY = hudH + 4;
  const colsH = H - colsY - pad - safeB;
  let w = (W - sideW - pad * 3 - 9 * gap) / 10;
  w = Math.min(w, colsH / 4.2);
  const colsW = w * 10 + gap * 9;
  const sideX = leftHanded ? pad : W - pad - sideW;
  const colsX = leftHanded ? sideX + sideW + pad + (W - sideW - pad * 3 - colsW) / 2 : pad + (W - sideW - pad * 3 - colsW) / 2;
  const sw = Math.min(w, sideW * 0.62);
  const stockY = H - pad - safeB - sw * ASPECT - 20;
  const fw = Math.min(w * 0.55, (sideW - 6) / 2, (stockY - colsY - 12 - 18) / (4 * ASPECT));
  return {
    portrait,
    w,
    h: w * ASPECT,
    gap,
    colsX,
    colsY,
    colsH,
    stock: { x: sideX + (sideW - sw) / 2 - 8, y: stockY, w: sw },
    found: { x: sideX + (sideW - fw * 2 - 6) / 2, y: colsY, w: fw, cols: 2, gap: 6 },
    web: { cx: W * 0.94, cy: H * 0.08, R: Math.max(W, H) * 0.75 },
  };
}

/** Sarakkeen korttien pystysiirtymät, tiivistettynä niin että sarake mahtuu näytölle. */
export function columnOffsets(L: Layout, downs: number, total: number): number[] {
  const offs: number[] = [];
  for (let i = 0; i < total - 1; i++) offs.push((i < downs ? DOWN_OFF : UP_OFF) * L.w);
  const sum = offs.reduce((a, b) => a + b, 0);
  const k = sum > 0 ? Math.min(1, (L.colsH - L.h) / sum) : 1;
  return offs.map((o) => o * k);
}

export function cardPositions(g: GameState, L: Layout): Map<number, Pos> {
  const pos = new Map<number, Pos>();
  g.cols.forEach((col, c) => {
    const downs = col.filter((x) => !x.up).length;
    const offs = columnOffsets(L, downs, col.length);
    let y = L.colsY;
    col.forEach((card, i) => {
      pos.set(card.id, { x: L.colsX + c * (L.w + L.gap), y, s: 1, z: 100 + i });
      if (i < offs.length) y += offs[i];
    });
  });
  const sk = L.stock.w / L.w;
  g.stock.forEach((card, i) => {
    const grp = Math.floor(i / 10);
    pos.set(card.id, { x: L.stock.x + grp * 5, y: L.stock.y, s: sk, z: 10 + i, flat: i % 10 !== 9 && i !== g.stock.length - 1 });
  });
  const fk = L.found.w / L.w;
  g.done.forEach((run, r) => {
    const cx = r % L.found.cols;
    const cy = Math.floor(r / L.found.cols);
    const x = L.found.x + cx * (L.found.w + L.found.gap);
    const y = L.found.y + cy * (L.found.w * ASPECT + L.found.gap);
    run.ids.forEach((id, i) => pos.set(id, { x, y, s: fk, z: 32 - i, flat: i !== 0 }));
  });
  return pos;
}

export function columnAtX(L: Layout, x: number): number {
  const c = Math.round((x - L.colsX - L.w / 2) / (L.w + L.gap));
  return Math.max(0, Math.min(9, c));
}
