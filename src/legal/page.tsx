import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/saira/wdth.css';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-sans/700.css';
import '@fontsource/press-start-2p/400.css';
import { LegalDoc } from './LegalDoc';
import { docIn, isLegalDocId, langsOf, legalDoc, legalDocsIn } from './docs';
import { LANG_META } from '../i18n/langs';
import { LEGAL } from './meta';
import './legal.css';
import './page.css';

// Herkese açık yasal metin sayfası (GitHub Pages). Türkçe: legal.html#kosullar, #gizlilik, #aydinlatma, #riza, #silme;
// diğer diller "<kısa ad>-<dil>": #terms-en, #privacy-en, #kvkk-en, #consent-en, #deletion-en (yeni dil: #privacy-de …).
// Google Play'deki gizlilik politikası ve hesap silme bağlantıları buraya verilir; mevcut bağlantılar değişmez.
// Bağlantısız açılışta tarayıcının dilinde metin varsa o, yoksa İngilizce gizlilik politikası açılır.
const fromHash = () => {
  const h = decodeURIComponent((location.hash || '').slice(1));
  if (isLegalDocId(h)) return h;
  const want = (navigator.language || '').slice(0, 2).toLowerCase();
  return docIn('gizlilik', want).id;
};

const NAV_LABEL: Record<string, string> = { tr: 'Yasal metinler', en: 'Legal documents' };
const LABEL = new Map<string, string>(LANG_META.map((l) => [l.id, l.label]));

function LegalPage() {
  const [id, setId] = useState(fromHash);
  useEffect(() => {
    const on = () => { setId(fromHash()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const doc = legalDoc(id);
  useEffect(() => { document.querySelector('.lgp-nav [aria-current]')?.scrollIntoView?.({ inline: 'center', block: 'nearest' }); }, [id]);
  useEffect(() => { document.title = doc.title + ' · OUTMOVE'; document.documentElement.lang = doc.lang; }, [doc]);
  const open = (next: string) => { location.hash = next; };
  const others = langsOf(doc.id).filter((l) => l !== doc.lang);
  return (
    <div className="lgp">
      <header className="lgp-head">
        <div className="lgp-top">
          <a className="lg-brand" href={LEGAL.WEB}>OUTMOVE</a>
          <span className="lgp-langs">
            {others.map((l) => {
              const d = docIn(doc.id, l);
              return <a key={l} className="lgp-lang" id={'lgp-lang-' + l} href={'#' + d.id} hrefLang={l} lang={l}>{LABEL.get(l) || l}</a>;
            })}
          </span>
        </div>
        <nav className="lgp-nav" aria-label={NAV_LABEL[doc.lang] || NAV_LABEL.en}>
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
