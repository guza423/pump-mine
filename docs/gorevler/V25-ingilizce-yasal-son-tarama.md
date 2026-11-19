# V25 · İngilizce yasal metinler + son tarama

Önce `V21-dil-altyapisi-ingilizce.md`.

## Yasal metinler
- `src/legal/texts/` altına İngilizceleri: `terms-en.md` (Kullanım Koşulları), `kvkk-notice-en.md` (KVKK Aydınlatma, bilgi amaçlı çeviri; "Türkçe metin esastır" notu), `consent-en.md` (Açık Rıza), `deletion-en.md` (Hesap ve veri silme). `privacy-en.md` var; `gizlilik.md` ile içerik eşitliğini kontrol et.
- `docs.ts`: `appDocId()` her metni etkin dildeki karşılığına eşlesin; uygulama listesi İngilizcede yalnızca İngilizce metinleri göstersin.
- Herkese açık `legal.html`: İngilizce metinler de sekme olarak (Play Store bağlantıları değişmez).
- `LEGAL.VERSION`: içerik anlamca değişmiyorsa artırma (kullanıcılar kapıyı yeniden görmesin); rıza metni değişirse `CONSENT_VERSION` kuralı geçerli.

## Son tarama
- `i18n-screens.test.tsx`: dört sekmenin hepsi İngilizce ve Türkçe harf yok (kullanıcı verisi hariç).
- `flowEn` tüm akışı kapsasın; Türkçe akış da kalsın.
- `AGENTS.md`, `docs/PROJE.md`, `README.md`: "Arayüz dili" bölümlerini güncelle.

## Yapılan (2026-11-19, Claude)
- İngilizce yasal metinler: `terms-en.md` (Terms of Use), `kvkk-notice-en.md` (KVKK Privacy Notice; "Türkçe metin esastır"), `consent-en.md` (Explicit Consent Notice), `deletion-en.md` (Account and data deletion). `privacy-en.md` Türkçe Gizlilik Politikası'yla eşitlendi (eksikti: KVKK m.11 hakları tek tek, başvuru usulü ve Kurul'a şikâyet süreleri, 72 saat ihlal bildirimi, 6 ay periyodik imha, ebeveyn iletişimi, ilgili metin bağlantıları); başlığı artık "Privacy Policy".
- Hangi metin esas: Türkiye'deki kullanıcı için Türkçe, diğerleri için İngilizce (Terms, Privacy, Consent); KVKK Aydınlatma'nın İngilizcesi bilgi amaçlı.
- İngilizce metinlerde uygulama yolları İngilizce arayüzle aynı: "Account › Export my data (JSON)", "Delete account", "Withdraw my consent", "Delete data on this phone", DELETE yaz, "I give my consent".
- `meta.ts` › `fillLegal(md, lang)`: şirket açıklaması, bölge ve eksik alan uyarıları İngilizce metinde İngilizce.
- `docs.ts`: her metnin dili ve karşılığı (`pair`), `docIn()`, `legalDocsIn()`. Uygulama tarafı ayrı dosyada (`appDocs.ts`): metne Türkçe kimlikle başvurulur, `appDocId()` etkin dildekini açar; Hesap › Legal listesi beş metni etkin dilde gösterir. Herkese açık sayfa uygulamanın dil katmanını yüklemez (paylaşılan paket ~70 KB küçüldü).
- `legal.html`: sekmeler metnin dilinde, üstte diğer dile geçiş bağlantısı (aynı metnin karşılığı). Bağlantısız açılış tarayıcı dili Türkçeyse Türkçe, değilse İngilizce gizlilik politikası. Play bağlantıları (`#gizlilik`, `#silme`) değişmedi; İngilizce: `#privacy-en`, `#deletion-en`.
- `LEGAL.VERSION` ve `CONSENT_VERSION` artırılmadı: içerik anlamca değişmedi, kullanıcılar kapıyı yeniden görmez.
- Son tarama:
  - Kaynakta `t()` dışında kalan Türkçe metinler AST ile tarandı; kalanlar veri (kütüphane, kas, not seçenekleri) ya da `byLang` Türkçe tarafı. `Cns.tsx` içindeki `StageRecovery`, `model()`, `Axon` uygulamada kullanılmıyor (çevrilmedi).
  - Türkçe harf taşımayan Türkçe kelimeler de artık yakalanıyor (sözlükte geçip İngilizcelerde geçmeyen kelimeler). Bulduğu: biyomekanikte "Triceps · dirsek ekstansiyonu" satırı İngilizcede Türkçeydi.
  - Aynı satırda V24 hatası: kas vurgusu satırlarının kimliği modelden düşüyordu, "target" etiketi kaybolmuştu. Düzeldi, testi var.
  - `index.html` dili `en`, açıklama İngilizce; PWA manifest açıklaması İngilizce, `lang: 'en'`; Android dinlenme bildirimi hata kayıtları İngilizce.
- Testler: `legal.test.ts` (karşılık eşleşmesi, bölüm/madde/tablo satırı eşitliği, İngilizce metinde Türkçe yok, bağlantılar aynı dilde, `appDocId`), İngilizce ekranlar (kapıdaki üç metin, Hesap › Legal beş metin, metin içi bağlantı, Türkçeye geçince Türkçe metin), `test:layout`: kapıda Terms, Hesap'ta Privacy Policy ve herkese açık sayfanın on metni (320 ve 884 px).
- Hukukçu kontrolü İngilizce metinler için de gerekli (`docs/PROJE.md` › Açık işler).
