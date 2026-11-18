# V23 · İngilizce: Gözlem sekmesi (Insights)

Önce `V21-dil-altyapisi-ingilizce.md`. Sekmenin İngilizce adı **Insights**, başlık "Antrenman plan ve gözlem" → "Plan & insights".

## Kapsam
- `App.tsx`: `GozlemScreen` (takvim, gün paneli, ay özeti, 1RM gelişimi, haftalık yük), `PlanPickBody`, `PlanBody`, `E1Chart`, `FatigueBars`, `Metric`.
- Uyarılar (`historyWarnings`) V21'de çevrildi; yalnızca gösterim kontrolü.
- Ay ve gün adları `byLang` ile hazır; tarih sırası İngilizcede "November 19".

## Test
- `i18n-screens.test.tsx`: dolu bir ayla Gözlem İngilizce, Türkçe harf yok (plan/gün adları hariç).
- `flowEn`'e Gözlem ekranı.
