// Peliaika: käy vain, kun peli on näkyvissä ja kesken.
let base = 0;
let since: number | null = null;

export const clock = {
  reset(ms: number) {
    base = ms;
    since = null;
  },
  start() {
    if (since === null && document.visibilityState === 'visible') since = performance.now();
  },
  stop() {
    if (since !== null) {
      base += performance.now() - since;
      since = null;
    }
  },
  elapsed(): number {
    return base + (since === null ? 0 : performance.now() - since);
  },
};

export function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}
