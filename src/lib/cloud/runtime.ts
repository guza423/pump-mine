import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { browserPopupRedirectResolver, createUserWithEmailAndPassword, deleteUser, EmailAuthProvider, GoogleAuthProvider, onAuthStateChanged, reauthenticateWithCredential, reauthenticateWithPopup, sendPasswordResetEmail, signInWithCredential, signInWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth';
import { clearIndexedDbPersistence, collection, doc, getDoc, getDocFromCache, getDocsFromServer, setDoc, terminate, writeBatch } from 'firebase/firestore';
import { auth, fs } from './firebase';
import { CloudBackend } from './CloudBackend';
import { collectionFor, kinds } from '../store/backend';
import type { AccountRuntime, AccountUser } from '../store/controller';
import { db } from '../store/database';

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

export const accountRuntime: AccountRuntime = {
  watch(next, error) {
    return onAuthStateChanged(auth, user => next(user ? { uid: user.uid, email: user.email, provider: user.providerData[0]?.providerId || 'password' } : null), error);
  },
  async consent(user: AccountUser) {
    const ref = doc(fs, 'users', user.uid);
    const snap = await (navigator.onLine ? getDoc(ref) : getDocFromCache(ref));
    return snap.data()?.consent?.v === 1;
  },
  async accept(user: AccountUser) {
    if (!navigator.onLine) throw new Error('Onayı kaydetmek için internete bağlan.');
    const ref = doc(fs, 'users', user.uid);
    const previous = await getDoc(ref);
    await setDoc(ref, { email: user.email, createdAt: previous.data()?.createdAt || Date.now(), consent: { v: 1, at: Date.now() }, appVersion: '0.9' }, { merge: true });
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
    for (const kind of kinds) {
      const snap = await getDocsFromServer(collection(fs, 'users', user.uid, collectionFor(kind)));
      for (let offset = 0; offset < snap.docs.length; offset += 400) {
        const batch = writeBatch(fs);
        snap.docs.slice(offset, offset + 400).forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
    }
    const batch = writeBatch(fs);
    batch.delete(doc(fs, 'users', user.uid));
    await batch.commit();
    await deleteUser(user);
    await db.snapshots.where('uid').equals(user.uid).delete();
    if (Capacitor.isNativePlatform()) await FirebaseAuthentication.signOut();
    await clearDevice();
  },
};
