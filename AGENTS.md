# OUTMOVE · antrenman takip uygulaması

Android telefonda çalışan, sunucusuz, çevrimdışı bir antrenman uygulaması. Arayüz dili Türkçe.

## Her görevin başında (zorunlu, kullanıcıya sorma)
`git pull --rebase origin main` çalıştır. Claude repoya doğrudan görev, referans ve yapılandırma dosyası gönderiyor; yerel klasör geride olabilir. Çekme bitmeden hiçbir dosyayı okuma ya da değiştirme.

## Görevler
Yapılacak işler `GOREV.md`'de sırayla listelidir; görev ayrıntıları `docs/gorevler/` altında. Kullanıcı "GOREV.md'yi uygula" dediğinde bekleyen ilk görevden başla.

## Referans prototip
`reference/v09/` klasörü, Claude'da yapılmış ve çalışan güncel prototiptir. Bu projenin tasarım ve davranış kaynağıdır. Önceki prototip `reference/v03/` altında yalnızca tarihçe için tutulur.

- `performance.html`: tek dosyalık çalışan hali. Tarayıcıda açıp davranışı gör.
- `app.jsx`: dört sekmeli uygulama kabuğu (Bugün, Antrenman, Programlar, Lab), ekranlar, sheet yığını, hesap ekranları.
- `exlib.js`: 438 hareketlik kütüphane (kuvvet, olimpik, pliometrik).
- `core.jsx`: sabitler, şablonlar, hız/RIR modeli, pliometrik yardımcılar ve ortak antrenman bileşenleri.
- `bio-ui.jsx` + `biomech.js`: biyomekanik hareket kartları ve tork modelleri.
- `cns.jsx` + `cns.css`: sinir sistemi dersleri, göstergeler ve yorgunluk simülatörü.
- CSS sırası: `cns.css → app.css → log.css → mobile.css → app5.css`.

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

Veri yalnızca telefonda tutulduğu için Programlar listesinin sonuna "Yedekle / Geri yükle" ekle: tüm veriyi JSON olarak dışa aktar, JSON'dan içe aktar. Android'de Capacitor Filesystem + Share kullan.

## Klasör yapısı
```
src/
  app/            kabuk, sekme çubuğu, yönlendirme
  features/
    bugun/
    antrenman/
    programlar/
    lab/
  lib/
    models/       biomech, hız/RIR/e1RM modeli (saf fonksiyonlar)
    store/        IndexedDB katmanı
  styles/
```

## Kurallar
- Mobil öncelikli, 360–430 px genişlik. `env(safe-area-inset-*)` paylarını koru.
- Animasyonlar `requestAnimationFrame` ile. `prefers-reduced-motion` desteklensin.
- Modeller birim testleriyle korunsun. Prototipten alınan kontrol değerleri:
  - Uyku yok → 0; tek 5 saatlik gece → ≈23; üç 5 saatlik gece → 30
  - `rirFromSpeed(20, 4)` = 0, `rirFromSpeed(20, 2)` = 2, `rirFromSpeed(5, 0)` = 5
  - `e1rm(75, 8, 2)` = 100
  - `bestE1([{ kg: 40, reps: 20, rir: 1 }])` = 0
  - `simulatePlan(programFromTemplate(TEMPLATES[0]))`: seans başı ortalama ≈21, en yüksek tepe ≈76
- Her PR'da `npm run build` ve `npm test` geçmeli.

## Fazlar
1. **Web uygulaması.** Vite + React + TS iskeleti, prototipin birebir taşınması, IndexedDB store, yedekleme, PWA. Her push'ta GitHub Pages'e deploy eden workflow (Vite `base` ayarını repo adına göre yap).
2. **Android APK.** Capacitor Android projesi. Her push'ta debug APK üreten GitHub Actions workflow'u; APK, Actions çalıştırmasının "Artifacts" bölümünden indirilebilsin. Uygulama adı: OUTMOVE (eski adı PERFORMANCE). Paket adı `app.performance.training` **değişmez**: kurulu uygulama güncellenebilsin, Firebase kaydı ve yerel veriler korunsun. IndexedDB adı (`performance-training`) ve kod içindeki `Performance*` tip adları da aynı kalır.
3. **v0.7 arayüzü.** Bugün, Antrenman, Programlar ve Lab; hedef, geçmiş, program analizi ve yorgunluk simülatörü.

## Teslim
Her fazın sonunda README'yi güncelle: yerelde nasıl çalıştırılır, canlı adres, APK nereden indirilir ve telefona nasıl kurulur.

## Her görevin sonunda (zorunlu, kullanıcıya sorma)
1. `npm test` ve `npm run build` çalıştır.
2. İkisi de geçerse: `git add -A`, kısa ve anlamlı bir mesajla commit, ardından `git push origin HEAD:main`.
3. PR veya ayrı branch açma; her zaman doğrudan `main`'e push et.
4. Bitince `git log -1 --oneline`, push çıktısını ve `git status` çıktısını göster.
5. Derleme çıktılarını asla commit etme: `dist/`, `android/app/build/`, `android/app/src/main/assets/public/`, `android/app/src/main/assets/capacitor.config.json`, `android/app/src/main/assets/capacitor.plugins.json`, `android/app/src/main/res/xml/config.xml`, `android/capacitor-cordova-android-plugins/`.
6. Testler veya build geçmezse hatayı düzelt ve tekrar dene; geçmeyen kodu push etme.
