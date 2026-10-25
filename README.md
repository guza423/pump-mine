# PERFORMANCE

Android telefonları hedefleyen; sunucusuz, çevrimdışı çalışan kuvvet antrenmanı uygulaması. Vite + React + TypeScript ile geliştirilen v0.7, Capacitor ile Android uygulaması olarak paketlenir ve dört ana sekmeye ayrılır:

- **Bugün:** zaman damgalı zor setler ve uyku girişlerinden yorgunluk, toparlanma, haftalık plan ve hedef.
- **Antrenman:** antrenman türleri, aktif set kaydı, dinlenme sayacı ve dönem filtreli geçmiş.
- **Programlar:** program editörü, şablonlar ve üç haftalık seans başı/sonu yorgunluk analizi.
- **Lab:** yorgunluk modelinin dört adımı, sinir sistemi dersleri, simülatör ve biyomekanik hareket kartları.

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

Programlar, antrenmanlar, özel hareketler, uyku girişleri ve hedef tarayıcının IndexedDB alanında tutulur; bir sunucuya gönderilmez. İlk açılışta **Hipertrofi bloğu** örnek programı eklenir. Her set, uyku girişi ve antrenman başlangıç/bitişi zaman damgalıdır.

**Programlar → Veri** ekranındaki **Yedekle** düğmesi bütün veriyi v2 JSON olarak dışa aktarır. Web sürümü dosyayı indirir; Android sürümü Capacitor Filesystem ve Share ile sistem paylaşım menüsünü açar. **Geri yükle**, seçilen PERFORMANCE yedeğini doğrular ve mevcut yerel verinin yerine koyar. Tarayıcı verilerini temizlemeden veya telefon değiştirmeden önce yedek alın.

## Hesap modelleri

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
3. Sayfanın altındaki **Artifacts** bölümünden `performance-debug-apk` dosyasını indir.
4. İndirilen ZIP'i aç ve içindeki `app-debug.apk` dosyasını telefona aktar.

Telefonda APK'ya dokun ve istendiğinde kullandığın tarayıcı/dosya yöneticisi için **Bilinmeyen uygulamaları yükle** iznini ver. Play Protect debug uygulama için uyarı gösterebilir. Bu APK geliştirme/test amaçlıdır ve Play Store için imzalanmış bir sürüm değildir.
