// @ts-nocheck
import { PxIcon } from '../../app/PxIcon';
import React, { useState } from 'react';
import { Icon, Switch } from '../lab/Cns';
import { BackupPanel, exportBackup } from '../programlar/BackupPanel';
import { accountError } from '../../lib/cloud/errors';
import { readFxSettings } from '../../lib/native/fx';
import { allPlans } from '../plan/plans';
import { HoldButton } from '../../app/HoldButton';
import { appDocId, appDocs, appDocTitle } from '../../legal/appDocs';
import { LANGS, clock, setLang, t, upper, useLang } from '../../i18n';
import { LEGAL } from '../../legal/meta';
import '../../legal/legal.css';
const hm = ts => clock(ts);
function AccountChip({ acct, onClick }) {
  const state = acct.mode === 'guest' ? 'guest' : acct.pending ? 'pending' : acct.online ? 'ok' : 'offline';
  const label = acct.mode === 'guest' ? t('Misafir: kayıtlar yalnızca bu telefonda') : acct.pending ? t('{n} kayıt buluta gönderilmeyi bekliyor', { n: acct.pending }) : acct.online ? t('Tüm kayıtlar bulutta') : t('Çevrimdışı: kayıtlar bu telefonda hazır');
  return (
    <button type="button" id="account-btn" className={'acct-chip ' + state} onClick={onClick} aria-label={t('Hesap ve ayarlar') + '. ' + label} title={label}>
      <PxIcon name={acct.mode === 'guest' ? 'user' : 'cloud'} size={22} />
      <i className="acct-dot" />
    </button>
  );
}
function AccountBody({ st, acct, actions, openSheet, onClose, put }) {
  const [mode, setMode] = useState(null); // null | 'email'
  const [isNew, setIsNew] = useState(false);
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState(null); // 'out' | 'del' | 'withdraw' | 'wipe'
  const [delTxt, setDelTxt] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  // Silme onayı: Türkçede SİL, İngilizcede DELETE yazılır.
  const delWord = t('SİL');
  const delOk = upper(delTxt.trim()) === delWord;
  const run = async (action, success) => { setBusy(true); setMessage(''); try { await action(); if (success) setMessage(success); } catch (error) { setMessage(accountError(error)); } finally { setBusy(false); } };
  const status = <>{message || st.error ? <p className="backup-status bad" role="status">{message || t(st.error)}</p> : null}{busy || acct.busy || acct.migrating ? <p role="status">{t('İşlem sürüyor…')}</p> : null}</>;
  const n = { p: allPlans(st.programs).length, s: st.sessions.filter((x) => x.status === 'done').length, c: st.checkins.length };
  const valid = /.+@.+\..+/.test(email) && pass.length >= 6;
  const fx = readFxSettings(st.settings);
  const sysReduce = typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fxSection = put ? (
    <div className="acct-fx" style={{ display: 'grid', gap: '8px' }}>
      <Switch id="fx-sound" label={t('Sesler')} on={fx.sound} onChange={(v) => put('settings', { key: 'fx', value: { ...fx, sound: v } })} />
      <Switch id="fx-haptic" label={t('Titreşim')} on={fx.haptic} onChange={(v) => put('settings', { key: 'fx', value: { ...fx, haptic: v } })} />
      <Switch id="fx-motion" label={t('Animasyonlar (cihaz azaltsa da)')} on={fx.motion} onChange={(v) => put('settings', { key: 'fx', value: { ...fx, motion: v } })} />
      {sysReduce && !fx.motion ? <p className="acct-fx-note">{t('Bu cihaz animasyonları azaltıyor. Bu yüzden set kutucuğa uçmuyor, yerinde yanıp sönüyor. Açarsan tam oynar.')}</p> : null}
    </div>
  ) : null;
  if (acct.mode === 'guest') {
    return (
      <div className="acct">{status}
        <LangPicker />
        <div className="acct-hero">
          <Icon name="cloud" size={22} />
          <div>
            <strong>{t('Kayıtların şu an yalnızca bu telefonda')}</strong>
            <p>{t('Giriş yap: her set buluta yedeklenir, telefon değişse de hesabınla geri gelir. İnternet yokken de kaydeder, bağlantı gelince gönderir.')}</p>
          </div>
        </div>
        {acct.waiting ? <div className="pop flat"><p>{t('İnternete bağlanınca taşınacak. Yerel kayıtların korunuyor.')}</p><button type="button" className="btn primary" disabled={busy} onClick={() => run(actions.retryMigration)}>{t('Yeniden dene')}</button></div> : null}
        <p className="acct-move mono">{t('Bu telefondaki {p}, {s} ve {c} hesabına taşınır.', { p: t('{n} plan', { n: n.p }), s: t('{n} antrenman', { n: n.s }), c: t('{n} uyku kaydı', { n: n.c }) })}</p>
        <button type="button" id="google-signin" className="btn google full" disabled={busy || !!acct.uid} onClick={() => run(actions.google)}><span className="g-mark">G</span> {t('Google ile devam et')}</button>
        {mode === 'email' ? (
          <div className="acct-form">
            <input id="acct-email" className="text-in" type="email" inputMode="email" autoComplete="email" placeholder={t('E-posta')} value={email} onChange={(e) => setEmail(e.target.value)} />
            <input id="acct-pass" className="text-in" type="password" autoComplete={isNew ? 'new-password' : 'current-password'} placeholder={isNew ? t('Şifre (en az 6 karakter)') : t('Şifre')} value={pass} onChange={(e) => setPass(e.target.value)} />
            <button type="button" id="acct-email-go" className="btn primary full" disabled={!valid || busy || !!acct.uid} onClick={() => run(() => actions.email(email.trim(), pass, isNew))}>{isNew ? t('Hesap oluştur') : t('Giriş yap')}</button>
            <div className="acct-links">
              <button type="button" className="linkbtn" onClick={() => setIsNew(!isNew)}>{isNew ? t('Hesabın var mı? Giriş yap') : t('Hesabın yok mu? Oluştur')}</button>
              {!isNew ? <button type="button" className="linkbtn" disabled={busy || !/.+@.+\..+/.test(email)} onClick={() => run(() => actions.reset(email.trim()), t('Şifre sıfırlama e-postası gönderildi.'))}>{t('Şifremi unuttum')}</button> : null}
            </div>
          </div>
        ) : <button type="button" id="email-signin" className="btn ghost full" onClick={() => setMode('email')}><Icon name="mail" size={15} /> {t('E-posta ile devam et')}</button>}
        <BackupPanel />
        {fxSection}
        <button type="button" className="linkbtn" onClick={() => openSheet('privacy', {})}><Icon name="shield" size={13} /> {t('Verilerin nasıl saklanır?')}</button>
        {confirm === 'wipe' ? (
          <div className="lg-pop">
            <p>{t('Bu telefondaki tüm planların, antrenmanların, uyku kayıtların, hedeflerin ve ayarların kalıcı olarak silinir. Geri alınamaz. İstersen önce yukarıdan dışa aktar.')}</p>
            <div className="confirm-inline">
              <HoldButton id="wipe-yes" className="btn danger sm" disabled={busy} onHold={() => run(async () => { await actions.wipeDevice(); setConfirm(null); }, t('Bu telefondaki kayıtlar silindi.'))}>{t('Hepsini sil')}</HoldButton>
              <button type="button" className="btn ghost sm" onClick={() => setConfirm(null)}>{t('Vazgeç')}</button>
            </div>
          </div>
        ) : <button type="button" id="wipe-device" className="linkbtn danger-t" onClick={() => setConfirm('wipe')}><Icon name="trash" size={13} /> {t('Bu telefondaki verileri sil')}</button>}
        <LegalLinks openSheet={openSheet} />
      </div>
    );
  }
  return (
    <div className="acct">{status}
      <LangPicker />
      <div className="acct-user">
        <span className="acct-av">{(acct.email || '?')[0].toUpperCase()}</span>
        <div><strong>{acct.email}</strong><small>{acct.provider === 'google.com' ? t('Google hesabı') : t('E-posta hesabı')} · {t('giriş yapıldı')}</small></div>
      </div>
      <div className={'acct-sync ' + (acct.pending ? 'pending' : acct.online ? 'ok' : 'offline')}>
        <Icon name="cloud" size={16} />
        <span>{acct.pending ? t('{n} kayıt bekliyor; internet gelince gönderilecek', { n: acct.pending }) : acct.online ? t('Tüm kayıtlar bulutta') : t('Çevrimdışı · kayıtlar bu telefonda hazır')}</span>
        <small className="mono">{acct.lastSync ? t('son eşitleme {x}', { x: hm(acct.lastSync) }) : ''}</small>
      </div>
      <p className="acct-move mono">{t('{n} plan', { n: n.p })} · {t('{n} antrenman', { n: n.s })} · {t('{n} uyku kaydı', { n: n.c })}</p>
      <BackupPanel />
      {fxSection}
      <button type="button" className="btn ghost full" disabled={busy} onClick={() => run(() => exportBackup(actions.readBackup))}>{t('Verilerimi dışa aktar (JSON)')}</button>
      <button type="button" className="linkbtn" onClick={() => openSheet('privacy', {})}><Icon name="shield" size={13} /> {t('Gizlilik ve veri kullanımı')}</button>
      {confirm === 'withdraw' ? (
        <div className="lg-pop">
          <p>{t('Açık rızanı geri alırsan buluttaki tüm kayıtların silinir ve hesabından çıkış yapılır. Kayıtların bu telefonda misafir olarak kalır. Hesabın (e-posta adresin) durur; tamamen silmek için Hesabı sil’i kullan. Tekrar giriş yaparsan rıza yeniden sorulur.')}</p>
          <div className="confirm-inline">
            <HoldButton id="withdraw-yes" className="btn danger sm" disabled={busy || acct.pending > 0 || !acct.online} onHold={() => run(actions.withdrawConsent)}>{t('Rızamı geri al')}</HoldButton>
            <button type="button" className="btn ghost sm" onClick={() => setConfirm(null)}>{t('Vazgeç')}</button>
          </div>
        </div>
      ) : confirm === 'out' ? (
        <div className="pop flat">
          <p>{acct.pending ? t('{n} kayıt henüz buluta gitmedi. Çıkarsan bu telefondan silinir. İnternete bağlanıp bekle.', { n: acct.pending }) : t('Çıkış yapınca kayıtların bu telefondan kalkar, hesabında durur.')}</p>
          <div className="confirm-inline">
            <button type="button" id="signout-yes" className="btn danger sm" disabled={!!acct.pending || busy || acct.waiting} onClick={() => run(actions.logout)}>{t('Çıkış yap')}</button>
            <button type="button" className="btn ghost sm" onClick={() => setConfirm(null)}>{t('Vazgeç')}</button>
          </div>
        </div>
      ) : confirm === 'del' ? (
        <div className="pop flat">
          <p>{t('Hesabın, buluttaki tüm kayıtların ve bu telefondaki kopya kalıcı olarak silinir; geri alınamaz. İstersen önce dışa aktar. Onaylamak için [SİL] yaz.').split(/\[|\]/).map((part, i) => (i === 1 ? <b key={i}>{part}</b> : part))}</p>
          {acct.provider !== 'google.com' ? <input id="delete-password" className="text-in" type="password" autoComplete="current-password" placeholder={t('Şifreni tekrar gir')} value={password} onChange={e => setPassword(e.target.value)} /> : null}
          <input id="del-confirm" className="text-in" value={delTxt} onChange={(e) => setDelTxt(e.target.value)} placeholder={delWord} />
          <div className="confirm-inline">
            <HoldButton id="delete-yes" className="btn danger sm" disabled={!delOk || busy || acct.pending > 0 || !acct.online} onHold={() => run(() => actions.deleteAccount(password))}>{t('Hesabı kalıcı sil')}</HoldButton>
            <button type="button" className="btn ghost sm" onClick={() => { setConfirm(null); setDelTxt(''); }}>{t('Vazgeç')}</button>
          </div>
        </div>
      ) : (
        <div className="acct-danger">
          <button type="button" id="signout" className="btn ghost sm" onClick={() => setConfirm('out')}>{t('Çıkış yap')}</button>
          <button type="button" id="delete-account" className="btn ghost sm danger-t" onClick={() => setConfirm('del')}><Icon name="trash" size={13} /> {t('Hesabı sil')}</button>
        </div>
      )}
      {!confirm ? <button type="button" id="withdraw-consent" className="linkbtn" onClick={() => setConfirm('withdraw')}>{t('Açık rızamı geri al')}</button> : null}
      <LegalLinks openSheet={openSheet} />
    </div>
  );
}
// V21 · Dil seçici. Etiket iki dilde birden yazılır ki yanlış dilde kalan kullanıcı da bulsun.
function LangPicker() {
  const lang = useLang();
  return (
    <div className="acct-lang">
      <span className="st-k" id="lang-k">Language · Dil</span>
      <div className="segmented seg2" style={LANGS.length > 2 ? { gridTemplateColumns: 'repeat(' + Math.min(LANGS.length, 3) + ', minmax(0, 1fr))' } : undefined} role="radiogroup" aria-labelledby="lang-k">
        {LANGS.map((l) => (
          <button key={l.id} type="button" role="radio" id={'lang-' + l.id} lang={l.id} aria-checked={lang === l.id} className={lang === l.id ? 'on' : ''} onClick={() => setLang(l.id)}>{l.label}</button>
        ))}
      </div>
    </div>
  );
}
function LegalLinks({ openSheet }) {
  return (
    <div className="lg-acct">
      <p className="lg-acct-h">{t('Yasal')}</p>
      <div className="lg-acct-links">
        {appDocs().map((id) => <button key={id} type="button" id={'legal-' + id} className="linkbtn" onClick={() => openSheet('legal', { doc: id })}>{appDocTitle(id)}</button>)}
      </div>
      <p className="lg-acct-co">{LEGAL.COMPANY} · {t('metin sürümü {v}', { v: LEGAL.VERSION })}</p>
    </div>
  );
}
function ConsentBody({ onAccept, onClose, busy: externalBusy, openSheet }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const status = error ? <p role="alert">{error}</p> : null;
  const accept = async () => { setBusy(true); try { await onAccept(); } catch (e) { setError(accountError(e)); } finally { setBusy(false); } };
  const [ok, setOk] = useState(false);
  const doc = (id, label) => <button type="button" className="linkbtn" onClick={() => openSheet && openSheet('legal', { doc: appDocId(id) })}>{label}</button>;
  // Açık rıza, aydınlatmadan ve Kullanım Koşulları’ndan ayrı, kendi başlığı ve beyanıyla istenir (KVKK İlke Kararı 2026/347).
  return (
    <div className="acct">{status}
      <p className="consent-p">{t('Hesabında planların, antrenman ve set kayıtların, hedeflerin ve ayarların saklanır. Yalnızca sana gösterilir; satılmaz, reklam için kullanılmaz. Veri sorumlusu {co} (ABD); veriler Google Firebase’in Frankfurt (Almanya) sunucularında tutulur.', { co: LEGAL.COMPANY })}</p>
      <p className="consent-p"><b>{t('Açık rıza:')}</b> {t('Uyku saatlerin, zorlanma ve yorgunluk girişlerin, notların ve bunlardan yapılan hesaplar sağlık verisi sayılabilir. Bunları bulutta saklamak için açık rızan gerekir. Rıza vermezsen hesap açılmaz; uygulamayı misafir olarak tüm işlevleriyle kullanmaya devam edersin.')}</p>
      <div className="lg-acct-links">{doc('riza', appDocTitle('riza'))}{doc('aydinlatma', appDocTitle('aydinlatma'))}{doc('gizlilik', appDocTitle('gizlilik'))}</div>
      <label className="check-row"><input id="consent-check" type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} /> <span>{t('Açık Rıza Metni’ni okudum. Sağlık verisi niteliği taşıyabilecek verilerimin bu metindeki amaçla hesabımda saklanmasına ve işlenmesine özgür irademle açık rıza veriyorum.')}</span></label>
      <p className="consent-p">{t('Rızanı istediğin an Hesap › Açık rızamı geri al ile geri alabilirsin.')}</p>
      <button type="button" id="consent-no" className="btn ghost full" disabled={busy || externalBusy} onClick={onClose}>{t('Rıza vermeden misafir devam et')}</button>
      <button type="button" id="consent-yes" className="btn primary full" disabled={!ok || busy || externalBusy} onClick={accept}>{t('Rıza veriyorum')}</button>
    </div>
  );
}
function PrivacyBody({ openSheet }) {
  return (
    <div className="acct privacy">
      <p><b>{t('Veri sorumlusu:')}</b> {t('{co} (ABD).', { co: LEGAL.COMPANY })}</p>
      <p><b>{t('Ne saklanır:')}</b> {t('Hesaplıysan e-posta adresin; planların, antrenman ve set kayıtların (saatleriyle), notların, uyku girişlerin, hedeflerin ve ayarların.')}</p>
      <p><b>{t('Nerede:')}</b> {t('Hesapsız kullanımda yalnızca bu telefonda; bize gelmez. Giriş yapınca Google Firebase’in Frankfurt (Almanya) sunucularında; telefonda da bir kopya kalır.')}</p>
      <p><b>{t('Kim görür:')}</b> {t('Yalnızca sen. Her kullanıcı sadece kendi verisine erişebilir; bu kural sunucuda zorunlu.')}</p>
      <p><b>{t('Satış ve reklam:')}</b> {t('Yok. Uygulamada reklam, analiz ya da takip yazılımı bulunmaz.')}</p>
      <p><b>{t('Silme ve kopya:')}</b> {t('Dışa aktar ile JSON kopyanı al. Hesap › Hesabı sil ile hesabını ve tüm verilerini sil. Misafirsen Bu telefondaki verileri sil.')}</p>
      {openSheet ? <LegalLinks openSheet={openSheet} /> : null}
    </div>
  );
}

export { AccountChip, AccountBody, ConsentBody, LangPicker, PrivacyBody };
