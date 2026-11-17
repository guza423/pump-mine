# V16 · Pixel tema: Gözlem sekmesi

Uygulayan: Claude (kullanıcı: "buda iyi . sıradakine geçek"). Yöntem V14/V15 ile aynı: kök div'e `pxt`, kurallar `src/styles/px-theme.css`'in "Gözlem (V16)" bölümünde.

Kural: **"herşey korunucak … sadece stil değişicek"**. DOM, kimlikler, metinler, akışlar ve veri değişmedi. Bileşenlerde yalnızca görünüm değişiklikleri var (aşağıda).

## Yapılan
- **Kök:** `GozlemScreen` → `screen pxt gozlem-screen`. Başlık büyük harf, sığmazsa küçülür.
- **Takvim:**
  - ay oklarında pixel ikon (`PxIcon` `left`/`right`; `left` ve `more` eklendi);
  - hücreler köşesiz panel, gün sayısı Plex 15 kalın;
  - bugün altın çerçeve + altın sayı, seçili gün açık çerçeve, ikisi birden altın dolgu;
  - işaretler Dashboard şeridiyle aynı: yapıldı yeşil kare (beceri ağırlıklı mavi), planlı altın çerçeveli kare, kaçırıldı kırmızı çizgi.
- **Seçili gün paneli:** çentikli kart; seans satırı yeşil kare + yorgunluk rozeti; plan satırı 48 px, `BAŞLAT` ve pixel `⋮` menüsü. Dar ekranda önce "· Her Sal" kısalır, plan adı görünür kalır.
- **Ay özeti:** tek panelde dört satır (RPG istatistik ekranı gibi). Değer sağda, Press Start 16, altın; "6 sa 12 dk" gibi uzun değerler kırılmaz.
- **Yorgunluk kartı:** pixel halka (`Ring pixel`, 72 px; 96 px altında sayı 16 px). Son 12 seansın çubukları kartın altında tam genişlik, köşesiz.
- **Uyarılar:** çentikli kartlar; kötü kırmızı, dikkat altın çerçeve; bilgi mavi kare.
- **Hareket gelişimi:** 1RM grafiği panel içinde; çizgi 3 px keskin kenar, noktalar kare (`circle` → `rect`), hedef çizgisi altın kesikli, son değer Press Start 16.
- **Haftalık yük** kartı ve sheet'i: pixel halka, gün tablosu, kas çubukları köşesiz.
- **Yorgunluk ölçer sheet'i:** iğneli ölçerde düz uçlar, parlama kapalı. Tam pixel ölçer V17'de (bileşen Lab'ın).

## Kontroller
`npm test` (15 dosya, 91 test), lint, `tsc -b`, build, `test:layout` (11 boyut) geçti. Örnek veriyle (13 seans, haftalık plan, hedef, uyku) 390 ve 320 px'te ekran görüntüsüyle kontrol edildi: takvim, gün paneli, plan menüsü, ay özeti, yorgunluk, uyarılar, grafik, haftalık yük, yorgunluk ölçer, antrenman özeti.

## Kalan
- Lab (V17). Kullanıcının sorusu: Lab'daki öğretici animasyonlar pixel art olabilir mi? Zamanı gelince birlikte karar verilecek (bkz. `docs/PROJE.md` §8).
