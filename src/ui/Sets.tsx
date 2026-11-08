import { useEffect, useRef, useState } from 'preact/hooks';
import { DEFAULT_SET_ID, type ImageSet, MAX_LIBRARY, uid } from '../store/model';
import { quickRecord } from '../images/imaging';
import { downloadFile, exportAllFile, exportSetFile, shareFile } from '../store/transfer';
import { deleteImage, deleteSet, getData, imageUrl, saveImage, updateSettings, upsertSet, urlKey, useData } from '../store/store';
import { Icon, MiniCard } from './Art';
import { Page, Seg, Switch } from './Settings';

export function SetsPage({ onBack, onOpen, onImport }: { onBack: () => void; onOpen: (id: string) => void; onImport: () => void }) {
  const { sets, settings, urls } = useData();
  const ownSets = sets.filter((s) => s.id !== DEFAULT_SET_ID);
  function create() {
    const s: ImageSet = {
      id: uid(),
      name: 'Oma setti ' + sets.length,
      layout: 'area',
      cardBorder: true,
      picBorder: false,
      images: [],
      map: Array(13).fill(null),
    };
    upsertSet(s);
    onOpen(s.id);
  }
  return (
    <Page title="Kuvasetit" onBack={onBack}>
      <p class="hint-text">Kuvasetissä valitaan, mikä kuva näkyy millä numerolla. Käytössä oleva setti näkyy pelissä heti.</p>
      <div class="list">
        {sets.map((s) => (
          <div key={s.id} class="item">
            <button type="button" class="item" style={{ padding: 0, minHeight: 0 }} onClick={() => onOpen(s.id)}>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[13, 7, 1].map((r, i) => (
                  <MiniCard key={r} rank={r} suit={i} w={30} set={s} urls={urls} />
                ))}
              </div>
              <div class="grow">
                <div style={{ fontWeight: 700 }}>{s.name}</div>
                <div class="sub">{s.id === DEFAULT_SET_ID ? 'Oletuskuvat' : `${s.images.length} ${s.images.length === 1 ? 'kuva' : 'kuvaa'}`}</div>
              </div>
            </button>
            {settings.activeSet === s.id ? (
              <span class="sub" style={{ color: 'var(--accent)', fontWeight: 700 }}>
                Käytössä
              </span>
            ) : (
              <button class="btn small" type="button" onClick={() => updateSettings({ activeSet: s.id })}>
                Käytä
              </button>
            )}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button class="btn primary" type="button" onClick={create}>
          <Icon name="plus" /> Uusi kuvasetti
        </button>
        <button class="btn" type="button" onClick={onImport}>
          <Icon name="install" /> Tuo setti
        </button>
      </div>
      <section class="section">
        <h2>Varmuuskopio</h2>
        <p class="hint-text">Tallentaa kaikki omat kuvasetit yhteen tiedostoon esimerkiksi puhelimen vaihtoa varten. Tiedoston voi palauttaa kohdasta Tuo setti.</p>
        <ShareFlow label="Vie kaikki setit" title="Custom Spider -varmuuskopio" make={exportAllFile} disabled={!ownSets.length} />
      </section>
    </Page>
  );
}

function Thumb({ id, set, onClick, selected }: { id: string; set: ImageSet; onClick: () => void; selected?: boolean }) {
  const { urls } = useData();
  const url = urls[urlKey(id, set.layout)];
  useEffect(() => {
    if (!url) void imageUrl(id, set.layout);
  }, [id, set.layout, url]);
  return (
    <button type="button" class={'thumb' + (selected ? ' sel' : '')} onClick={onClick} aria-label="Kuva">
      {url && <img src={url} alt="" />}
    </button>
  );
}

type Sheet = null | { kind: 'slot'; n: number } | { kind: 'image'; id: string } | { kind: 'delete' };

export function SetEditor({ id, onBack, onEditImage }: { id: string; onBack: () => void; onEditImage: (imageId: string | null, file?: File) => void }) {
  const { sets, settings, urls } = useData();
  const set = sets.find((s) => s.id === id);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [name, setName] = useState(set?.name ?? '');
  const [over, setOver] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const dragFrom = useRef<{ n: number; x: number; y: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  useEffect(() => {
    if (!set) onBack();
  }, [set]);
  if (!set) return null;
  const isDefault = set.id === DEFAULT_SET_ID;
  const save = (patch: Partial<ImageSet>) => upsertSet({ ...set, ...patch });

  function slotDown(e: PointerEvent, n: number) {
    dragFrom.current = { n, x: e.clientX, y: e.clientY, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }
  function slotMove(e: PointerEvent) {
    const d = dragFrom.current;
    if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 8) d.moved = true;
    if (d.moved) {
      const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-slot]') as HTMLElement | null;
      setOver(el ? Number(el.dataset.slot) : null);
    }
  }
  function slotUp(e: PointerEvent) {
    const d = dragFrom.current;
    dragFrom.current = null;
    setOver(null);
    if (!d) return;
    // Napautus käsitellään click-tapahtumassa. Jos ikkuna avattaisiin jo tässä,
    // kosketusta seuraava klikkaus osuisi ikkunan taustaan ja sulkisi sen heti.
    if (!d.moved) return;
    suppressClick.current = true;
    window.setTimeout(() => (suppressClick.current = false), 400);
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-slot]') as HTMLElement | null;
    if (!el) return;
    const to = Number(el.dataset.slot);
    if (to === d.n) return;
    const map = [...set!.map];
    [map[d.n], map[to]] = [map[to], map[d.n]];
    save({ map });
  }

  async function onFile(e: Event) {
    const input = e.target as HTMLInputElement;
    const files = [...(input.files ?? [])];
    input.value = '';
    if (!files.length) return;
    if (files.length === 1) return onEditImage(null, files[0]);
    // Useita kuvia: lisätään suoraan, ja kutakin voi muokata myöhemmin.
    const room = MAX_LIBRARY - set!.images.length;
    const take = files.slice(0, room);
    setBusy(`Lisätään kuvia 0/${take.length}…`);
    const images = [...set!.images];
    const map = [...set!.map];
    let done = 0;
    for (const f of take) {
      try {
        const rec = await quickRecord(f, set!.layout, uid());
        await saveImage(rec);
        images.push(rec.id);
        const free = map.findIndex((m) => m === null);
        if (free >= 0) map[free] = rec.id;
      } catch (err) {
        console.error(err);
      }
      setBusy(`Lisätään kuvia ${++done}/${take.length}…`);
    }
    upsertSet({ ...getData().sets.find((x) => x.id === set!.id)!, images, map });
    setBusy(files.length > room ? `Lisättiin ${take.length} kuvaa. Settiin mahtuu enintään ${MAX_LIBRARY} kuvaa.` : null);
    if (files.length > room) window.setTimeout(() => setBusy(null), 3500);
  }

  function duplicate() {
    const copy: ImageSet = { ...set!, id: uid(), name: set!.name + ' (kopio)', images: [...set!.images], map: [...set!.map] };
    upsertSet(copy);
    onBack();
  }

  return (
    <Page
      title={set.name}
      titleEl={
        isDefault ? undefined : (
          <label class="titleedit">
            <input
              id="setname"
              type="text"
              value={name}
              maxLength={40}
              aria-label="Kuvasetin nimi"
              onInput={(e) => setName((e.target as HTMLInputElement).value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              onBlur={() => {
                const v = name.trim();
                if (v && v !== set.name) save({ name: v });
                else setName(set.name);
              }}
            />
            <Icon name="edit" />
          </label>
        )
      }
      onBack={onBack}
      actions={
        settings.activeSet === set.id ? null : (
          <button class="btn small primary" type="button" onClick={() => updateSettings({ activeSet: set.id })}>
            Käytä
          </button>
        )
      }
    >
      <section class="section">
        <h2>Esikatselu</h2>
        <div class="cardrow">
          {[0, 1, 2, 3].map((i) => (
            <MiniCard key={i} rank={[13, 10, 5, 1][i]} suit={i} w={72} set={set} urls={urls} />
          ))}
        </div>
      </section>

      {!isDefault && (
        <section class="section">
          <h2>Kuvat ({set.images.length}/{MAX_LIBRARY})</h2>
          <div class="library">
            {set.images.map((imgId) => (
              <Thumb key={imgId} id={imgId} set={set} onClick={() => setSheet({ kind: 'image', id: imgId })} />
            ))}
            {set.images.length < MAX_LIBRARY && (
              <label class="thumb addthumb file">
                <span>
                  <Icon name="plus" />
                  <br />
                  Lisää kuva
                </span>
                <input type="file" accept="image/*" multiple onChange={onFile} aria-label="Lisää kuvia galleriasta" />
              </label>
            )}
          </div>
          {busy && (
            <p class="hint-text" role="status" style={{ color: 'var(--fg)' }}>
              {busy}
            </p>
          )}
          <p class="hint-text">Voit valita useita kuvia kerralla. Napauta kuvaa muokataksesi sitä. Uudet kuvat asetetaan vapaille numeroille.</p>
        </section>
      )}

      <section class="section">
        <h2>Numerot</h2>
        <div class="slots" onPointerMove={slotMove} onPointerUp={slotUp} onPointerCancel={() => ((dragFrom.current = null), setOver(null))}>
          {set.map.map((_, n) => (
            <div key={n} data-slot={n} class={'slotbtn' + (over === n ? ' over' : '')} role="button" tabIndex={0} aria-label={`Numero ${n + 1}`} onPointerDown={(e) => slotDown(e, n)} onClick={() => !suppressClick.current && !isDefault && setSheet({ kind: 'slot', n })} onKeyDown={(e) => e.key === 'Enter' && !isDefault && setSheet({ kind: 'slot', n })}>
              <MiniCard rank={n + 1} suit={0} w={60} set={set} urls={urls} />
            </div>
          ))}
        </div>
        {!isDefault && <p class="hint-text">Napauta numeroa valitaksesi sen kuvan. Raahaa numero toisen päälle vaihtaaksesi niiden kuvat keskenään.</p>}
      </section>

      <section class="section">
        <h2>Kortin ulkoasu</h2>
        <Seg
          label="Kuvan asettelu"
          value={set.layout}
          options={[
            ['area', 'Kuva-alue'],
            ['full', 'Koko kortti'],
          ]}
          onChange={(v) => save({ layout: v })}
        />
        <div class="list">
          <div class="item">
            <div class="grow">Viiva kortin ulkoreunassa</div>
            <Switch label="Viiva kortin ulkoreunassa" checked={set.cardBorder} onChange={(v) => save({ cardBorder: v })} />
          </div>
          {set.layout === 'area' && (
            <div class="item">
              <div class="grow">Laatikko kuvan ympärillä</div>
              <Switch label="Laatikko kuvan ympärillä" checked={set.picBorder} onChange={(v) => save({ picBorder: v })} />
            </div>
          )}
        </div>
      </section>

      <section class="section">
        <h2>Setti</h2>
        {!isDefault && (
          <>
            <ShareFlow label="Jaa setti" title={set.name} primary make={() => exportSetFile(set.id)} />
            <p class="hint-text">Jaa setti perheenjäsenelle esimerkiksi WhatsAppilla. Kuvat kulkevat vain lähettämässäsi viestissä.</p>
          </>
        )}
        <div class="row" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button class="btn" type="button" onClick={duplicate}>
            Monista
          </button>
          {!isDefault && (
            <button class="btn danger" type="button" onClick={() => setSheet({ kind: 'delete' })}>
              <Icon name="trash" /> Poista setti
            </button>
          )}
        </div>
      </section>

      {sheet && (
        <div class="scrim" onClick={(e) => e.target === e.currentTarget && setSheet(null)}>
          <div class="dialog" role="dialog">
            {sheet.kind === 'slot' && (
              <>
                <h2>Numeron {sheet.n + 1} kuva</h2>
                <div class="library">
                  <button
                    type="button"
                    class={'thumb' + (set.map[sheet.n] === null ? ' sel' : '')}
                    style={{ display: 'grid', placeItems: 'center' }}
                    onClick={() => {
                      const map = [...set.map];
                      map[sheet.n] = null;
                      save({ map });
                      setSheet(null);
                    }}
                    aria-label="Hämähäkki"
                  >
                    <MiniCard rank={sheet.n + 1} suit={0} w={46} set={{ ...set, map: Array(13).fill(null) }} urls={urls} />
                  </button>
                  {set.images.map((imgId) => (
                    <Thumb
                      key={imgId}
                      id={imgId}
                      set={set}
                      selected={set.map[sheet.n] === imgId}
                      onClick={() => {
                        const map = [...set.map];
                        map[sheet.n] = imgId;
                        save({ map });
                        setSheet(null);
                      }}
                    />
                  ))}
                </div>
                {set.images.length === 0 && <p>Lisää ensin kuvia galleriasta.</p>}
                <div class="row">
                  <button
                    class="btn"
                    type="button"
                    disabled={set.map[sheet.n] === null}
                    onClick={() => {
                      const img = set.map[sheet.n];
                      save({ map: set.map.map(() => img) });
                      setSheet(null);
                    }}
                  >
                    Käytä kaikilla numeroilla
                  </button>
                  <button class="btn ghost" type="button" onClick={() => setSheet(null)}>
                    Sulje
                  </button>
                </div>
              </>
            )}
            {sheet.kind === 'image' && (
              <>
                <h2>Kuva</h2>
                <p>
                  Käytössä numeroilla:{' '}
                  {set.map
                    .map((m, i) => (m === sheet.id ? i + 1 : null))
                    .filter((x) => x !== null)
                    .join(', ') || 'ei millään'}
                </p>
                <div class="menu">
                  <button class="btn" type="button" onClick={() => (setSheet(null), onEditImage(sheet.id))}>
                    <Icon name="edit" /> Muokkaa kuvaa
                  </button>
                  <button
                    class="btn danger"
                    type="button"
                    onClick={() => {
                      const others = sets.some((s) => s.id !== set.id && s.images.includes(sheet.id));
                      if (others) save({ images: set.images.filter((x) => x !== sheet.id), map: set.map.map((m) => (m === sheet.id ? null : m)) });
                      else void deleteImage(sheet.id);
                      setSheet(null);
                    }}
                  >
                    <Icon name="trash" /> Poista kuva
                  </button>
                  <button class="btn ghost" type="button" onClick={() => setSheet(null)}>
                    Sulje
                  </button>
                </div>
              </>
            )}
            {sheet.kind === 'delete' && (
              <>
                <h2>Poistetaanko “{set.name}”?</h2>
                <p>Setin kuvat poistetaan tästä laitteesta. Tätä ei voi perua.</p>
                <div class="row">
                  <button class="btn" type="button" onClick={() => setSheet(null)}>
                    Peruuta
                  </button>
                  <button
                    class="btn primary"
                    style={{ background: '#e5484d', borderColor: '#e5484d', color: '#fff' }}
                    type="button"
                    onClick={() => {
                      setSheet(null);
                      void deleteSet(set.id);
                    }}
                  >
                    Poista
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </Page>
  );
}

type ShareState = 'idle' | 'busy' | 'needs-tap' | 'unsupported' | 'error';

/** Jakonappi: kokoaa tiedoston ja avaa puhelimen jakovalikon. */
function ShareFlow(props: { label: string; title: string; make: () => Promise<File>; primary?: boolean; disabled?: boolean }) {
  const [state, setState] = useState<ShareState>('idle');
  const [file, setFile] = useState<File | null>(null);
  async function share(ready?: File) {
    try {
      let f = ready;
      if (!f) {
        setState('busy');
        f = await props.make();
        setFile(f);
      }
      const r = await shareFile(f, props.title);
      setState(r === 'shared' || r === 'cancelled' ? 'idle' : r);
    } catch (e) {
      console.error(e);
      setState('error');
    }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
      <button class={'btn' + (props.primary ? ' primary' : '')} type="button" disabled={props.disabled || state === 'busy'} onClick={() => void share()}>
        <Icon name="share" /> {state === 'busy' ? 'Kootaan tiedostoa…' : props.label}
      </button>
      {state === 'needs-tap' && file && (
        <div class="hint-text" role="status" style={{ color: 'var(--fg)', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          Tiedosto on valmis.
          <button class="btn small primary" type="button" onClick={() => void share(file)}>
            Jaa nyt
          </button>
        </div>
      )}
      {state === 'unsupported' && file && (
        <div class="hint-text" role="status" style={{ color: 'var(--fg)', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
          Tämä selain ei osaa jakaa tiedostoja suoraan. Tallenna tiedosto puhelimeen ja lähetä se sieltä esimerkiksi WhatsAppilla.
          <button class="btn small" type="button" onClick={() => downloadFile(file)}>
            Tallenna tiedosto
          </button>
        </div>
      )}
      {state === 'error' && (
        <p class="hint-text" role="status" style={{ color: 'var(--fg)', margin: 0 }}>
          Jakaminen epäonnistui. Yritä uudelleen.
        </p>
      )}
    </div>
  );
}
