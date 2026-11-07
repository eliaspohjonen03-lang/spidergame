// Tallennettavat tietorakenteet ja niiden oletusarvot.
import type { SuitCount } from '../game/engine';

export type StyleId = 'hehku' | 'kaste' | 'muste';
export type ThemeMode = 'system' | 'light' | 'dark';
export type ColorMode = 'num' | 'kehys' | 'tausta';
export type Layout = 'area' | 'full';

export interface Settings {
  suits: SuitCount;
  style: StyleId;
  theme: ThemeMode;
  colorMode: ColorMode;
  /** Käyttäjän omat sarjojen värit teemoittain. Puuttuva = tyylin oletus. */
  customColors: { light?: string[]; dark?: string[] };
  sound: boolean;
  volume: number; // 0–1
  fastAnim: boolean;
  leftHanded: boolean;
  activeSet: string;
}

export const DEFAULT_SET_ID = 'spiders';

export const defaultSettings: Settings = {
  suits: 1,
  style: 'hehku',
  theme: 'system',
  colorMode: 'num',
  customColors: {},
  sound: false,
  volume: 0.6,
  fastAnim: false,
  leftHanded: false,
  activeSet: DEFAULT_SET_ID,
};

export interface ImageSet {
  id: string;
  name: string;
  layout: Layout;
  cardBorder: boolean;
  picBorder: boolean;
  /** Kirjaston kuvien id:t, enintään 13. */
  images: string[];
  /** Numeroiden 1–13 kuvat (indeksi 0 = numero 1). null = hämähäkki. */
  map: (string | null)[];
}

export function defaultSpiderSet(): ImageSet {
  return {
    id: DEFAULT_SET_ID,
    name: 'Hämähäkit',
    layout: 'area',
    cardBorder: true,
    picBorder: false,
    images: [],
    map: Array(13).fill(null),
  };
}

export interface ImageEdit {
  /** Kuvan keskipisteen siirtymä kehyksen keskeltä, kehyksen leveyksinä. */
  x: number;
  y: number;
  /** Kuvan leveys kehyksen leveyksinä. */
  scale: number;
  /** Kierto radiaaneina. */
  rot: number;
  /** Reunan pehmennys 0–1. */
  feather: number;
}

export interface ImageRecord {
  id: string;
  original: Blob;
  /** Alfa-maski (PNG). Valkoinen = näkyy, läpinäkyvä = pyyhitty. */
  mask: Blob | null;
  edit: ImageEdit;
}

export interface GameRecord {
  date: number;
  suits: SuitCount;
  result: 'won' | 'lost';
  score: number;
  timeMs: number;
  moves: number;
  undos: number;
}

export const MAX_LIBRARY = 13;

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
