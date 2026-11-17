# OUTMOVE · antrenman takip uygulaması

Android telefonda çalışan, sunucusuz, çevrimdışı bir antrenman uygulaması. Arayüz dili Türkçe.

## Kayıt kuralı (her AI için zorunlu: Claude, Codex, Gemini/Antigravity, Cursor, Copilot…)
Bu repo projenin **tek hafızası**. Sohbetler kaybolabilir, oturumlar değişir, AI değişir; repo kalır. Bu yüzden:

1. **Başlarken oku**, bu sırayla:
   1. `git pull --rebase origin main`
   2. bu dosya
   3. `docs/PROJE.md` (ürün, mimari, modeller, kararlar)
   4. `GOREV.md`
   5. `docs/KONUSMA-KAYDI.md`'nin son bölümü
2. **Her kullanıcı mesajını kaydet.** `docs/KONUSMA-KAYDI.md`'nin sonuna dosyanın başındaki biçimde ekle: tarih, AI adı ve aracı, kullanıcının sözleri **birebir**, ne yapıldığı / karar, commit ya da görev dosyası. Ekran görüntüsündeki notları da birebir yaz. Yanıtın tamamını değil, özünü yaz.
3. **Kalıcı kararı işle.** Ad, kapsam, mimari, veri modeli, kural, model ya da formül değiştiyse `docs/PROJE.md`'de ilgili bölümü güncelle ve §9 Karar günlüğüne tarihli satır ekle. Teknik şema değiştiyse bu dosyanın "Veri" bölümünü de güncelle.
4. **Promptlar repoya, sohbete değil.** Başka bir AI'nın uygulayacağı her iş `docs/gorevler/Vxx-kisa-ad.md` olarak yazılır ve `GOREV.md` "Bekleyen"e eklenir. Prompt metni sohbete yazılmaz. Sohbette yalnızca dosya yolu ve kullanıcının kodlayan AI'ya yazacağı tek satır verilir: `AGENTS.md'yi oku ve uygula`.
5. **Kaydet, sonra konuş.** İş bitince (kod, belge ya da sadece karar) kayıt dosyalarını güncelle, commit et ve `main`'e push et. Push edilmemiş hiçbir şey "kaydedildi" sayılmaz. Sadece soru-cevap olan konuşmalar da kayda girer; o zaman tek commit yeterli (`docs: konuşma kaydı`).
6. **Gizli ve kişisel bilgi yazma.** Repo herkese açık. Şifre, token, kişisel sağlık/vücut verisi ve e-posta adresi kayda girmez.
7. **Kodlayan AI olarak** görevi bitirince: `GOREV.md`'de görevi "Tamamlanan"a taşı (tarih + commit). `docs/KONUSMA-KAYDI.md`'ye "uygulandı" satırı ekle; görev dosyasından sapma ya da açık kalan iş varsa onu da yaz.

Kullanıcı yeni bir AI'ya yalnızca şunu yazar: **`AGENTS.md'yi oku ve uygula`**. Bekleyen görev varsa onu uygula; yoksa kullanıcıya ne yapmak istediğini sor ve konuşmayı yukarıdaki kurala göre kaydet.

## Her görevin başında (zorunlu, kullanıcıya sorma)
`git pull --rebase origin main` çalıştır. Claude repoya doğrudan görev, referans ve yapılandırma dosyası gönderiyor; yerel klasör geride olabilir. Çekme bitmeden hiçbir dosyayı okuma ya da değiştirme.

## Görevler
Yapılacak işler `GOREV.md`'de sırayla listelidir; görev ayrıntıları `docs/gorevler/` altında (eski görevler `docs/gorevler/arsiv/`). Kullanıcı "AGENTS.md'yi oku ve uygula" ya da "GOREV.md'yi uygula" dediğinde bekleyen ilk görevden başla.

## Referans prototip

V10 ve sonraki görev dosyaları referanstan farklı bir şey söylüyorsa görev dosyası geçerlidir.
`reference/v13-pixel/` V13 ile gelen pixel tasarım dilinin kaynağıdır (bkz. içindeki `README.md`). `reference/v09/` klasörü, Claude'da yapılmış ve çalışan güncel prototiptir. Bu projenin tasarım ve davranış kaynağıdır. Önceki prototip `reference/v03/` altında yalnızca tarihçe için tutulur.

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

Misafir veri katmanı Dexie'dir. Hesapta Firebase Auth ve Firestore kullanılır: `users/{uid}` profilinde `{ email, createdAt, consent: { v: 1, at }, appVersion }`, altındaki `programs`, `sessions`, `exercises`, `checkins`, `settings` koleksiyonlarında bugünkü belgeler tutulur; settings belge kimliği `key`'dir. Her kullanıcı yalnızca kendi ağacına erişir (`firestore.rules`). Analytics başlatılmaz.

İlk girişte açık rıza alınır. Misafir verisi tam sunucu okumasıyla birleştirilir: programda yeni updatedAt, seansta fazla set (eşitse bulut), checkin'de yeni at; özel hareketler birleşir ve buluttaki settings korunur. En fazla 400'lük batch ve `waitForPendingWrites` onayından sonra Dexie snapshots tablosuna `{ at, uid, data }` kopyalanır, aktif tablolar atomik boşaltılır; snapshotlar 30 gün tutulur. Başarısız/çevrimdışı taşıma yereli korur ve yeniden denenir. Çıkış bekleyen yazma varken engellenir; çıkışta Firestore önbelleği temizlenir ve boş misafir alanı açılır. Hesap silme çevrimiçi, yeniden doğrulamayla tüm kullanıcı belgelerini ve Auth hesabını siler. Yedekleme aktif arka ucu kullanır; hesapta geri yükleme buluta yazar.
Prototip `window.claude.use('db')` kullanıyor; bu yalnızca Claude artifact ortamında var. Kaldır.

Yerine cihazda IndexedDB (Dexie) kullan, veri modeli aynı kalsın:
- `programs`: plan belgelerini taşır: `{ id, name, createdAt, updatedAt, days: [{ id, name, weekdays: number[] (0=Pazar … 6=Cumartesi), dates?: string[] ('YYYY-MM-DD'), skip?: string[] ('YYYY-MM-DD'), weekday?: number | null (geriye uyumlu), items: [{ id, exId, name, muscle, sets, repMin, repMax, kg, rpeMin, rpeMax, rest (sn), note }] }] }`
- `sessions`: `{ id, programId, programName, dayId, dayName, startedAt, endedAt, status: 'active' | 'done', ready?: true, items: [{ id, exId, name, muscle, note, target: { sets, repMin, repMax, kg, rpeMin, rpeMax, rest }, sets: [{ kg, reps, lvl (0–4), vl, rpe, rir, rirEst, rom?, plyo?, skill?, hold?, q?, at }] }] }`
- `sessions` belgesinde isteğe bağlı `rest: { start, total, exId, setNo }` dinlenme sayacını saklar. `start` epoch ms, `total` saniye, `setNo` biten setin numarasıdır.
- `settings` içinde `key: 'restPrefs'`, `value: { [exId]: saniye }` plansız hareketlerin dinlenme tercihleridir; hesapta buluta eşitlenir.
- `settings` içinde `key: 'fx'`, `value: { sound: boolean, haptic: boolean }` ses ve titreşim tercihleridir (varsayılan ikisi de `true`).
- `settings` içinde `key: 'goals'`, `value: Goal[]` güç (`perf`) ve öğrenme (`skill`) hedeflerini tutar; eski tekil `key: 'goal'` kaydı okuma sırasında otomatik taşınır.
- Plansız oturum tanımı `dayId == null` koşuludur (`isFree`); görünen ada göre belirlenmez.
- `exercises`: kullanıcının eklediği özel hareketler `{ id, name, muscle, createdAt, pending: true }`

Store arayüzü prototiptekiyle aynı mantıkta olsun (`put`, `del`, canlı liste). İlk açılışta veri yoktur; uygulama boş başlar (örnek program, şablon ve varsayılan hedef yok).

Veri yedekleme/geri yükleme ("Yedekle / Geri yükle") **Hesap ve yedek** penceresinin altındadır: tüm veriyi JSON olarak dışa aktar, JSON'dan içe aktar. Android'de Capacitor Filesystem + Share kullan.

## Klasör yapısı
```
src/
  app/            kabuk, sekme çubuğu (Dashboard / Antrenman / Gözlem / Lab), yönlendirme
  features/
    bugun/        Dashboard ve hedefler (goals.ts)
    antrenman/
    plan/         plan modeli ve takvim yardımcıları (plans.ts)
    programlar/   yedekleme bileşeni
    lab/
  lib/
    models/       biomech, hız/RIR/e1RM modeli (saf fonksiyonlar)
    store/        IndexedDB katmanı
  styles/
```

## Kurallar
- Her telefona oturma: 320–430 px genişlik, 568 px'ten itibaren yükseklik ve %115'e kadar sistem yazısı desteklenir. Ana eylem düğmeleri kaydırmadan görünür. Her görevde `npm run test:layout` geçmeli.
- Android: pencereye/temaya `super.onCreate()` öncesinde dokunma; tüm temalar koyu ve başlıksız; sistem çubukları şeffaf, simgeler açık.
- Mobil öncelikli, 360–430 px genişlik. `env(safe-area-inset-*)` paylarını koru.
- Animasyonlar `requestAnimationFrame` ile. `prefers-reduced-motion` desteklensin.
- Modeller birim testleriyle korunsun. Prototipten alınan kontrol değerleri:
  - Uyku yok → 0; tek 5 saatlik gece → ≈23; üç 5 saatlik gece → 30
  - `rirFromSpeed(20, 4)` = 0, `rirFromSpeed(20, 2)` = 2, `rirFromSpeed(5, 0)` = 5
  - `e1rm(75, 8, 2)` = 100
  - `bestE1([{ kg: 40, reps: 20, rir: 1 }])` = 0
  - `simulatePlan(hipertrofiProgram())` ve `simulatePlan(weekProgram([hipertrofiProgram()]))` (test fikstürü, `src/test/fixtures.ts`): seans başı ortalama ≈21, en yüksek tepe ≈76
- Her PR'da `npm run build` ve `npm test` geçmeli.

## Fazlar
1. **Web uygulaması.** Vite + React + TS iskeleti, prototipin birebir taşınması, IndexedDB store, yedekleme, PWA. Her push'ta GitHub Pages'e deploy eden workflow (Vite `base` ayarını repo adına göre yap).
2. **Android APK.** Capacitor Android projesi. Her push'ta debug APK üreten GitHub Actions workflow'u; APK, Actions çalıştırmasının "Artifacts" bölümünden indirilebilsin. Uygulama adı: OUTMOVE (eski adı PERFORMANCE). Paket adı `app.performance.training` **değişmez**: kurulu uygulama güncellenebilsin, Firebase kaydı ve yerel veriler korunsun. IndexedDB adı (`performance-training`) ve kod içindeki `Performance*` tip adları da aynı kalır.
3. **Arayüz.** Sekmeler: **Dashboard** (`bugun`), **Antrenman** (`antrenman`), **Gözlem** (`gozlem`, başlık "Antrenman plan ve gözlem") ve **Lab** (`lab`); güç ve beceri hedefleri, satır içi geçmiş, aylık takvim, gözlem metrikleri ve yorgunluk simülatörü.

## Teslim
Her fazın sonunda README'yi güncelle: yerelde nasıl çalıştırılır, canlı adres, APK nereden indirilir ve telefona nasıl kurulur.

## Her görevin sonunda (zorunlu, kullanıcıya sorma)
1. `npm test` ve `npm run build` çalıştır.
2. İkisi de geçerse: `git add -A`, kısa ve anlamlı bir mesajla commit, ardından `git push origin HEAD:main`.
3. PR veya ayrı branch açma; her zaman doğrudan `main`'e push et.
4. `GOREV.md` ve `docs/KONUSMA-KAYDI.md` güncel olsun (bkz. Kayıt kuralı); kalıcı karar varsa `docs/PROJE.md` de.
5. Bitince `git log -1 --oneline`, push çıktısını ve `git status` çıktısını göster.
6. Derleme çıktılarını asla commit etme: `dist/`, `android/app/build/`, `android/app/src/main/assets/public/`, `android/app/src/main/assets/capacitor.config.json`, `android/app/src/main/assets/capacitor.plugins.json`, `android/app/src/main/res/xml/config.xml`, `android/capacitor-cordova-android-plugins/`.
7. Testler veya build geçmezse hatayı düzelt ve tekrar dene; geçmeyen kodu push etme.
