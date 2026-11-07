import { describe, expect, it } from 'vitest';
import {
  type Card,
  type GameState,
  applyMove,
  bestTarget,
  canDeal,
  deal,
  hints,
  isMovable,
  isStuck,
  newGame,
  runsPerSuit,
  score,
  undo,
} from './engine';

let nextId = 1000;
const c = (rank: number, suit = 0, up = true): Card => ({ id: nextId++, rank, suit, up });

function state(cols: Card[][], stock: Card[] = [], extra: Partial<GameState> = {}): GameState {
  while (cols.length < 10) cols.push([c(13, 0, false), c(1, 0)]);
  return { cols, stock, done: [], seed: 1, suits: 4, moves: 0, undos: 0, elapsedMs: 0, status: 'playing', history: [], ...extra };
}

describe('uusi peli', () => {
  it('jakaa 54 korttia pöytään ja 50 pakkaan', () => {
    const g = newGame(4, 42);
    expect(g.cols.map((x) => x.length)).toEqual([6, 6, 6, 6, 5, 5, 5, 5, 5, 5]);
    expect(g.stock.length).toBe(50);
    g.cols.forEach((col) => {
      expect(col[col.length - 1].up).toBe(true);
      col.slice(0, -1).forEach((x) => expect(x.up).toBe(false));
    });
  });

  it('on deterministinen siemenluvulla', () => {
    expect(newGame(2, 7).stock.map((x) => x.id)).toEqual(newGame(2, 7).stock.map((x) => x.id));
    expect(newGame(2, 7).stock.map((x) => x.id)).not.toEqual(newGame(2, 8).stock.map((x) => x.id));
  });

  it('jakaa 8 jonoa sarjoille', () => {
    expect(runsPerSuit(1)).toEqual([8]);
    expect(runsPerSuit(2)).toEqual([4, 4]);
    expect(runsPerSuit(3)).toEqual([3, 3, 2]);
    expect(runsPerSuit(4)).toEqual([2, 2, 2, 2]);
    for (const n of [1, 2, 3, 4] as const) {
      const g = newGame(n, 3);
      const all = [...g.cols.flat(), ...g.stock];
      expect(all.length).toBe(104);
      for (let s = 0; s < n; s++) expect(all.filter((x) => x.suit === s).length).toBe(runsPerSuit(n)[s] * 13);
    }
  });
});

describe('siirrot', () => {
  it('sallii siirron yhtä suuremman päälle sarjasta riippumatta', () => {
    const g = state([[c(8, 1)], [c(7, 0)]]);
    const n = applyMove(g, { from: 1, index: 0, to: 0 })!;
    expect(n.cols[0].map((x) => x.rank)).toEqual([8, 7]);
    expect(n.moves).toBe(1);
    expect(score(n)).toBe(499);
  });

  it('kieltää siirron väärän numeron päälle', () => {
    const g = state([[c(9)], [c(7)]]);
    expect(applyMove(g, { from: 1, index: 0, to: 0 })).toBeNull();
  });

  it('pinon voi siirtää vain, jos se on samaa sarjaa', () => {
    expect(isMovable([c(9, 0), c(8, 0), c(7, 0)], 0)).toBe(true);
    expect(isMovable([c(9, 0), c(8, 1), c(7, 1)], 0)).toBe(false);
    expect(isMovable([c(9, 0), c(8, 1), c(7, 1)], 1)).toBe(true);
    expect(isMovable([c(9, 0, false), c(8, 0)], 0)).toBe(false);
  });

  it('kääntää paljastuneen kortin', () => {
    const g = state([[c(5, 0, false), c(4)], [c(5)]]);
    const n = applyMove(g, { from: 0, index: 1, to: 1 })!;
    expect(n.cols[0][0].up).toBe(true);
  });

  it('tyhjään sarakkeeseen voi siirtää minkä tahansa kortin', () => {
    const g = state([[], [c(3, 0, false), c(9)]]);
    expect(applyMove(g, { from: 1, index: 1, to: 0 })).not.toBeNull();
  });

  it('kerää valmiin jonon ja antaa 100 pistettä', () => {
    const run = [13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2].map((r) => c(r, 2));
    const g = state([[c(4, 1, false), ...run], [c(1, 2)]]);
    const n = applyMove(g, { from: 1, index: 0, to: 0 })!;
    expect(n.done.length).toBe(1);
    expect(n.done[0].suit).toBe(2);
    expect(n.cols[0].length).toBe(1);
    expect(n.cols[0][0].up).toBe(true);
    expect(score(n)).toBe(500 - 1 + 100);
  });

  it('ei kerää sekasarjaista jonoa', () => {
    const run = [13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2].map((r) => c(r, 0));
    const g = state([run, [c(1, 1)]]);
    expect(applyMove(g, { from: 1, index: 0, to: 0 })!.done.length).toBe(0);
  });

  it('voittaa, kun 8 jonoa on kerätty', () => {
    const done = Array.from({ length: 7 }, () => ({ suit: 0, ids: [] as number[] }));
    const run = [13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2].map((r) => c(r, 0));
    const g = state([run, [c(1, 0)]], [], { done });
    expect(applyMove(g, { from: 1, index: 0, to: 0 })!.status).toBe('won');
  });
});

describe('jako', () => {
  it('jakaa yhden kortin jokaiseen sarakkeeseen', () => {
    const g = newGame(1, 5);
    const n = deal(g)!;
    expect(n.stock.length).toBe(40);
    expect(n.cols.map((x) => x.length)).toEqual([7, 7, 7, 7, 6, 6, 6, 6, 6, 6]);
    n.cols.forEach((col) => expect(col[col.length - 1].up).toBe(true));
    expect(n.moves).toBe(1);
  });

  it('estää jaon, jos jokin sarake on tyhjä', () => {
    const g = state([[]], Array.from({ length: 10 }, () => c(5, 0, false)));
    expect(canDeal(g)).toBe('empty-column');
    expect(deal(g)).toBeNull();
  });

  it('ei jaa tyhjästä pakasta', () => {
    expect(canDeal(state([]))).toBe('empty-stock');
  });
});

describe('kumoaminen', () => {
  it('palauttaa tilanteen ja maksaa siirron', () => {
    const g = state([[c(8, 1)], [c(7, 0)]]);
    const n = applyMove(g, { from: 1, index: 0, to: 0 })!;
    const u = undo(n)!;
    expect(u.cols[0].map((x) => x.rank)).toEqual([8]);
    expect(u.cols[1].map((x) => x.rank)).toEqual([7]);
    expect(u.moves).toBe(2);
    expect(u.undos).toBe(1);
    expect(score(u)).toBe(498);
  });

  it('kumoaa jonon valmistumisen yhdessä siirron kanssa', () => {
    const run = [13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2].map((r) => c(r, 2));
    const g = state([run, [c(1, 2)]]);
    const u = undo(applyMove(g, { from: 1, index: 0, to: 0 })!)!;
    expect(u.done.length).toBe(0);
    expect(u.cols[0].length).toBe(12);
    expect(score(u)).toBe(498);
  });

  it('kumoaa jaon', () => {
    const g = newGame(2, 9);
    const u = undo(deal(g)!)!;
    expect(u.stock.length).toBe(50);
    expect(u.cols.map((x) => x.length)).toEqual([6, 6, 6, 6, 5, 5, 5, 5, 5, 5]);
  });

  it('ei kumoa ilman historiaa', () => {
    expect(undo(newGame(1, 1))).toBeNull();
  });
});

describe('vihjeet ja napautus', () => {
  it('suosii saman sarjan kohdetta napautuksessa', () => {
    const g = state([[c(8, 1)], [c(8, 0)], [c(7, 0)]]);
    expect(bestTarget(g, 2, 0)).toBe(1);
  });

  it('palauttaa null, jos sallittua kohdetta ei ole', () => {
    const g = state([[c(10)], [c(10)], [c(4)]]);
    expect(bestTarget(g, 2, 0)).toBeNull();
  });

  it('vihje suosii kortin paljastavaa siirtoa', () => {
    const g = state([[c(9, 0)], [c(9, 1)], [c(2, 0, false), c(8, 2)], [c(8, 3)]]);
    const h = hints(g)[0];
    expect(h.kind).toBe('move');
    if (h.kind === 'move') expect(h.move.from).toBe(2);
  });

  it('ehdottaa jakoa, kun siirtoja ei ole', () => {
    const cols = Array.from({ length: 10 }, (_, i) => [c(((i * 3) % 13) + 1 === 13 ? 1 : 13 - i, i % 4)]);
    const g = state(cols.map(() => [c(5)]), Array.from({ length: 10 }, () => c(5, 0, false)));
    expect(hints(g).at(-1)!.kind).toBe('deal');
  });

  it('tunnistaa jumiutuneen pelin', () => {
    const cols = Array.from({ length: 10 }, () => [c(5)]);
    expect(isStuck(state(cols))).toBe(true);
  });
});
