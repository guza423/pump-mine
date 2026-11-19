# V23 · İngilizce: Gözlem sekmesi (Insights)

Önce `V21-dil-altyapisi-ingilizce.md`. Sekmenin İngilizce adı **Insights**, başlık "Antrenman plan ve gözlem" → "Plan & insights".

## Kapsam
- `App.tsx`: `GozlemScreen` (takvim, gün paneli, ay özeti, 1RM gelişimi, haftalık yük), `PlanPickBody`, `PlanBody`, `E1Chart`, `FatigueBars`, `Metric`.
- Uyarılar (`historyWarnings`) V21'de çevrildi; yalnızca gösterim kontrolü.
- Ay ve gün adları `byLang` ile hazır; tarih sırası İngilizcede "November 19".

## Test
- `i18n-screens.test.tsx`: dolu bir ayla Gözlem İngilizce, Türkçe harf yok (plan/gün adları hariç).
- `flowEn`'e Gözlem ekranı.

## Yapılan (2026-11-19, Claude)
- Gözlem sekmesinin tamamı `t()` ile: başlık **Plan & insights**, takvim (gün/ay adları, erişilebilirlik etiketleri), seçili gün paneli, ay özeti (Workouts / Total time / Sets / Volume), yorgunluk kartı, uyarılar, 1RM gelişimi ve grafiği, Haftalık yük penceresi, "Bu güne plan ekle" penceresi.
- Tarih biçimi İngilizcede ay önce: "Thursday, November 19", kısa tarih "Nov 19 · Thu" (`dateTxt`).
- Plan ve gün adları `dayLabel()`, kaslar `muscleName()`, hareketler `exName()` ile.
- Dar ekranda uzun İngilizce ay adı taşmasın diye takvim başlığı küçülebilir (`px-theme.css`, `.pxt .cal-title`).
- Testler: İngilizce Insights (takvim, gün paneli, 1RM çipi, haftalık yük, plan seçimi); `flowEn` Insights ekranını da kontrol eder.

