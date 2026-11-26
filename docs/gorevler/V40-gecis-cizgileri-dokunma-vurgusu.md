# V40 · Geçişte ekran ortasındaki çizgiler ve dokunma vurgusu

Durum: **Claude (Claude Code) doğrudan uyguladı**, 2026-11-26.

## Kullanıcının isteği (birebir)

> Bak busfrde böyle çizgiler var aniden çıkıo ekran ortasında

(Ek: 17 sn ekran videosu; sekmeler arası geçiş, süren idman, Lab.)

## Bulgu (video kare kare)
1. **Şerit geçişi:** süren idmana girip çıkarken (`into` / `out`) 12 şerit ekranı kapatıp kapanarak açılıyordu (V38'de yana kaymaması için `scaleY`). Şeritler küçülürken ekranın ortasında yatay koyu bantlar ve çizgiler kalıyordu.
2. **Dokunma vurgusu:** Android WebView'in varsayılan dokunma vurgusu dokunulan öğenin üstünde mavi-yeşil yarı saydam bir bant çiziyordu. Görüldüğü yerler:
   - sekme çubuğunda Antrenman düğmesi;
   - geçmiş satırına dokununca özet penceresi açılırken ekranın ortasında kalan bant.
   - Önceden yalnızca `.px` kökünde ve bir öğede kapalıydı.

## Yapılan
- `into` / `out` geçişi tek parça perde: `.px-md-veil`, 0,5 sn, `steps(6)`. Opaklık 0 → 0,9 → 0. Renk süren idmana girerken kor, çıkarken gece. Şerit, çizgi ve yana hareket yok. `.px-md-bar` kaldırıldı.
- `app.css`: `*, *::before, *::after { -webkit-tap-highlight-color: transparent; }`. Geri bildirimi düğmelerin `:active` durumları veriyor.
- BAŞLA ve bitiş blok dalgası (`start` / `end`) ile Lab efektleri değişmedi (bloklar üst üste biniyor, dikiş çizgisi yok).

## Kontroller
`npm test`, lint, `tsc -b`, build, `test:layout`.
