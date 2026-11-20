# V29 · Planlı oturum da plansızın pixel ekranında

Uygulayan: Claude. Kullanıcı: "Planlamış idmanı seçince ekran bu hala mlsf" (ekran görüntüsü: planlı oturumun eski set ekranı; HEDEF kartı, set tablosu, − / + kilo-tekrar kutuları, RPE çipleri, "SET 1/5 KAYDET").

## Yapılan
- **Tek ekran:** `App.tsx` etkin oturum planlı da olsa `FreePixelSession`'ı açar (adı aynı kaldı, iki türü de taşır). Eski planlı görünüm (`SessionView2`, `SetTable`, `PlyoTable`, `SkillTable`, `SpeedStage`, `PlyoStage`, `SkillStage`, `RestChip`, `RestBig`, `ExListBody`, `exlist` penceresi, `useNow`) silindi. Eski CSS (`.tgt2`, `.srow`, `.ses2-*`) dosyalarda duruyor; kullanılmıyor.
- **Liste ekranı (planlı):**
  - başlık plan gününün adı (`sessionName`);
  - açılışta ilk bitmemiş hareket seçili (`firstOpen`);
  - kartta `n/m set` (+ tonaj), **HEDEF** satırı (`targetTxt`: set × tekrar · kg · RPE) ve hareket notu (oturum notu yoksa plan notu, sarı).
- **Set ekranı (planlı):**
  - üst satır `SET n/m · <not>` (not yoksa ekipman);
  - set kutusunun başlığında **HEDEF** + hedef metni, sağda `n/m set` (ek yükseklik yok: 568 px ve %115 yazıda kaydet düğmesi yerinde);
  - set yokken kutuda **Son sefer** (önceki biten antrenmandaki setler).
- **Başlangıç değerleri:** hareketin ilk seti hedef kilodan (yoksa son kayıt/geçmiş) ve hedefin en çok tekrarından başlar; sonraki setler son kaydedilen setten.
- **Dinlenme:** planın dinlenme süresi (`restDuration`, değişmedi).
- **Not:** not penceresinde "plana da yaz" seçeneği planlı oturumda yine çalışır.
- **Özet:** planlıda da pixel özet; başlıkta plan gününün adı (`.px-sum-name`).
- **RPE:** ayrı RPE çipleri kalktı. RPE, plansızda olduğu gibi son tekrarın hızından gelir (Aynı/Hafif/Belirgin/Çok/Zar zor → ≤6/7/8/9/10) ve RIR · RPE kutularında görünür.
- **Yeni metin:** `'{d}/{n} set'` (EN sözlüğü `workout.ts`).

## Testler
- `screens.test.tsx` ana akış planlı bölümü pixel ekrana göre yeniden yazıldı (hedef, not, 75 kg başlangıç, 2/2 set, set ayrıntısı, özet, geçmişten salt okunur ayrıntı).
- `i18n-screens.test.tsx` İngilizce planlı akış ve sözde dil taraması pixel ekrana göre güncellendi.
- `layout-check.mjs`: TR ve EN akışında notlu planlı hareket; yeni ekran `planli-liste` / `planned-list`.

## Kontroller
`npm test` (136), lint, `tsc -b`, build, `test:layout` geçti.
