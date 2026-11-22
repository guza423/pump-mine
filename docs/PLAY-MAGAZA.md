# OUTMOVE · Google Play mağaza sayfası ve formlar

Hazırlayan: Claude, 20 Kasım 2026 (V28). Play Console'a kopyala-yapıştır için. Görseller `docs/play-store/`, üretimleri `scripts/store-shots.mjs` (örnek veriyle ham ekranlar) ve `scripts/store-art.mjs` (başlıklı vitrin + öne çıkan görsel).

Play Console'da sol menü: **Büyüme › Mağaza varlığı › Ana mağaza girişi** (metin + görseller) ve **Politika ve programlar › Uygulama içeriği** (formlar). Varsayılan dil İngilizce; Türkçe için aynı sayfada **Çeviriler › Kendi çevirilerimi yönet › Türkçe (tr-TR)** ekle.

---

## 1. Mağaza girişi · English (en-US, varsayılan)

**Uygulama adı** (en fazla 30):
```
OUTMOVE: Workout Tracker
```

**Kısa açıklama** (en fazla 80):
```
Log every set in seconds. Track fatigue, sleep and strength in one place.
```

**Tam açıklama** (en fazla 4000):
```
Log fast. Train smart.

OUTMOVE is a workout log built for the gym floor. Open it, start a quick workout and log a set in seconds. Then see what that training actually did to you.

LOG A SET IN SECONDS
• Drag bars to set weight and reps. No tiny buttons, no typing.
• Tap how fast the last rep moved. OUTMOVE turns it into reps in reserve (RIR) for you.
• Plates per side, your sets so far and estimated 1RM on the same screen.
• The rest timer starts on its own and alerts you when rest is over, even with the screen locked.

KNOW WHEN TO PUSH
• A live fatigue score built from your hard sets, how close to failure they were and your sleep.
• See roughly how long you need to recover.
• Weekly load per muscle, with alerts when a muscle gets too little or too much work.

WATCH YOUR STRENGTH CLIMB
• Estimated 1RM for every lift, calculated only from sets close to failure.
• Strength goals, and skill goals with four learning stages.
• A calendar with repeating plan days and a monthly summary.

TRAIN WITH A PLAN OR WITHOUT ONE
• Build plans day by day: sets, rep ranges, target effort and rest.
• Or skip the plan: start a quick workout and add exercises as you go.

466 EXERCISES, REAL BIOMECHANICS
• Strength, Olympic lifts, plyometrics and skills, searchable in English or Turkish.
• Interactive biomechanics: see joint torque through the full range of motion.

YOUR DATA, YOUR CALL
• Works offline from the first launch. No account needed.
• Sign in with Google or email to sync across devices and keep a cloud copy.
• Export everything as a JSON file. Delete your account from inside the app.
• No ads. No analytics. No tracking.

Available in English and Turkish.

OUTMOVE is a training tool, not medical advice. If you have a health condition, talk to a professional before starting a new program.
```

**Görseller** (`docs/play-store/`):
- Uygulama simgesi: `icon-512.png` (512×512, 32 bit PNG)
- Öne çıkan görsel: `en/feature-graphic.png` (1024×500)
- Telefon ekran görüntüleri: `en/01-session.png` … `en/08-biomech.png` (8 adet, 1080×1920; bu sırayla yükle)
- Tablet ekran görüntüsü zorunlu değil, boş bırak.

## 2. Mağaza girişi · Türkçe (tr-TR)

**Uygulama adı**:
```
OUTMOVE: Antrenman Takibi
```

**Kısa açıklama**:
```
Her seti saniyeler içinde kaydet. Yorgunluk, uyku ve gücünü tek yerde izle.
```

**Tam açıklama**:
```
Hızlı kaydet. Akıllı çalış.

OUTMOVE, salonda kullanılmak için yapılmış bir antrenman günlüğü. Aç, plansız antrenmanı başlat, seti saniyeler içinde kaydet. Sonra o antrenmanın sana gerçekte ne yaptığını gör.

SETİ SANİYELER İÇİNDE KAYDET
• Kilo ve tekrarı çubukları sürükleyerek ayarla. Küçük düğme yok, yazı yazmak yok.
• Son tekrarın ne kadar yavaşladığına dokun. OUTMOVE bunu senin için yedek tekrara (RIR) çevirir.
• Taraf başına plakalar, o ana kadarki setlerin ve tahmini 1RM aynı ekranda.
• Dinlenme sayacı kendiliğinden başlar, ekran kilitliyken bile dinlenme bitince haber verir.

NE ZAMAN YÜKLENECEĞİNİ BİL
• Zor setlerinden, tükenişe ne kadar yaklaştığından ve uykundan hesaplanan canlı yorgunluk puanı.
• Toparlanmak için yaklaşık ne kadar süre gerektiğini gör.
• Kas başına haftalık yük; bir kas çok az ya da çok fazla çalıştığında uyarı.

GÜCÜNÜN ARTIŞINI İZLE
• Her hareket için tahmini 1RM, yalnızca tükenişe yakın setlerden hesaplanır.
• Güç hedefleri ve dört öğrenme aşamalı beceri hedefleri.
• Tekrar eden plan günleri ve aylık özetiyle takvim.

PLANLA YA DA HEMEN BAŞLA
• Günü gününe plan kur: set, tekrar aralığı, hedef zorluk ve dinlenme.
• Ya da planı atla: plansız antrenmana gir, hareketleri yolda ekle.

466 HAREKET, GERÇEK BİYOMEKANİK
• Kuvvet, olimpik kaldırışlar, pliometrik ve beceri hareketleri; Türkçe ya da İngilizce aranabilir.
• Etkileşimli biyomekanik: hareket boyunca eklem torkunu gör.

VERİN SENİN
• İlk açılıştan itibaren internetsiz çalışır. Hesap gerekmez.
• Cihazlar arasında eşitlemek ve bulutta kopya tutmak için Google ya da e-postayla giriş yap.
• Her şeyi JSON dosyası olarak dışa aktar. Hesabını uygulamanın içinden sil.
• Reklam yok. Analitik yok. Takip yok.

Türkçe ve İngilizce.

OUTMOVE bir antrenman aracıdır, tıbbi tavsiye değildir. Bir sağlık sorunun varsa yeni bir programa başlamadan önce bir uzmana danış.
```

**Görseller**: aynı ikon; `tr/feature-graphic.png`; `tr/01-session.png` … `tr/08-biomech.png`.

---

## 3. Mağaza ayarları (Büyüme › Mağaza varlığı › Mağaza ayarları)

- Uygulama mı oyun mu: **Uygulama**
- Kategori: **Sağlık ve Fitness**
- Etiketler: listeden antrenman/fitness takibine en yakın olanları seç (en fazla 5).
- İletişim e-postası: `wworksof@gmail.com` (herkese görünür; gizlilik politikasındaki adresle aynı).
- Web sitesi: `https://guza423.github.io/pump-mine/`
- Telefon: boş bırak.

## 4. Uygulama içeriği formları (Politika ve programlar › Uygulama içeriği)

**Gizlilik politikası**
- URL: `https://guza423.github.io/pump-mine/legal.html#privacy-en`
- Şirket adresi ve iletişim e-postası politikada (20 Kasım, `src/legal/meta.ts`).

**Oturum açma bilgileri** (eski adı "Uygulama erişimi")
- 21 Kasım: kullanıcı **Hayır** işaretleyip kaydetti. İnceleme hesap ister ya da reddederse Uygulama içeriği › Oturum açma bilgileri › Yönet'ten aşağıdakiyle değiştirilir.
- Önerilen: **Evet** (kısıtlanmış bölüm var). İnceleme ekibi yeni hesap açamıyor; bulut eşitleme ve hesap silme yalnızca girişle görülüyor.
- Uygulamada bir test hesabı aç: Dashboard › sağ üst hesap simgesi › Continue with email. E-posta: `wworksof+playreview@gmail.com` (Gmail'in + takma adı; postalar wworksof'a gelir), şifreyi sen belirle. E-posta doğrulaması istenmiyor.
- Formda: e-posta + şifre, talimat (İngilizce):
  `Every feature also works without an account (guest mode). The account is only needed for cloud sync and account deletion: Dashboard > account icon (top right) > Continue with email.`

**Reklamlar**
- **Hayır, uygulamamda reklam yok.**

**İçerik derecelendirmesi** (IARC anketi)
- E-posta: `wworksof@gmail.com`. Kategori: **Diğer tüm uygulama türleri** (All Other App Types).
- Şiddet, korku, cinsellik, kumar, küfür, uyuşturucu/alkol/tütün, kaba mizah: hepsi **Hayır**.
- Kullanıcılar birbiriyle etkileşebilir ya da içerik paylaşabilir mi: **Hayır** (sosyal özellik yok).
- Kullanıcının konumunu paylaşıyor mu: **Hayır**. Dijital ürün satın alma: **Hayır**. Sınırsız internet erişimi (tarayıcı/arama motoru): **Hayır**.
- Beklenen sonuç: herkes / 3+ yaş.

**Hedef kitle ve içerik**
- Hedef yaş grubu: yalnızca **18 ve üzeri** (Kullanım Koşulları 18 yaş sınırı koyuyor).
- Uygulama çocukların ilgisini çekebilir mi: **Hayır**.

**Veri güvenliği**
- Uygulamanız zorunlu kullanıcı veri türlerinden herhangi birini topluyor ya da paylaşıyor mu: **Evet**.
- Toplanan tüm kullanıcı verileri aktarım sırasında şifreleniyor mu: **Evet**.
- Kullanıcıların verilerinin silinmesini isteyebileceği bir yol sunuyor musunuz: **Evet**. Hesap silme URL'si: `https://guza423.github.io/pump-mine/legal.html#deletion-en`
- Hesap oluşturma: **Evet**, kullanıcı adı/e-posta + şifre ve Google ile giriş (OAuth).
- Toplanan veriler (hepsi: **Toplanır**, **Paylaşılmaz**, **geçici işlenmez**, **İsteğe bağlı**, çünkü hesapsız kullanılabiliyor):

| Kategori › Veri türü | Ne | Amaç |
|---|---|---|
| Kişisel bilgiler › Ad | Google ile girişte Google'ın verdiği ad Firebase hesabına yazılıyor | Hesap yönetimi |
| Kişisel bilgiler › E-posta adresi | Giriş e-postası | Uygulama işlevselliği, Hesap yönetimi |
| Kişisel bilgiler › Kullanıcı kimlikleri | Firebase kullanıcı kimliği (UID) | Uygulama işlevselliği, Hesap yönetimi |
| Sağlık ve fitness › Sağlık bilgileri | Uyku saatleri, zorluk (RPE/RIR), notlardaki ağrı/sakatlık gibi bilgiler | Uygulama işlevselliği |
| Sağlık ve fitness › Fitness bilgileri | Antrenman kayıtları: planlar, setler, kilo, tekrar, süreler, hedefler | Uygulama işlevselliği |
| Uygulama etkinliği › Kullanıcı tarafından oluşturulan diğer içerikler | Notlar, kendi eklediğin hareketler | Uygulama işlevselliği |

- Toplanmayanlar: konum, kişiler, fotoğraf/video, ses, dosyalar, takvim, mesajlar, finans, cihaz kimlikleri, reklam kimliği, kilitlenme ve teşhis kayıtları, analitik.
- "Paylaşılır" işaretlenmez: Firebase (Google) veriyi bizim adımıza işleyen hizmet sağlayıcı; Play bunu paylaşım saymıyor.

**Reklam kimliği**
- Uygulama reklam kimliği kullanıyor mu: **Hayır**.

**Kamu (devlet) uygulaması**: **Hayır**. **Finansal özellikler**: **Uygulamam finansal özellik sunmuyor**. **Haber uygulaması**: **Hayır**.

**Sağlık uygulamaları beyanı**
- Özellikler: fitness/aktivite takibi ve uyku ile ilgili seçenekleri işaretle.
- Tıbbi cihaz mı, teşhis/tedavi sunuyor mu, sağlık araştırması mı: **Hayır**.

## 4b. Otomatik dahili test (V30)

`main`'e her kod push'unda `release.yml` imzalı AAB üretir ve **dahili test** kanalına yükler; telefonda güncelleme Play Store'dan gelir (birkaç dakika). Yalnızca belge değişen push'lar ve `[skip ci]` atlanır. Sürüm notu commit başlığıdır.

Bir kerelik kurulum (kullanıcı yapar; anahtar dosyası depoya **asla** girmez):
1. Google Cloud Console, proje `outmove-cd140` › **API'ler ve Hizmetler › Kitaplık** › "Google Play Android Developer API" › **Etkinleştir**.
2. **IAM ve Yönetici › Hizmet hesapları › Hizmet hesabı oluştur**: ad `play-upload`, rol verme (boş geç) › Bitti. Hesaba gir › **Anahtarlar › Anahtar ekle › Yeni anahtar oluştur › JSON** (dosya iner).
3. Play Console › **Kullanıcılar ve izinler › Yeni kullanıcıları davet et**: e-posta `play-upload@outmove-cd140.iam.gserviceaccount.com` › **Uygulama izinleri › Uygulama ekle › OUTMOVE** › "Uygulama bilgilerini görüntüleme" ve **"Uygulamaları test kanallarına yayınlama"** › Davet et. (Üretim izni verilmez; üretime çıkarmak elle kalır.)
4. GitHub › repo **Settings › Secrets and variables › Actions › New repository secret**: ad `PLAY_SERVICE_ACCOUNT_JSON`, değer JSON dosyasının **tüm içeriği**. Sonra indirilen JSON dosyasını bilgisayardan sil.
5. Actions › "Build Play Store AAB" › **Run workflow** ile dene; "Upload to Play internal testing" adımı yeşil olmalı.

Telefonda: Play sürümü kurulu kalır; debug APK **kurulmaz** (aynı paket, farklı imza: kurulum reddedilir, Play sürümünü kaldırmak cihazdaki misafir verisini siler). Güncelleme görünmezse Play Store › OUTMOVE sayfasını yenile.

## 5. Herkese açık yayın (Üretim)

1. Yukarıdakiler bitince Play Console › **Yayınlama özeti**'nde eksik kalmamalı.
2. **Test et ve yayınla › Üretim › Yeni sürüm oluştur** › "Kitaplıktan ekle" ile dahili testteki AAB'yi (1.0.0) seç. Sürüm notu: `First release.`
3. Ülkeler: **Üretim › Ülkeler/bölgeler**'den başlangıç için istediğin ülkeleri ekle (örn. tümü).
4. **İncelemeye gönder.** İlk sürümde Google incelemesi genelde birkaç gün sürüyor.

Göndermeden önce yapılması gerekenler (`docs/PROJE.md` › Play Store):
- Firebase Blaze + bütçe uyarısı + günlük yedek (başkaları veri girmeye başlamadan önce).
