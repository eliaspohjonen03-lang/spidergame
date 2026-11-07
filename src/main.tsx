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
render(<App />, document.getElementById('app')!);
