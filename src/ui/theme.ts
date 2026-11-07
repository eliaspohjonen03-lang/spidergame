import type { Settings, StyleId } from '../store/model';

export type Mode = 'light' | 'dark';

export const STYLES: { id: StyleId; name: string; desc: string }[] = [
  { id: 'hehku', name: 'Yöhehku', desc: 'Syvä yötaivas, ja kortit hehkuvat sarjan värissä.' },
  { id: 'kaste', name: 'Aamukaste', desc: 'Sammaleenvihreä metsänpohja ja pehmeät laatat.' },
  { id: 'muste', name: 'Muste', desc: 'Kivenharmaa paperi ja tussin tunnelma.' },
];

export const STYLE_COLORS: Record<StyleId, Record<Mode, string[]>> = {
  hehku: {
    light: ['#0e9b77', '#2d6bd4', '#cf7b19', '#a548c6'],
    dark: ['#6af0c6', '#7cb7ff', '#ffb86a', '#e78cff'],
  },
  kaste: {
    light: ['#2e7a58', '#2a6c9b', '#bd5d37', '#7556a3'],
    dark: ['#62c697', '#5ea9de', '#ee8b60', '#b296e2'],
  },
  muste: {
    light: ['#2e4ea3', '#1d8676', '#bf6c25', '#a13a69'],
    dark: ['#7f97f0', '#4fc6b2', '#efa25f', '#e17ba9'],
  },
};

export const THEME_BG: Record<StyleId, Record<Mode, string>> = {
  hehku: { light: '#e6e8f3', dark: '#070a17' },
  kaste: { light: '#e4ece7', dark: '#0d1916' },
  muste: { light: '#e7e9ec', dark: '#15171b' },
};

export function systemMode(): Mode {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function resolveMode(s: Settings): Mode {
  return s.theme === 'system' ? systemMode() : s.theme;
}

export function suitColors(s: Settings, mode: Mode): string[] {
  const def = STYLE_COLORS[s.style][mode];
  const custom = s.customColors[mode];
  return def.map((c, i) => custom?.[i] ?? c);
}

export function applyTheme(s: Settings) {
  const mode = resolveMode(s);
  const root = document.documentElement;
  root.dataset.style = s.style;
  root.dataset.mode = mode;
  root.dataset.cmode = s.colorMode;
  root.dataset.anim = s.fastAnim ? 'fast' : 'normal';
  root.style.colorScheme = mode;
  suitColors(s, mode).forEach((c, i) => root.style.setProperty(`--s${i}`, c));
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute('content', THEME_BG[s.style][mode]);
}
