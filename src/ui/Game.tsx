import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
  type Card,
  type GameState,
  type Hint,
  applyMove,
  bestTarget,
  canDeal,
  deal,
  hints,
  isMovable,
  isStuck,
  score,
  undo,
} from '../game/engine';
import { activeSet, recordGame, setGame, useData } from '../store/store';
import { Back, Face, Icon, picUrl, setClasses, webPaths } from './Art';
import { sfx } from './audio';
import { clock, formatTime } from './clock';
import { type Layout, type Pos, cardPositions, columnAtX, computeLayout } from './layout';
import { WinOverlay } from './Win';

export type Screen = 'settings' | 'sets' | 'stats' | 'install';

interface Props {
  onMenu: () => void;
  onStuck: () => void;
  toast: (msg: string) => void;
  onNav: (s: Screen) => void;
  onNewGame: () => void;
}

interface Drag {
  pointerId: number;
  from: number;
  index: number;
  ids: number[];
  sx: number;
  sy: number;
  active: boolean;
}

function useViewport() {
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', on);
    window.addEventListener('orientationchange', on);
    window.visualViewport?.addEventListener('resize', on);
    return () => {
      window.removeEventListener('resize', on);
      window.removeEventListener('orientationchange', on);
      window.visualViewport?.removeEventListener('resize', on);
    };
  }, []);
  return vp;
}

function readSafeBottom(): number {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;bottom:0;height:env(safe-area-inset-bottom,0px);visibility:hidden';
  document.body.appendChild(el);
  const h = el.getBoundingClientRect().height;
  el.remove();
  return h;
}

export function Game(p: Props) {
  const data = useData();
  const g = data.game!;
  const set = activeSet();
  const vp = useViewport();
  const hudRef = useRef<HTMLDivElement>(null);
  const [hudH, setHudH] = useState(56);
  const [safeB, setSafeB] = useState(0);
  const [hint, setHint] = useState<{ ids: number[]; stock: boolean } | null>(null);
  const [lifted, setLifted] = useState<{ ids: Set<number>; deal: number[] }>({ ids: new Set(), deal: [] });
  const [shake, setShake] = useState<number | null>(null);
  const [showWin, setShowWin] = useState(g.status === 'won');
  const hintIdx = useRef(0);
  const hintList = useRef<Hint[]>([]);
  const drag = useRef<Drag | null>(null);
  const els = useRef(new Map<number, HTMLDivElement>());
  const flips = useRef(new Map<number, number>());
  const prevUp = useRef(new Map<number, boolean>());
  const gameRef = useRef(g);
  gameRef.current = g;

  useLayoutEffect(() => {
    if (hudRef.current) setHudH(hudRef.current.getBoundingClientRect().height);
    setSafeB(readSafeBottom());
  }, [vp.w, vp.h]);

  const L: Layout = useMemo(
    () => computeLayout(vp.w, vp.h, hudH, safeB, data.settings.leftHanded),
    [vp.w, vp.h, hudH, safeB, data.settings.leftHanded],
  );
  const pos = useMemo(() => cardPositions(g, L), [g, L]);

  // Kaikki kortit id:n mukaan (myös valmiit jonot).
  const cards = useMemo(() => {
    const m = new Map<number, Card>();
    g.cols.flat().forEach((c) => m.set(c.id, c));
    g.stock.forEach((c) => m.set(c.id, c));
    g.done.forEach((run) => run.ids.forEach((id, i) => m.set(id, { id, rank: 13 - i, suit: run.suit, up: true })));
    return [...m.values()].sort((a, b) => a.id - b.id);
  }, [g]);

  // Kääntöanimaatio korteille, jotka juuri kääntyivät.
  const now = performance.now();
  for (const c of cards) {
    const was = prevUp.current.get(c.id);
    if (was === false && c.up && !g.stock.includes(c)) flips.current.set(c.id, now);
    prevUp.current.set(c.id, c.up);
  }

  // Ajastin
  useEffect(() => {
    clock.reset(g.elapsedMs);
    if (g.status === 'playing') clock.start();
    const vis = () => {
      if (document.visibilityState === 'hidden') {
        clock.stop();
        const cur = gameRef.current;
        if (cur.status === 'playing') setGame({ ...cur, elapsedMs: clock.elapsed() }, true);
      } else if (gameRef.current.status === 'playing') clock.start();
    };
    document.addEventListener('visibilitychange', vis);
    window.addEventListener('pagehide', vis);
    return () => {
      clock.stop();
      document.removeEventListener('visibilitychange', vis);
      window.removeEventListener('pagehide', vis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.seed, g.suits]);

  function commit(next: GameState, kind: 'move' | 'deal' | 'undo', moved: number[] = []) {
    const prev = gameRef.current;
    const ranBefore = prev.done.length;
    next = { ...next, elapsedMs: clock.elapsed() };
    setHint(null);
    hintList.current = [];
    const runIds = next.done.length > ranBefore ? next.done[next.done.length - 1].ids : [];
    setLifted({ ids: new Set([...moved, ...runIds]), deal: kind === 'deal' ? moved : [] });
    window.setTimeout(() => setLifted({ ids: new Set(), deal: [] }), 900);
    if (next.status === 'won') {
      clock.stop();
      next = { ...next, elapsedMs: clock.elapsed() };
      setGame(next, true);
      recordGame({
        date: Date.now(),
        suits: next.suits,
        result: 'won',
        score: score(next),
        timeMs: next.elapsedMs,
        moves: next.moves,
        undos: next.undos,
      });
      sfx.run();
      window.setTimeout(() => sfx.win(), 500);
      window.setTimeout(() => setShowWin(true), 700);
      return;
    }
    setGame(next);
    if (kind === 'deal') sfx.deal();
    else sfx.move();
    if (next.done.length > ranBefore) window.setTimeout(() => sfx.run(), 180);
    if (isStuck(next)) window.setTimeout(() => p.onStuck(), 600);
  }

  function tryMove(from: number, index: number, to: number): boolean {
    const cur = gameRef.current;
    const ids = cur.cols[from].slice(index).map((c) => c.id);
    const next = applyMove(cur, { from, index, to });
    if (!next) return false;
    commit(next, 'move', ids);
    return true;
  }

  function doDeal() {
    const cur = gameRef.current;
    const err = canDeal(cur);
    if (err === 'empty-column') {
      p.toast('Täytä tyhjät sarakkeet ennen jakoa.');
      sfx.nope();
      return;
    }
    if (err) return;
    const ids = cur.stock.slice(-10).reverse().map((c) => c.id);
    commit(deal(cur)!, 'deal', ids);
  }

  function doUndo() {
    const next = undo(gameRef.current);
    if (next) commit(next, 'undo');
  }

  function doHint() {
    const cur = gameRef.current;
    if (!hintList.current.length) {
      hintList.current = hints(cur);
      hintIdx.current = 0;
    }
    const h = hintList.current[hintIdx.current % hintList.current.length];
    hintIdx.current++;
    if (h.kind === 'none') {
      p.toast('Hyödyllisiä siirtoja ei löytynyt.');
      return;
    }
    if (h.kind === 'deal') {
      setHint({ ids: [], stock: true });
    } else {
      const { from, index, to } = h.move;
      const ids = cur.cols[from].slice(index).map((c) => c.id);
      const t = cur.cols[to];
      if (t.length) ids.push(t[t.length - 1].id);
      setHint({ ids, stock: false });
    }
    window.setTimeout(() => setHint(null), 2200);
  }

  // ---------- Kosketus ----------
  function locate(id: number): { col: number; index: number } | null {
    const cols = gameRef.current.cols;
    for (let c = 0; c < cols.length; c++) {
      const i = cols[c].findIndex((x) => x.id === id);
      if (i >= 0) return { col: c, index: i };
    }
    return null;
  }

  function onPointerDown(e: PointerEvent, id: number) {
    if (drag.current || gameRef.current.status !== 'playing') return;
    if (gameRef.current.stock.some((c) => c.id === id)) {
      e.preventDefault();
      doDeal();
      return;
    }
    const loc = locate(id);
    if (!loc) return;
    const col = gameRef.current.cols[loc.col];
    if (!col[loc.index].up) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = {
      pointerId: e.pointerId,
      from: loc.col,
      index: loc.index,
      ids: col.slice(loc.index).map((c) => c.id),
      sx: e.clientX,
      sy: e.clientY,
      active: false,
    };
  }

  function onPointerMove(e: PointerEvent) {
    const d = drag.current;
    if (!d || e.pointerId !== d.pointerId) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.active) {
      if (Math.hypot(dx, dy) < 7) return;
      if (!isMovable(gameRef.current.cols[d.from], d.index)) {
        drag.current = null;
        return;
      }
      d.active = true;
      d.ids.forEach((id, i) => {
        const el = els.current.get(id);
        if (el) {
          el.classList.add('drag');
          el.style.zIndex = String(3000 + i);
        }
      });
    }
    d.ids.forEach((id) => {
      const el = els.current.get(id);
      const ps = pos.get(id);
      if (el && ps) el.style.transform = `translate3d(${ps.x + dx}px, ${ps.y + dy}px, 0) scale(1.04)`;
    });
  }

  function endDrag(e: PointerEvent, cancelled = false) {
    const d = drag.current;
    if (!d || e.pointerId !== d.pointerId) return;
    drag.current = null;
    const reset = () =>
      d.ids.forEach((id) => {
        const el = els.current.get(id);
        const ps = pos.get(id);
        if (el && ps) {
          el.classList.remove('drag');
          el.style.transform = `translate3d(${ps.x}px, ${ps.y}px, 0) scale(${ps.s})`;
          el.style.zIndex = String(ps.z);
        }
      });
    if (cancelled) return reset();
    if (!d.active) {
      // Napautus: siirto parhaaseen paikkaan.
      const to = bestTarget(gameRef.current, d.from, d.index);
      if (to === null || !tryMove(d.from, d.index, to)) {
        setShake(d.ids[0]);
        sfx.nope();
        window.setTimeout(() => setShake(null), 320);
      }
      return;
    }
    const first = pos.get(d.ids[0])!;
    const to = columnAtX(L, first.x + (e.clientX - d.sx) + L.w / 2);
    d.ids.forEach((id) => els.current.get(id)?.classList.remove('drag'));
    if (to === d.from || !tryMove(d.from, d.index, to)) reset();
  }

  // ---------- Piirto ----------
  const web = useMemo(() => {
    const w = webPaths(L.web.cx, L.web.cy, L.web.R, 14, 9, 1.9, 0.1);
    return w.spokes.join('') + w.rings.join('');
  }, [L]);

  const dews = data.settings.style !== 'muste';
  const t = performance.now();
  const hintIds = new Set(hint?.ids ?? []);
  const stockGroups = Math.ceil(g.stock.length / 10);

  return (
    <div
      class={'game ' + setClasses(set)}
      style={{ '--w': L.w + 'px' }}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => endDrag(e)}
      onPointerCancel={(e) => endDrag(e, true)}
    >
      <svg class="webbg" viewBox={`0 0 ${vp.w} ${vp.h}`} preserveAspectRatio="none" aria-hidden="true">
        <path d={web} fill="none" stroke="currentColor" stroke-width="1" />
        {dews &&
          [
            [0.62, 0.21],
            [0.78, 0.33],
            [0.49, 0.12],
            [0.86, 0.46],
            [0.71, 0.14],
          ].map(([a, b], i) => <circle key={i} class="dew" cx={vp.w * a} cy={vp.h * b} r={2.2 + (i % 2)} />)}
      </svg>

      <div class="hud" ref={hudRef}>
        <div class="stat">
          <b>{score(g)}</b>
          <span>Pisteet</span>
        </div>
        <Timer status={g.status} />
        <div class="stat">
          <b>{g.moves}</b>
          <span>Siirrot</span>
        </div>
        <div class="sp" />
        <div class="tools">
          <button class="iconbtn" type="button" aria-label="Kumoa" onClick={doUndo} disabled={!g.history.length || g.status !== 'playing'}>
            <Icon name="undo" />
          </button>
          <button class="iconbtn" type="button" aria-label="Vihje" onClick={doHint} disabled={g.status !== 'playing'}>
            <Icon name="hint" />
          </button>
          <button class="iconbtn" type="button" aria-label="Valikko" onClick={p.onMenu}>
            <Icon name="menu" />
          </button>
        </div>
      </div>

      {/* Tyhjien sarakkeiden ja paikkojen merkit */}
      {g.cols.map((col, c) =>
        col.length === 0 ? (
          <div key={'e' + c} class="slot" style={{ width: L.w + 'px', height: L.h + 'px', transform: `translate(${L.colsX + c * (L.w + L.gap)}px, ${L.colsY}px)` }} />
        ) : null,
      )}
      {Array.from({ length: 8 }, (_, i) => {
        const x = L.found.x + (i % L.found.cols) * (L.found.w + L.found.gap);
        const y = L.found.y + Math.floor(i / L.found.cols) * (L.found.w * 1.42 + L.found.gap);
        return <div key={'f' + i} class="slot" style={{ '--w': L.found.w + 'px', width: L.found.w + 'px', height: L.found.w * 1.42 + 'px', transform: `translate(${x}px, ${y}px)` }} />;
      })}
      {g.stock.length === 0 && (
        <div class="slot" style={{ '--w': L.stock.w + 'px', width: L.stock.w + 'px', height: L.stock.w * 1.42 + 'px', transform: `translate(${L.stock.x}px, ${L.stock.y}px)` }} />
      )}
      <div
        class="stocklbl"
        style={{ transform: `translate(${L.stock.x}px, ${L.stock.y + L.stock.w * 1.42 + 4}px)`, color: hint?.stock ? 'var(--s2)' : undefined, fontWeight: hint?.stock ? 800 : undefined }}
      >
        {stockGroups ? `${stockGroups} ${stockGroups === 1 ? 'jako' : 'jakoa'}` : 'Pakka tyhjä'}
      </div>

      {cards.map((c) => {
        const ps: Pos = pos.get(c.id)!;
        const isLifted = lifted.ids.has(c.id);
        const dealIdx = lifted.deal.indexOf(c.id);
        const flipAt = flips.current.get(c.id);
        const flipping = flipAt !== undefined && t - flipAt < 400;
        if (flipAt !== undefined && !flipping) flips.current.delete(c.id);
        const cls = ['card', ps.flat && !isLifted ? 'flat' : '', flipping ? 'flip' : '', shake === c.id ? 'shake' : '', hintIds.has(c.id) || (hint?.stock && g.stock.includes(c)) ? 'hint' : '']
          .filter(Boolean)
          .join(' ');
        return (
          <div
            key={c.id}
            ref={(el) => {
              if (el) els.current.set(c.id, el);
              else els.current.delete(c.id);
            }}
            class={cls}
            style={{
              '--c': `var(--s${c.suit})`,
              transform: `translate3d(${ps.x}px, ${ps.y}px, 0) scale(${ps.s})`,
              zIndex: ps.z + (isLifted ? 1000 : 0),
              transitionDelay: dealIdx >= 0 ? `${dealIdx * 45}ms` : undefined,
            }}
            onPointerDown={(e) => onPointerDown(e, c.id)}
          >
            {c.up ? <Face rank={c.rank} url={picUrl(set, c.rank, data.urls)} /> : <Back />}
          </div>
        );
      })}

      {showWin && g.status === 'won' && (
        <WinOverlay
          game={g}
          set={set}
          urls={data.urls}
          onNew={() => {
            setShowWin(false);
            p.onNewGame();
          }}
          onStats={() => p.onNav('stats')}
        />
      )}
    </div>
  );
}

function Timer({ status }: { status: GameState['status'] }) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (status !== 'playing') return;
    const i = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => window.clearInterval(i);
  }, [status]);
  return (
    <div class="stat">
      <b>{formatTime(clock.elapsed())}</b>
      <span>Aika</span>
    </div>
  );
}
