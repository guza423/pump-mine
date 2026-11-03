# V09 · Hesap + bulut veritabanı (Firebase)

**Ön koşul:** V08 tamamlanmış olmalı. Repoda `firebase-config.json` (kökte) ve `android/app/google-services.json` bulunmalı. Bunlar yoksa bu göreve başlama; kullanıcıya "Firebase dosyaları eksik, `docs/FIREBASE-KURULUM.md`'ye bak" de ve dur. `firebase-config.example.json` yalnızca şablondur.

Referans: `reference/v09/` (hesap ekranları dahil; `performance.html`'i tarayıcıda aç). Kurallar dosyası: kökteki `firestore.rules` (kullanıcı Firebase konsoluna elle yükler).

## Hedef
- Kullanıcı hesapsız da kullanabilir (misafir: veri yalnızca telefonda, Dexie).
- Google ya da e-posta/şifre ile giriş yapınca tüm veri Firestore'a taşınır. Bundan sonra her kayıt önce telefona yazılır (çevrimdışı önbellek), internet gelince buluta gider.
- Her kullanıcı yalnızca kendi verisini görür.
- **Hiçbir kayıt kaybolmaz:** bekleyen yazma varken çıkış yapılamaz, taşıma sunucuda onaylanmadan yerel veri silinmez.

## 1) Bağımlılıklar
- `firebase` (modüler JS SDK v11+ ya da güncel sürüm).
- `@capacitor-firebase/authentication`: `@capacitor/core` 8 ile uyumlu major sürüm. `npm view @capacitor-firebase/authentication peerDependencies` ile kontrol et.
- `capacitor.config.ts`:
  ```ts
  plugins: {
    SystemBars: { insetsHandling: 'native', style: 'DARK' },
    FirebaseAuthentication: { skipNativeAuth: true, providers: ['google.com'] },
  }
  ```
- Android: `google-services.json` varken Capacitor şablonu `com.google.gms.google-services` eklentisini uygular. `android/build.gradle`'da classpath'in olduğunu doğrula; yoksa ekle.

## 2) Firebase başlatma: `src/lib/cloud/firebase.ts`
```ts
import cfg from '../../../firebase-config.json';
const app = initializeApp(cfg);
export const auth = initializeAuth(app, { persistence: indexedDBLocalPersistence });
auth.languageCode = 'tr';
export const fs = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentSingleTabManager(undefined) }) });
```
`getAuth` kullanma. Capacitor WebView'de popup/redirect çözümleyicisi sorun çıkarır; `initializeAuth` + `indexedDBLocalPersistence` şart.

## 3) Veri modeli
- Firestore yolları: `users/{uid}` ve alt koleksiyonlar `programs`, `sessions`, `exercises`, `checkins`, `settings`. Belge kimliği mevcut `id`.
- Belge içeriği bugünkü tiplerle aynı. `settings` belgesi `{ key, value }`, belge kimliği `key`.
- `users/{uid}` belgesi: `{ email, createdAt, consent: { v: 1, at }, appVersion }`.
- `firestore.rules` repoda kalsın (kullanıcı konsola elle yükler). Bir rules birim testi gerekmez.

## 4) Depolama katmanı
`useLogStore` aynı arayüzle (`state` + `put` + `del`) iki arka uç arasında geçsin:
- **LocalBackend:** bugünkü Dexie kodu (misafir).
- **CloudBackend:** her koleksiyon için `onSnapshot(query, { includeMetadataChanges: true })`. `sessions` için `orderBy('startedAt', 'desc'), limit(300)`, `checkins` için `orderBy('at', 'desc'), limit(90)`.
  - `put` = `setDoc(doc(fs, 'users', uid, kind, id), data)`. Promise'i **bekleme**; çevrimdışıyken sunucu onayına kadar çözülmez. Hata olursa `catch` ile `error` durumuna yaz.
  - `del` = `deleteDoc`.
  - Bekleyen yazma sayısı = tüm koleksiyonlarda `doc.metadata.hasPendingWrites` olan belge sayısı.
  - Son eşitleme zamanı = bekleyen yazma 0'a indiği an.
  - Çevrimiçi durum = `navigator.onLine` + `snapshot.metadata.fromCache`.
- Store'un `state`'ine ekle: `account: { mode: 'guest' | 'user', uid, email, provider, pending, lastSync, online }`.

## 5) Giriş akışı
- **Google:**
  - Android/iOS: `FirebaseAuthentication.signInWithGoogle()`, sonra `signInWithCredential(auth, GoogleAuthProvider.credential(result.credential.idToken))`.
  - Web: `signInWithPopup(auth, new GoogleAuthProvider())`.
- **E-posta:** `createUserWithEmailAndPassword`, `signInWithEmailAndPassword`, `sendPasswordResetEmail`. Hataları Türkçe göster: yanlış şifre, kullanıcı yok, e-posta kullanımda, zayıf şifre, ağ hatası.
- **Onay:** İlk girişte `users/{uid}.consent` yoksa ConsentBody açılır (prototipteki metin ve onay kutusu). Kabul edilmezse oturumu kapat ve misafir kal.
- **Misafirden hesaba taşıma** (onaydan sonra, bir kez):
  1. Dexie'deki tüm veriyi oku. Buluttaki koleksiyonları bir kez oku (`getDocsFromServer`; çevrimdışıysa taşımayı beklet ve "İnternete bağlanınca taşınacak" de).
  2. Saf bir fonksiyonla birleştir, `src/lib/cloud/merge.ts` → `mergeGuestIntoCloud(local, cloud)`. Yazılacak belgeleri döndürür:
     - `programs`: aynı id varsa `updatedAt` büyük olan kazanır.
     - `sessions`: aynı id varsa toplam set sayısı fazla olan kazanır; eşitse bulut.
     - `checkins`: `at` büyük olan kazanır.
     - `exercises`: birleşim.
     - `settings`: bulutta varsa bulut.
  3. `writeBatch` ile en fazla 400'lük parçalar halinde yaz, sonra `waitForPendingWrites(fs)`.
  4. Ancak bundan sonra Dexie verisini `snapshots` tablosuna tek bir JSON anlık görüntüsü olarak kopyala (`{ at, uid, data }`, 30 gün sakla) ve aktif tabloları boşalt.
  5. Taşıma yarıda kalırsa bir sonraki açılışta kaldığı yerden tekrar dene; yerel veriye dokunma.
- **Çıkış:**
  - Bekleyen yazma > 0 ise engelle; prototipteki uyarıyı göster.
  - Değilse `signOut`, `terminate(fs)`, `clearIndexedDbPersistence(fs)`, sonra `location.reload()`. Uygulama boş misafir olarak açılır.
- **Hesap silme:**
  - Çevrimiçi olmalı.
  - Önce `users/{uid}` altındaki tüm belgeleri batch ile sil, sonra `users/{uid}`'yi, sonra `auth.currentUser.delete()`.
  - `auth/requires-recent-login` gelirse aynı yöntemle yeniden doğrulat (Google tekrar ya da şifre sor) ve devam et.
  - Bitince yerel önbelleği temizleyip yeniden yükle.

## 6) Arayüz (prototipteki gibi, birebir)
- Bugün başlığında `AccountChip`:
  - Misafir: kişi simgesi, sarı nokta.
  - Bekleyen yazma: bulut simgesi, yanıp sönen sarı nokta.
  - Her şey bulutta: yeşil nokta.
  - Çevrimdışı ve bekleyen yoksa gri nokta.
- Misafirken ve en az bir antrenman varken Bugün'de tek satırlık `guest-banner`.
- Sayfalar:
  - `AccountBody`: misafir ve giriş yapılmış halleri.
  - `ConsentBody`
  - `PrivacyBody`: veri sorumlusu satırı yer tutucu kalsın.
- "Verilerimi dışa aktar (JSON)" mevcut `BackupPanel` dışa aktarımını kullanır.
- Programlar altındaki Yedekle / Geri yükle kalsın. Geri yükleme hesaptayken buluta yazar.
- Hesap durumu değişince (giriş/çıkış) tüm sayfalar kapanır ve Bugün açılır.

## 7) Testler
- `merge.test.ts`: her koleksiyon kuralı için en az bir örnek, aynı id çakışmaları, boş bulut, boş yerel.
- Store: Firebase'i taklit eden bellek içi bir CloudBackend ile:
  - misafir → giriş → taşıma → yerel tablolar boş ve snapshot var;
  - bekleyen yazma varken çıkış engelleniyor.
- `screens.test.tsx`: misafir akışı aynen çalışmalı. Hesap sayfası açılıyor; e-posta formu, onay sayfası ve hesap silme onayı ("SİL" yazmadan düğme pasif) çalışıyor. Firebase çağrıları test ortamında taklit edilsin.

## 8) Teslim
- README'ye "Hesap ve yedek" bölümü: veri nerede, misafir modu, çıkış ve silme. Geliştiriciler için `firebase-config.json` ve `google-services.json` notu.
- AGENTS.md "Veri" bölümüne Firestore yollarını, misafir/hesap davranışını ve taşıma kurallarını ekle.
- "Her görevin sonunda" kuralı geçerli: `npm test` ve `npm run build` geçsin, doğrudan `main`'e push et.
- `GOREV.md`'de bu görevi "Tamamlanan"a taşı.
