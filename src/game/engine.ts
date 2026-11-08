// Spider-pasianssin pelilogiikka. Puhdasta TypeScriptiä ilman käyttöliittymäriippuvuuksia.

export type SuitCount = 1 | 2 | 3 | 4;

export interface Card {
  id: number;
  rank: number; // 1–13
  suit: number; // 0–3
  up: boolean;
}

export interface Board {
  cols: Card[][];
  stock: Card[];
  /** Valmiit jonot: kunkin jonon sarja ja korttien id:t (13 → 1). */
  done: { suit: number; ids: number[] }[];
}

export interface GameState extends Board {
  seed: number;
  suits: SuitCount;
  /** Kaikki toiminnot: siirrot, jaot ja kumoamiset. Ei koskaan pienene. */
  moves: number;
  undos: number;
  elapsedMs: number;
  status: 'playing' | 'won';
  history: Board[];
}

export interface Move {
  from: number;
  index: number;
  to: number;
}

export const START_SCORE = 500;
export const RUN_BONUS = 100;
export const COLS = 10;

export function score(s: Pick<GameState, 'moves' | 'done'>): number {
  return START_SCORE - s.moves + RUN_BONUS * s.done.length;
}

/** Mulberry32 – pieni, deterministinen satunnaislukugeneraattori. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}

/** Sarjojen jako 8 jonolle: 1 → 8, 2 → 4+4, 3 → 3+3+2, 4 → 2+2+2+2. */
export function runsPerSuit(suits: SuitCount): number[] {
  const out = Array.from({ length: suits }, () => Math.floor(8 / suits));
  let rest = 8 - out.reduce((a, b) => a + b, 0);
  for (let i = 0; rest > 0; i++, rest--) out[i]++;
  return out;
}

export function newGame(suits: SuitCount, seed: number = randomSeed()): GameState {
  const cards: Card[] = [];
  let id = 0;
  runsPerSuit(suits).forEach((n, suit) => {
    for (let r = 0; r < n; r++) for (let rank = 1; rank <= 13; rank++) cards.push({ id: id++, rank, suit, up: false });
  });
  const rand = rng(seed);
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  const cols: Card[][] = Array.from({ length: COLS }, () => []);
  let k = 0;
  for (let c = 0; c < COLS; c++) {
    const n = c < 4 ? 6 : 5;
    for (let i = 0; i < n; i++) cols[c].push(cards[k++]);
    cols[c][cols[c].length - 1].up = true;
  }
  return {
    cols,
    stock: cards.slice(k),
    done: [],
    seed,
    suits,
    moves: 0,
    undos: 0,
    elapsedMs: 0,
    status: 'playing',
    history: [],
  };
}

function cloneBoard(b: Board): Board {
  return {
    cols: b.cols.map((c) => c.map((x) => ({ ...x }))),
    stock: b.stock.map((x) => ({ ...x })),
    done: b.done.map((d) => ({ suit: d.suit, ids: [...d.ids] })),
  };
}

/** Voiko sarakkeen kortit indeksistä alkaen siirtää yhtenä pinona? */
export function isMovable(col: Card[], index: number): boolean {
  if (index < 0 || index >= col.length || !col[index].up) return false;
  for (let i = index; i < col.length - 1; i++) {
    const a = col[i];
    const b = col[i + 1];
    if (!b.up || b.suit !== a.suit || b.rank !== a.rank - 1) return false;
  }
  return true;
}

export function canDrop(cols: Card[][], card: Card, to: number): boolean {
  const target = cols[to];
  if (target.length === 0) return true;
  const top = target[target.length - 1];
  return top.up && top.rank === card.rank + 1;
}

export function isLegal(s: Board, m: Move): boolean {
  if (m.from === m.to) return false;
  const col = s.cols[m.from];
  if (!isMovable(col, m.index)) return false;
  return canDrop(s.cols, col[m.index], m.to);
}

/** Poistaa valmiin saman sarjan jonon 13 → 1 sarakkeen lopusta. */
function collectRun(b: Board, c: number): boolean {
  const col = b.cols[c];
  if (col.length < 13) return false;
  const start = col.length - 13;
  if (col[start].rank !== 13 || !isMovable(col, start)) return false;
  const run = col.splice(start, 13);
  b.done.push({ suit: run[0].suit, ids: run.map((x) => x.id) });
  return true;
}

function flipTop(b: Board, c: number) {
  const col = b.cols[c];
  if (col.length && !col[col.length - 1].up) col[col.length - 1].up = true;
}

function finish(s: GameState): GameState {
  if (s.done.length === 8) s.status = 'won';
  return s;
}

export function applyMove(s: GameState, m: Move): GameState | null {
  if (s.status !== 'playing' || !isLegal(s, m)) return null;
  const prev = cloneBoard(s);
  const b = cloneBoard(s);
  const moving = b.cols[m.from].splice(m.index);
  b.cols[m.to].push(...moving);
  flipTop(b, m.from);
  if (collectRun(b, m.to)) flipTop(b, m.to);
  return finish({ ...s, ...b, moves: s.moves + 1, history: [...s.history, prev] });
}

export type DealError = 'empty-stock' | 'empty-column';

export function canDeal(s: Board): DealError | null {
  if (s.stock.length === 0) return 'empty-stock';
  if (s.cols.some((c) => c.length === 0)) return 'empty-column';
  return null;
}

export function deal(s: GameState): GameState | null {
  if (s.status !== 'playing' || canDeal(s)) return null;
  const prev = cloneBoard(s);
  const b = cloneBoard(s);
  for (let c = 0; c < COLS; c++) {
    const card = b.stock.pop()!;
    card.up = true;
    b.cols[c].push(card);
  }
  for (let c = 0; c < COLS; c++) if (collectRun(b, c)) flipTop(b, c);
  return finish({ ...s, ...b, moves: s.moves + 1, history: [...s.history, prev] });
}

export function undo(s: GameState): GameState | null {
  if (s.history.length === 0 || s.status !== 'playing') return null;
  const prev = s.history[s.history.length - 1];
  return {
    ...s,
    ...cloneBoard(prev),
    moves: s.moves + 1,
    undos: s.undos + 1,
    history: s.history.slice(0, -1),
  };
}

/** Kaikki lailliset siirrot, pois lukien koko sarakkeen siirto tyhjään sarakkeeseen. */
export function legalMoves(s: Board): Move[] {
  const out: Move[] = [];
  s.cols.forEach((col, from) => {
    for (let index = col.length - 1; index >= 0; index--) {
      if (!isMovable(col, index)) break;
      for (let to = 0; to < COLS; to++) {
        if (to === from) continue;
        if (s.cols[to].length === 0 && index === 0) continue;
        if (canDrop(s.cols, col[index], to)) out.push({ from, index, to });
      }
    }
  });
  return out;
}

export function isStuck(s: GameState): boolean {
  return s.status === 'playing' && s.stock.length === 0 && legalMoves(s).length === 0;
}

export type Hint = { kind: 'move'; move: Move } | { kind: 'deal' } | { kind: 'none' };

/** Järjestää siirrot hyödyllisyyden mukaan. Hyödyttömät siirrot jätetään pois. */
export function hints(s: Board): Hint[] {
  const scored: { move: Move; value: number }[] = [];
  for (const m of legalMoves(s)) {
    const col = s.cols[m.from];
    const card = col[m.index];
    const below = m.index > 0 ? col[m.index - 1] : null;
    const target = s.cols[m.to];
    const top = target.length ? target[target.length - 1] : null;
    const sameSuitTarget = !!top && top.suit === card.suit;
    const sitsOnNatural = !!below && below.up && below.rank === card.rank + 1;
    const sitsOnSameSuit = sitsOnNatural && below!.suit === card.suit;
    let value = 0;
    if (!top) {
      // Tyhjään sarakkeeseen: hyödyllinen vain, jos se paljastaa kortin.
      if (below && !below.up) value = 20;
      else continue;
    } else {
      if (sitsOnSameSuit) continue;
      if (below && !below.up) value += 60;
      if (m.index === 0) value += 50;
      if (sameSuitTarget) value += 40;
      if (sitsOnNatural && !sameSuitTarget) continue;
      value += 10;
      value += col.length - m.index; // pidemmät pinot ensin
    }
    scored.push({ move: m, value });
  }
  scored.sort((a, b) => b.value - a.value);
  const out: Hint[] = scored.map((x) => ({ kind: 'move', move: x.move }));
  if (s.stock.length > 0 && !s.cols.some((c) => c.length === 0)) out.push({ kind: 'deal' });
  if (out.length === 0) out.push({ kind: 'none' });
  return out;
}

/** Paras kohde napautukselle: saman sarjan jatko, muu sallittu kortti, tyhjä sarake. */
export function bestTarget(s: Board, from: number, index: number): number | null {
  const col = s.cols[from];
  if (!isMovable(col, index)) return null;
  const card = col[index];
  let best: number | null = null;
  let bestVal = -1;
  for (let k = 1; k < COLS; k++) {
    const to = (from + k) % COLS;
    if (!canDrop(s.cols, card, to)) continue;
    const target = s.cols[to];
    let val: number;
    if (target.length === 0) {
      if (index === 0) continue;
      val = 1;
    } else {
      const top = target[target.length - 1];
      val = top.suit === card.suit ? 3 : 2;
    }
    if (val > bestVal) {
      bestVal = val;
      best = to;
    }
  }
  return best;
}

/**
 * Peli on hävitty, kun pakka on tyhjä eikä hyödyllisiä siirtoja ole.
 * Tyhjän sarakkeen kanssa vaaditaan, ettei laillisia siirtoja ole lainkaan,
 * koska tyhjän sarakkeen avulla voi järjestellä pinoja tavoilla, joita vihje ei arvioi.
 */
export function isLost(s: GameState): boolean {
  if (s.status !== 'playing' || s.stock.length > 0) return false;
  if (s.cols.some((c) => c.length === 0)) return isStuck(s);
  return hints(s).every((h) => h.kind !== 'move');
}
