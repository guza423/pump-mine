import { initializeApp } from 'firebase/app';
import { indexedDBLocalPersistence, initializeAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentSingleTabManager } from 'firebase/firestore';
import cfg from '../../../firebase-config.json';

const app = initializeApp(cfg);
export const auth = initializeAuth(app, { persistence: indexedDBLocalPersistence });
auth.languageCode = 'tr';
export const fs = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentSingleTabManager(undefined) }),
});
