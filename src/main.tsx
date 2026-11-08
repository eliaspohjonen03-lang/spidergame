import '@fontsource/lexend/400.css';
import '@fontsource/lexend/600.css';
import '@fontsource/nunito-sans/400.css';
import '@fontsource/nunito-sans/600.css';
import '@fontsource/nunito-sans/700.css';
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/young-serif/400.css';
import '@fontsource/figtree/400.css';
import '@fontsource/figtree/600.css';
import '@fontsource/figtree/700.css';
import './ui/styles.css';
import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import { App } from './ui/App';

registerSW({ immediate: true });

// Estetään selaimen zoomaus (iPhonen nipistys ja tuplanapautus), jotta pelinäkymä
// ei suurennu vahingossa esimerkiksi jakopakkaa nopeasti napautettaessa.
for (const t of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(t, (e) => e.preventDefault());
let lastTouchEnd = 0;
document.addEventListener(
  'touchend',
  (e) => {
    const now = Date.now();
    const target = e.target as Element | null;
    const interactive = target?.closest('button, input, label, a, select, textarea, [role="button"]');
    if (now - lastTouchEnd < 350 && !interactive) e.preventDefault();
    lastTouchEnd = now;
  },
  { passive: false },
);
document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
render(<App />, document.getElementById('app')!);
