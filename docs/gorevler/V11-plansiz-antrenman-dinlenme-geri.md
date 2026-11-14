# V11 · Sade plansız antrenman, bildirimli dinlenme sayacı, geri tuşu

Kullanıcının amacı: programsız salona gidip antrenmanı **çok hızlı** kaydedebilmek. Bunun için:
- hareket ekle,
- kilo · tekrar · son tekrar hızı / RPE gir,
- seti kaydet,
- dinlenme sayacı kendiliğinden başlasın.

Ekranda bunun dışında bir şey olmasın.

Kullanıcının kararları:
- Sade ekran **yalnızca plansız antrenmanda**. Programlı antrenman ekranı bugünkü gibi kalır.
- Son tekrar hızı seçici ve RPE çipleri **bugünkü haliyle kalır** (iyi çalışıyor).
- Dinlenme bildirimi: kilit ekranında **canlı geri sayım**, bitince titreşim + ses.
- Program / antrenman türü yapısına bu görevde dokunulmaz.

Bu görev `reference/v09/`'dan bilerek ayrılır; çelişkide bu dosya geçerlidir.

---

## 1) Plansız antrenman: sade ekran

**Tanım.** Plansız antrenman = `session.dayId == null` olan oturum (`startSession(null, null)`). Bunun için tek bir yardımcı yaz: `isFree(s)`. Ad kontrolü (`dayName === 'Boş antrenman'`) hiçbir yerde kullanılmasın; `SaveTemplateBody`'deki kontrol de `isFree`'ye geçsin.

**Adlandırma:**
- Antrenman sekmesindeki `#free-session` düğmesinin metni: `Plansız antrenman` (ikon `plus` kalsın).
- Yeni oturumların `dayName`'i `Plansız antrenman`. Eski kayıtlardaki `Boş antrenman` adına dokunma; geçmiş, özet ve listelerde gösterirken `Boş antrenman` → `Plansız antrenman` olarak göster.
- Antrenman sekmesinin boş hali: `<strong>Henüz antrenman türün yok</strong><p>Plansız antrenmanla hemen başla; istersen bitince antrenman türü olarak kaydet.</p>`
- Oturumdaki ilk boş hal (hareket yokken): başlık `Plansız antrenman`, metin `Yaptığın hareketi ekle, setlerini kaydet.`, düğme `Hareket ekle` (`#ses-add-first`, aynı).

**Plansız oturumda ekran (yukarıdan aşağı):**
```
┌ ● Plansız antrenman                         [Bitir] ┐   başlık: aynı (.shead), alt satır: "17:23 başladı · 12:40 · 4 set"
├──────────────────────────────────────────────────────┤
│ [Düz bench press 3] [Squat 1] [Barfiks ×] [+ Hareket] │   hareket şeridi (yatay kayar)
│ Düz bench press                                  (i) │   seçili hareketin adı + bilgi düğmesi
│ ┌ SET  KİLO  TEKRAR  RPE  SON TEKRAR  SAAT ┐         │   yalnızca YAPILAN setler
│ │ ✓1   60    10      8    Belirgin    17:31│         │
│ └──────────────────────────────────────────┘         │
│          ( dinlenme sayacı: 2:14 )                    │   orta alan: dinlenirken büyük sayaç, yoksa boş
│ KİLO  [−][ 60 ][+]      TEKRAR [−][ 10 ][+]           │   dock: bugünkü gibi
│ SON TEKRARIN HIZI  (5'li seçici, bugünkü)             │
│ RPE ≤6 7 8 9 10                               [✎]     │
│ [              Seti kaydet              ]             │
└──────────────────────────────────────────────────────┘
```

Plansız oturumda **olmayacaklar:**
- `.exprog` ilerleme çubuğu
- `.exnav` oklu gezinme ve "Hareket 1/n"
- `.tgt2` hedef kartı
- `SetTable`'daki `srow.now` ("sırada") satırı ve `srow.plan` (planlı boş set) satırları
- Orta alandaki `SpeedStage` (iki şeritli m/s animasyonu ve "1. tekrar / son tekrar m/s" özeti)
- Kaydet düğmesindeki "1/3", "· ek", "Ek set / Sonraki hareket" ikilisi

Ayrıntılar:
- **Hareket şeridi** (`.fx-strip`, yatay kayan tek satır):
  - Her eklenen hareket bir çip: `ad` + set sayısı (mono, `--muted`). Seçili olan `.on`.
  - Hiç seti olmayan çipte küçük bir `×` (`aria-label="… hareketini çıkar"`) olsun; hareketi oturumdan siler.
  - En sonda `+ Hareket` çipi (`#fx-add`), hareket seçiciyi (`picker`) açar.
  - Yeni eklenen hareket seçili olur ve şerit onu görünür alana kaydırır.
- **Başlık satırı** (`.fx-title`): seçili hareketin adı (bugünkü `.exnav-n` stili) ve sağında `#ex-info` (i) düğmesi.
- **Set tablosu:** aynı sütunlar, yalnızca yapılan setler. Hiç set yoksa tek satır, sönük: `İlk setini kaydet`. Satıra dokununca set ayrıntısı açılır (aynı). Plansızda hedef aralığı olmadığı için tekrar hücresi asla `off` (kırmızı) olmaz.
- **Kaydet düğmesi:** `#log-set`, metin `Seti kaydet`, `btn fire big`, tek düğme, tam genişlik.
- **Pliometrik hareket** plansızda: dock bugünkü pliometrik dock. Orta alanda dinlenme yokken `PlyoStage` kalsın (seans temas sayacı güvenlik için gerekli).

**Kilo ve tekrarın ilk değeri** (plansız oturumda yeni eklenen hareket):
1. Bu oturumda bu hareketin son seti varsa: o set (bugünkü gibi).
2. Yoksa geçmişte bu hareketin **en son yapılan seti** (`st.sessions`, `status: 'done'`, aynı `exId`, en büyük `at`): onun kilosu ve tekrarı. Hız seviyesi de oradan.
3. Hiç kayıt yoksa:
   - kilo: barbell (`eq: 'bb'`) için 20, vücut ağırlığı (`bw`) ve pliometrik için 0, diğerleri için 0.
   - tekrar: kuvvet 10, olimpik 3, pliometrik 5.
   - Kilo 0 iken ve hareket `bw` / pliometrik değilse `Seti kaydet` pasif; düğmenin üstünde küçük ipucu: `Kiloyu gir`.

Programlı oturumda `entryFor` bugünkü gibi kalsın.

**Programlı oturum ekranı değişmiyor**; tek fark aşağıdaki dinlenme sayacı.

---

## 2) Dinlenme sayacı (her iki oturum türünde)

**Davranış:**
- `Seti kaydet`'e basınca sayaç **kendiliğinden** başlar (bugün de başlıyor).
- **Süre:**
  - Plansızda: kullanıcının bu hareket için son ayarladığı süre. Yoksa hareketin kütüphane süresi (`lib.rest`). O da yoksa 120 sn.
  - Programlıda: kalemin `target.rest`'i (bugünkü gibi).
- **Ayar:**
  - Sayaçta `−15` ve `+15` sn düğmeleri ve `Atla` var (bugünkü tek `+30` yerine). Alt sınır 15 sn, üst sınır 600 sn.
  - Plansızda `−15/+15` yapılan değişiklik o hareket için hatırlanır: `settings` belgesi `key: 'restPrefs'`, `value: { [exId]: saniye }`, buluta da gider. Bir sonraki sette ve sonraki antrenmanlarda bu süre kullanılır.
  - Programlıda yalnızca o anki sayacı değiştirir (programdaki süre değişmez).
- **Durumu oturuma yaz:** sayaç şu an sadece bileşen state'inde; sekme değişince ya da uygulama kapanınca kayboluyor. Bunu `session.rest = { start, total, exId, setNo }` olarak oturum belgesine yaz (`mutate`). `Atla`, yeni set, `Bitir` ve `Sil` bu alanı silsin. Oturum ekranı açılınca `session.rest`'ten devam etsin.
- **Görünüm:**
  - Plansızda orta alanda büyük sayaç (`RestBig`, `#rest-big`). Orta alan sayaca yetmeyecek kadar kısaysa (`.ses2-body.compact-overflow` ya da `.ses2-mid` yüksekliği < 72 px) dock'ta `RestChip` görünsün. Sayaç **her ekran boyutunda görünür** olmalı.
  - Programlıda bugünkü gibi dock'ta `RestChip`, ama `−15 / +15` ile.
  - Süre bitince bugünkü "Hazırsın +0:05" hali kalsın.

**Telefon bildirimi (Android, canlı geri sayım).** Küçük bir yerel Capacitor eklentisi yaz, dış paket ekleme.

- `android/app/src/main/java/app/performance/training/RestTimerPlugin.java`:
  `@CapacitorPlugin(name = "RestTimer", permissions = @Permission(strings = { Manifest.permission.POST_NOTIFICATIONS }, alias = "notifications"))`
  - `start({ endAt: number (ms, epoch), title: string, body: string, doneTitle: string, doneBody: string })`:
    - Kanalları oluştur (bir kez):
      - `rest-running`: "Dinlenme sayacı", `IMPORTANCE_LOW`, ses ve titreşim yok.
      - `rest-done`: "Dinlenme bitti", `IMPORTANCE_HIGH`, varsayılan bildirim sesi, titreşim `[0, 350, 150, 350]`.
    - Süren bildirim (id 4101, `rest-running`):
      - `setSmallIcon(R.drawable.ic_stat_rest)`, `setContentTitle(title)`, `setContentText(body)`
      - `setUsesChronometer(true)`, `setChronometerCountDown(true)`, `setWhen(endAt)`, `setShowWhen(true)`
      - `setOngoing(true)`, `setOnlyAlertOnce(true)`, `setCategory(CATEGORY_STOPWATCH)`, `setVisibility(VISIBILITY_PUBLIC)`
      - Dokununca uygulamayı açan `PendingIntent` (`FLAG_IMMUTABLE | FLAG_UPDATE_CURRENT`).
    - `endAt` anı için alarm kur → `RestTimerReceiver`:
      - `canScheduleExactAlarms()` doğruysa (ya da API < 31) `setExactAndAllowWhileIdle(RTC_WAKEUP, endAt, pi)`.
      - Değilse `setAndAllowWhileIdle(RTC_WAKEUP, endAt, pi)`.
    - Aynı çağrı tekrar gelirse eski alarmı ve bildirimi günceller (±15 için).
  - `stop()`: alarmı iptal et, 4101 ve 4102'yi kaldır.
- `RestTimerReceiver.java` (`BroadcastReceiver`):
  - 4101'i kaldırır.
  - 4102'yi `rest-done` kanalına yazar: `doneTitle` / `doneBody`, `setAutoCancel(true)`, `PRIORITY_HIGH`, `setTimeoutAfter(5 * 60 * 1000)`, dokununca uygulamayı açar.
- `res/drawable/ic_stat_rest.xml`: tek renkli (beyaz) 24 dp vektör. Material "timer" yolunu kullan:
  `M15,1H9v2h6V1z M11,14h2V8h-2V14z M19.03,7.39l1.42-1.42c-0.43-0.51-0.9-0.99-1.41-1.41l-1.42,1.42C16.07,4.74,14.12,4,12,4c-4.97,0-9,4.03-9,9s4.02,9,9,9s9-4.03,9-9C21,10.88,20.26,8.93,19.03,7.39z M12,20c-3.87,0-7-3.13-7-7s3.13-7,7-7s7,3.13,7,7S15.87,20,12,20z`
- `MainActivity`: `registerPlugin(RestTimerPlugin.class);` satırı `super.onCreate(...)`'ten **önce** olmalı. Bu, Capacitor'ın kuralı ve pencereye dokunmaz; V10 kuralını bozmaz. `EdgeToEdge` ve `textZoom` satırları olduğu gibi kalsın.
- `AndroidManifest.xml`:
  - `POST_NOTIFICATIONS`, `VIBRATE`
  - `USE_EXACT_ALARM`
  - `SCHEDULE_EXACT_ALARM` (`android:maxSdkVersion="32"`)
  - `<receiver android:name=".RestTimerReceiver" android:exported="false" />`
  - Not: `USE_EXACT_ALARM` Play Store'da gerekçe ister. Şimdilik APK doğrudan kuruluyor; Play'e çıkarken yeniden değerlendirilecek. Bunu README'de "Bilinen notlar" altına yaz.
- JS sarmalayıcı `src/lib/native/restTimer.ts`:
  - `registerPlugin('RestTimer', { web: … })`. Web uygulaması no-op: PWA'da bildirim yok, sadece ekrandaki sayaç.
  - `startRest(rest, exName)`:
    - `endAt = rest.start + rest.total * 1000`
    - `title: 'Dinlenme · ' + exName`, `body: (rest.setNo + 1) + '. set sırada'`
    - `doneTitle: 'Dinlenme bitti'`, `doneBody: exName + ' · ' + (rest.setNo + 1) + '. set zamanı'`
  - `stopRest()`.
  - İzin: ilk sayaç başlarken `checkPermissions()`. `prompt` ise bir kez `requestPermissions()` iste. Sonucu `localStorage`'a `restNotifyAsked=1` olarak yaz ve bir daha sorma. Reddedilirse sessizce sadece ekran sayacı çalışsın.
  - Bütün çağrılar `try/catch`'li olsun; eklenti hatası set kaydını asla engellemesin.
- Çağrı noktaları:
  - **`startRest`:** set kaydı ve `−15/+15`.
  - **`stopRest`:** `Atla`, yeni set kaydı (önce stop, sonra yeni start), `Bitir`, `Sil`, `Kaydetmeden çık` ve hesaptan çıkış.

---

## 3) Android geri tuşu

Şu an geri tuşu her yerde uygulamayı kapatıyor (ör. hareket seçici açıkken). Beklenen davranış:

**Kurulum:**
- `@capacitor/app` ekle (Capacitor 8.5.3 ile uyumlu major; `npm view @capacitor/app peerDependencies` ile kontrol et).
- `src/app/back.ts`'te LIFO bir geri yığını: `useBack(active: boolean, handler: () => void)`. Kancayı kullanan en son ve etkin bileşen geri tuşunu "yer". Kök dinleyici: `App.addListener('backButton', …)`, yalnızca native'de.

**Öncelik sırası:**
1. Açık sheet varsa en üsttekini kapat (sheet yığını kancayı kullansın).
2. Oturumdaki satır içi onay (`Bitir` / `Sil` sorusu) açıksa onu kapat.
3. Alt ekranlar bir önceki ekrana döner:
   - Program düzenleyici ve program analizi → Programlar listesi (bugünkü `onBack`).
   - Antrenman geçmişi → Antrenman başlangıcı.
   - Lab'da açık ders ya da hareket ayrıntısı → Lab listesi (hangisi sheet değilse).
4. Aktif oturum ekranı: Bugün sekmesine geç. Oturum sürer, Antrenman sekmesindeki canlı nokta kalır, **hiçbir şey silinmez**.
5. Bugün dışındaki bir sekmenin kökü: Bugün'e geç.
6. Bugün kökü:
   - İlk basışta alt tarafta toast: `Çıkmak için tekrar bas` (2 sn).
   - 2 sn içinde ikinci basışta `App.exitApp()`.

Klavye açıksa sistem önce klavyeyi kapatır; bu davranışa karışma.

---

## 4) Testler

- **`back.test.ts`:**
  - Yığın sırası: sheet > satır içi onay > alt ekran > oturum → Bugün > sekme kökü → Bugün > Bugün'de çift basış.
  - Kanca kapanınca (unmount) yığından çıkıyor.
- **`restTimer.test.ts`** (eklenti taklit edilir):
  - Süre çözümü: `restPrefs[exId]` > `lib.rest` > 120 (plansız); `target.rest` (programlı).
  - `±15` 15–600 aralığına sıkışıyor.
  - Plansızda `restPrefs` yazılıyor, programlıda yazılmıyor.
  - Set kaydında `start(endAt = at + total·1000)` çağrılıyor; sonraki sette önce `stop` sonra `start`; `Bitir`'de `stop`.
  - Eklenti hata fırlatınca set yine kaydediliyor.
- **`screens.test.tsx`:**
  - **Plansız:**
    - `#free-session` metni "Plansız antrenman".
    - "düz bench" eklenince `.tgt2`, `.exprog`, `.srow.plan`, `.srow.now` **yok**.
    - `#log-set` metni "Seti kaydet".
    - Kayıttan sonra bir `.srow.done` ve `#rest-big` (ya da `.restchip`) var.
    - `+15` süreyi artırıyor.
    - İkinci hareket ekleyince şeritte iki çip var; setsiz çipte `×` hareketi siliyor.
  - **Geçmişten varsayılan:** önceden `60 kg × 10` bench içeren bitmiş bir oturum yaz → yeni plansız oturumda bench eklenince kilo 60, tekrar 10.
  - **Programlı oturum değişmedi:** "Ağır gün"de `.tgt2` ve plan satırları var, `#log-set` metni "Set 1/2 kaydet" biçiminde.
- **`npm run test:layout`:**
  - Plansız akışta set kaydından sonra dinlenme sayacının (`#rest-big` ya da `.restchip`) ve `#log-set`'in görünür olduğunu tüm boyut matrisinde kontrol et.
  - Programlı oturum akışını da ekle: Programlar → `+` → bir hareket ekle → başlat → set kaydet.
- `npm test`, `npm run build`, `npm run test:layout` geçsin.

---

## 5) Belgeler

- `AGENTS.md` veri bölümüne:
  - `sessions` belgesinde isteğe bağlı `rest: { start, total, exId, setNo }`
  - `settings`'te `restPrefs: { [exId]: saniye }`
  - Plansız oturum tanımı: `dayId == null`.
- README "Telefona kurulum" altına:
  - `İlk dinlenme sayacında Android bildirim izni ister; izin verirsen kilit ekranında geri sayım görürsün.`
  - "Bilinen notlar" altına `USE_EXACT_ALARM` notu.

---

## 6) Telefonda kabul (kullanıcı kontrol edecek)

1. Antrenman → Plansız antrenman → Hareket ekle → bench. Ekranda yalnızca yaptığım setler, kilo, tekrar, hız, RPE, not ve "Seti kaydet" var. Hedef kartı, boş 2. ve 3. set satırları yok.
2. Bench'i ikinci kez eklediğimde (başka bir gün) kilo ve tekrar son kaydımla dolu geliyor.
3. "Seti kaydet" → sayaç başlıyor. −15 / +15 çalışıyor; bir sonraki sette ayarladığım süre hatırlanıyor.
4. Telefonu kilitleyince kilit ekranında geri sayım görünüyor; süre bitince titreşim ve ses geliyor.
5. Hareket seçici açıkken geri tuşu sadece seçiciyi kapatıyor. Alt ekranlarda bir önceki ekrana dönüyor. Bugün'de iki kez basınca çıkıyor.
6. Programlı antrenman ekranı eskisi gibi.
