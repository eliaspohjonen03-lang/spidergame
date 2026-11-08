import { useState } from 'preact/hooks';
import { Icon } from './Art';
import { isStandalone } from './Install';
import { Page, Seg } from './Settings';

type Platform = 'android' | 'ios';

function Kbd({ icon, children }: { icon?: string; children: string }) {
  return (
    <span class="kbd">
      {icon && <Icon name={icon} />}
      {children}
    </span>
  );
}

/** Tuo setti -näkymä: ohjeet eri jakotavoille ja tiedoston valinta. */
export function ImportPage({ onBack, onFile }: { onBack: () => void; onFile: (f: File) => void }) {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  const [platform, setPlatform] = useState<Platform>(ios ? 'ios' : 'android');

  function pick(e: Event) {
    const input = e.target as HTMLInputElement;
    const f = input.files?.[0];
    input.value = '';
    if (f) onFile(f);
  }

  return (
    <Page title="Tuo setti" onBack={onBack}>
      <p class="hint-text">
        Kuvasetti tulee tiedostona, jonka joku on jakanut sinulle pelin Jaa setti -napilla. Tuotu setti on oma kopiosi, ja voit muokata sitä vapaasti.
      </p>
      <label class="btn primary file" style={{ alignSelf: 'flex-start' }}>
        <Icon name="plus" /> Valitse tiedosto
        <input type="file" accept=".json,application/json,text/plain,application/octet-stream" onChange={pick} aria-label="Valitse kuvasettitiedosto" />
      </label>

      <Seg<Platform>
        label="Puhelin"
        value={platform}
        options={[
          ['android', 'Android'],
          ['ios', 'iPhone'],
        ]}
        onChange={setPlatform}
      />

      {platform === 'android' ? (
        <div class="install">
          <section class="section">
            <h2>WhatsApp, suoraan peliin</h2>
            <ol>
              <li>
                <span>Avaa keskustelu, jossa tiedosto on, ja paina tiedostoa pitkään.</span>
              </li>
              <li>
                <span>
                  Napauta ylhäältä jakopainiketta <Kbd icon="share">Jaa</Kbd>.
                </span>
              </li>
              <li>
                <span>
                  Valitse sovelluslistasta <b>Custom Spider</b>. Peli aukeaa ja kysyy, tuodaanko setti.
                </span>
              </li>
            </ol>
            <p class="hint-text">
              {isStandalone()
                ? 'Jos Custom Spider ei näy listassa, käytä alla olevaa tapaa. Peli ilmestyy jakovalikkoon joskus vasta viiveellä tai kun sen asentaa uudelleen.'
                : 'Tämä toimii vain, kun peli on asennettu aloitusnäytölle. Ohje löytyy asetuksista kohdasta Asennusohje.'}
            </p>
          </section>
          <section class="section">
            <h2>WhatsApp, tiedoston kautta</h2>
            <ol>
              <li>
                <span>Avaa tiedosto WhatsAppissa, jolloin se tallentuu puhelimeen.</span>
              </li>
              <li>
                <span>
                  Napauta tässä näkymässä <b>Valitse tiedosto</b> ja etsi tiedosto kansiosta <b>Lataukset</b> tai <b>WhatsApp Documents</b>.
                </span>
              </li>
            </ol>
          </section>
          <section class="section">
            <h2>Sähköposti tai muu sovellus</h2>
            <ol>
              <li>
                <span>Lataa liite puhelimeen.</span>
              </li>
              <li>
                <span>
                  Napauta <b>Valitse tiedosto</b> ja valitse tiedosto kansiosta <b>Lataukset</b>.
                </span>
              </li>
            </ol>
          </section>
        </div>
      ) : (
        <div class="install">
          <section class="section">
            <h2>WhatsApp</h2>
            <ol>
              <li>
                <span>Avaa tiedosto keskustelussa napauttamalla sitä.</span>
              </li>
              <li>
                <span>
                  Napauta jakopainiketta <Kbd icon="share">Jaa</Kbd> ja valitse <b>Tallenna Tiedostoihin</b>.
                </span>
              </li>
              <li>
                <span>
                  Palaa peliin, napauta <b>Valitse tiedosto</b> ja valitse tallentamasi tiedosto.
                </span>
              </li>
            </ol>
          </section>
          <section class="section">
            <h2>Sähköposti tai muu sovellus</h2>
            <ol>
              <li>
                <span>
                  Paina liitettä pitkään ja valitse <b>Tallenna Tiedostoihin</b>.
                </span>
              </li>
              <li>
                <span>
                  Napauta <b>Valitse tiedosto</b> ja valitse tiedosto.
                </span>
              </li>
            </ol>
            <p class="hint-text">iPhonessa peli ei voi näkyä jakovalikossa, joten tiedosto tallennetaan ensin Tiedostot-sovellukseen.</p>
          </section>
        </div>
      )}
    </Page>
  );
}
