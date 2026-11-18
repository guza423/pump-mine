import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { browserPopupRedirectResolver, createUserWithEmailAndPassword, deleteUser, EmailAuthProvider, GoogleAuthProvider, onAuthStateChanged, reauthenticateWithCredential, reauthenticateWithPopup, sendPasswordResetEmail, signInWithCredential, signInWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth';
import { clearIndexedDbPersistence, collection, doc, getDoc, getDocFromCache, getDocsFromServer, setDoc, terminate, writeBatch } from 'firebase/firestore';
import { auth, fs } from './firebase';
import { CloudBackend } from './CloudBackend';
import { collectionFor, kinds } from '../store/backend';
import type { AccountRuntime, AccountUser } from '../store/controller';
import { db, restoreBackup } from '../store/database';
import type { BackupData } from '../store/types';
import { LEGAL } from '../../legal/meta';
import { readAcceptance } from '../../legal/acceptance';

async function googleCredential() {
  const result = await FirebaseAuthentication.signInWithGoogle();
  if (!result.credential?.idToken) throw new Error('Google kimliği alınamadı.');
  return GoogleAuthProvider.credential(result.credential.idToken);
}

async function clearDevice() {
  await terminate(fs);
  await clearIndexedDbPersistence(fs);
  await db.meta.put({ key: 'empty-guest', value: true });
  location.reload();
}

// Kullanıcının tüm alt koleksiyonlarını sunucudan siler (hesap silme ve rızayı geri alma ortak).
async function deleteCloudRecords(uid: string) {
  for (const kind of kinds) {
    const snap = await getDocsFromServer(collection(fs, 'users', uid, collectionFor(kind)));
    for (let offset = 0; offset < snap.docs.length; offset += 400) {
      const batch = writeBatch(fs);
      snap.docs.slice(offset, offset + 400).forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
  }
}

export const accountRuntime: AccountRuntime = {
  watch(next, error) {
    return onAuthStateChanged(auth, user => next(user ? { uid: user.uid, email: user.email, provider: user.providerData[0]?.providerId || 'password' } : null), error);
  },
  async consent(user: AccountUser) {
    const ref = doc(fs, 'users', user.uid);
    const snap = await (navigator.onLine ? getDoc(ref) : getDocFromCache(ref));
    return snap.data()?.consent?.v === LEGAL.CONSENT_VERSION;
  },
  async accept(user: AccountUser) {
    if (!navigator.onLine) throw new Error('Onayı kaydetmek için internete bağlan.');
    const ref = doc(fs, 'users', user.uid);
    const previous = await getDoc(ref);
    // Açık rıza (sürümü ve tarihi) ile Kullanım Koşulları kabulü ayrı alanlarda tutulur.
    await setDoc(ref, {
      email: user.email,
      createdAt: previous.data()?.createdAt || Date.now(),
      consent: { v: LEGAL.CONSENT_VERSION, at: Date.now(), text: LEGAL.VERSION },
      terms: readAcceptance() || { v: LEGAL.VERSION, at: Date.now() },
      appVersion: '0.9',
    }, { merge: true });
  },
  backend: user => new CloudBackend(fs, user.uid),
  async google() {
    if (Capacitor.isNativePlatform()) await signInWithCredential(auth, await googleCredential());
    else await signInWithPopup(auth, new GoogleAuthProvider(), browserPopupRedirectResolver);
  },
  async email(email, password, create) {
    if (create) await createUserWithEmailAndPassword(auth, email, password);
    else await signInWithEmailAndPassword(auth, email, password);
  },
  reset: email => sendPasswordResetEmail(auth, email),
  reject: () => signOut(auth),
  async logout() {
    await signOut(auth);
    if (Capacitor.isNativePlatform()) await FirebaseAuthentication.signOut();
    await clearDevice();
  },
  async deleteAccount(password) {
    const user = auth.currentUser;
    if (!user) throw new Error('Önce giriş yap.');
    if (!navigator.onLine) throw new Error('Hesabı silmek için internete bağlan.');
    // Reauthenticate before deleting documents, so an expired login cannot leave half an account.
    if (user.providerData.some(x => x.providerId === 'google.com')) {
      if (Capacitor.isNativePlatform()) await reauthenticateWithCredential(user, await googleCredential());
      else await reauthenticateWithPopup(user, new GoogleAuthProvider(), browserPopupRedirectResolver);
    } else {
      if (!password) throw new Error('Silmek için şifreni tekrar gir.');
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email!, password));
    }
    await deleteCloudRecords(user.uid);
    const batch = writeBatch(fs);
    batch.delete(doc(fs, 'users', user.uid));
    await batch.commit();
    await deleteUser(user);
    await db.snapshots.where('uid').equals(user.uid).delete();
    if (Capacitor.isNativePlatform()) await FirebaseAuthentication.signOut();
    await clearDevice();
  },
  // Açık rızayı geri alma: bulut kayıtları silinir, hesabın e-postası kalır, kayıtlar bu cihazda misafir olarak devam eder.
  async withdraw(keep: BackupData) {
    const user = auth.currentUser;
    if (!user) throw new Error('Önce giriş yap.');
    if (!navigator.onLine) throw new Error('Rızanı geri almak için internete bağlan.');
    // Bir adım yarıda kalırsa kayıtlar kaybolmasın: önce cihazda 30 günlük güvenlik kopyası.
    await db.snapshots.add({ at: Date.now(), uid: 'withdraw:' + user.uid, data: keep });
    await deleteCloudRecords(user.uid);
    // Rıza kaydı: yalnızca geri alındığı bilgisi kalır (e-posta ve eski içerik yazılmaz).
    await setDoc(doc(fs, 'users', user.uid), { consent: { v: 0, withdrawnAt: Date.now() } });
    await signOut(auth);
    if (Capacitor.isNativePlatform()) await FirebaseAuthentication.signOut();
    await db.snapshots.where('uid').equals(user.uid).delete();
    await terminate(fs);
    await clearIndexedDbPersistence(fs);
    await restoreBackup({ format: 'performance-backup', version: 2, exportedAt: new Date().toISOString(), data: keep });
    await db.snapshots.where('uid').equals('withdraw:' + user.uid).delete();
    location.reload();
  },
};
