import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource-variable/saira/wdth.css';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-sans/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/600.css';
import '@fontsource/press-start-2p/400.css';
import { registerSW } from 'virtual:pwa-register';
import App from './app/App';

registerSW({ immediate: true });

// V37: basılı tutma menüsü (kopyala, resmi kaydet, bağlantıyı aç) yalnız yazı alanlarında açılır.
document.addEventListener('contextmenu', (e) => {
  const el = e.target as HTMLElement | null;
  if (el && el.closest && el.closest('input, textarea, select, [contenteditable="true"]')) return;
  e.preventDefault();
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
