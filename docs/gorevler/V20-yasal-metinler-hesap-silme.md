# V20 · Yasal metinler (KVKK + GDPR), kabul kapısı, açık rıza, hesap/veri silme, akıcı animasyonlar

Uygulayan: Claude. Kullanıcı istekleri:
1. animasyonlar "bir tık kasıyor";
2. isteyen hesabını silebilsin;
3. KVKK ve AB (GDPR) gizlilik metinleri çok detaylı olsun;
4. "okudum onaylıyorum" akışı; kurallar önemli;
5. firma adı PRWAGON LLC.

## Yapılan

### Yasal metinler (`src/legal/texts/*.md`, tek kaynak)
- `kosullar.md` Kullanım Koşulları: sağlık uyarısı ve risk üstlenme, 18 yaş, hesap, misafir veri kaybı, içerik, yasaklar, fikri mülkiyet, ücret, garanti reddi, sorumluluk sınırı (TBK m.115 ve tüketici hakları saklı), fesih, değişiklik, Wyoming hukuku + tüketicinin emredici hakları.
- `gizlilik.md` Gizlilik Politikası (KVKK + GDPR): veri sorumlusu, iki kullanım biçimi, veri kategorileri tablosu, amaç–hukuki sebep tablosu (KVKK m.5/m.6, GDPR m.6/m.9), alıcılar, yurt dışı aktarım (KVKK m.9 standart sözleşme + 5 iş günü bildirim; GDPR DPF/SCC), saklama süreleri, güvenlik ve ihlal bildirimi, KVKK m.11 ve GDPR m.15–22 hakları, başvuru usulü ve süreler, yaş sınırı, izinler, yerel depolama, değişiklikler.
- `aydinlatma.md` KVKK Aydınlatma Metni (m.10 ve Aydınlatma Tebliği), `riza.md` ayrı Açık Rıza Metni (sağlık verisi niteliği taşıyabilecek veriler), `silme.md` Hesap ve veri silme (Google Play web bağlantısı için), `privacy-en.md` İngilizce gizlilik politikası.
- Yer tutucular `src/legal/meta.ts` içinde: `ADDRESS`, `EMAIL`, `TR_REP`, `EU_REP` boş → metinde "[… yayın öncesi eklenecek]". **EIN ve kişisel bilgi depoya yazılmaz** (`legal.test.ts` denetler).
- `LEGAL.VERSION` metin sürümüdür; **yalnızca önemli değişiklikte** artırılır, artınca herkes kapıyı yeniden görür. `CONSENT_VERSION` (şimdi 2) açık rıza metni değişince artar.

### Uygulama akışı
- **Kabul kapısı** (`LegalGate`, ilk açılış ve sürüm değişince): sağlık uyarısı, üç metne bağlantı, iki ayrı kutu:
  1. "18 yaşını doldurdum. Kullanım Koşulları’nı okudum, kabul ediyorum." (kabul);
  2. "KVKK Aydınlatma Metni’ni ve Gizlilik Politikası’nı okudum." (yalnızca okundu; onay/rıza değil, KVKK İlke Kararı 2026/347).
  Kabul cihazda `localStorage['outmove.legal'] = {v, at}`; hesap açılınca `users/{uid}.terms` alanına da yazılır.
- **Açık rıza** (hesap açarken, ayrı pencere): ayrı başlık ve beyan, Açık Rıza Metni bağlantısı; "Rıza vermeden misafir devam et" / "Rıza veriyorum". `users/{uid}.consent = {v: 2, at, text: VERSION}`. v1 rızası olanlardan yeniden istenir.
- **Hesap penceresi:** "Yasal" bölümü (6 metin), hesaplıda **Açık rızamı geri al** (bulut kayıtları silinir, `consent = {v: 0, withdrawnAt}`, çıkış yapılır, kayıtlar cihazda misafir olarak kalır; önce 30 günlük cihaz kopyası alınır), misafirde **Bu telefondaki verileri sil** (1 sn basılı). Hesabı sil aynı kaldı; uyarı metni cihaz kopyasını da söyler.
- **Herkese açık sayfa** `legal.html` (Vite ikinci giriş): `https://guza423.github.io/pump-mine/legal.html#gizlilik`, `#kosullar`, `#aydinlatma`, `#riza`, `#silme`, `#privacy-en`. Google Play gizlilik ve hesap silme bağlantıları buraya verilir. PWA bu sayfayı `index.html`'e yönlendirmez.

### Animasyon akıcılığı
- Pixel animasyonlarının adım sayısı arttı (uçuş 16, iniş 20, parçacık 9–11, açılış/toast 6–7, İDMAN BİTTİ 10); hâlâ kare kare ama daha akıcı.
- Hareket eden öğelere `will-change`.
- Set paneli parlaması gölge/arka plan boyamak yerine ayrı katmanda yalnızca opaklıkla oynar.
- Dinlenmede ekran saniyede 4 yerine 1 kez çizilir; kilo sürüklerken parçacık patlaması en fazla ~9/sn.

## Kullanıcının yapması gerekenler (kod dışı)
- `meta.ts`: şirket adresi ve gizlilik e-postası (kişisel değil, ör. privacy@… alan adı).
- VERBİS: yurt dışında yerleşik veri sorumlusu olarak, Türkiye’de yerleşik **veri sorumlusu temsilcisi** ile kayıt; sonra `TR_REP`.
- KVKK m.9: Google ile standart sözleşme ve imzadan sonra **5 iş günü** içinde Kuruma bildirim.
- GDPR m.27: AB’den kullanıcı alınacaksa AB temsilcisi; sonra `EU_REP`.
- Google Play: Gizlilik politikası ve "hesap silme" bağlantısı olarak `legal.html#gizlilik` / `legal.html#silme`; Veri güvenliği formu bu metinlerle uyumlu doldurulur.
- Firebase Auth "Authorized domains" listesinde `guza423.github.io` olmalı (web’den silme için).
- Metinleri bir hukukçuya kontrol ettir.

## Kontroller
`npm test` (102 test), lint, `tsc -b`, build, `test:layout` (yeni ekranlar: yasal-kapi, yasal-metin, yasal-kosullar).
