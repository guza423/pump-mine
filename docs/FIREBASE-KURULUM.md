# Firebase kurulumu (bir kez, ~15 dk, bilgisayardan)

Google hesabınla https://console.firebase.google.com adresine gir. Menü Türkçe ya da İngilizce olabilir; parantez içinde İngilizcesi var.

## 1) Proje
- **Proje ekle (Add project)** → ad: `performance` → Google Analytics: **kapalı** → Oluştur.

## 2) Giriş yöntemleri
- Sol menü **Derleme (Build) → Authentication → Başlayın (Get started)**.
- **Oturum açma yöntemi (Sign-in method)** sekmesi:
  - **E-posta/Şifre (Email/Password)** → Etkinleştir → Kaydet.
  - **Google** → Etkinleştir → proje destek e-postası olarak kendi adresini seç → Kaydet.
- **Ayarlar (Settings) → Yetkili alan adları (Authorized domains)** → **Alan adı ekle** → `guza423.github.io` (uygulamanın web sürümü için).

## 3) Veritabanı
- **Derleme → Firestore Database → Veritabanı oluştur (Create database)**.
- Konum: **europe-west3 (Frankfurt)**. Sonradan değiştirilemez.
- **Üretim modunda başlat (Start in production mode)**.
- Açılınca **Kurallar (Rules)** sekmesi → içindekini tamamen sil → repo kökündeki `firestore.rules` dosyasının içeriğini yapıştır → **Yayınla (Publish)**.

## 4) Android uygulaması
- Sol üstte dişli → **Proje ayarları (Project settings) → Genel (General)** → en altta **Uygulamalarınız** → Android simgesi.
- Paket adı: `app.performance.training`
- Takma ad: `PERFORMANCE`
- Hata ayıklama imza sertifikası SHA-1:
  `C5:34:1E:AF:12:E4:35:0E:1A:48:D4:69:BB:6B:90:85:02:C3:1F:64`
- **Uygulamayı kaydet** → **google-services.json indir**. Kalan adımlarda sadece İleri'ye bas.
- Aynı sayfada Android uygulamasının altında **Parmak izi ekle (Add fingerprint)** → SHA-256:
  `EE:71:15:42:1B:BF:BE:4D:DD:F8:EE:5A:C3:5A:36:A9:FC:D7:B0:E2:F5:D2:47:32:A2:DD:4F:21:C6:DC:7B:F6`

Bu iki parmak izi, APK'yı imzalayan sabit anahtarın. Google ile girişin çalışması için gerekli.

## 5) Web uygulaması
- Aynı yerde **Uygulama ekle → Web (</>)** → takma ad: `PERFORMANCE web` → Hosting **işaretleme** → Kaydet.
- Ekranda `firebaseConfig = { apiKey: ..., authDomain: ..., ... }` çıkar. Bu altı değeri kopyala (6. adımda kullanılacak).

## 6) İki dosyayı repoya koydur
- 4. adımda indirdiğin `google-services.json` ve 5. adımdaki `firebaseConfig` değerleri gerekiyor.
- En kolayı: ikisini Claude'a sohbette gönder; Claude `android/app/google-services.json` ve kökte `firebase-config.json` olarak repoya koyar.
- Ya da kendin koy: `firebase-config.example.json`'ı `firebase-config.json` adıyla kopyala, değerleri doldur.
- Sonra Codex'e (ya da Claude'a) yaz: `GOREV.md'yi uygula`

Bu iki dosyadaki değerler gizli değildir; Firebase'de veriyi koruyan şey 3. adımdaki kurallar. Repoya girmeleri normal.

## 7) Herkese açmadan önce (şimdi şart değil)
- **Ödeme planı:** Proje ayarları → Kullanım ve faturalandırma → **Blaze**'e geç. Ücretsiz kotalar aynen geçerli; aşmadıkça ödeme çıkmaz.
- **Bütçe uyarısı:** Hemen bir bütçe uyarısı kur (ör. 1 $).
- **Günlük yedek:** Firestore → **Felaket kurtarma / Yedekler (Disaster recovery / Backups)** → günlük yedek, 7 gün saklama. Yedek için Blaze gerekiyor.
- **Gizlilik metni:** Veri sorumlusu adını ve iletişim adresini gizlilik metnine ekle (uygulamada "Gizlilik" sayfası). Metnin son halini bir hukukçuya kontrol ettirmeni öneririm.
