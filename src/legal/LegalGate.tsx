import React, { useEffect, useRef, useState } from 'react';
import { LegalDoc } from './LegalDoc';
import { legalDoc } from './docs';
import { LEGAL } from './meta';
import { readAcceptance, saveAcceptance } from './acceptance';
import './legal.css';

// İlk açılışta ve metinler önemli ölçüde değişince çıkan kapı.
// KVKK Kurulu İlke Kararı 2026/347 gereği: Kullanım Koşulları "kabul" edilir, aydınlatma yalnızca "okundu" olarak işaretlenir
// (onay/rıza istenmez). Sağlık verisi için açık rıza burada değil, hesap açılırken ayrı bir ekranda istenir.
export function LegalGate({ onDone }: { onDone: () => void }) {
  const [terms, setTerms] = useState(false);
  const [notice, setNotice] = useState(false);
  const [doc, setDoc] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const updated = !!readAcceptance();
  useEffect(() => { scroller.current?.scrollTo?.(0, 0); }, [doc]);

  if (doc) {
    return (
      <div className="lg-gate pxt" role="dialog" aria-modal="true" aria-label={legalDoc(doc).title}>
        <div className="lg-gate-bar">
          <button type="button" id="legal-back" className="lg-back" onClick={() => setDoc(null)} aria-label="Geri">‹</button>
          <b>{legalDoc(doc).title}</b>
        </div>
        <div className="lg-gate-doc" ref={scroller}><LegalDoc id={doc} onOpen={setDoc} hideTitle /></div>
        <div className="lg-gate-foot"><button type="button" className="btn primary full" onClick={() => setDoc(null)}>Geri dön</button></div>
      </div>
    );
  }
  const link = (id: string, label: string) => (
    <button type="button" className="lg-inline" onClick={() => setDoc(id)}>{label}</button>
  );
  return (
    <div className="lg-gate pxt" role="dialog" aria-modal="true" aria-labelledby="lg-gate-h">
      <div className="lg-gate-in" ref={scroller}>
        <p className="lg-brand">OUTMOVE</p>
        <h1 id="lg-gate-h" className="lg-gate-h">{updated ? 'Metinler güncellendi' : 'Başlamadan önce'}</h1>
        <p className="lg-gate-p">
          {updated
            ? 'Kullanım koşullarımızı ve gizlilik metinlerimizi güncelledik. Devam etmek için yeni sürümü oku ve onayla.'
            : 'OUTMOVE’u kullanmadan önce kuralları ve verilerinin nasıl işlendiğini oku. Hesapsız kullanımda kayıtların yalnızca bu cihazda kalır.'}
        </p>
        <div className="lg-warn" role="note">
          <b>Sağlık uyarısı</b>
          <p>OUTMOVE tıbbi tavsiye vermez; yorgunluk ve yük hesapları tahmindir. Yeni bir programa başlamadan önce hekimine danış. Ağrı, baş dönmesi ya da göğüs ağrısı olursa hemen dur.</p>
        </div>
        <ul className="lg-list">
          {['kosullar', 'aydinlatma', 'gizlilik'].map((id) => (
            <li key={id}><button type="button" id={'legal-open-' + id} className="lg-open" onClick={() => setDoc(id)}><span>{legalDoc(id).title}</span><i aria-hidden="true">›</i></button></li>
          ))}
        </ul>
        <label className="lg-check">
          <input id="legal-terms" type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
          <span>{LEGAL.MIN_AGE} yaşını doldurdum. {link('kosullar', 'Kullanım Koşulları')}’nı okudum, kabul ediyorum.</span>
        </label>
        <label className="lg-check">
          <input id="legal-notice" type="checkbox" checked={notice} onChange={(e) => setNotice(e.target.checked)} />
          <span>{link('aydinlatma', 'KVKK Aydınlatma Metni')}’ni ve {link('gizlilik', 'Gizlilik Politikası')}’nı okudum.</span>
        </label>
        <p className="lg-note">Aydınlatma metni bir onay değildir; yalnızca bilgilendirildiğini gösterir. Sağlıkla ilgili verilerin için açık rıza, yalnızca hesap açarsan ayrıca sorulur.</p>
        <button type="button" id="legal-go" className="btn primary full" disabled={!terms || !notice} onClick={() => { saveAcceptance(); onDone(); }}>Devam et</button>
        <p className="lg-co">{LEGAL.COMPANY} · Sürüm {LEGAL.VERSION}</p>
      </div>
    </div>
  );
}
