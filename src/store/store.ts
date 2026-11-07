// Sovelluksen yhteinen tila ja sen tallennus IndexedDB:hen.
import { useEffect, useState } from 'preact/hooks';
import type { GameState } from '../game/engine';
import { renderCardImage } from '../images/imaging';
import { db, requestPersistence } from './db';
import {
  DEFAULT_SET_ID,
  type GameRecord,
  type ImageRecord,
  type ImageSet,
  type Layout,
  type Settings,
  defaultSettings,
  defaultSpiderSet,
} from './model';

export interface AppData {
  ready: boolean;
  settings: Settings;
  sets: ImageSet[];
  game: GameState | null;
  stats: GameRecord[];
  /** Kuvien valmiit korttikuvat: avain `${id}|${layout}`. */
  urls: Record<string, string>;
}

let data: AppData = {
  ready: false,
  settings: defaultSettings,
  sets: [defaultSpiderSet()],
  game: null,
  stats: [],
  urls: {},
};

const listeners = new Set<() => void>();

function set(patch: Partial<AppData>) {
  data = { ...data, ...patch };
  listeners.forEach((l) => l());
}

export function getData() {
  return data;
}

export function useData(): AppData {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return data;
}

export async function init() {
  requestPersistence();
  try {
    const [settings, sets, game, stats] = await Promise.all([
      db.get<Settings>('settings'),
      db.get<ImageSet[]>('sets'),
      db.get<GameState>('game'),
      db.get<GameRecord[]>('stats'),
    ]);
    let s = sets && sets.length ? sets : [defaultSpiderSet()];
    if (!s.some((x) => x.id === DEFAULT_SET_ID)) s = [defaultSpiderSet(), ...s];
    const st = { ...defaultSettings, ...(settings ?? {}) };
    if (!s.some((x) => x.id === st.activeSet)) st.activeSet = DEFAULT_SET_ID;
    set({ settings: st, sets: s, game: game ?? null, stats: stats ?? [], ready: true });
  } catch (e) {
    console.error('Tallennustilan lukeminen epäonnistui', e);
    set({ ready: true });
  }
  void ensureSetImages(activeSet());
}

// ---------- Asetukset ----------

export function updateSettings(patch: Partial<Settings>) {
  const settings = { ...data.settings, ...patch };
  set({ settings });
  void db.set('settings', settings);
  if (patch.activeSet) void ensureSetImages(activeSet());
}

// ---------- Peli ----------

let saveTimer: number | undefined;
export function setGame(game: GameState | null, immediate = false) {
  set({ game });
  window.clearTimeout(saveTimer);
  const save = () => (game ? db.set('game', game) : db.del('game'));
  if (immediate) void save();
  else saveTimer = window.setTimeout(save, 250);
}

export function recordGame(rec: GameRecord) {
  const stats = [...data.stats, rec];
  set({ stats });
  void db.set('stats', stats);
}

export function resetStats(suits?: number) {
  const stats = suits ? data.stats.filter((r) => r.suits !== suits) : [];
  set({ stats });
  void db.set('stats', stats);
}

// ---------- Kuvasetit ----------

export function activeSet(): ImageSet {
  return data.sets.find((s) => s.id === data.settings.activeSet) ?? data.sets[0];
}

export function saveSets(sets: ImageSet[]) {
  set({ sets });
  void db.set('sets', sets);
}

export function upsertSet(s: ImageSet) {
  const exists = data.sets.some((x) => x.id === s.id);
  saveSets(exists ? data.sets.map((x) => (x.id === s.id ? s : x)) : [...data.sets, s]);
  void ensureSetImages(s);
}

export async function deleteSet(id: string) {
  if (id === DEFAULT_SET_ID) return;
  const victim = data.sets.find((s) => s.id === id);
  const rest = data.sets.filter((s) => s.id !== id);
  saveSets(rest);
  if (data.settings.activeSet === id) updateSettings({ activeSet: DEFAULT_SET_ID });
  // Poista kuvat, joita mikään muu setti ei käytä.
  if (victim) {
    const used = new Set(rest.flatMap((s) => s.images));
    for (const img of victim.images) if (!used.has(img)) await db.del('img:' + img);
  }
}

// ---------- Kuvat ----------

export function getImage(id: string) {
  return db.get<ImageRecord>('img:' + id);
}

const rendering = new Map<string, Promise<string | null>>();

export function urlKey(id: string, layout: Layout) {
  return `${id}|${layout}`;
}

export async function imageUrl(id: string, layout: Layout): Promise<string | null> {
  const key = urlKey(id, layout);
  if (data.urls[key]) return data.urls[key];
  if (!rendering.has(key)) {
    rendering.set(
      key,
      (async () => {
        const rec = await getImage(id);
        if (!rec) return null;
        const url = await renderCardImage(rec, layout);
        set({ urls: { ...data.urls, [key]: url } });
        return url;
      })().finally(() => rendering.delete(key)),
    );
  }
  return rendering.get(key)!;
}

export async function ensureSetImages(s: ImageSet) {
  await Promise.all(s.images.map((id) => imageUrl(id, s.layout).catch(() => null)));
}

export async function saveImage(rec: ImageRecord) {
  await db.set('img:' + rec.id, rec);
  // Mitätöi vanhat korttikuvat.
  const urls = { ...data.urls };
  for (const k of Object.keys(urls)) {
    if (k.startsWith(rec.id + '|')) {
      URL.revokeObjectURL(urls[k]);
      delete urls[k];
    }
  }
  set({ urls });
  for (const s of data.sets) if (s.images.includes(rec.id)) void imageUrl(rec.id, s.layout);
}

export async function deleteImage(id: string) {
  const sets = data.sets.map((s) =>
    s.images.includes(id)
      ? { ...s, images: s.images.filter((x) => x !== id), map: s.map.map((m) => (m === id ? null : m)) }
      : s,
  );
  saveSets(sets);
  await db.del('img:' + id);
}
