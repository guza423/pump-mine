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
