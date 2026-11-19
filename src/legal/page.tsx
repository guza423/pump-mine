import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/saira/wdth.css';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-sans/700.css';
import '@fontsource/press-start-2p/400.css';
import { LegalDoc } from './LegalDoc';
import { docIn, isLegalDocId, legalDoc, legalDocsIn } from './docs';
import { LEGAL } from './meta';
import './legal.css';
import './page.css';

// Herkese açık yasal metin sayfası (GitHub Pages). Türkçe: legal.html#kosullar, #gizlilik, #aydinlatma, #riza, #silme;
// İngilizce (V25): #terms-en, #privacy-en, #kvkk-en, #consent-en, #deletion-en.
// Google Play'deki gizlilik politikası ve hesap silme bağlantıları buraya verilir; mevcut bağlantılar değişmez.
// Bağlantısız açılışta tarayıcı dili Türkçeyse Türkçe, değilse İngilizce gizlilik politikası açılır.
const fromHash = () => {
  const h = decodeURIComponent((location.hash || '').slice(1));
  if (isLegalDocId(h)) return h;
  return /^tr\b/i.test(navigator.language || '') ? 'gizlilik' : 'privacy-en';
};

const UI = {
  tr: { nav: 'Yasal metinler', switchTo: 'English' },
  en: { nav: 'Legal documents', switchTo: 'Türkçe' },
} as const;

function LegalPage() {
  const [id, setId] = useState(fromHash);
  useEffect(() => {
    const on = () => { setId(fromHash()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const doc = legalDoc(id);
  const ui = UI[doc.lang];
  useEffect(() => { document.querySelector('.lgp-nav [aria-current]')?.scrollIntoView?.({ inline: 'center', block: 'nearest' }); }, [id]);
  useEffect(() => { document.title = doc.title + ' · OUTMOVE'; document.documentElement.lang = doc.lang; }, [doc]);
  const open = (next: string) => { location.hash = next; };
  const other = docIn(doc.id, doc.lang === 'en' ? 'tr' : 'en');
  return (
    <div className="lgp">
      <header className="lgp-head">
        <div className="lgp-top">
          <a className="lg-brand" href={LEGAL.WEB}>OUTMOVE</a>
          <a className="lgp-lang" id="lgp-lang" href={'#' + other.id} hrefLang={other.lang} lang={other.lang}>{ui.switchTo}</a>
        </div>
        <nav className="lgp-nav" aria-label={ui.nav}>
          {legalDocsIn(doc.lang).map((d) => (
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
