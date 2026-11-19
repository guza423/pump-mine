# V27 · Play Store hazırlığı: imzalı AAB ve alarm izni

Kullanıcı: "outmove yi yavaştan playstoreye yükleyim ne dersin. neler gerekiyor şimdi" · "tamam oldu şimdi" (Play Console kuruluş web sitesi doğrulandıktan sonra)

Amaç: Play Console'a yüklenecek imzalı AAB'yi CI'da üretmek ve Play'in reddedeceği `USE_EXACT_ALARM` iznini kaldırmak.

## Kapsam
- `USE_EXACT_ALARM` kaldırılır. Play politikası bu izni yalnızca çekirdek işlevi alarm/zamanlayıcı ya da takvim olan uygulamalara veriyor; başkaları için `SCHEDULE_EXACT_ALARM` (aynı işlev, kullanıcı izniyle) öneriliyor.
- Dinlenme sayacı izin yoksa gecikmeli alarmla çalışmaya devam eder (zaten vardı). Kullanıcı izni Hesap ve ayarlar'dan açabilir.
- Yayın (upload) anahtarı, GitHub Secrets'tan imzalanan `bundleRelease`, AAB yapıt olarak.

## Yapılan (2026-11-19, Claude)
- `AndroidManifest.xml`: `USE_EXACT_ALARM` yok; `SCHEDULE_EXACT_ALARM` artık her sürümde (önce `maxSdkVersion="32"`).
- `RestTimerPlugin.java`: `exactAlarm()` → `{ needed, allowed }` (Android 12+ ve `canScheduleExactAlarms()`), `openExactAlarmSettings()` → Ayarlar › Alarmlar ve hatırlatıcılar (`ACTION_REQUEST_SCHEDULE_EXACT_ALARM`). `start()` değişmedi: izin varsa `setExactAndAllowWhileIdle`, yoksa `setAndAllowWhileIdle`.
- `restTimer.ts`: `exactAlarmStatus()`, `openExactAlarmSettings()`; web'de gerekmez (`needed: false`).
- `Account.tsx`: ses/titreşim/animasyon anahtarlarının altında, yalnızca Android 12+ ve izin kapalıyken uyarı + "İzni aç" düğmesi (`#exact-alarm`). Ayar ekranından dönünce (görünürlük değişince) durum yeniden okunur. İngilizcesi `en/account.ts`.
- Yayın anahtarı: PKCS12, takma ad `upload`, RSA 4096, 10000 gün, "CN=PRWAGON LLC". Anahtar ve şifre **repoda yok**; kullanıcıya dosya olarak verildi, GitHub Secrets'a o ekler: `UPLOAD_KEYSTORE_BASE64`, `UPLOAD_KEYSTORE_PASSWORD`.
  - SHA-1: `97:B2:84:BD:D6:A5:22:B6:C5:89:D7:CB:8A:1B:A3:A1:35:90:68:33`
  - SHA-256: `11:D6:85:D1:7F:91:94:16:1C:6F:5E:6A:4C:15:44:E7:73:B5:DA:7C:8F:8E:35:B9:84:D2:70:FF:40:E8:9B:92`
- `android/app/build.gradle`: `signingConfigs.release` ortam değişkenlerinden (`UPLOAD_KEYSTORE_FILE`, `UPLOAD_KEYSTORE_PASSWORD`); değişken yoksa release imzasız kalır, debug derlemesi etkilenmez. `versionName` Play derlemesinde `OUTMOVE_VERSION_NAME`'den.
- `.github/workflows/release.yml` ("Build Play Store AAB"): `android/release.txt` main'de değişince ya da elle (Run workflow) çalışır. Sırrı kontrol eder, test + `android:sync` + `bundleRelease`, AAB'nin yükleme anahtarıyla imzalandığını SHA-256 ile doğrular, `outmove-play-<sürüm>-<n>` yapıtı (90 gün). `versionCode` = bu iş akışının çalışma sayısı (1, 2, 3…; artan).
- `android/release.txt`: Play sürüm adı (`1.0.0`). Yeni Play sürümü = bu dosyayı artır, push.

## Kalan (kullanıcı)
- GitHub Secrets'a iki sır; sonra `release.txt`'i değiştir ya da Actions'tan çalıştır.
- Play Console'da uygulama oluşturulunca Play App Signing açık kalsın; App integrity'deki **uygulama imzalama anahtarı** SHA-1/SHA-256'sını (ve isteğe bağlı yükleme anahtarı SHA-1'ini) Firebase › Proje ayarları › Android uygulaması'na ekle. Yoksa Play'den inen sürümde Google girişi çalışmaz.
- Play'den kurmadan önce telefondaki debug APK kaldırılmalı (paket adı aynı, imza farklı). Hesapla giriş yapan kullanıcının bulut verisi etkilenmez.
