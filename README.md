# OUTMOVE

Android telefonları hedefleyen, çevrimdışı çalışan antrenman uygulaması. Misafir kullanımında veri cihazda kalır; isteğe bağlı hesap ile Firebase'e eşitlenir. Vite + React + TypeScript uygulaması Capacitor ile Android için paketlenir ve dört ana sekmeye ayrılır:

- **Bugün:** zaman damgalı zor setler ve uyku girişlerinden yorgunluk, toparlanma, haftalık plan ve hedef.
- **Antrenman:** antrenman türleri, aktif set kaydı, dinlenme sayacı ve dönem filtreli geçmiş.
- **Programlar:** program editörü, şablonlar ve üç haftalık seans başı/sonu yorgunluk analizi.
- **Lab:** Temeller dersleri ve Türkçe/İngilizce arama, tür, kas, ekipman filtreleriyle 438 hareket (359 kuvvet, 28 olimpik, 51 pliometrik).

## Yerelde çalıştırma

Node.js 22 veya daha yenisi gerekir.

```bash
npm ci
npm run dev
```

Üretim derlemesi ve model testleri:

```bash
npm test
npm run build
npm run preview
```

## Android projesini yerelde çalıştırma

Yerel Android derlemesi için JDK 21 ve Android SDK 36 gerekir. Android Studio 2025.2.1 veya daha yenisi bu gereksinimleri birlikte kurmanın en kolay yoludur; APK almak için Android Studio zorunlu değildir.

Web uygulamasını derleyip Capacitor projesine kopyala:

```bash
npm ci
npm run android:sync
```

Projeyi Android Studio'da açmak için:

```bash
npm run android:open
```

Komut satırından debug APK oluşturmak için macOS/Linux'ta:

```bash
cd android
./gradlew assembleDebug
```

Windows PowerShell'de:

```powershell
cd android
.\gradlew.bat assembleDebug
```

Yerel APK `android/app/build/outputs/apk/debug/app-debug.apk` konumunda oluşur. Web kodunda veya Capacitor eklentilerinde değişiklik yaptıktan sonra yeniden `npm run android:sync` çalıştır.

## Veri ve yedekleme

Misafirken programlar, antrenmanlar, özel hareketler, uyku girişleri ve hedef tarayıcının IndexedDB alanında tutulur. İlk açılışta **Hipertrofi bloğu** örnek programı eklenir. Her set, uyku girişi ve antrenman başlangıç/bitişi zaman damgalıdır.

**Programlar** listesinin altındaki **Yedekle** düğmesi bütün veriyi v2 JSON olarak dışa aktarır. Web sürümü dosyayı indirir; Android sürümü Capacitor Filesystem ve Share ile sistem paylaşım menüsünü açar. **Geri yükle**, seçilen OUTMOVE yedeğini doğrular ve mevcut yerel verinin yerine koyar. Tarayıcı verilerini temizlemeden veya telefon değiştirmeden önce yedek alın.

## Hesap ve yedek

Bugün başlığındaki kişi/bulut simgesinden **Hesap ve yedek** açılır. Google veya e-posta/şifre ile giriş yapılabilir; e-posta ekranında hesap oluşturma ve şifre sıfırlama da bulunur. Hesap kullanmak zorunlu değildir. İlk girişte antrenman ve uyku verisinin saklanması için açık rıza istenir; kabul etmezsen misafir olarak devam edersin. Google Analytics başlatılmaz.

Onaydan sonra misafir verisi `users/{uid}` altındaki `programs`, `sessions`, `exercises`, `checkins`, `settings` koleksiyonlarına taşınır. Programlarda yeni `updatedAt`, seanslarda fazla set, uykuda yeni `at` kazanır; eşitlikte bulut korunur. Özel hareketler birleşir, buluttaki ayarlar korunur. Taşıma sunucuda onaylanmadan yerel veri silinmez. Tam yerel kopya, Dexie `snapshots` tablosunda 30 gün tutulur ve açılışta eski kopyalar temizlenir. Bağlantı kesilirse taşıma yeniden denenir; yerel kayıtlar korunur.

Hesapta her yazma önce Firestore'un cihazdaki kalıcı IndexedDB önbelleğine alınır, bağlantı gelince buluta gider. Sarı yanıp sönen nokta bekleyen kayıt, yeşil nokta eşitlenmiş veri, gri nokta çevrimdışı durumu gösterir. Ekranda son 300 antrenman ve 90 uyku girişi izlenir; JSON dışa aktarımı bütün koleksiyonları okur. Çevrimdışı dışa aktarımda yalnızca cihazda önbelleğe alınmış bulut kayıtları bulunabilir; tam arşiv için çevrimiçi dışa aktar.

**Çıkış** bekleyen yazma veya tamamlanmamış taşıma varken engellenir. Eşitleme bittikten sonra çıkış, bulut önbelleğini temizler ve boş misafir alanı açar; buluttaki kayıtlar hesabında kalır. **Hesabı sil** çevrimiçi bağlantı, `SİL` onayı ve yeniden Google/şifre doğrulaması ister; kullanıcının bütün koleksiyonları ve hesabı silinir. Programlar altındaki yedekleme hesapta da çalışır; geri yükleme hesaptaki veriyi değiştirir ve çevrimdışı yazmaları kuyruğa alır.

Geliştiriciler: kökte gerçek `firebase-config.json`, Android'de `android/app/google-services.json` gerekir; örnek dosya çalışma yapılandırması değildir. Kurulum: [Firebase kurulumu](docs/FIREBASE-KURULUM.md). Web alan adını Firebase Auth yetkili alanlarına ekle. Android paket adı `app.performance.training`, veritabanı adı `performance-training` korunur; Google için `client_type: 3` web istemcisi ve APK imzasının SHA-1/SHA-256 kayıtları gerekir. `android/variables.gradle` Google yerel bağımlılıklarını etkinleştirir. `firestore.rules` konsoldan yayımlanır. Kullanılan SDK davranışları: [Firestore çevrimdışı önbellek](https://firebase.google.com/docs/firestore/manage-data/enable-offline), [Capacitor Firebase Authentication](https://capawesome.io/docs/sdks/capacitor/firebase/authentication/).

## Hesap modelleri

- Pliometrik kayıtta ek yük, temas ve sıçrama kalitesi tutulur. Temaslar tonaj, e1RM, zor set ve RPE ortalamasına katılmaz; yoğunluğa göre ayrı yük üretir ve 36 saatlik aynı azalmayı kullanır. Bir seansta 140 üstü temas için uyarı gösterilir.

- Hız seçici yükten ve tekrar sayısından bağımsız olarak `5+ / 3 / 2 / 1 / 0 RIR` eşlemesini kullanır. Bench hareketlerinde tahmini m/s, diğer hareketlerde ilk tekrara göre temsili yüzde gösterilir.
- e1RM yalnızca `RIR ≤ 4` ve `tekrar + RIR ≤ 12` koşulunu sağlayan setlerde Epley ile hesaplanır.
- Antrenman yorgunluğu son yedi gündeki zor setlere; tükeniş yakınlığı, hareket maliyeti ve 36 saatlik üstel azalma uygulanarak hesaplanır. Uyku puanı yalnızca bilinen geceleri kullanır.
- Bütün yorgunluk, hız ve e1RM sonuçları tahmindir; arayüz dayanağı ve belirsizliği açıkça belirtir.

## PWA ve canlı adres

Uygulama çevrimdışı önbelleğe alınır ve destekleyen mobil tarayıcılarda ana ekrana eklenebilir. Her push, test ve build başarılı olduğunda GitHub Pages'e otomatik olarak dağıtılır:

<https://guza423.github.io/pump-mine/>

Workflow, ilk dağıtımda GitHub Pages'i etkinleştirir ve sonraki push'larda siteyi otomatik günceller.

PR açıldığında otomatik test edilir, main'e birleşir ve APK üretilir.

## APK

Her push ve elle tetiklenen çalıştırma, **Build Android debug APK** GitHub Actions workflow'unu başlatır. APK'yı indirmek için:

1. GitHub deposunda **Actions** sekmesini aç.
2. Soldan **Build Android debug APK** workflow'unu, ardından başarılı bir çalıştırmayı seç.
3. Sayfanın altındaki **Artifacts** bölümünden `outmove-<çalıştırma numarası>` dosyasını indir.
4. İndirilen ZIP'i aç ve içindeki `app-debug.apk` dosyasını telefona aktar.

Telefonda APK'ya dokun ve istendiğinde kullandığın tarayıcı/dosya yöneticisi için **Bilinmeyen uygulamaları yükle** iznini ver. Play Protect debug uygulama için uyarı gösterebilir. Bu APK geliştirme/test amaçlıdır ve Play Store için imzalanmış bir sürüm değildir.

İmza sabitlendi. Bu sürümden önceki bir APK yüklüyse telefondan bir kez kaldır, sonra yenisini kur. Bundan sonraki sürümler üstüne kurulur, veriler kalır.
