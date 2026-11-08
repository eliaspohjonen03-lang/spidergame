// Kuvasettien vienti ja tuonti tiedostona. Kuvat kulkevat tiedoston mukana, eivät palvelimen kautta.
import { DEFAULT_SET_ID, type ImageEdit, type ImageSet, type Layout, uid } from './model';
import { getData, getImage, saveImage, upsertSet } from './store';

const SET_TYPE = 'custom-spider-set';
const BACKUP_TYPE = 'custom-spider-backup';
const VERSION = 1;

interface ExportedImage {
  original: string; // data-URL
  mask: string | null;
  edit: ImageEdit;
}

interface ExportedSet {
  name: string;
  layout: Layout;
  cardBorder: boolean;
  picBorder: boolean;
  images: ExportedImage[];
  /** Numeroiden 1–13 kuvat indekseinä images-taulukkoon, null = hämähäkki. */
  map: (number | null)[];
}

export interface ParsedImport {
  kind: 'set' | 'backup';
  sets: ExportedSet[];
}

function blobToDataUrl(b: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(b);
  });
}

async function dataUrlToBlob(url: string): Promise<Blob> {
  const m = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(url);
  if (!m) throw new Error('Virheellinen kuva');
  const mime = m[1] || 'application/octet-stream';
  if (!m[2]) return new Blob([decodeURIComponent(m[3])], { type: mime });
  const bin = atob(m[3]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

async function exportOne(s: ImageSet): Promise<ExportedSet> {
  const images: ExportedImage[] = [];
  const index = new Map<string, number>();
  for (const id of s.images) {
    const rec = await getImage(id);
    if (!rec) continue;
    index.set(id, images.length);
    images.push({
      original: await blobToDataUrl(rec.original),
      mask: rec.mask ? await blobToDataUrl(rec.mask) : null,
      edit: rec.edit,
    });
  }
  return {
    name: s.name,
    layout: s.layout,
    cardBorder: s.cardBorder,
    picBorder: s.picBorder,
    images,
    map: s.map.map((m) => (m && index.has(m) ? index.get(m)! : null)),
  };
}

/** Tiedostonimi ilman ääkkösiä: osa selaimista hylkää muut kuin ASCII-merkit. Setin nimi säilyy tiedoston sisällä. */
function safeName(name: string) {
  const ascii = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 ._()-]+/g, '')
    .trim();
  return ascii || 'kuvasetti';
}

export async function exportSetFile(setId: string): Promise<File> {
  const s = getData().sets.find((x) => x.id === setId);
  if (!s) throw new Error('Kuvasettiä ei löytynyt');
  const body = JSON.stringify({ type: SET_TYPE, version: VERSION, set: await exportOne(s) });
  return new File([body], `Custom Spider - ${safeName(s.name)}.json`, { type: 'application/json' });
}

export async function exportAllFile(): Promise<File> {
  const sets = getData().sets.filter((s) => s.id !== DEFAULT_SET_ID);
  const out: ExportedSet[] = [];
  for (const s of sets) out.push(await exportOne(s));
  const body = JSON.stringify({ type: BACKUP_TYPE, version: VERSION, sets: out });
  const d = new Date();
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return new File([body], `Custom Spider - varmuuskopio ${stamp}.json`, { type: 'application/json' });
}

/**
 * Jakaa tiedoston puhelimen jakovalikolla. Jos jakaminen ei ole mahdollista,
 * tiedosto ladataan laitteelle. Palauttaa, kumpi tehtiin.
 */
export async function shareOrDownload(file: File, title: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title });
      return 'shared';
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return 'cancelled';
      // Muu virhe: kokeillaan latausta.
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10000);
  return 'downloaded';
}

function validSet(x: unknown): x is ExportedSet {
  const s = x as ExportedSet;
  return (
    !!s &&
    typeof s.name === 'string' &&
    Array.isArray(s.images) &&
    Array.isArray(s.map) &&
    s.images.every((i) => i && typeof i.original === 'string' && i.original.startsWith('data:image/') && i.edit && typeof i.edit.scale === 'number')
  );
}

export class ImportError extends Error {}

export async function parseImportFile(file: Blob): Promise<ParsedImport> {
  let json: { type?: string; version?: number; set?: unknown; sets?: unknown[] };
  try {
    json = JSON.parse(await file.text());
  } catch {
    throw new ImportError('Tiedosto ei ole Custom Spider -kuvasetti.');
  }
  if (json.type === SET_TYPE && validSet(json.set)) return { kind: 'set', sets: [json.set] };
  if (json.type === BACKUP_TYPE && Array.isArray(json.sets) && json.sets.every(validSet)) return { kind: 'backup', sets: json.sets as ExportedSet[] };
  if (typeof json.version === 'number' && json.version > VERSION) throw new ImportError('Tiedosto on tehty uudemmalla pelin versiolla. Päivitä peli ja yritä uudelleen.');
  throw new ImportError('Tiedosto ei ole Custom Spider -kuvasetti.');
}

function uniqueName(name: string, taken: Set<string>): string {
  if (!taken.has(name)) return name;
  for (let n = 2; ; n++) {
    const candidate = `${name} (${n})`;
    if (!taken.has(candidate)) return candidate;
  }
}

/** Tallentaa tuodut setit uusina kopioina. Palauttaa uusien settien id:t. */
export async function applyImport(p: ParsedImport): Promise<string[]> {
  const taken = new Set(getData().sets.map((s) => s.name));
  const ids: string[] = [];
  for (const es of p.sets) {
    const imageIds: string[] = [];
    for (const img of es.images.slice(0, 13)) {
      const id = uid();
      await saveImage({
        id,
        original: await dataUrlToBlob(img.original),
        mask: img.mask ? await dataUrlToBlob(img.mask) : null,
        edit: { x: img.edit.x ?? 0, y: img.edit.y ?? 0, scale: img.edit.scale, rot: img.edit.rot ?? 0, feather: img.edit.feather ?? 0.25 },
      });
      imageIds.push(id);
    }
    const name = uniqueName(es.name.slice(0, 40) || 'Tuotu setti', taken);
    taken.add(name);
    const set: ImageSet = {
      id: uid(),
      name,
      layout: es.layout === 'full' ? 'full' : 'area',
      cardBorder: es.cardBorder !== false,
      picBorder: !!es.picBorder,
      images: imageIds,
      map: Array.from({ length: 13 }, (_, i) => {
        const k = es.map[i];
        return typeof k === 'number' && imageIds[k] ? imageIds[k] : null;
      }),
    };
    upsertSet(set);
    ids.push(set.id);
  }
  return ids;
}

export function summary(p: ParsedImport) {
  return p.sets.map((s) => ({ name: s.name, images: s.images.length }));
}

// ---------- Android: jakovalikosta saapunut tiedosto ----------

export const SHARE_CACHE = 'custom-spider-share';
export const SHARE_KEY = 'shared-file';

/** Hakee palvelutyöntekijän tallentaman jaetun tiedoston ja poistaa sen välimuistista. */
export async function takeSharedFile(): Promise<Blob | null> {
  if (!('caches' in window)) return null;
  const cache = await caches.open(SHARE_CACHE);
  const res = await cache.match(SHARE_KEY);
  if (!res) return null;
  await cache.delete(SHARE_KEY);
  return res.blob();
}
