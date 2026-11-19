import React, { useEffect, useRef, useState } from 'react';
import { LegalDoc } from './LegalDoc';
import { appDocId, appDocTitle } from './appDocs';
import { t } from '../i18n';
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
      <div className="lg-gate pxt" role="dialog" aria-modal="true" aria-label={appDocTitle(doc)}>
        <div className="lg-gate-bar">
          <button type="button" id="legal-back" className="lg-back" onClick={() => setDoc(null)} aria-label={t('Geri')}>‹</button>
          <b>{appDocTitle(doc)}</b>
        </div>
        <div className="lg-gate-doc" ref={scroller}><LegalDoc id={appDocId(doc)} onOpen={setDoc} hideTitle /></div>
        <div className="lg-gate-foot"><button type="button" className="btn primary full" onClick={() => setDoc(null)}>{t('Geri dön')}</button></div>
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
        <h1 id="lg-gate-h" className="lg-gate-h">{updated ? t('Metinler güncellendi') : t('Başlamadan önce')}</h1>
        <p className="lg-gate-p">
          {updated
            ? t('Kullanım koşullarımızı ve gizlilik metinlerimizi güncelledik. Devam etmek için yeni sürümü oku ve onayla.')
            : t('OUTMOVE’u kullanmadan önce kuralları ve verilerinin nasıl işlendiğini oku. Hesapsız kullanımda kayıtların yalnızca bu cihazda kalır.')}
        </p>
        <div className="lg-warn" role="note">
          <b>{t('Sağlık uyarısı')}</b>
          <p>{t('OUTMOVE tıbbi tavsiye vermez; yorgunluk ve yük hesapları tahmindir. Yeni bir programa başlamadan önce hekimine danış. Ağrı, baş dönmesi ya da göğüs ağrısı olursa hemen dur.')}</p>
        </div>
        <ul className="lg-list">
          {['kosullar', 'aydinlatma', 'gizlilik'].map((id) => (
            <li key={id}><button type="button" id={'legal-open-' + id} className="lg-open" onClick={() => setDoc(id)}><span>{appDocTitle(id)}</span><i aria-hidden="true">›</i></button></li>
          ))}
        </ul>
        <label className="lg-check">
          <input id="legal-terms" type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
          <span>{t('{age} yaşını doldurdum.', { age: LEGAL.MIN_AGE })} {t('[Kullanım Koşulları]’nı okudum, kabul ediyorum.').split(/\[|\]/).map((part, i) => (i === 1 ? <React.Fragment key={i}>{link('kosullar', appDocTitle('kosullar'))}</React.Fragment> : part))}</span>
        </label>
        <label className="lg-check">
          <input id="legal-notice" type="checkbox" checked={notice} onChange={(e) => setNotice(e.target.checked)} />
          <span>{t('[KVKK Aydınlatma Metni]’ni ve [Gizlilik Politikası]’nı okudum.').split(/\[|\]/).map((part, i) => (i === 1 ? <React.Fragment key={i}>{link('aydinlatma', appDocTitle('aydinlatma'))}</React.Fragment> : i === 3 ? <React.Fragment key={i}>{link('gizlilik', appDocTitle('gizlilik'))}</React.Fragment> : part))}</span>
        </label>
        <p className="lg-note">{t('Aydınlatma metni bir onay değildir; yalnızca bilgilendirildiğini gösterir. Sağlıkla ilgili verilerin için açık rıza, yalnızca hesap açarsan ayrıca sorulur.')}</p>
        <button type="button" id="legal-go" className="btn primary full" disabled={!terms || !notice} onClick={() => { saveAcceptance(); onDone(); }}>{t('Devam et')}</button>
        <p className="lg-co">{LEGAL.COMPANY} · {t('Sürüm {v}', { v: LEGAL.VERSION })}</p>
      </div>
    </div>
  );
}
