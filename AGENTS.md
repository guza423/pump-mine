# PERFORMANCE · kuvvet antrenmanı uygulaması

Android telefonda çalışan, sunucusuz, çevrimdışı bir antrenman uygulaması. Arayüz dili Türkçe.

## Referans prototip
`reference/` klasörü, Claude'da yapılmış ve çalışan prototiptir. Bu projenin tasarım ve davranış kaynağıdır.

- `performance.html`: tek dosyalık çalışan hali. Tarayıcıda açıp davranışı gör.
- `shell.jsx`: uygulama kabuğu, alt sekme çubuğu (Merkez, Günlük, Biyomekanik, Yorgunluk, İlerleme), Merkez ekranı.
- `log.jsx` + `log.css`: Günlük. Program yazma, antrenman modu, set kaydı, hız/RIR modeli, özet.
- `bio-ui.jsx` + `biomech.js`: Biyomekanik. Eğimli bench, RDL, yana açış; moment kolu ve tork modelleri.
- `cns.jsx` + `cns.css`: Yorgunluk. 5 aşamalı sinir sistemi dersi ve yorgunluk simülatörü.
- `app.css`: tasarım token'ları ve kabuk stilleri.

Görünüm, Türkçe metinler, animasyonlar, formüller ve modeller birebir korunacak. Kodu düzenleyip bölebilirsin, davranışı değiştirme.

## Teknoloji
- Vite + React + TypeScript
- Mevcut CSS'i taşı. Tailwind veya UI kütüphanesi ekleme.
- Fontlar (Saira, IBM Plex Sans, JetBrains Mono) `@fontsource` ile pakete gömülü, internet gerektirmesin.
- Grafikler ve animasyonlar el yapımı SVG/canvas olarak kalsın, grafik kütüphanesi ekleme.
- PWA: `vite-plugin-pwa`. Çevrimdışı çalışsın, ana ekrana eklenebilsin.
- Android: Capacitor. APK GitHub Actions'ta üretilsin, Android Studio gerekmesin.
- Testler: Vitest.

## Veri
Prototip `window.claude.use('db')` kullanıyor; bu yalnızca Claude artifact ortamında var. Kaldır.

Yerine cihazda IndexedDB (Dexie) kullan, veri modeli aynı kalsın:
- `programs`: { id, name, createdAt, updatedAt, days: [{ id, name, weekday (0=Pazar … 6=Cumartesi | null), items: [{ id, exId, name, muscle, sets, repMin, repMax, kg, rpeMin, rpeMax, rest (sn), note }] }] }
- `sessions`: { id, programId, programName, dayId, dayName, startedAt, endedAt, status: 'active' | 'done', items: [{ id, exId, name, muscle, note, target: { sets, repMin, repMax, kg, rpeMin, rpeMax, rest }, sets: [{ kg, reps, lvl (0–4), vl, rpe, rir, rirEst, at }] }] }
- `exercises`: kullanıcının eklediği özel hareketler { id, name, muscle, createdAt, pending: true }

Store arayüzü prototiptekiyle aynı mantıkta olsun (`put`, `del`, canlı liste). İlk açılışta `TEMPLATES[0]` (Hipertrofi bloğu) örnek program olarak yüklensin.

Veri yalnızca telefonda tutulduğu için Merkez'e "Yedekle / Geri yükle" ekle: tüm veriyi JSON olarak dışa aktar, JSON'dan içe aktar. Android'de Capacitor Filesystem + Share kullan.

## Klasör yapısı
```
src/
  app/            kabuk, sekme çubuğu, yönlendirme
  features/
    merkez/
    gunluk/
    biyomekanik/
    yorgunluk/
  lib/
    models/       biomech, hız/RIR/e1RM modeli (saf fonksiyonlar)
    store/        IndexedDB katmanı
  styles/
```

## Kurallar
- Mobil öncelikli, 360–430 px genişlik. `env(safe-area-inset-*)` paylarını koru.
- Animasyonlar `requestAnimationFrame` ile. `prefers-reduced-motion` desteklensin.
- Modeller birim testleriyle korunsun. Prototipten alınan kontrol değerleri:
  - `rirFromSpeed(8, 3)` ≈ 2,5 ve `rirFromSpeed(8, 4)` ≈ 0,25
  - `rirFromSpeed(5, 2)` ≈ 3,25
  - `e1rm(75, 8, 2)` = 100
  - Biyomekanik: 30° bench, orta tutuş, bar göğüsteyken omuz moment kolu ≈ 14,4 cm
- Her PR'da `npm run build` ve `npm test` geçmeli.

## Fazlar
1. **Web uygulaması.** Vite + React + TS iskeleti, prototipin birebir taşınması, IndexedDB store, yedekleme, PWA. Her push'ta GitHub Pages'e deploy eden workflow (Vite `base` ayarını repo adına göre yap).
2. **Android APK.** Capacitor Android projesi. Her push'ta debug APK üreten GitHub Actions workflow'u; APK, Actions çalıştırmasının "Artifacts" bölümünden indirilebilsin. Uygulama adı: PERFORMANCE, paket adı: `app.performance.training`.
3. **İlerleme sekmesi** (sonra tarif edilecek).

## Teslim
Her fazın sonunda README'yi güncelle: yerelde nasıl çalıştırılır, canlı adres, APK nereden indirilir ve telefona nasıl kurulur.
