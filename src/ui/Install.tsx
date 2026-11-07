import { useEffect, useState } from 'preact/hooks';
import { Icon, MiniCard } from './Art';
import { Page, Seg } from './Settings';
import { activeSet, useData } from '../store/store';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const waiters = new Set<() => void>();
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e as BeforeInstallPromptEvent;
  waiters.forEach((w) => w());
});
window.addEventListener('appinstalled', () => {
  deferred = null;
  waiters.forEach((w) => w());
});

export function isStandalone(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

type Platform = 'android' | 'ios';

function detect(): { platform: Platform; iosOtherBrowser: boolean } {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  return { platform: ios ? 'ios' : 'android', iosOtherBrowser: ios && /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua) };
}

function Kbd({ icon, children }: { icon?: string; children: string }) {
  return (
    <span class="kbd">
      {icon && <Icon name={icon} />}
      {children}
    </span>
  );
}

function Steps({ platform, iosOtherBrowser }: { platform: Platform; iosOtherBrowser: boolean }) {
  const [, force] = useState(0);
  useEffect(() => {
    const w = () => force((n) => n + 1);
    waiters.add(w);
    return () => {
      waiters.delete(w);
    };
  }, []);

  if (platform === 'ios') {
    return (
      <ol>
        {iosOtherBrowser && (
          <li>
            <span>
              Avaa tämä sivu <b>Safari</b>-selaimessa. Muissa selaimissa iPhone ei anna lisätä peliä aloitusnäytölle.
            </span>
          </li>
        )}
        <li>
          <span>
            Napauta Safarin alareunassa olevaa jakopainiketta <Kbd icon="share">Jaa</Kbd>.
          </span>
        </li>
        <li>
          <span>
            Vieritä alas ja valitse <Kbd icon="plus">Lisää Koti-valikkoon</Kbd>.
          </span>
        </li>
        <li>
          <span>
            Napauta oikeasta yläkulmasta <b>Lisää</b>. Custom Spider ilmestyy aloitusnäytölle omana kuvakkeenaan.
          </span>
        </li>
      </ol>
    );
  }
  return (
    <>
      {deferred && (
        <button
          class="btn primary"
          type="button"
          onClick={async () => {
            const d = deferred;
            if (!d) return;
            await d.prompt();
            await d.userChoice;
            deferred = null;
            force((n) => n + 1);
          }}
        >
          <Icon name="install" /> Asenna peli
        </button>
      )}
      <ol>
        <li>
          <span>
            Avaa sivu <b>Chrome</b>-selaimessa.
          </span>
        </li>
        <li>
          <span>
            Napauta oikean yläkulman valikkoa <Kbd icon="dots">⋮</Kbd>.
          </span>
        </li>
        <li>
          <span>
            Valitse <Kbd icon="install">Asenna sovellus</Kbd> tai <Kbd icon="plus">Lisää aloitusnäytölle</Kbd>.
          </span>
        </li>
        <li>
          <span>
            Vahvista napauttamalla <b>Asenna</b>. Peli ilmestyy aloitusnäytölle ja sovelluslistaan.
          </span>
        </li>
      </ol>
    </>
  );
}

export function InstallGuide({ onClose, asPage }: { onClose: () => void; asPage?: boolean }) {
  const det = detect();
  const [platform, setPlatform] = useState<Platform>(det.platform);
  const { urls } = useData();
  const set = activeSet();
  const body = (
    <div class="install">
      <Seg<Platform>
        label="Puhelin"
        value={platform}
        options={[
          ['android', 'Android'],
          ['ios', 'iPhone'],
        ]}
        onChange={setPlatform}
      />
      <Steps platform={platform} iosOtherBrowser={det.iosOtherBrowser && platform === 'ios'} />
      <p class="hint-text">Asennettu peli toimii myös ilman nettiyhteyttä. Omat kuvasi ja tilastosi pysyvät vain tässä puhelimessa.</p>
    </div>
  );
  if (asPage)
    return (
      <Page title="Asennusohje" onBack={onClose}>
        {body}
      </Page>
    );
  return (
    <div class="page" style={{ zIndex: 2500 }}>
      <div class="content">
        <div class="hero">
          <div style={{ display: 'flex', gap: '6px' }}>
            {[13, 7, 1].map((r, i) => (
              <MiniCard key={r} rank={r} suit={i} w={54} set={set} urls={urls} />
            ))}
          </div>
          <h1>Custom Spider</h1>
          <p>Lisää peli puhelimesi aloitusnäytölle, niin se aukeaa kuin mikä tahansa sovellus. Tähän menee alle minuutti.</p>
        </div>
        {body}
        <button class="btn" type="button" onClick={onClose}>
          Pelaa selaimessa
        </button>
      </div>
    </div>
  );
}
