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

## Play App Signing (19 Kasım, Play Console › Google Play ile korunanlar › Uygulama imzalama)
Google'ın uygulama imzalama anahtarı; Play'den inen sürüm bununla imzalı. Firebase'de Android uygulamasına eklenmesi gereken bunlar (Klasik anahtar):
- SHA-1: `0E:E3:42:3A:61:E7:DA:9B:4C:46:3E:80:E3:CC:AF:EB:5D:47:2F:1C`
- SHA-256: `78:7A:2B:CE:E7:88:1F:70:92:3C:C7:C1:94:58:59:5B:90:AB:70:8A:AB:6A:1E:E3:DF:25:41:31:94:E2:27:29`

Kuantum sonrası kriptografi anahtarı (Beta, bilgi için; bugünkü cihazlar ve Google girişi klasik imzaya bakar):
- SHA-1: `9C:4D:DB:FE:AB:0A:72:37:A7:AE:9B:94:F9:BC:7F:27:D2:30:B1:29`
- SHA-256: `0C:DF:FD:A4:8C:DD:5B:A3:1E:47:9C:C0:80:ED:79:6F:C8:29:23:AD:DF:E7:96:59:81:84:69:E5:2C:2C:8E:2C`
