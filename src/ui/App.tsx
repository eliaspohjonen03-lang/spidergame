import { useEffect, useState } from 'preact/hooks';
import { type SuitCount, newGame, score } from '../game/engine';
import { getData, init, recordGame, setGame, updateSettings, useData } from '../store/store';
import { ImportError, type ParsedImport, applyImport, parseImportFile, takeSharedFile } from '../store/transfer';
import { Icon, SvgDefs } from './Art';
import { clock } from './clock';
import { Game, type Screen } from './Game';
import { ImageEditor } from './ImageEditor';
import { ImportPage } from './Import';
import { InstallGuide, isStandalone } from './Install';
import { SetEditor, SetsPage } from './Sets';
import { SettingsPage } from './Settings';
import { StatsPage } from './Stats';
import { applyTheme } from './theme';

type Page = { kind: Screen } | { kind: 'import' } | { kind: 'set'; id: string } | { kind: 'editor'; setId: string; imageId: string | null; file?: File };
type Dialog = null | 'menu' | 'new' | 'replay';

/** Kirjaa keskeneräisen pelin häviöksi, jos siinä on tehty siirtoja. */
function abandonCurrent() {
  const g = getData().game;
  if (g && g.status === 'playing' && g.moves > 0) {
    recordGame({
      date: Date.now(),
      suits: g.suits,
      result: 'lost',
      score: score(g),
      timeMs: clock.elapsed(),
      moves: g.moves,
      undos: g.undos,
    });
  }
}

function inProgress() {
  const g = getData().game;
  return !!g && g.status === 'playing' && g.moves > 0;
}

export function App() {
  const data = useData();
  const [pages, setPages] = useState<Page[]>([]);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showInstall, setShowInstall] = useState(() => !isStandalone());
  const [newSuits, setNewSuits] = useState<SuitCount>(1);
  const [nonce, setNonce] = useState(0);
  const [pending, setPending] = useState<ParsedImport | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    void init();
  }, []);

  useEffect(() => {
    applyTheme(data.settings);
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    const on = () => applyTheme(getData().settings);
    mq?.addEventListener('change', on);
    return () => mq?.removeEventListener('change', on);
  }, [data.settings]);

  useEffect(() => {
    if (data.ready && !data.game) setGame(newGame(data.settings.suits), true);
  }, [data.ready, data.game]);

  // Androidin jakovalikosta saapunut kuvasetti.
  useEffect(() => {
    if (!data.ready) return;
    const q = new URLSearchParams(location.search);
    if (!q.has('shared')) return;
    history.replaceState(null, '', location.pathname);
    setShowInstall(false);
    void (async () => {
      const blob = await takeSharedFile().catch(() => null);
      if (blob) await handleImportFile(blob);
      else toast('Jaettua tiedostoa ei saatu avattua. Kokeile Kuvasetit → Tuo setti.');
    })();
  }, [data.ready]);

  // Android: takaisin-painike sulkee ylimmän näkymän.
  useEffect(() => {
    const onPop = () => {
      if (dialog) setDialog(null);
      else setPages((p) => p.slice(0, -1));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [dialog]);

  function push(p: Page) {
    history.pushState({ d: pages.length + 1 }, '');
    setDialog(null);
    setPages((s) => [...s, p]);
  }
  function pop() {
    history.back();
  }
  function toast(msg: string) {
    setToastMsg(msg);
    window.setTimeout(() => setToastMsg((m) => (m === msg ? null : m)), 2600);
  }
  async function handleImportFile(f: Blob) {
    try {
      setPending(await parseImportFile(f));
    } catch (e) {
      toast(e instanceof ImportError ? e.message : 'Tiedoston lukeminen epäonnistui.');
    }
  }
  async function confirmImport() {
    if (!pending) return;
    setImporting(true);
    try {
      const ids = await applyImport(pending);
      toast(ids.length === 1 ? 'Kuvasetti tuotu.' : `${ids.length} kuvasettiä tuotu.`);
      const next: Page = ids.length === 1 ? { kind: 'set', id: ids[0] } : { kind: 'sets' };
      setPages((s) => (s.length && s[s.length - 1].kind === 'import' ? [...s.slice(0, -1), next] : s.length ? [...s, next] : (history.pushState({ d: 1 }, ''), [next])));
    } catch (e) {
      console.error(e);
      toast('Kuvasetin tuonti epäonnistui.');
    } finally {
      setImporting(false);
      setPending(null);
    }
  }
  function openDialog(d: Dialog) {
    if (d === 'new') setNewSuits(getData().settings.suits);
    setDialog(d);
  }

  function startNew(suits: SuitCount) {
    abandonCurrent();
    updateSettings({ suits });
    setGame(newGame(suits), true);
    setNonce((n) => n + 1);
    setDialog(null);
  }
  function replay() {
    const g = getData().game;
    if (!g) return;
    abandonCurrent();
    setGame(newGame(g.suits, g.seed), true);
    setNonce((n) => n + 1);
    setDialog(null);
  }

  if (!data.ready || !data.game) return <SvgDefs />;

  const top = pages[pages.length - 1];

  return (
    <>
      <SvgDefs />
      <Game
        key={nonce + ':' + data.game.seed + ':' + data.game.suits}
        onMenu={() => openDialog('menu')}
        onReplay={replay}
        toast={toast}
        onNav={(s) => push({ kind: s })}
        onNewGame={() => openDialog('new')}
      />

      {top?.kind === 'settings' && <SettingsPage onBack={pop} onInstall={() => push({ kind: 'install' })} onSets={() => push({ kind: 'sets' })} />}
      {top?.kind === 'sets' && <SetsPage onBack={pop} onOpen={(id) => push({ kind: 'set', id })} onImport={() => push({ kind: 'import' })} />}
      {top?.kind === 'set' && (
        <SetEditor
          id={top.id}
          onBack={pop}
          onEditImage={(imageId, file) => push({ kind: 'editor', setId: top.id, imageId, file })}
        />
      )}
      {top?.kind === 'editor' && <ImageEditor setId={top.setId} imageId={top.imageId} file={top.file} onDone={pop} />}
      {top?.kind === 'stats' && <StatsPage onBack={pop} />}
      {top?.kind === 'import' && <ImportPage onBack={pop} onFile={(f) => void handleImportFile(f)} />}
      {top?.kind === 'install' && <InstallGuide onClose={pop} asPage />}
      {showInstall && !top && <InstallGuide onClose={() => setShowInstall(false)} />}

      {dialog && (
        <div class="scrim" onClick={(e) => e.target === e.currentTarget && setDialog(null)}>
          {dialog === 'menu' && (
            <div class="dialog" role="dialog" aria-label="Valikko">
              <h2>Custom Spider</h2>
              <div class="menu">
                <button class="btn" type="button" onClick={() => openDialog('new')}>
                  <Icon name="play" /> Uusi peli
                </button>
                <button class="btn" type="button" onClick={() => (inProgress() ? openDialog('replay') : replay())}>
                  <Icon name="replay" /> Pelaa sama jako uudelleen
                </button>
                <button class="btn" type="button" onClick={() => push({ kind: 'stats' })}>
                  <Icon name="chart" /> Tilastot
                </button>
                <button class="btn" type="button" onClick={() => push({ kind: 'sets' })}>
                  <Icon name="images" /> Kuvasetit
                </button>
                <button class="btn" type="button" onClick={() => push({ kind: 'settings' })}>
                  <Icon name="gear" /> Asetukset
                </button>
              </div>
              <button class="btn ghost" type="button" onClick={() => setDialog(null)}>
                Jatka peliä
              </button>
            </div>
          )}
          {dialog === 'new' && (
            <div class="dialog" role="dialog" aria-label="Uusi peli">
              <h2>Uusi peli</h2>
              <p>Valitse sarjojen eli maiden määrä. Mitä enemmän sarjoja, sitä vaikeampi peli.</p>
              <div class="seg" role="group" aria-label="Sarjoja">
                {([1, 2, 3, 4] as SuitCount[]).map((n) => (
                  <button key={n} type="button" aria-pressed={newSuits === n} onClick={() => setNewSuits(n)}>
                    {n} {n === 1 ? 'sarja/maa' : 'sarjaa/maata'}
                  </button>
                ))}
              </div>
              {inProgress() && <p>Keskeneräinen peli kirjataan tilastoihin häviönä.</p>}
              <div class="row">
                <button class="btn" type="button" onClick={() => setDialog(null)}>
                  Peruuta
                </button>
                <button class="btn primary" type="button" onClick={() => startNew(newSuits)}>
                  Aloita
                </button>
              </div>
            </div>
          )}
          {dialog === 'replay' && (
            <div class="dialog" role="dialog" aria-label="Pelaa sama jako uudelleen">
              <h2>Pelaa sama jako uudelleen?</h2>
              <p>Keskeneräinen peli kirjataan tilastoihin häviönä.</p>
              <div class="row">
                <button class="btn" type="button" onClick={() => setDialog(null)}>
                  Peruuta
                </button>
                <button class="btn primary" type="button" onClick={replay}>
                  Aloita alusta
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {pending && (
        <div class="scrim" onClick={(e) => e.target === e.currentTarget && !importing && setPending(null)}>
          <div class="dialog" role="dialog" aria-label="Tuo kuvasetti">
            {pending.kind === 'set' ? (
              <>
                <h2>Tuodaanko kuvasetti “{pending.sets[0].name}”?</h2>
                <p>
                  Setissä on {pending.sets[0].images.length} {pending.sets[0].images.length === 1 ? 'kuva' : 'kuvaa'}. Siitä tulee oma kopiosi, jota voit muokata vapaasti.
                </p>
              </>
            ) : (
              <>
                <h2>Palautetaanko varmuuskopio?</h2>
                <p>Tiedostossa on {pending.sets.length} kuvasettiä. Ne lisätään settiesi joukkoon, eikä nykyisiä settejä poisteta.</p>
                <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--muted)' }}>
                  {pending.sets.map((s, i) => (
                    <li key={i}>
                      {s.name} ({s.images.length} kuvaa)
                    </li>
                  ))}
                </ul>
              </>
            )}
            <div class="row">
              <button class="btn" type="button" disabled={importing} onClick={() => setPending(null)}>
                Peruuta
              </button>
              <button class="btn primary" type="button" disabled={importing} onClick={() => void confirmImport()}>
                {importing ? 'Tuodaan…' : 'Tuo'}
              </button>
            </div>
          </div>
        </div>
      )}
      {toastMsg && (
        <div class="toast" role="status">
          {toastMsg}
        </div>
      )}
    </>
  );
}
