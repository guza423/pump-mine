// @ts-nocheck
import React, { useState } from 'react';
import { Icon } from '../lab/Cns';
import { exportBackup } from '../programlar/BackupPanel';
import { accountError } from '../../lib/cloud/errors';
const hm = ts => new Date(ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
function AccountChip({ acct, onClick }) {
  const state = acct.mode === 'guest' ? 'guest' : acct.pending ? 'pending' : acct.online ? 'ok' : 'offline';
  const label = acct.mode === 'guest' ? 'Misafir: kayıtlar yalnızca bu telefonda' : acct.pending ? acct.pending + ' kayıt buluta gönderilmeyi bekliyor' : acct.online ? 'Tüm kayıtlar bulutta' : 'Çevrimdışı: kayıtlar bu telefonda hazır';
  return (
    <button type="button" id="account-btn" className={'acct-chip ' + state} onClick={onClick} aria-label={'Hesap. ' + label} title={label}>
      <Icon name={acct.mode === 'guest' ? 'user' : 'cloud'} size={17} />
      <i className="acct-dot" />
    </button>
  );
}
function AccountBody({ st, acct, actions, openSheet, onClose }) {
  const [mode, setMode] = useState(null); // null | 'email'
  const [isNew, setIsNew] = useState(false);
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState(null); // 'out' | 'del'
  const [delTxt, setDelTxt] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const run = async (action, success) => { setBusy(true); setMessage(''); try { await action(); if (success) setMessage(success); } catch (error) { setMessage(accountError(error)); } finally { setBusy(false); } };
  const status = <>{message || st.error ? <p className="backup-status bad" role="status">{message || st.error}</p> : null}{busy || acct.busy || acct.migrating ? <p role="status">İşlem sürüyor…</p> : null}</>;
  const n = { p: st.programs.length, s: st.sessions.filter((x) => x.status === 'done').length, c: st.checkins.length };
  const valid = /.+@.+\..+/.test(email) && pass.length >= 6;
  if (acct.mode === 'guest') {
    return (
      <div className="acct">{status}
        <div className="acct-hero">
          <Icon name="cloud" size={22} />
          <div>
            <strong>Kayıtların şu an yalnızca bu telefonda</strong>
            <p>Giriş yap: her set buluta yedeklenir, telefon değişse de hesabınla geri gelir. İnternet yokken de kaydeder, bağlantı gelince gönderir.</p>
          </div>
        </div>
        {acct.waiting ? <div className="pop flat"><p>İnternete bağlanınca taşınacak. Yerel kayıtların korunuyor.</p><button type="button" className="btn primary" disabled={busy} onClick={() => run(actions.retryMigration)}>Yeniden dene</button></div> : null}
        <p className="acct-move mono">Bu telefondaki {n.p} program, {n.s} antrenman ve {n.c} uyku kaydı hesabına taşınır.</p>
        <button type="button" id="google-signin" className="btn google full" disabled={busy || !!acct.uid} onClick={() => run(actions.google)}><span className="g-mark">G</span> Google ile devam et</button>
        {mode === 'email' ? (
          <div className="acct-form">
            <input id="acct-email" className="text-in" type="email" inputMode="email" autoComplete="email" placeholder="E-posta" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input id="acct-pass" className="text-in" type="password" autoComplete={isNew ? 'new-password' : 'current-password'} placeholder={isNew ? 'Şifre (en az 6 karakter)' : 'Şifre'} value={pass} onChange={(e) => setPass(e.target.value)} />
            <button type="button" id="acct-email-go" className="btn primary full" disabled={!valid || busy || !!acct.uid} onClick={() => run(() => actions.email(email.trim(), pass, isNew))}>{isNew ? 'Hesap oluştur' : 'Giriş yap'}</button>
            <div className="acct-links">
              <button type="button" className="linkbtn" onClick={() => setIsNew(!isNew)}>{isNew ? 'Hesabın var mı? Giriş yap' : 'Hesabın yok mu? Oluştur'}</button>
              {!isNew ? <button type="button" className="linkbtn" disabled={busy || !/.+@.+\..+/.test(email)} onClick={() => run(() => actions.reset(email.trim()), 'Şifre sıfırlama e-postası gönderildi.')}>Şifremi unuttum</button> : null}
            </div>
          </div>
        ) : <button type="button" id="email-signin" className="btn ghost full" onClick={() => setMode('email')}><Icon name="mail" size={15} /> E-posta ile devam et</button>}
        <button type="button" className="linkbtn" onClick={() => openSheet('privacy', {})}><Icon name="shield" size={13} /> Verilerin nasıl saklanır?</button>
      </div>
    );
  }
  return (
    <div className="acct">{status}
      <div className="acct-user">
        <span className="acct-av">{(acct.email || '?')[0].toUpperCase()}</span>
        <div><strong>{acct.email}</strong><small>{acct.provider === 'google.com' ? 'Google hesabı' : 'E-posta hesabı'} · giriş yapıldı</small></div>
      </div>
      <div className={'acct-sync ' + (acct.pending ? 'pending' : acct.online ? 'ok' : 'offline')}>
        <Icon name="cloud" size={16} />
        <span>{acct.pending ? acct.pending + ' kayıt bekliyor; internet gelince gönderilecek' : acct.online ? 'Tüm kayıtlar bulutta' : 'Çevrimdışı · kayıtlar bu telefonda hazır'}</span>
        <small className="mono">{acct.lastSync ? 'son eşitleme ' + hm(acct.lastSync) : ''}</small>
      </div>
      <p className="acct-move mono">{n.p} program · {n.s} antrenman · {n.c} uyku kaydı</p>
      <button type="button" className="btn ghost full" disabled={busy} onClick={() => run(() => exportBackup(actions.readBackup))}>Verilerimi dışa aktar (JSON)</button>
      <button type="button" className="linkbtn" onClick={() => openSheet('privacy', {})}><Icon name="shield" size={13} /> Gizlilik ve veri kullanımı</button>
      {confirm === 'out' ? (
        <div className="pop flat">
          <p>{acct.pending ? acct.pending + ' kayıt henüz buluta gitmedi. Çıkarsan bu telefondan silinir. İnternete bağlanıp bekle.' : 'Çıkış yapınca kayıtların bu telefondan kalkar, hesabında durur.'}</p>
          <div className="confirm-inline">
            <button type="button" id="signout-yes" className="btn danger sm" disabled={!!acct.pending || busy || acct.waiting} onClick={() => run(actions.logout)}>Çıkış yap</button>
            <button type="button" className="btn ghost sm" onClick={() => setConfirm(null)}>Vazgeç</button>
          </div>
        </div>
      ) : confirm === 'del' ? (
        <div className="pop flat">
          <p>Hesabın ve buluttaki tüm kayıtların kalıcı olarak silinir; geri alınamaz. Onaylamak için <b>SİL</b> yaz.</p>
          {acct.provider !== 'google.com' ? <input id="delete-password" className="text-in" type="password" autoComplete="current-password" placeholder="Şifreni tekrar gir" value={password} onChange={e => setPassword(e.target.value)} /> : null}
          <input id="del-confirm" className="text-in" value={delTxt} onChange={(e) => setDelTxt(e.target.value)} placeholder="SİL" />
          <div className="confirm-inline">
            <button type="button" id="delete-yes" className="btn danger sm" disabled={delTxt.trim().toLocaleUpperCase('tr') !== 'SİL' || busy || acct.pending > 0 || !acct.online} onClick={() => run(() => actions.deleteAccount(password))}>Hesabı kalıcı sil</button>
            <button type="button" className="btn ghost sm" onClick={() => { setConfirm(null); setDelTxt(''); }}>Vazgeç</button>
          </div>
        </div>
      ) : (
        <div className="acct-danger">
          <button type="button" id="signout" className="btn ghost sm" onClick={() => setConfirm('out')}>Çıkış yap</button>
          <button type="button" id="delete-account" className="btn ghost sm danger-t" onClick={() => setConfirm('del')}><Icon name="trash" size={13} /> Hesabı sil</button>
        </div>
      )}
    </div>
  );
}
function ConsentBody({ onAccept, onClose, busy: externalBusy }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const status = error ? <p role="alert">{error}</p> : null;
  const accept = async () => { setBusy(true); try { await onAccept(); } catch (e) { setError(accountError(e)); } finally { setBusy(false); } };
  const [ok, setOk] = useState(false);
  return (
    <div className="acct">{status}
      <p className="consent-p">Hesabına şunlar kaydedilir: programların, antrenman ve set kayıtların, notların, uyku saatlerin ve hedefin. Bunlar yalnızca sana gösterilir, yorgunluk ve gelişim hesapları için kullanılır, kimseyle paylaşılmaz ve satılmaz. Veriler Avrupa’daki (Frankfurt) sunucularda tutulur.</p>
      <p className="consent-p">Uyku ve antrenman verisi sağlıkla ilgili sayılabileceği için açık rızan gerekir. Rızanı istediğin an hesabını silerek geri alabilirsin; o zaman tüm verilerin silinir.</p>
      <label className="check-row"><input id="consent-check" type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} /> Antrenman ve uyku verilerimin bu amaçla saklanmasına açık rıza veriyorum.</label>
      <button type="button" className="btn ghost full" disabled={busy || externalBusy} onClick={onClose}>Misafir olarak devam et</button>
      <button type="button" id="consent-yes" className="btn primary full" disabled={!ok || busy || externalBusy} onClick={accept}>Kabul et ve devam et</button>
    </div>
  );
}
function PrivacyBody() {
  return (
    <div className="acct privacy">
      <p><b>Ne saklanır:</b> e-posta adresin, programların, antrenman ve set kayıtların (saatleriyle), notların, uyku girişlerin, hedefin.</p>
      <p><b>Nerede:</b> Hesapsız kullanımda yalnızca bu telefonda. Giriş yapınca Google Firebase’in Avrupa (Frankfurt) sunucularında; telefonda da bir kopya kalır, internet yokken kayıt buraya yazılır.</p>
      <p><b>Kim görür:</b> Yalnızca sen. Her kullanıcı sadece kendi verisine erişebilir; bu kural sunucuda zorunlu.</p>
      <p><b>Silme:</b> Hesap › Hesabı sil ile hesabın ve tüm verilerin kalıcı silinir. Dışa aktar ile istediğin an JSON kopyasını alabilirsin.</p>
      <p className="ex-src">Veri sorumlusu ve iletişim bilgisi yayın öncesi eklenecek.</p>
    </div>
  );
}


export { AccountChip, AccountBody, ConsentBody, PrivacyBody };
