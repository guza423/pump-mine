# V24 · İngilizce: Lab sekmesi

Önce `V21-dil-altyapisi-ingilizce.md`. Lab en uzun metinleri taşır; çeviri "proper English" olmalı, bilimsel terimler doğru (RIR, motor unit, rate coding, CNS…), kaynak gösterimleri aynen.

## Kapsam
- `features/lab/Cns.tsx`: dersler (`STAGES`, kısa adlar dahil; Yorgunluk ölçerdeki kısayollar bunlardan gelir), göstergeler, yorgunluk simülatörü, `NeedleGauge` etiketi.
- `features/lab/Biomekanik.tsx` + `lib/models/biomech.ts`: kartlar, kas adları, tork modelleri. `m.k === 'Üst göğüs'` gibi metinle yapılan karşılaştırmaları kimliğe (id) çevir, sonra çevir.
- `App.tsx`: `LabScreen`, `MeasureBody`, `LessonBody`, `ExerciseBody`.
- Hareket kütüphanesi Lab listesi: ad `exName()`, kas `muscleName()`, filtre çipleri.

## Test
- `i18n-screens.test.tsx`: Lab temeller + hareketler + bir ders + bir biyomekanik kart İngilizce, Türkçe harf yok.
- `flowEn`'e Lab ekranları; Yorgunluk ölçer testindeki `.fat2-learn` istisnasını kaldır.
