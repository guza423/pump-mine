# V13 pixel tasarım referansı

`Main.dc.html`, kullanıcıyla Claude'un Design tuvalinde birlikte yapılan ve onaylanan konseptin kaynağıdır. Tuvalin canlı hali: https://claude.ai/artifact/94H2oKR9f9Qh3H6kbYN9Bv (kullanıcının hesabı).

## Nasıl okunur
Dosya bir "Design Component" (`.dc.html`). Tuvalin kendi çalıştırıcısı (`support.js`) olmadan tarayıcıda tek başına açılmaz; kaynak olarak okunur:
- `<helmet><style>`: bütün renk jetonları (`.night`), pixel kenarlıklar, animasyon `@keyframes` ve sınıflar.
- `<x-dc>` içi: ekranlar. `{{ad}}` yer tutucuları `renderVals()`'dan gelir. `<sc-if>` koşullu blok, `<sc-for>` döngüdür.
  - `scrList`: plansız idman listesi
  - `scrPick`: hareket seçici
  - `scrLog`: set ekranı
  - `restBig`: dinlenme ekranı
  - `selOpen`: set penceresi
  - `scrStats`: idman özeti
  - `toastOn`: "idman başladı" bildirimi
- `<script type="text/x-dc">` içindeki `class Component`: bütün davranış.
  - `kgDown / kgMove / edgeTick / kgUp`: kilo barı
  - `setReps`, `setLvl`, `setRom`: tekrar, hız ve ROM
  - `logSet`, `addRest`, `rtMove`: kayıt ve dinlenme
  - `autoStart`: idmanın kendiliğinden başlaması
  - `blip()` ve `buzz()`: ses ve titreşim değerleri

## Dikkat
- `LIB`, varsayılan kilolar ve örnek setler **demo verisidir**. Uygulamada gerçek kütüphane (`src/lib/data/exlib.ts`) ve kullanıcının kendi geçmişi kullanılır.
- Konseptteki yorgunluk özeti yalnızca bu idmanın payıdır. Uygulamada mevcut `fatigue: { pre, post }` ve `recoveryHours()` kullanılır (bkz. görev dosyası §2.4).
- RIR 5+ için RPE konseptte `≤5` görünür; uygulamada `training.ts` eşlemesi (`Aynı = 6`) geçerlidir.
- Game Boy teması ve tasarım ayarları (Tweaks) uygulamaya girmez. `doz` ayarından yalnızca **Dengeli** (`.d2`) uygulanır; `ekran` ayarı demo içindir.

Uygulanan görevler: `docs/gorevler/V13-pixel-plansiz-idman.md`, `docs/gorevler/V13.1-dengeli-doz-set-animasyon.md`. Görev dosyası bu referansla çelişirse görev dosyası geçerlidir.
