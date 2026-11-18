import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/saira/wdth.css';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-sans/700.css';
import '@fontsource/press-start-2p/400.css';
import { LegalDoc } from './LegalDoc';
import { LEGAL_DOCS, isLegalDocId, legalDoc } from './docs';
import { LEGAL } from './meta';
import './legal.css';
import './page.css';

// Herkese açık yasal metin sayfası (GitHub Pages: legal.html#gizlilik, #kosullar, #aydinlatma, #riza, #silme, #privacy-en).
// Google Play'deki gizlilik politikası ve hesap silme bağlantıları buraya verilir.
const fromHash = () => {
  const h = decodeURIComponent((location.hash || '').slice(1));
  return isLegalDocId(h) ? h : 'gizlilik';
};

function LegalPage() {
  const [id, setId] = useState(fromHash);
  useEffect(() => {
    const on = () => { setId(fromHash()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  useEffect(() => { document.querySelector('.lgp-nav [aria-current]')?.scrollIntoView?.({ inline: 'center', block: 'nearest' }); }, [id]);
  useEffect(() => { document.title = legalDoc(id).title + ' · OUTMOVE'; document.documentElement.lang = id === 'privacy-en' ? 'en' : 'tr'; }, [id]);
  const open = (next: string) => { location.hash = next; };
  return (
    <div className="lgp">
      <header className="lgp-head">
        <a className="lg-brand" href={LEGAL.WEB}>OUTMOVE</a>
        <nav className="lgp-nav" aria-label="Yasal metinler">
          {LEGAL_DOCS.map((d) => (
            <a key={d.id} href={'#' + d.id} aria-current={d.id === id ? 'page' : undefined}>{d.title}</a>
          ))}
        </nav>
      </header>
      <main className="lgp-main"><LegalDoc id={id} onOpen={open} /></main>
      <footer className="lgp-foot">{LEGAL.COMPANY} · {LEGAL.VERSION}</footer>
    </div>
  );
}

createRoot(document.getElementById('legal-root')!).render(<React.StrictMode><LegalPage /></React.StrictMode>);
