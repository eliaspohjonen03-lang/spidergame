import { describe, expect, it } from 'vitest';
import { type Pixels, backgroundAlpha, detectBackground } from './background';

/** Tekee kuvan, jossa reunat ovat taustaväriä ja keskellä on kuvio. */
function img(w: number, h: number, fn: (x: number, y: number) => [number, number, number, number]): Pixels {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const c = fn(x, y);
      data[i] = c[0];
      data[i + 1] = c[1];
      data[i + 2] = c[2];
      data[i + 3] = c[3];
    }
  return { data, width: w, height: h };
}

const WHITE: [number, number, number, number] = [255, 255, 255, 255];
const GREY: [number, number, number, number] = [204, 204, 204, 255];
const RED: [number, number, number, number] = [200, 20, 30, 255];

describe('taustan tunnistus', () => {
  it('löytää valkoisen taustan', () => {
    const p = img(20, 20, (x, y) => (x > 5 && x < 14 && y > 5 && y < 14 ? RED : WHITE));
    const r = detectBackground(p);
    expect(r.colors[0]).toEqual([255, 255, 255]);
    expect(r.transparent).toBe(false);
  });

  it('löytää ruudukon molemmat värit', () => {
    const p = img(32, 32, (x, y) => ((Math.floor(x / 4) + Math.floor(y / 4)) % 2 ? GREY : WHITE));
    const cols = detectBackground(p).colors;
    expect(cols).toContainEqual([255, 255, 255]);
    expect(cols).toContainEqual([204, 204, 204]);
  });

  it('tunnistaa valmiiksi läpinäkyvän taustan', () => {
    const p = img(10, 10, () => [0, 0, 0, 0]);
    expect(detectBackground(p).transparent).toBe(true);
  });
});

describe('taustan poisto', () => {
  // Valkoinen tausta, punainen rengas, jonka sisällä valkoista.
  const ring = img(21, 21, (x, y) => {
    const d = Math.hypot(x - 10, y - 10);
    return d > 4 && d < 8 ? RED : WHITE;
  });

  it('poistaa vain reunoihin yhteydessä olevan taustan', () => {
    const a = backgroundAlpha(ring, [[255, 255, 255]], 0.1, true);
    expect(a[0]).toBe(0); // kulma
    expect(a[10 * 21 + 10]).toBe(255); // renkaan sisus säilyy
    expect(a[10 * 21 + 16]).toBe(255); // rengas säilyy
  });

  it('poistaa värin kaikkialta, kun yhtenäisyyttä ei vaadita', () => {
    const a = backgroundAlpha(ring, [[255, 255, 255]], 0.1, false);
    expect(a[0]).toBe(0);
    expect(a[10 * 21 + 10]).toBe(0);
    expect(a[10 * 21 + 16]).toBe(255);
  });

  it('ei poista mitään ilman valittuja värejä', () => {
    expect(backgroundAlpha(ring, [], 0.5, true).every((v) => v === 255)).toBe(true);
  });
});
