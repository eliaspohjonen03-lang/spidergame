import { type GameState, score } from '../game/engine';
import { Icon, SpiderPic } from './Art';
import { formatTime } from './clock';

interface Props {
  game: GameState;
  onUndo: () => void;
  onReplay: () => void;
  onNew: () => void;
  onContinue: () => void;
}

/** Häviöanimaatio: hämähäkki laskeutuu langan varassa ja pöytä himmenee. */
export function LoseOverlay({ game, onUndo, onReplay, onNew, onContinue }: Props) {
  return (
    <div class="lose" role="dialog" aria-label="Siirrot loppuivat">
      <div class="lose-thread" aria-hidden="true">
        <div class="lose-spider">
          <SpiderPic />
        </div>
      </div>
      <div class="winmsg losemsg">
        <h2>Siirrot loppuivat</h2>
        <p class="stats">Pakka on tyhjä, eikä pöydällä ole enää hyödyllisiä siirtoja.</p>
        <div class="stats">
          {game.done.length}/8 jonoa · pisteet {score(game)} · aika {formatTime(game.elapsedMs)}
        </div>
        <div class="menu">
          <button class="btn" type="button" onClick={onUndo} disabled={!game.history.length}>
            <Icon name="undo" /> Kumoa
          </button>
          <button class="btn" type="button" onClick={onReplay}>
            <Icon name="replay" /> Pelaa sama jako uudelleen
          </button>
          <button class="btn primary" type="button" onClick={onNew}>
            <Icon name="play" /> Uusi peli
          </button>
          <button class="btn ghost" type="button" onClick={onContinue}>
            Jatka silti
          </button>
        </div>
      </div>
    </div>
  );
}
