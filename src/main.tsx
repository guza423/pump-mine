import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/saira/400.css';
import '@fontsource/saira/600.css';
import '@fontsource/saira/700.css';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/600.css';
import { registerSW } from 'virtual:pwa-register';
import App from './app/App';

registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
