import type { ComponentChildren } from 'preact';
import type { SuitCount } from '../game/engine';
import type { ColorMode, ThemeMode } from '../store/model';
import { activeSet, updateSettings, useData } from '../store/store';
import { Icon, MiniCard } from './Art';
import { STYLES, STYLE_COLORS, resolveMode, suitColors } from './theme';

export function Page(props: { title: string; titleEl?: ComponentChildren; onBack: () => void; children: ComponentChildren; actions?: ComponentChildren }) {
  return (
    <div class="page">
      <header>
        <button class="iconbtn" type="button" aria-label="Takaisin" onClick={props.onBack}>
          <Icon name="back" />
        </button>
        {props.titleEl ?? <h1>{props.title}</h1>}
        {props.actions}
      </header>
      <div class="content">{props.children}</div>
    </div>
  );
}

export function Seg<T extends string | number>(props: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div class="seg" role="group" aria-label={props.label}>
      {props.options.map(([v, t]) => (
        <button key={String(v)} type="button" aria-pressed={props.value === v} onClick={() => props.onChange(v)}>
          {t}
        </button>
      ))}
    </div>
  );
}

export function Switch(props: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" role="switch" class="switch" aria-checked={props.checked} aria-label={props.label} onClick={() => props.onChange(!props.checked)} />;
}

export function SettingsPage({ onBack, onInstall, onSets }: { onBack: () => void; onInstall: () => void; onSets: () => void }) {
  const { settings: s, urls, sets } = useData();
  const mode = resolveMode(s);
  const colors = suitColors(s, mode);
  const set = activeSet();

  function setColor(i: number, v: string) {
    const cur = [...(s.customColors[mode] ?? STYLE_COLORS[s.style][mode])];
    cur[i] = v;
    updateSettings({ customColors: { ...s.customColors, [mode]: cur } });
  }

  return (
    <Page title="Asetukset" onBack={onBack}>
      <section class="section">
        <h2>Vaikeustaso</h2>
        <Seg<SuitCount>
          label="Sarjoja"
          value={s.suits}
          options={[
            [1, '1 sarja/maa'],
            [2, '2 sarjaa/maata'],
            [3, '3 sarjaa/maata'],
            [4, '4 sarjaa/maata'],
          ]}
          onChange={(v) => updateSettings({ suits: v })}
        />
        <p class="hint-text">Koskee seuraavaa uutta peliä. Mitä enemmän sarjoja, sitä vaikeampi peli.</p>
      </section>

      <section class="section">
        <h2>Kuvasetti</h2>
        <div class="list">
          <button class="item" type="button" onClick={onSets}>
            <MiniCard rank={13} suit={0} w={34} set={set} urls={urls} />
            <div class="grow">
              <div>{set.name}</div>
              <div class="sub">Käytössä · {sets.length} {sets.length === 1 ? 'setti' : 'settiä'} yhteensä</div>
            </div>
            <span aria-hidden="true">›</span>
          </button>
        </div>
      </section>

      <section class="section">
        <h2>Tyyli</h2>
        <div class="list">
          {STYLES.map((st) => (
            <button key={st.id} class="item" type="button" aria-pressed={s.style === st.id} onClick={() => updateSettings({ style: st.id })}>
              <div class="grow">
                <div style={{ fontWeight: s.style === st.id ? 800 : 600 }}>{st.name}</div>
                <div class="sub">{st.desc}</div>
              </div>
              {s.style === st.id && (
                <span style={{ width: '22px', height: '22px', color: 'var(--accent)' }}>
                  <Icon name="check" />
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      <section class="section">
        <h2>Teema</h2>
        <Seg<ThemeMode>
          label="Teema"
          value={s.theme}
          options={[
            ['system', 'Puhelimen mukaan'],
            ['light', 'Vaalea'],
            ['dark', 'Tumma'],
          ]}
          onChange={(v) => updateSettings({ theme: v })}
        />
      </section>

      <section class="section">
        <h2>Sarjojen värit</h2>
        <div class="swatches">
          {colors.map((c, i) => (
            <label key={i} class="swatch">
              <input type="color" value={c} onInput={(e) => setColor(i, (e.target as HTMLInputElement).value)} aria-label={`Sarjan ${i + 1} väri`} />
              Sarja {i + 1}
            </label>
          ))}
        </div>
        <p class="hint-text">Muutos koskee {mode === 'dark' ? 'tummaa' : 'vaaleaa'} teemaa.</p>
        <div>
          <button
            class="btn small"
            type="button"
            disabled={!s.customColors.light && !s.customColors.dark}
            onClick={() => updateSettings({ customColors: {} })}
          >
            Palauta oletusvärit
          </button>
        </div>
        <h2 style={{ marginTop: '8px' }}>Sarjan väri näkyy</h2>
        <Seg<ColorMode>
          label="Sarjan väri näkyy"
          value={s.colorMode}
          options={[
            ['num', 'Numerossa'],
            ['kehys', '+ kehyksessä'],
            ['tausta', '+ taustassa'],
          ]}
          onChange={(v) => updateSettings({ colorMode: v })}
        />
        <div class="cardrow">
          {[0, 1, 2, 3].map((i) => (
            <MiniCard key={i} rank={[13, 9, 4, 1][i]} suit={i} w={64} set={set} urls={urls} />
          ))}
        </div>
      </section>

      <section class="section">
        <h2>Äänet</h2>
        <div class="list">
          <div class="item">
            <div class="grow">Äänet</div>
            <Switch label="Äänet" checked={s.sound} onChange={(v) => updateSettings({ sound: v })} />
          </div>
          {s.sound && (
            <div class="item">
              <div class="grow">
                <label for="vol">Äänenvoimakkuus</label>
                <input id="vol" type="range" min={0} max={1} step={0.05} value={s.volume} onInput={(e) => updateSettings({ volume: Number((e.target as HTMLInputElement).value) })} />
              </div>
            </div>
          )}
        </div>
      </section>

      <section class="section">
        <h2>Pelaaminen</h2>
        <div class="list">
          <div class="item">
            <div class="grow">
              Nopeat animaatiot
              <div class="sub">Kortit liikkuvat nopeammin.</div>
            </div>
            <Switch label="Nopeat animaatiot" checked={s.fastAnim} onChange={(v) => updateSettings({ fastAnim: v })} />
          </div>
          <div class="item">
            <div class="grow">
              Vasenkätinen asettelu
              <div class="sub">Jakopakka on vasemmalla.</div>
            </div>
            <Switch label="Vasenkätinen asettelu" checked={s.leftHanded} onChange={(v) => updateSettings({ leftHanded: v })} />
          </div>
        </div>
      </section>

      <section class="section">
        <h2>Sovellus</h2>
        <div class="list">
          <button class="item" type="button" onClick={onInstall}>
            <div class="grow">
              Asennusohje
              <div class="sub">Näin peli lisätään puhelimen aloitusnäytölle.</div>
            </div>
            <span aria-hidden="true">›</span>
          </button>
        </div>
        <p class="hint-text">Kaikki kuvat, pelit ja tilastot tallentuvat vain tähän laitteeseen.</p>
      </section>
    </Page>
  );
}
