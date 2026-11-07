// Kuvien lataus, maskin pehmennys ja korttikuvan piirtäminen.
import type { ImageEdit, ImageRecord, Layout } from '../store/model';

export const ORIGINAL_MAX = 1600;
export const MASK_MAX = 1024;

/** Kuva-alueen kuvasuhde (leveys / korkeus) kortin asettelun mukaan. */
export function frameAspect(layout: Layout): number {
  // Kortti on 1 × 1,42. Kuva-alue: leveys 0,84, korkeus 1,42 − 0,6 − 0,08 = 0,74.
  return layout === 'full' ? 1 / 1.42 : 0.84 / 0.74;
}

export function canvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

export function toBlob(c: HTMLCanvasElement, type = 'image/png', q?: number): Promise<Blob> {
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('toBlob epäonnistui'))), type, q));
}

export async function blobToImage(b: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(b);
    } catch {
      /* varaväylä alla */
    }
  }
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = URL.createObjectURL(b);
  });
}

/** Lukee gallerian kuvan ja pienentää sen. Palauttaa JPEG-blobin. */
export async function loadOriginal(file: File): Promise<Blob> {
  const src = await blobToImage(file);
  const w = src.width;
  const h = src.height;
  const k = Math.min(1, ORIGINAL_MAX / Math.max(w, h));
  const c = canvas(w * k, h * k);
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, c.width, c.height);
  return toBlob(c, 'image/jpeg', 0.9);
}

export function coverEdit(imgW: number, imgH: number, layout: Layout): ImageEdit {
  const a = imgW / imgH;
  const F = frameAspect(layout);
  return { x: 0, y: 0, scale: a > F ? a / F : 1, rot: 0, feather: 0.25 };
}

let filterSupport: boolean | null = null;
function supportsFilter(): boolean {
  if (filterSupport === null) {
    const ctx = canvas(1, 1).getContext('2d') as CanvasRenderingContext2D & { filter?: string };
    if (!ctx || typeof ctx.filter !== 'string') filterSupport = false;
    else {
      ctx.filter = 'blur(2px)';
      filterSupport = ctx.filter === 'blur(2px)';
    }
  }
  return filterSupport;
}

/** Pehmentää maskin reunat. Säde pikseleinä. */
export function featherMask(mask: HTMLCanvasElement, radius: number): HTMLCanvasElement {
  if (radius < 0.5) return mask;
  const out = canvas(mask.width, mask.height);
  const ctx = out.getContext('2d')!;
  if (supportsFilter()) {
    ctx.filter = `blur(${radius}px)`;
    ctx.drawImage(mask, 0, 0);
    ctx.filter = 'none';
    return out;
  }
  // Varaväylä: pienennys ja suurennus tuottaa pehmeän reunan.
  const k = Math.max(1, radius);
  const small = canvas(mask.width / k, mask.height / k);
  const sctx = small.getContext('2d')!;
  sctx.imageSmoothingQuality = 'high';
  sctx.drawImage(mask, 0, 0, small.width, small.height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(small, 0, 0, out.width, out.height);
  return out;
}

export function featherRadius(feather: number, maskW: number, maskH: number): number {
  return feather * 0.025 * Math.max(maskW, maskH);
}

/** Yhdistää kuvan ja (pehmennetyn) maskin läpinäkyväksi kuvaksi. */
export function composite(
  img: CanvasImageSource & { width: number; height: number },
  mask: HTMLCanvasElement | null,
  feather: number,
): HTMLCanvasElement {
  const c = canvas(img.width, img.height);
  const ctx = c.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  if (mask) {
    const m = featherMask(mask, featherRadius(feather, mask.width, mask.height));
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(m, 0, 0, c.width, c.height);
    ctx.globalCompositeOperation = 'source-over';
  }
  return c;
}

/** Piirtää kuvan kehykseen muokkausasetusten mukaan. */
export function drawInFrame(
  ctx: CanvasRenderingContext2D,
  src: CanvasImageSource & { width: number; height: number },
  edit: ImageEdit,
  fx: number,
  fy: number,
  fw: number,
) {
  const w = edit.scale * fw;
  const h = (w * src.height) / src.width;
  ctx.save();
  ctx.translate(fx + edit.x * fw, fy + edit.y * fw);
  ctx.rotate(edit.rot);
  ctx.drawImage(src, -w / 2, -h / 2, w, h);
  ctx.restore();
}

export async function maskCanvasFromBlob(b: Blob | null, w: number, h: number): Promise<HTMLCanvasElement> {
  const c = canvas(w, h);
  const ctx = c.getContext('2d')!;
  if (b) {
    const m = await blobToImage(b);
    ctx.drawImage(m, 0, 0, c.width, c.height);
  } else {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
  }
  return c;
}

export function maskSize(imgW: number, imgH: number) {
  const k = Math.min(1, MASK_MAX / Math.max(imgW, imgH));
  return { w: Math.round(imgW * k), h: Math.round(imgH * k) };
}

/** Tuottaa valmiin korttikuvan (PNG, läpinäkyvä tausta) ja palauttaa sen object-URL:na. */
export async function renderCardImage(rec: ImageRecord, layout: Layout, width = 420): Promise<string> {
  const img = await blobToImage(rec.original);
  const ms = maskSize(img.width, img.height);
  const mask = rec.mask ? await maskCanvasFromBlob(rec.mask, ms.w, ms.h) : null;
  const comp = composite(img, mask, rec.edit.feather);
  const F = frameAspect(layout);
  const out = canvas(width, width / F);
  const ctx = out.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  drawInFrame(ctx, comp, rec.edit, out.width / 2, out.height / 2, out.width);
  const blob = await toBlob(out);
  return URL.createObjectURL(blob);
}
