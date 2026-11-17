# OUTMOVE · proje belgesi (tek kaynak)

> **Bu dosya projenin hafızasıdır.** Hangi yapay zekâ ya da kişi bu repoda çalışırsa çalışsın:
> 1. önce `AGENTS.md`'yi,
> 2. sonra bu dosyayı,
> 3. sonra `GOREV.md`'yi okur.
>
> Konuşmaların kronolojik kaydı `docs/KONUSMA-KAYDI.md`'de. Kalıcı her karar bu dosyaya da işlenir (bkz. §9 Karar günlüğü).
> Repo **herkese açık**. Buraya şifre, token ya da kişisel sağlık/vücut verisi yazılmaz.

Son güncelleme: 2026-11-17 · V13 sonrası durum.

---

## 1) Ürün

**OUTMOVE**, her türlü antrenmanı takip eden ve yorgunluğu yöneten bir telefon uygulaması.
- Ağırlık, olimpik kaldırış, pliometri ve beceri (kip-up, amut, front lever…) kaydı.
- Arayüz Türkçe. Hedef platform Android (APK). Aynı kod PWA olarak da çalışır.
- Eski adı **PERFORMANCE**.

**Kimin için:** önce proje sahibinin kendisi için. Yıllardır antrenmanlarını sadece kendisinin olduğu bir WhatsApp grubuna yazıyor; OUTMOVE'un bulut veritabanı bundan sonra onun kalıcı antrenman kaydı olacak. Uygulama başkalarının da kullanabileceği biçimde tasarlanıyor: hesap, misafir modu, her kullanıcının verisi ayrı.

**Ürün ilkeleri** (kullanıcının söyledikleri, öncelik sırasıyla):
1. **Tüm sürecin doğruluğu.** Yorgunluk, uyku, set eforu ve 1RM hesapları fizyolojik olarak doğru olmalı. Her ağırlığın dayanağı yazılı; tahmin olduğu açıkça söylenir.
2. **Hiçbir kayıt kaybolmaz.** Önce telefona, sonra buluta yazılır. Bekleyen yazma varken çıkış yapılamaz.
3. **Sadelik.** Ana kullanım: programsız salona gidip antrenmanı çok hızlı kaydetmek. Uzun açıklama metinleri, sahte varsayılanlar, hazır şablonlar yok. Uygulama boş başlar.
4. **Her telefona oturur.** 320–430 px genişlik, %115'e kadar sistem yazısı. Ana eylem düğmeleri kaydırmadan görünür.
5. **Son kullanıcı uygulaması, ders platformu değil.** Program kurma ve antrenman kaydı merkezde. Yorgunluk ve biyomekanik karar anında yardımcı. Bilgi tek yerde: Lab.

---

## 2) Bugünkü uygulama (V13 sonrası)

Alt menü: **Dashboard · Antrenman · Gözlem · Lab**.

| Sekme (id) | İçerik |
|---|---|
| **Dashboard** (`bugun`) | Hesap düğmesi (eşitleme durumu: sarı bekleyen, yeşil eşit, gri çevrimdışı). Yorgunluk halkası + kırılım, uyku girişi (5–9 sa), plan kartı (bugün plan var / sıradaki / plan yok; hazır plansız oturumda `başlamadı`), bu hafta şeridi. **Hedefler:** güç (1RM) ve öğrenme (beceri, 4 aşama, "Pratik et"). |
| **Antrenman** (`antrenman`) | `Plansız antrenman` ve `Yeni plan` düğmeleri; **Planlarım**; ay başlıklı, kaydırılabilir **geçmiş**. Aktif oturum ekranı da burada. |
| **Gözlem** (`gozlem`, başlık "Antrenman plan ve gözlem") | Aylık takvim (yapılan ●, planlı ○, kaçırılan ·). Gün paneli: yapılanlar, planlar, uyku, yorgunluk, "Bu güne plan ekle" (tek gün ya da her hafta). Ay özeti, uyarılar, 1RM gelişimi, haftalık yük. |
| **Lab** (`lab`) | 01 Temeller: sinir sistemi dersleri, "Yorgunluk nasıl ölçülür?", yorgunluk ölçer. 02 Hareketler: 466 hareket, arama + tür + kas + ekipman filtresi, biyomekanik kartlar. |

**Oturum ekranları:**
- **Plansız oturum** (`dayId == null`, V13 pixel arayüz `.px`):
  - **Hazır akışı ve liste:** oturum `ready: true` (`HAZIR · başlamadı`) açılır; hareket listesi + çoklu seçimli hareket seçici (`N HAREKET EKLE`) + `İDMANI BAŞLAT` / `İDMANI BİTİR`. Set ekranı açılınca ya da ilk set kaydedilince süre kendiliğinden başlar ve altın bildirim çıkar.
  - **Set ekranı (kuvvet / olimpik):** ekipmana göre ağırlık görseli (bar plakaları, makine/kablo yığını ve pim, dambıl), sürüklemeli kilo barı (kenarda hızlanma, bırakınca ortalama), 1–30 merdiven tekrar barı, 5 bölgeli sürüklemeli hız seçici (RPE çipleri yok; RIR/RPE hızdan), canlı `RIR · RPE · e1RM · ROM` (%10–100 sürüklenebilir, sonraki sette %100'e döner). Setler yeniden eskiye 3 sütunlu kutucuklarda; dokununca set ayrıntısı penceresi açılır.
  - **Pliometrik / Beceri:** plansız oturumda `.px` kabuğunun içinde mevcut temas/ek yük/deneme/süre/kalite girişleriyle çalışır.
  - **Büyük dinlenme ekranı (`#rest-big`):** set kaydında açılır; sürükleyerek ve `-15 SN`/`+15 SN` düğmeleriyle ayarlanır, `GİZLE` ile kaydet düğmesinin solunda küçük çipe küçülür, `GEÇ` ile biter.
  - **Ses ve titreşim:** her adımda WebAudio kare/testere dalga sesleri, parçacık/pop/sarsıntı efektleri ve titreşim; **Hesap ve yedek** penceresinden (`Sesler`, `Titreşim`) kapatılabilir.
  - **Pixel özet:** süre, tonaj (dambılda iki el; `Tek ` ile başlayanlar tek el), set · zor set, 25 parçalı yorgunluk çubuğu, `recoveryHours()`, hareket başına e1RM (`ROM ≥ %90`), `Plan olarak kaydet`.
- **Planlı oturum:** hedef kartı ("Hedef 4×6–8 · 80 kg · RPE 8"), planlı set satırları, "Set 1/4 kaydet", hız animasyonu.
- **Android geri tuşu:** sheet'i / pixel pencereyi kapatır → büyük dinlenmeyi küçültür → set ekranından listeye döner → oturumdan Dashboard'a (oturum sürer) → sekmeden Dashboard'a → Dashboard'da iki kez basınca çıkar.

**Hesap ve yedek** (Dashboard sağ üst):
- Misafir ya da Google / e-posta hesabı. İlk girişte açık rıza.
- Sesler / Titreşim anahtarları (`settings.fx`).
- Verilerimi dışa aktar (JSON), Yedekle / Geri yükle.
- Gizlilik sayfası, hesap silme ("SİL" onayı).

---

## 3) Mimari

- **Uygulama:** Vite + React 19 + TypeScript. El yapımı CSS (Tailwind / UI kütüphanesi yok). El yapımı SVG grafikler. Fontlar `@fontsource` ile gömülü: Saira, IBM Plex Sans, JetBrains Mono.
- **Mobil:** Capacitor 8 (`app.performance.training` paket adı **değişmez**). Yerel kod:
  - `MainActivity`: kenardan kenara koyu sistem çubukları, metin yakınlaştırma 100–115.
  - `RestTimerPlugin` + `RestTimerReceiver`: dinlenme bildirimi, kesin alarm.
  - `@capacitor/app`: geri tuşu.
  - `@capacitor-firebase/authentication`: Google girişi.
- **Veri:** misafirde Dexie (IndexedDB `performance-training`). Hesapta Firebase Auth + Firestore, kalıcı yerel önbellekle (çevrimdışı önce telefona). Ayrıntı §5.
- **CI** (`.github/workflows/`):
  - `android.yml`: her push'ta debug APK (artifact `outmove-<no>`), sabit debug anahtarıyla imzalı.
  - `pages.yml`: test + build + yerleşim testi + GitHub Pages (https://guza423.github.io/pump-mine/).
- **Testler:**
  - `npm test` (Vitest: modeller, store, ekranlar)
  - `npm run build`
  - `npm run test:layout` (Playwright: 320×568 … 430×932, %115 yazı, 884×1104 tablet)
- **Klasörler:** `src/app` (kabuk, App.tsx), `src/features/{bugun,antrenman,plan,programlar,hesap,lab}`, `src/lib/{data,models,store,cloud,native}`, `src/styles`, `reference/` (Claude prototipleri: v03, v09), `docs/gorevler/` (görev dosyaları).
- Ayrıntılı teknik kurallar ve veri şeması: `AGENTS.md`.

---

## 4) Çalışma düzeni (kim ne yapar)

- **Tasarım ve görev yazımı:** Claude (claude.ai PERFORMANCE projesi / Claude Code oturumu).
  - Prototipi tasarlar: claude.ai artifact https://claude.ai/artifact/M5m8Sgmk91es5hxGozf3gk; kaynaklar `reference/v09/`.
  - Teşhis yapar (gerekirse uygulamayı Playwright'la birçok ekran boyutunda açıp ölçer).
  - Görevi `docs/gorevler/Vxx-*.md` olarak **doğrudan repoya** yazar, `GOREV.md` "Bekleyen"e ekler, `main`'e push eder.
- **Uygulama:** kodlayan yapay zekâ.
  - Şimdiye kadar: OpenAI Codex (masaüstü) ve V12'de Google Antigravity (Gemini 4 Argon).
  - Kullanıcı tek satır yazar: `AGENTS.md'yi oku ve uygula`.
  - Kodlayan AI `git pull` → görevi uygular → test + build + layout → `main`'e push → `GOREV.md`'de "Tamamlanan"a taşır.
- **Kontrol:** Claude push'u kontrol eder, kullanıcı APK'yı telefonda dener (her görev dosyasının sonunda "Telefonda kabul" listesi var).
- **Kullanıcının kuralları:**
  - Zip yok, dosya taşıma yok, PR yok; her şey doğrudan repoya ve `main`'e.
  - Kısa, net Türkçe yanıt.
  - Promptlar sohbete yazılmaz, repoya yazılır.
  - Her şey her zaman repoya kaydedilir (bkz. `AGENTS.md` → "Kayıt kuralı").

---

## 5) Veri modeli (özet; şemanın tamamı `AGENTS.md` → "Veri")

- **Firestore:** `users/{uid}` (`email, createdAt, consent {v, at}, appVersion`). Alt koleksiyonlar: `programs`, `sessions`, `exercises`, `checkins`, `settings`. `firestore.rules`: yalnızca `request.auth.uid == uid`, yalnızca bu 5 alt koleksiyon. **Yeni koleksiyon açmak kuralların konsolda yeniden yayınlanmasını gerektirir**; bu yüzden V12'de planlar `programs` içinde tutuldu.
- **Plan** = program belgesinin günü. Yeni plan = tek günlük program belgesi.
  - Takvim alanları: `weekdays: number[]` (JS `getDay()`, 0 = Pazar), `dates: string[]` ve `skip: string[]` (`'YYYY-MM-DD'`, yerel).
  - Eski `weekday` okunurken diziye çevrilir.
- **Oturum:** `{ id, programId, dayId, dayName, startedAt, endedAt, status, ready?, items[{ exId, name, target, sets[] }], rest? }`. Plansız = `dayId == null`. `ready: true` iken süre başlamamıştır (`dur = 0`).
- **Set:**
  - Kuvvet: `{ kg, reps, lvl 0–4, vl, rpe, rir, rom?, at }` (`rom` yoksa 100 sayılır)
  - Pliometrik: `{ kg, reps (temas), plyo: true, q 0–2, rir: 9 }`
  - Beceri: `{ kg: 0, reps (deneme), hold?, skill: true, q 0–2, rir: 9 }`
- **Ayarlar:** `goals: Goal[]` (`perf` / `skill`; eski tekil `goal` otomatik taşınır), `restPrefs: { [exId]: sn }`, `fx: { sound: boolean, haptic: boolean }`.
- **Misafir → hesap taşıma kuralları:**
  - Programlarda `updatedAt` yeni olan, oturumlarda seti fazla olan (eşitse bulut) kazanır.
  - Uyku girişlerinde `at` yeni olan kazanır. Özel hareketler birleşir, ayarlarda bulut kazanır.
  - Sunucu onayından sonra yerel veri 30 günlük anlık görüntüye alınır.
- **Firebase projesi:** `outmove-cd140`, bölge europe-west3. Analytics başlatılmaz.
  - Android SHA-1 `C5:34:1E:AF:12:E4:35:0E:1A:48:D4:69:BB:6B:90:85:02:C3:1F:64` ve SHA-256 kayıtlı. Bu, repodaki sabit debug anahtarına ait; gizli değil.
  - `firebase-config.json` ve `google-services.json` repoda. Bunlar gizli değildir; veriyi koruyan şey kurallardır.

---

## 6) Modeller ve formüller

- **Son tekrar hızı → kalan tekrar (RIR), yükten bağımsız:**

  | Hız | Kalan tekrar | RPE |
  |---|---|---|
  | Aynı hız | 5+ | ≤6 |
  | Biraz yavaş | ~3 | 7 |
  | Belirgin yavaş | ~2 | 8 |
  | Çok yavaş | ~1 | 9 |
  | Zar zor | 0 | 10 |

  m/s değeri yalnızca bench hareketlerinde gösterilir; diğerlerinde temsili yüzde.
- **e1RM:** Epley, `kg × (1 + (tekrar + RIR) / 30)`. Yalnızca RIR ≤ 4, tekrar + RIR ≤ 12 ve `ROM ≥ %90` (eski setlerde varsayılan 100) setlerden. Kontrol: `e1rm(75, 8, 2) = 100`.
- **Tonaj:** tek kaynak `sessionStats().tonnage`. Dambıl (`eq === 'db'`) setlerinde iki el (`kg × tekrar × 2`), adı `Tek ` ile başlayanlar ×1.
- **Antrenman yorgunluğu:**
  - Kapsam: son 7 günün zor setleri (RIR ≤ 4).
  - Set ağırlığı = yakınlık (RIR 0…4 → 1,6 / 1,3 / 1,1 / 1 / 0,8) × hareket maliyeti (fat 3/2/1 → 1,5 / 1 / 0,6).
  - Pliometrik set = temas × `[0, .03, .05, .08, .12][yoğunluk]`.
  - Beceri set = deneme × `[0, .02, .04, .06][fat]`.
  - Azalma `e^(−saat/36)`. Skor = `100 × (1 − e^(−toplam/20))`.
- **Uyku puanı:** `20 × clamp((7,5 − dün gece)/2,5) + 10 × clamp((7 − son 3 gece ort.)/2) × (bilinen gece/3)`.
- **Bölgeler:** 0–39 Yönetilebilir · 40–69 Birikiyor · 70+ Yüksek.
- **Kontrol değerleri** (testlerde sabit):
  - antrenman yok + tek 5 sa gece = 23
  - üç 5 sa gece = 30
  - dün "Ağır gün" + 8 sa = 52; + 5 sa = 75
  - `simulatePlan(hipertrofiProgram())` ≈ 21 / ≈ 76
- **Pliometrik doz (NSCA):**
  - Seans başına temas: 80–100 (başlangıç), 100–120 (orta), 120–140 (ileri).
  - Seanslar arası 48–72 sa. 100 kg üstünde derinlik sıçramasında kutu en fazla 45 cm.
- **Hareket kütüphanesi** (`src/lib/data/exlib.ts`):
  - 466 hareket: 359 kuvvet, 28 olimpik, 51 pliometrik, 28 beceri.
  - Her hareket: Türkçe + İngilizce ad, 19 kas grubu, 18 ekipman, fat 1–3, direnç profili (a altta / u üstte / o ortada / d dengeli ağır).
  - İlk 17 id korunur.

---

## 7) Sürüm geçmişi

| Sürüm | Tarih | Ne oldu | Commit / görev |
|---|---|---|---|
| CNS anlatıcı | 2026-10-20 | Kullanıcının isteğiyle "Ağırlık Kaldırmada Merkezi Sinir Sistemi" etkileşimli anlatıcı (5 aşama: sinyal, motor ünite, ateşleme hızı, yorgunluk, toparlanma simülatörü) | artifact EJRCLGUmkjHivBQyYjLYQj |
| v0.1–v0.4 | 2026-10-20 → 23 | Anlatıcı telefona uygun bir uygulamaya dönüştü: "PERFORMANCE Uygulaması" prototipi (yorgunluk sekmesi, biyomekanik, Günlük/kayıt). Codex web/PWA ve Android APK fazlarını yaptı. Mobil düzeltme ve çökme onarımı. | artifact M5m8Sgmk91es5hxGozf3gk · `c412f3c` · `docs/gorevler/arsiv/` |
| v0.5–v0.7 | 2026-10-23 → 25 | Eğitim platformundan son kullanıcı uygulamasına: program yazma, set set kayıt, hız seçici, hedef kartı, set tablosu, Geçmiş, Lab. Yorgunluk modeli doğruluk için yeniden kuruldu. APK imzası sabitlendi. | `6f88ddb`, `8e79ac6`, `4fb0bc1` |
| V08 | 2026-11-03 → 14 | 438 hareketlik kütüphane + pliometrik kayıt | `459a522` |
| V09 | 2026-11-03 → 14 | Firebase hesap, açık rıza, misafir → hesap taşıma, çevrimdışı bulut | `b9c35e2` |
| Ad | 2026-11-06 | PERFORMANCE → **OUTMOVE** | `03700a1` |
| V10 | 2026-11-14 | Android beyaz üst şerit düzeltmesi, her telefona oturma + `test:layout`, varsayılan hedef ve hazır şablonlar kaldırıldı | `f7875cd` |
| V11 | 2026-11-14 | Sade plansız antrenman, bildirimli dinlenme sayacı, Android geri tuşu | `c5c588d` |
| V12 | 2026-11-15 | Dashboard, antrenman planları (program katmanı kalktı), Gözlem takvimi, satır içi geçmiş, öğrenme hedefleri, 28 beceri hareketi | `c2f274b` (Antigravity) |
| V13 | 2026-11-17 | Plansız idman pixel arayüzü (liste, çoklu seçici, sürüklemeli kilo/tekrar/hız/ROM, ekipman görselleri, dinlenme ekranı, ses/titreşim, pixel özet), `ROM ≥ %90` e1RM, dambıl iki el tonaj, `ready` otomatik başlatma | `5366058` (Antigravity) |

---

## 8) Açık işler / yol haritası

**Herkese açmadan önce:**
- Firebase Blaze planına geç, 1 $ bütçe uyarısı kur, günlük Firestore yedeğini aç (7 gün saklama).
- Gizlilik metnine veri sorumlusunun adını ve iletişim adresini yaz; metni bir hukukçuya kontrol ettir.
- Play Store'a çıkılacaksa:
  - Gerçek bir yayın imza anahtarı oluştur.
  - `USE_EXACT_ALARM` için gerekçe hazırla.
  - Yeni anahtarın SHA'larını Firebase'e ekle.

**Önerildi, henüz istenmedi:**
- **WhatsApp içe aktarma:** yıllardır WhatsApp grubuna yazılan antrenmanlar. WhatsApp → Sohbeti dışa aktar → Medya olmadan → .txt → uygulama biçimine çevir.
- **Drive yedeği:** haftalık otomatik JSON yedeğini Google Drive'a alma.
- **Ad kontrolü:** OUTMOVE için alan adı ve TÜRKPATENT marka kontrolü.

**Tasarım (pixel):**
- V14: V13'teki pixel dili tüm sekmelere (Dashboard, Antrenman listeleri, planlı oturum, Gözlem, Lab, sheet'ler) uygula. Kaynak: `reference/v13-pixel/`, kararlar §9.
- Açık soru: salona göre değişen makine plakası (5 / 7 kg, libre) için hareket başına plaka değeri mi tutulsun, yoksa yalnızca pim numarası mı kaydedilsin?

**Teknik borç:**
- Claude prototipi (`reference/v09/`) V10–V12'nin gerisinde: şablonlar, varsayılan hedef ve eski sekmeler hâlâ orada. Yeni bir referans gerekirse önce V12'ye göre güncellenmeli. V10'dan beri görev dosyaları referansa göre önceliklidir.
- Eski çok günlü program belgeleri bölünmeden plan olarak listeleniyor (V12 kararı). Gerekirse ileride tek günlük belgelere bölünebilir.

---

## 9) Karar günlüğü

| Tarih | Karar | Gerekçe |
|---|---|---|
| 2026-10-20 | CNS anlatıcısı telefon uygulamasına dönüşecek, ayrı proje | Kullanıcı isteği |
| 2026-10 | Kodlamayı Codex yapar; Claude tasarlar ve görev yazar | Kullanıcı isteği; telefonda APK olsun |
| 2026-10 | Sunucusuz başla: web/PWA + Capacitor APK, GitHub Actions'ta derleme | Android Studio gerekmesin |
| 2026-10 | PR yok, doğrudan `main`'e push; her görevin başında `git pull`, sonunda test + build | Kullanıcı PR ile uğraşmak istemiyor |
| 2026-10 | Eğitim platformundan son kullanıcı uygulamasına; tek sayfaya sığan ekranlar | Kullanıcı isteği |
| 2026-10 | Doğruluk önce: hız → RIR yükten bağımsız; yorgunluk modeli yeniden kuruldu | "Önemli olan tüm sürecin doğruluğu" |
| 2026-10-25 | Sabit debug imza anahtarı repoda | APK güncellemesi "yüklenmedi" hatası veriyordu |
| 2026-11-03 | Bulut: **Firebase** (Railway ve Supabase yerine), Google + e-posta, misafir modu sonra bağlanır | Kendi sunucu/auth/senkron yazmak gerekmez; çevrimdışı senkron hazır; ücretsiz kota yeterli |
| 2026-11-03 | Görev dosyaları zip değil, doğrudan repoya | Kullanıcı: "ya bu ne ya…" |
| 2026-11-06 | Ad **OUTMOVE**. MOVEOUT taşınma uygulamalarıyla, REZERV aynı adlı fitness uygulamasıyla çakışıyordu. Paket adı ve veritabanı adı değişmez. | Her türlü antrenmanı kapsayan, tek kelime |
| 2026-11-06 | Google Analytics başlatılmaz | KVKK; ayrı rıza gerekir |
| 2026-11-14 | Android tema kökü düzeltildi; tüm temalar koyu; dikey kilit | Beyaz şerit = beyaz splash teması + erken `EdgeToEdge` |
| 2026-11-14 | Varsayılan hedef ve hazır şablonlar yok; uygulama boş başlar | Kullanıcı isteği |
| 2026-11-14 | Sade ekran **yalnızca plansız** antrenmanda; hız + RPE sistemi aynen kalır; canlı geri sayımlı bildirim | Kullanıcının seçimleri |
| 2026-11-15 | "Antrenman türü" → **antrenman planı**; program katmanı kalkar; Programlar → **Gözlem** takvimi | "Antrenman planı varken programlara ihtiyaç yok" |
| 2026-11-15 | Takvim: haftalık tekrar + tek gün; sekme adı "Gözlem"; grafikler takvimin altına | Kullanıcının seçimleri |
| 2026-11-15 | "Bugün" → **Dashboard** | Kullanıcı isteği |
| 2026-11-15 | Öğrenme hedefleri: 4 aşama + 28 beceri hareketi, deneme + kalite kaydı | "Sadece performans değil, istediğim hareketi öğrenmeyi planlayayım (kip-up)" |
| 2026-11-15 | Planlar `programs` koleksiyonunda, her plan ayrı belge | Firestore kuralları değişmesin; cihazlar arası çakışma olmasın |
| 2026-11-16 | **Kayıt kuralı:** her konuşma, karar ve prompt repoya; hangi AI olursa olsun | Kullanıcı: "her şey her zaman repoya kaydolsun, promptlar repoya gitsin ekrana yazılmasın" |
| 2026-11-17 | **Pixel arayüz** (Press Start 2P yalnızca büyük sayılarda, geri kalan Pixelify Sans); küçük tuş yok, kontroller sürüklemeli; her adımda ses + titreşim + efekt. Önce plansız idmanda (V13), sonra tüm sekmelerde (V14) | "komple tüm uygulama biraz böyle pixel art gibi olsun … küçük tuşlara basarak kontrol etmek istemiyorum" |
| 2026-11-17 | Plansız idmanda RPE çipleri kalkar; RPE ve RIR son tekrar hızından gelir (2026-11-14 kararını değiştirir) | Konseptte onaylandı; set kutucuğunda RPE hızdan gösterilir |
| 2026-11-17 | Sete **ROM** (%10–100, varsayılan 100) eklenir; **ROM < %90 olan set e1RM'e girmez** | Kullanıcı: "o set rom %100 kaçtı onu puanlayalım"; yarım tekrar 1RM tahminini şişirir |
| 2026-11-17 | Dambılda tonaj iki el (`kg × tekrar × 2`); adı `Tek ` ile başlayanlar ×1 | Dambıl kilosu tek el giriliyor |
| 2026-11-17 | Plansız idman: hareket listesi + çoklu seçim + İdmanı başlat / bitir; başlatılmazsa set ekranı açılınca ya da set kaydedilince süre kendiliğinden başlar ve bildirim çıkar | Kullanıcı: "unutsak bile … idman süresini başlatmış ol" |

---

## 10) Sözlük

- **RIR:** kalan tekrar.
- **RPE:** algılanan zorluk; RPE = 10 − RIR.
- **e1RM:** tahmini tek tekrar maksimumu.
- **Zor set:** RIR ≤ 4.
- **fat:** hareketin yorgunluk maliyeti, 1–3.
- **Plan:** eski "antrenman türü"; hareketleri ve hedefleri yazılı antrenman.
- **Plansız antrenman:** plan olmadan başlatılan oturum (`dayId == null`).
- **Gözlem:** takvim + ay özeti sekmesi.
- **Temas:** pliometrik iniş/sıçrama sayısı.
- **Deneme:** beceri girişimi.
- **Görev dosyası:** `docs/gorevler/Vxx-*.md`; kodlayan AI'nın uyguladığı ayrıntılı iş tanımı.

---

## 11) Dosya haritası

| Dosya | Ne |
|---|---|
| `AGENTS.md` | Bütün AI'lar için kurallar, teknik şema, test kuralları, kayıt kuralı |
| `docs/PROJE.md` | Bu belge: ne, neden, nasıl, kararlar |
| `docs/KONUSMA-KAYDI.md` | Tüm konuşmaların kronolojik kaydı |
| `GOREV.md` | Bekleyen / tamamlanan görevler |
| `docs/gorevler/` | Görev dosyaları (V08–V12), `arsiv/` eski görevler |
| `docs/FIREBASE-KURULUM.md` | Firebase konsol kurulumu |
| `reference/` | Claude prototipleri (tarihçe ve tasarım kaynağı) |
| `reference/v13-pixel/` | V13 pixel tasarım konsepti (Design tuvali kaynağı, `README.md` nasıl okunacağını anlatır) |
| `CLAUDE.md`, `GEMINI.md`, `.agent/rules/`, `.cursor/rules/`, `.github/copilot-instructions.md` | Farklı AI araçlarını `AGENTS.md`'ye yönlendiren kısa dosyalar |
