import { useMemo } from 'preact/hooks';
import { type GameState, score } from '../game/engine';
import type { ImageSet } from '../store/model';
import { MiniCard, webPaths } from './Art';
import { formatTime } from './clock';

interface Props {
  game: GameState;
  set: ImageSet;
  urls: Record<string, string>;
  onNew: () => void;
  onStats: () => void;
}

/** Voittoanimaatio vaihtelee: verkko kutoutuu tai kastepisarat syttyvät. */
export function WinOverlay({ game, set, urls, onNew, onStats }: Props) {
  const variant = useMemo(() => (Math.random() < 0.5 ? 'web' : 'dew'), []);
  const W = window.innerWidth;
  const H = window.innerHeight;
  const web = useMemo(() => webPaths(W / 2, H / 2, Math.max(W, H) * 0.6, 16, 10, 0.1, 0.08), [W, H]);
  const fast = variant === 'dew';
  const dews = useMemo(() => {
    const out: { x: number; y: number }[] = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.3;
      const r = Math.min(W, H) * (0.28 + (i % 2) * 0.08);
      out.push({ x: W / 2 + Math.cos(a) * r, y: H / 2 + Math.sin(a) * r });
    }
    return out;
  }, [W, H]);
  const msgDelay = variant === 'web' ? 1.7 : 2.5;
  return (
    <div class="win" role="dialog" aria-label="Voitto">
      <svg class="webdraw" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
        {web.spokes.map((d, i) => (
          <path key={'s' + i} pathLength={1} d={d} style={{ animationDelay: `${(i * (fast ? 0.015 : 0.03)).toFixed(3)}s`, animationDuration: fast ? '.6s' : undefined }} />
        ))}
        {web.rings.map((d, i) => (
          <path key={'r' + i} pathLength={1} d={d} style={{ animationDelay: `${((fast ? 0.2 : 0.45) + i * (fast ? 0.04 : 0.08)).toFixed(3)}s`, animationDuration: fast ? '.6s' : undefined }} />
        ))}
        {variant === 'dew' && dews.map((p, i) => <circle key={'d' + i} cx={p.x} cy={p.y} r={0} style={{ animationDelay: `${0.9 + i * 0.18}s` }} />)}
      </svg>
      <div class="winmsg" style={{ '--msgdelay': msgDelay + 's' }}>
        <h2>Voitit!</h2>
        <div class="kings">
          {game.done.map((run, i) => (
            <MiniCard key={i} rank={13} suit={run.suit} w={26} set={set} urls={urls} />
          ))}
        </div>
        <div class="stats">
          Pisteet {score(game)} · aika {formatTime(game.elapsedMs)} · {game.moves} siirtoa
        </div>
        <div class="row" style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button class="btn primary" type="button" onClick={onNew}>
            Uusi peli
          </button>
          <button class="btn" type="button" onClick={onStats}>
            Tilastot
          </button>
        </div>
      </div>
    </div>
  );
}
