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

## Yapılan (2026-11-19, Claude)
- Lab ekranı (Basics / Exercises), "How is fatigue measured?" sayfası, dört sinir sistemi dersi (Signal, Recruitment, Rate coding, Fatigue), biyomekanik (incline bench, RDL, lateral raise) ve hareket sayfası İngilizce. Kaynak gösterimleri (Zourdos 2016, Larsen 2021, Chaves 2020 …) aynen.
- Kalın parçalı metinler sözlükte `**…**` ile tutulur, ekranda `src/i18n/rich.tsx` › `rich()` çizer.
- Biyomekanikte kas vurgusu satırları metinle değil kimlikle (`clav`, `stern`, `delt`) seçilir (`lib/models/biomech.ts`).
- Hareket sayfasında İngilizcede alt satır Türkçe adı gösterir ("Turkish: Eğimli bench press"), Türkçede İngilizce adı.
- Aynı Türkçe kelimenin Lab'de farklı anlamı bağlamla ayrılır: `tc('bio', 'Kalça')` = Hip (kas grubu "Glutes" değil), `tc('bio', 'Kuvvet')` = Force (çip "Strength" değil).
- Dar ekranda kesilmesin diye dirsek açısı seçenekleri kısa: Tucked 45° / Mid 60° / Flared 80°.
- `Cns.tsx` içindeki `StageRecovery`, `model()` ve `Axon` uygulamada kullanılmıyor; çevrilmedi.
- Testler: İngilizce Lab testi (temeller, ölçüm, 4 ders + set simülasyonu, hareket listesi, bench/RDL/band/depth jump/kip-up sayfaları); yorgunluk ölçer testinde `.fat2-learn` istisnası kalktı; `flowEn` Lab ekranlarını da kontrol eder.
