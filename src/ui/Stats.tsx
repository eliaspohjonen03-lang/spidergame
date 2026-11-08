import { useState } from 'preact/hooks';
import type { SuitCount } from '../game/engine';
import type { GameRecord } from '../store/model';
import { resetStats, useData } from '../store/store';
import { formatTime } from './clock';
import { Page, Seg } from './Settings';

function streaks(games: GameRecord[]) {
  let best = 0;
  let cur = 0;
  for (const g of games) {
    if (g.result === 'won') {
      cur++;
      best = Math.max(best, cur);
    } else cur = 0;
  }
  return { best, cur };
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);

function rolling(xs: number[], n = 5) {
  return xs.map((_, i) => avg(xs.slice(Math.max(0, i - n + 1), i + 1)));
}

function niceTicks(min: number, max: number, count = 4) {
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const raw = (max - min) / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 1000) / 1000);
  return { lo, hi, ticks };
}

function Chart(props: { title: string; values: number[]; dates: number[]; fmt: (v: number) => string; color: string; empty: string }) {
  const [sel, setSel] = useState<number | null>(null);
  const { values } = props;
  const W = 600;
  const H = 210;
  const L = 52;
  const R = 12;
  const T = 12;
  const B = 26;
  if (values.length < 2) {
    return (
      <div class="chart">
        <h3>{props.title}</h3>
        <p class="hint-text" style={{ padding: '18px 0' }}>
          {props.empty}
        </p>
      </div>
    );
  }
  const ra = rolling(values);
  const { lo, hi, ticks } = niceTicks(Math.min(...values), Math.max(...values));
  const x = (i: number) => L + (i / (values.length - 1)) * (W - L - R);
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const line = (vs: number[]) => vs.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join('');
  const area = line(values) + `L${x(values.length - 1)} ${H - B}L${x(0)} ${H - B}Z`;
  const xTicks = values.length <= 6 ? values.map((_, i) => i) : [0, Math.round((values.length - 1) / 2), values.length - 1];
  function pick(e: PointerEvent) {
    const svg = e.currentTarget as SVGSVGElement;
    const r = svg.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - L) / (W - L - R)) * (values.length - 1));
    setSel(Math.max(0, Math.min(values.length - 1, i)));
  }
  const gid = 'g' + props.title.replace(/\W/g, '');
  return (
    <div class="chart">
      <h3>
        {props.title}
        <span class="legend">
          <span>
            <i style={{ background: props.color }} />
            Peli
          </span>
          <span>
            <i style={{ background: 'var(--fg)' }} />
            Keskiarvo (5 peliä)
          </span>
        </span>
      </h3>
      <svg viewBox={`0 0 ${W} ${H}`} onPointerDown={pick} onPointerMove={(e) => e.buttons && pick(e)} role="img" aria-label={props.title}>
        <defs>
          <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stop-color={props.color} stop-opacity=".28" />
            <stop offset="1" stop-color={props.color} stop-opacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line class="grid" x1={L} x2={W - R} y1={y(t)} y2={y(t)} />
            <text class="axis" x={L - 8} y={y(t) + 4} text-anchor="end">
              {props.fmt(t)}
            </text>
          </g>
        ))}
        {xTicks.map((i) => (
          <text key={i} class="axis" x={x(i)} y={H - 6} text-anchor={i === 0 ? 'start' : i === values.length - 1 ? 'end' : 'middle'}>
            {i + 1}.
          </text>
        ))}
        <path d={area} fill={`url(#${gid})`} />
        <path d={line(values)} fill="none" stroke={props.color} stroke-width="2" stroke-linejoin="round" />
        <path d={line(ra)} fill="none" stroke="var(--fg)" stroke-width="2" stroke-dasharray="5 4" opacity=".7" />
        <circle cx={x(values.length - 1)} cy={y(values[values.length - 1])} r="4.5" fill={props.color} />
        {sel !== null && (
          <g>
            <line x1={x(sel)} x2={x(sel)} y1={T} y2={H - B} stroke="var(--muted)" stroke-dasharray="3 3" />
            <circle cx={x(sel)} cy={y(values[sel])} r="5" fill={props.color} stroke="var(--panel)" stroke-width="2" />
          </g>
        )}
      </svg>
      <div class="tip">
        {sel !== null
          ? `${sel + 1}. peli (${new Date(props.dates[sel]).toLocaleDateString('fi-FI')}): ${props.fmt(values[sel])} · keskiarvo ${props.fmt(ra[sel])}`
          : 'Napauta kaaviota nähdäksesi yksittäisen pelin.'}
      </div>
    </div>
  );
}

export function StatsPage({ onBack }: { onBack: () => void }) {
  const { stats, settings } = useData();
  const [suits, setSuits] = useState<SuitCount>(settings.suits);
  const [confirm, setConfirm] = useState<null | 'level' | 'all'>(null);
  const games = stats.filter((g) => g.suits === suits);
  const wins = games.filter((g) => g.result === 'won');
  const { best, cur } = streaks(games);
  const pct = games.length ? Math.round((wins.length / games.length) * 100) : 0;
  const n = (v: number, f: (x: number) => string = (x) => String(Math.round(x))) => (Number.isFinite(v) ? f(v) : '–');
  const minutes = (ms: number) => formatTime(ms);

  return (
    <Page title="Tilastot" onBack={onBack}>
      <Seg<SuitCount>
        label="Vaikeustaso"
        value={suits}
        options={[
          [1, '1 sarja/maa'],
          [2, '2 sarjaa/maata'],
          [3, '3 sarjaa/maata'],
          [4, '4 sarjaa/maata'],
        ]}
        onChange={setSuits}
      />
      <section class="section">
        <h2>Yhteenveto</h2>
        <div class="tiles">
          <div class="tile">
            <b>{games.length}</b>
            <span>Pelattu</span>
          </div>
          <div class="tile">
            <b>{wins.length}</b>
            <span>Voitettu</span>
          </div>
          <div class="tile">
            <b>{pct} %</b>
            <span>Voittoprosentti</span>
          </div>
          <div class="tile">
            <b>{best}</b>
            <span>Pisin voittoputki</span>
          </div>
          <div class="tile">
            <b>{cur}</b>
            <span>Nykyinen putki</span>
          </div>
        </div>
      </section>
      <section class="section">
        <h2>Paras ja keskiarvo</h2>
        <div class="tiles">
          <div class="tile">
            <b>{n(games.length ? Math.max(...games.map((g) => g.score)) : NaN)}</b>
            <span>Paras pistemäärä</span>
            <small>Keskiarvo {n(avg(games.map((g) => g.score)))}</small>
          </div>
          <div class="tile">
            <b>{n(wins.length ? Math.min(...wins.map((g) => g.timeMs)) : NaN, minutes)}</b>
            <span>Nopein voitto</span>
            <small>Keskiarvo {n(avg(wins.map((g) => g.timeMs)), minutes)}</small>
          </div>
          <div class="tile">
            <b>{n(wins.length ? Math.min(...wins.map((g) => g.moves)) : NaN)}</b>
            <span>Vähiten siirtoja</span>
            <small>Keskiarvo {n(avg(wins.map((g) => g.moves)))}</small>
          </div>
        </div>
      </section>
      <section class="section">
        <h2>Kehitys</h2>
        <Chart title="Pisteet" values={games.map((g) => g.score)} dates={games.map((g) => g.date)} fmt={(v) => String(Math.round(v))} color="var(--s0)" empty="Kaavio näkyy, kun olet pelannut vähintään kaksi peliä." />
        <Chart title="Aika (voitetut)" values={wins.map((g) => g.timeMs)} dates={wins.map((g) => g.date)} fmt={minutes} color="var(--s1)" empty="Kaavio näkyy, kun olet voittanut vähintään kaksi peliä." />
        <Chart title="Siirrot (voitetut)" values={wins.map((g) => g.moves)} dates={wins.map((g) => g.date)} fmt={(v) => String(Math.round(v))} color="var(--s2)" empty="Kaavio näkyy, kun olet voittanut vähintään kaksi peliä." />
      </section>
      <section class="section">
        <h2>Nollaus</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button class="btn" type="button" disabled={!games.length} onClick={() => setConfirm('level')}>
            Nollaa tämän tason tilastot
          </button>
          <button class="btn danger" type="button" disabled={!stats.length} onClick={() => setConfirm('all')}>
            Nollaa kaikki tilastot
          </button>
        </div>
      </section>
      {confirm && (
        <div class="scrim" onClick={(e) => e.target === e.currentTarget && setConfirm(null)}>
          <div class="dialog" role="dialog">
            <h2>{confirm === 'all' ? 'Nollataanko kaikki tilastot?' : `Nollataanko ${suits} ${suits === 1 ? 'sarjan' : 'sarjan'} tilastot?`}</h2>
            <p>Tätä ei voi perua.</p>
            <div class="row">
              <button class="btn" type="button" onClick={() => setConfirm(null)}>
                Peruuta
              </button>
              <button
                class="btn primary"
                type="button"
                style={{ background: '#e5484d', borderColor: '#e5484d', color: '#fff' }}
                onClick={() => {
                  resetStats(confirm === 'all' ? undefined : suits);
                  setConfirm(null);
                }}
              >
                Nollaa
              </button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}
