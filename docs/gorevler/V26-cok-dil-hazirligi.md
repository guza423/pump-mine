# V26 · Çok dil hazırlığı (yeni Latin alfabeli diller hızlı eklensin)

Kullanıcı: "Tamam arapça yapmayız sadece latin alfebeler. Ön harılık iyi olur hızlıca sonra bir iki dil daha eklemek isterim"

Amaç: V21–V25'teki gibi sekme sekme uğraşmadan, yeni bir dilin yalnızca çeviri dosyalarıyla eklenmesi. Bu görev dil eklemez; altyapıyı ve testleri hazırlar. Yöntem: `AGENTS.md` › Dil › "Yeni dil ekleme".

## Kapsam
- Dil listesi ve dil paketleri (`src/i18n/langs.ts`, `dicts.ts`, `types.ts`); eksik metinde İngilizceye düşme.
- Çoğul: `Intl.PluralRules` (Fransızcada 0 tekil; çok biçimli diller için `{ one, few, many, other }`).
- Sayı, ondalık ve yüzde dilin yerel ayarından (`decimalSep()`, `pct()`).
- `byLang('bağlam', { tr, en })`: diğer diller Türkçe yapının metinlerini sözlükten (`bağlam|metin`) alır.
- Kütüphane hareket adları dil paketinden (yoksa İngilizce ad).
- Yasal metinler `texts/<dil>/<taban>.md`; klasördeki dil kendiliğinden görünür, yoksa İngilizcesi.
- Testler: her ek dilin sözlüğü eksiksiz; iş listesi üretimi; sözde dil ekran taraması; yerleşim akışı her dilde.

## Yapılan (2026-11-19, Claude)
- `langs.ts` (dil satırları, kaynak `tr`, yedek `en`), `dicts.ts` (dil paketleri), `types.ts` (sözlük ve çoğul tipleri). `index.ts`: `t`/`tc` etkin dil → İngilizce → Türkçe; `registerLang()` yalnızca testler için.
- 19 `byLang` sabitine bağlam adı verildi (`months`, `wdlong`, `prof`, `speed`, `eq`, `kind`…); `byLangKeys()` çevrilecek metinleri listeler.
- `exName()`: Türkçe dışındaki dillerde paketteki ad, yoksa İngilizce ad. Hareket sayfasındaki ikinci ad satırı dile göre (`ExAltName`).
- Kilo yazısı (`fk`), giriş sayıları ve yüzde dilin ayırıcısıyla. Dil seçici 3+ dilde ızgaraya geçer.
- Yasal metinler `src/legal/texts/tr/` ve `en/` altına taşındı (git mv), `import.meta.glob` ile bulunur, başlık metnin ilk satırından. İngilizce metinlerdeki bağlantılar taban adla (`#doc:riza`); `linkTarget()` okunan metnin dilinde açar. `legal.html`: metnin yazılı olduğu her dile bağlantı; bağlantısız açılışta tarayıcı dili. Yer tutucular `LEGAL_L10N`. Adresler aynı kaldı (`#gizlilik`, `#privacy-en`…).
- Testler:
  - `i18n.test.ts`: sözde dille yedek dil, çoğul (Almanca, Fransızca), `byLang` türetme, sayı biçimleri; bağlam adları tek.
  - `i18n-screens.test.tsx`: `byLang` İngilizcesi eksiksiz; her ek dil sözlüğü eksiksiz (değişken, çoğul, Türkçe harf, fazla anahtar); `I18N_WORKLIST=<dil> npm run i18n:worklist` iş listesi (Almanca için 1111 metin, 466 hareket adı, 5 yasal metin); **sözde dil taraması** dört sekme, oturum, özet, plan, Lab sayfalarında sözlükten geçmeyen metni arar.
  - `legal.test.ts`: klasörler dil listesiyle eşleşir, her dil Türkçeyle aynı yapıda, bağlantılar dilinde.
  - `layout-check.mjs`: `flowEn` → `flowLang(dil)`, ekran adları uygulamanın sözlüğünden (vite SSR); ek diller 6 boyutta; `LAYOUT_LANGS=de` ile yalnız istenen dil.
- Taramanın bulduğu: Lab biyomekanikte "Bar" ve "band" sözlükten geçmiyordu (düzeldi).
- Uzun dil denemesi: geçici %40 uzun sözde dille (depoya girmedi) yerleşim akışı koşuldu; büyük pixel düğmesi, dar sütun etiketi, basılı tut ipucu ve bölge hapı taşıyordu. `pixel.css` / `px-theme.css` sonunda: düğme ve etiket alt satıra iner, ipucu ve hap "…" ile kısalır. İngilizce ve Türkçe görünüm değişmedi (ekran görüntüleriyle bakıldı).
- Kalan: gerçek dil eklenince o dilin ekranlarına `LAYOUT_SHOTS=1` ile bakılmalı (en dar ekranda %115 yazıda oturum başlığı iki satıra inince alt satırı sıkışabiliyor; İngilizcede de var).
