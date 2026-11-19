# OUTMOVE · proje belgesi (tek kaynak)

> **Bu dosya projenin hafızasıdır.** Hangi yapay zekâ ya da kişi bu repoda çalışırsa çalışsın:
> 1. önce `AGENTS.md`'yi,
> 2. sonra bu dosyayı,
> 3. sonra `GOREV.md`'yi okur.
>
> Konuşmaların kronolojik kaydı `docs/KONUSMA-KAYDI.md`'de. Kalıcı her karar bu dosyaya da işlenir (bkz. §9 Karar günlüğü).
> Repo **herkese açık**. Buraya şifre, token ya da kişisel sağlık/vücut verisi yazılmaz.

Son güncelleme: 2026-11-19 · V21 (dil altyapısı, İngilizce varsayılan).

---

## 1) Ürün

**OUTMOVE**, her türlü antrenmanı takip eden ve yorgunluğu yöneten bir telefon uygulaması.
- Ağırlık, olimpik kaldırış, pliometri ve beceri (kip-up, amut, front lever…) kaydı.
- Arayüz **İngilizce (varsayılan) ve Türkçe** (V21; sekme sekme çevriliyor, bkz. §8). Hedef platform Android (APK). Aynı kod PWA olarak da çalışır.
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
- **Planlı oturum:** hedef kartı ("Hedef 4×6–8 · 80 kg · RPE 8"), planlı set satırları, "Set 1/4 kaydet", hız animasyonu. Hareketin notu hedef kartında küçük yazıyla görünür.
- **Plan düzenleyici (V18):**
  - hareket seçilince eklenir ve ayar penceresi kendiliğinden açılır;
  - set (1–12), tekrar aralığı (1–30), RPE aralığı (5–10) sürüklemeli merdiven; aralıkta dokunulan yere en yakın uç oynar;
  - kilo isteğe bağlı sürüklemeli bant (40 kg pencere, kenarda tutunca kayar, "Kilo hedefini kaldır");
  - "Nasıl yapılacak" hazır seçenekleri (Hissederek yap, Altta beklet, Pump seti …) + ek not; seçilenler notta ` · ` ile birleşir, plan menüsünde ve hedef kartında görünür.
- **Antrenman özeti (geçmiş, V18):**
  - set kutucuğuna dokununca salt okunur ayrıntı: RPE, kalan tekrar, zor set, e1RM, son tekrar hızı, ROM, tonaj;
  - "Bu antrenmanda çalışan kaslar" (zor set sayısıyla) + yardımcı kaslar;
  - son 7 gün kas başına zor set çubukları (az / iyi / fazla, bu antrenmanın katkısı `+n`) ve uyarılar (az, bu hafta hiç, fazla).
- **Android geri tuşu:** sheet'i / pixel pencereyi kapatır → büyük dinlenmeyi küçültür → set ekranından listeye döner → oturumdan Dashboard'a (oturum sürer) → sekmeden Dashboard'a → Dashboard'da iki kez basınca çıkar.

**Hesap ve ayarlar** (eski adı Hesap ve yedek; Dashboard sağ üst):
- En üstte **Language · Dil** seçici: English / Türkçe (cihazda saklanır, varsayılan English).
- Misafir ya da Google / e-posta hesabı. İlk girişte açık rıza.
- Sesler / Titreşim / Animasyonlar anahtarları (`settings.fx`: `sound`, `haptic`, `motion`). `motion` açıksa cihaz "animasyonları azalt" dese de pixel ekran animasyonları tam oynar. Cihaz azaltıyorsa altında not çıkar.
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
- **Dil (V21):** `src/i18n/`. Kaynak metin Türkçe ve anahtar; `t()` / `tc()` / `byLang()`; İngilizce sözlük `src/i18n/en/*.ts`. Veri Türkçe saklanır, gösterimde `muscleName()` / `exName()` / `dayLabel()` çevirir. Dil değişince `.device-wrap` `key={lang}` ile yeniden kurulur.
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

- **Firestore:** `users/{uid}` (`email, createdAt, consent {v: 2, at, text}, terms {v, at}, appVersion`; rıza geri alınınca yalnızca `consent {v: 0, withdrawnAt}`). Alt koleksiyonlar: `programs`, `sessions`, `exercises`, `checkins`, `settings`. `firestore.rules`: yalnızca `request.auth.uid == uid`, yalnızca bu 5 alt koleksiyon. **Yeni koleksiyon açmak kuralların konsolda yeniden yayınlanmasını gerektirir**; bu yüzden V12'de planlar `programs` içinde tutuldu.
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
| V14–V20 | 2026-11-17 → 18 | Pixel tema bütün sekmelere (V14–V17), plan ayarları ve özet (V18), basılı tutma ve göreli sürükleme (V19), yasal metinler, kabul kapısı, hesap/veri silme (V20) | `docs/gorevler/V14…V20` |
| V23 | 2026-11-19 | Gözlem sekmesi İngilizce (Plan & insights): takvim, gün paneli, ay özeti, uyarılar, 1RM, haftalık yük | `docs/gorevler/V23-ingilizce-gozlem.md` |
| V22 | 2026-11-19 | Antrenman sekmesi İngilizce (plansız/planlı oturum, plan düzenleyici, özet, dinlenme bildirimi ve Android kanal adları) | `docs/gorevler/V22-ingilizce-antrenman.md` |
| V21 | 2026-11-19 | Dil altyapısı; **İngilizce varsayılan**, Türkçe seçenek (Hesap ve ayarlar); ortak katman, Dashboard, Hesap, yasal kapı arayüzü İngilizce | `docs/gorevler/V21-dil-altyapisi-ingilizce.md` |
| V13 | 2026-11-17 | Plansız idman pixel arayüzü (liste, çoklu seçici, sürüklemeli kilo/tekrar/hız/ROM, ekipman görselleri, dinlenme ekranı, ses/titreşim, pixel özet), `ROM ≥ %90` e1RM, dambıl iki el tonaj, `ready` otomatik başlatma | `5366058` (Antigravity) |

---

## 8) Açık işler / yol haritası

**Herkese açmadan önce:**
- Firebase Blaze planına geç, 1 $ bütçe uyarısı kur, günlük Firestore yedeğini aç (7 gün saklama).
- Yasal (V20): `src/legal/meta.ts`'ye şirket adresi ve gizlilik e-postası; VERBİS kaydı (Türkiye'de veri sorumlusu temsilcisi); Google ile KVKK standart sözleşmesi + 5 iş günü içinde Kuruma bildirim; AB kullanıcısı alınacaksa GDPR m.27 temsilcisi; Play'de gizlilik ve hesap silme bağlantısı `legal.html#gizlilik` / `#silme`; metinleri hukukçuya kontrol ettir. Firestore günlük yedeği açılırsa saklama süresi Gizlilik Politikası Bölüm 8'e yazılır.
- Play Store'a çıkılacaksa:
  - Gerçek bir yayın imza anahtarı oluştur.
  - `USE_EXACT_ALARM` için gerekçe hazırla.
  - Yeni anahtarın SHA'larını Firebase'e ekle.

**Önerildi, henüz istenmedi:**
- **WhatsApp içe aktarma:** yıllardır WhatsApp grubuna yazılan antrenmanlar. WhatsApp → Sohbeti dışa aktar → Medya olmadan → .txt → uygulama biçimine çevir.
- **Drive yedeği:** haftalık otomatik JSON yedeğini Google Drive'a alma.
- **Ad kontrolü:** OUTMOVE için alan adı ve TÜRKPATENT marka kontrolü.

**Dil (V21'den itibaren, sekme sekme):**
- V21 altyapı + Dashboard + Hesap ✓, V22 Antrenman ✓, V23 Gözlem ✓; kalan: V24 Lab, V25 yasal metinlerin İngilizcesi + son tarama. Görev dosyaları `docs/gorevler/V24…V25`.
- Geçiş bitene kadar İngilizcede çevrilmemiş sekmeler kısmen Türkçe görünür; Türkçe seçiliyse her şey eskisi gibi.

**Tasarım (pixel):**
- **Pixel geçişi bitti.** V13–V13.1 plansız idman; V14 Dashboard + alt sekme çubuğu; V15 alt pencereler, Antrenman sekmesi, planlı oturum, plan düzenleyici; V16 Gözlem; V17 Lab + kalan ikonlar.
- İleride istenirse: Lab için kare kare sprite animasyonları (retro oyun karakteri gibi), ayrı iş.

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
| 2026-11-17 | Pixel stillerinde sınıf adları `px-` önekli olur; global CSS'te tek başına tanımlı bir adı kullanmak yasak (`pixel-classes.test.mjs` denetler) | V13'te global `.sl` listeyi 30 px'e sıkıştırdı |
| 2026-11-17 | **Dengeli pixel dozu:** Press Start 2P yalnızca büyük sayılarda ve büyük düğmelerde, yalnızca 8'in katı boyutlarda; başlıklar Saira, metin ve küçük sayılar IBM Plex Sans; Pixelify Sans kalkar | Kullanıcı: "yazılar okunmuyor … daha düzgün pikseller olsun"; "dengeli doz kalsın" |
| 2026-11-17 | Plansız set düğmesi `SET n BİTTİ`, rengi son tekrar hızının rengi; dinlenme sürerken düğme yerine dinlenme çubuğu (iptal büyük sayaçtan) | Kullanıcı isteği |
| 2026-11-17 | Pixel dil tüm uygulamaya yayılacak: **yalnızca stil değişir, her özellik ve akış korunur**; sekme sekme, önce tuvalde tasarım | Kullanıcı: "herşey korunucak … sadece stil değişicek" |
| 2026-11-18 | Silme düğmeleri 1 sn, İDMANI BİTİR / HAREKETİ BİTİR 0,5 sn **basılı tutulur** (`HoldButton`). "Emin misin" adımları kalktı; klavye/ekran okuyucu basılı tutmadan çalıştırır | Kullanıcı: "hemen basar basmaz çalışmasın … basılı tutulması gerektiği belli olsun" |
| 2026-11-18 | Kilo/tekrar barları (set ekranı ve plan ayarları) **göreli** sürüklenir: dokunmak değeri değiştirmez; parmak bardan uzaklaştıkça hassaslık 1/2, 1/4, 1/8 | Kullanıcı: "dokundumuz yere ışınlanmasın … youtube dan videoyu ileri yada geri sarmak gibi" |
| 2026-11-18 | Hareket "bitti" olarak işaretlenebilir (`item.done`); yeni set kaydı işareti kaldırır. `fx.motion` varsayılanı açık | Kullanıcı: "hareketi bitir tuşu", "o tam şekilde koyalım" |
| 2026-11-18 | Cihaz "animasyonları azalt" diyorsa set inişi uçmaz, yeni kutucuk yerinde yanıp söner, dinlenme ekranı 650 ms sonra açılır. Hesap'taki **Animasyonlar** anahtarı (`fx.motion`, varsayılan kapalı) sistemi geçer. `cns.css`'teki genel azaltma kuralı `.px` ekranlarına dokunmaz | Kullanıcı: "set gridine yerleşiyordu. O yok şuan"; kod sağlamdı, cihazın azaltma ayarı animasyonu tamamen kapatıyordu |
| 2026-11-18 | Plan ayarlarında sayılar elle yazılmaz, set kaydı gibi **sürüklenir**; hareket seçilince ayar penceresi kendiliğinden açılır; not için hazır "nasıl yapılacak" seçenekleri | Kullanıcı: "tekrar tıklayıp doldurmayım", "setleri kaydeder gibi", "ihtimaller listesi" |
| 2026-11-18 | Geçmiş özetinde set ayrıntısı salt okunurdur (silme yok); kas bölümü bu antrenmanda çalışan kasları ve haftalık durumu uyarılarla gösterir | Kullanıcı: "detayı görebileyim", "o bi ifade vermio … uyarılan kaslar" |
| 2026-11-18 | Makine/kablo ağırlık yığını, bar plakaları ve pim **temsilidir**: kaydedilen ve hesaba giren tek şey girilen kilo. Salona göre plaka değeri ya da pim numarası tutulmaz | Kullanıcı: "plaka zaten göstermelik. Önemli olan bizim verdimiz sayı … pim sırası falan … O temsili biraz" |
| 2026-11-18 | Yorgunluk ölçerde iki görünüm: **Şu an** (kayıtlar + uyku) ve **Simülasyon** (kaydırıcılar). Kaydırıcıya dokununca ibre simülasyona geçer, "Şu an" ile geri döner | Kullanıcı: "bar hiç hareket etmio artırıp azaltsamda"; ibre yalnızca kayıtlardan gelen değeri gösteriyordu |
| 2026-11-18 | Lab animasyonları pixel'e **boyanarak** geçer (seçenek 2): aynı çizim ve hareket, pixel palet, keskin kenar, kare uç, parlama yok; Lab'da sinir sinyali mavi. Kare kare sprite ileride ayrı iş | "sadece stil değişicek"; animasyonların öğrettiği her şey korunur |
| 2026-11-18 | Ortak `Icon` bileşeni, `PxIcon`'da karşılığı olan ikonu pixel çizer (boyut 12/18/24'e yuvarlanır) | Bütün uygulamada ikon dili tek |
| 2026-11-18 | Veri sorumlusu **PRWAGON LLC**. Yasal metinler `src/legal/texts/*.md` tek kaynaktır; uygulamada pencere, webde `legal.html` olarak açılır. Yer tutucular `meta.ts`'de; EIN ve kişisel bilgi depoya yazılmaz | Kullanıcı: "firma adı prwagon llc", "çok detaylı koy başa iş almayak"; depo herkese açık |
| 2026-11-18 | İlk açılışta kabul kapısı: Kullanım Koşulları **kabul edilir**, aydınlatma yalnızca **okundu** işaretlenir; açık rıza ayrı metin ve ayrı beyanla yalnızca hesap açarken istenir (rıza v2). `LEGAL.VERSION` yalnızca önemli değişiklikte artar | KVKK İlke Kararı 2026/347 (aydınlatma ve açık rıza ayrı; aydınlatmaya onay istenmez); GDPR m.7 ve m.9 |
| 2026-11-18 | Açık rızayı geri almak bulut kayıtlarını siler, e-posta hesabı kalır ve kayıtlar cihazda misafir olarak devam eder; misafir cihaz verisini tek düğmeyle silebilir | Rızanın geri alınması verilmesi kadar kolay olmalı (GDPR m.7/3); hesap silme ayrı ve daha sıkı kalır |
| 2026-11-18 | Animasyonlar yalnızca `transform`/`opacity` ile ve daha çok adımla oynar; dinlenmede ekran saniyede 1 çizilir | Kullanıcı: "animasyonlar bir tık kasio gibi" |
| 2026-11-19 | **Dil seçeneği; varsayılan İngilizce** (telefon dili ne olursa olsun), Türkçe seçilebilir. Seçim cihazda saklanır. Çeviri sekme sekme (V21 altyapı + Dashboard + Hesap, V22–V25 kalanlar) | Kullanıcı: "İngilizce ile başlayalım ve asıl default dil olsun … Ayarlardan dil seçeneği olsun" |
| 2026-11-19 | Kaynak metin Türkçe kalır ve sözlük anahtarıdır (gettext yöntemi); veri (kas, hareket, gün adı) Türkçe saklanır, yalnızca ekranda çevrilir | Mevcut kayıtlar ve testler bozulmaz; dil değişince geçmiş veri de doğru dilde görünür |
| 2026-11-19 | "Hesap ve yedek" penceresi **Hesap ve ayarlar** oldu; dil seçici en üstte, etiketi iki dilde (`Language · Dil`) | Dil bir ayar; yanlış dilde kalan da bulsun |
| 2026-11-19 | İngilizce adlar: sekmeler Dashboard · Workout · Insights · Lab; Plansız antrenman → **Quick workout**; hesap silme onayı **DELETE** | Kısa ve doğal İngilizce; "Free workout" ücretsiz gibi okunuyordu |
| 2026-11-17 | Pixel'e geçiş bir **tema katmanıyla** yapılır (`px-theme.css`, kök sınıf `.pxt`): var olan DOM ve kimlikler aynen kalır, yalnızca görünüm değişir. Yeni pixel bileşenleri `pixel.css`'te `px-` önekiyle yazılır | "sadece stil değişicek"; testler ve akışlar bozulmasın |

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
- **Çeviri anahtarı:** Türkçe kaynak metin; `t('Kaydet')` İngilizcede `Save`. Sözlük `src/i18n/en/*.ts`.

---

## 11) Dosya haritası

| Dosya | Ne |
|---|---|
| `AGENTS.md` | Bütün AI'lar için kurallar, teknik şema, test kuralları, kayıt kuralı |
| `docs/PROJE.md` | Bu belge: ne, neden, nasıl, kararlar |
| `docs/KONUSMA-KAYDI.md` | Tüm konuşmaların kronolojik kaydı |
| `GOREV.md` | Bekleyen / tamamlanan görevler |
| `docs/gorevler/` | Görev dosyaları (V08–V25), `arsiv/` eski görevler |
| `src/i18n/` | Dil katmanı (`index.ts`, `names.ts`) ve İngilizce sözlük (`en/`) |
| `docs/FIREBASE-KURULUM.md` | Firebase konsol kurulumu |
| `reference/` | Claude prototipleri (tarihçe ve tasarım kaynağı) |
| `reference/v13-pixel/` | V13 pixel tasarım konsepti (Design tuvali kaynağı, `README.md` nasıl okunacağını anlatır) |
| `CLAUDE.md`, `GEMINI.md`, `.agent/rules/`, `.cursor/rules/`, `.github/copilot-instructions.md` | Farklı AI araçlarını `AGENTS.md`'ye yönlendiren kısa dosyalar |
