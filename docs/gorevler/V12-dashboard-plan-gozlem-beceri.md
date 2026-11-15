# V12 · Dashboard, antrenman planları, Gözlem takvimi, öğrenme hedefleri

Kullanıcı geri bildirimi (15 Kasım):
1. "Antrenman türü" kavramı kafa karıştırıyor; adı **antrenman planı** olsun.
2. Programlar sekmesine gerek yok, çünkü antrenman planları var. Yerine haftanın günleri olan **aylık bir takvim** gelsin. Sayfa adı "Antrenman plan ve gözlem".
3. Antrenman sekmesinin boş alanına **geçmiş** gelsin, kaydırılabilir şekilde.
4. "Bugün" sekmesinin adı **Dashboard** olsun.
5. Hedeflere **öğrenme hedefi** eklensin: performansın yanında istediğim hareketi öğrenmeyi planlayabileyim (ör. kip-up).

Kullanıcının kararları:
- **Takvim:** plan haftanın günlerine bağlanır (her hafta tekrar) **ve** tek bir güne de eklenebilir.
- **Sekme adı:** alt menüde **Gözlem**, sayfa başlığında **Antrenman plan ve gözlem**.
- **Öğrenme hedefi:** 4 aşama + kayıtlardan otomatik pratik sayısı. Kütüphaneye **beceri** hareketleri eklenir, deneme + kalite olarak kaydedilir.
- **Grafikler:** eski Geçmiş sayfasındaki metrikler ve 1RM grafiği **takvimin altına** taşınır.

Bu görev `reference/v09/`'dan bilerek ayrılır; çelişkide bu dosya geçerlidir. Burada sayılmayan her şey (yorgunluk modeli, seans ekranları, hesap/bulut, Lab) aynen kalsın.

---

## 1) Sekmeler ve adlar

| Sıra | id | Alt menü | Sayfa başlığı | Simge |
|---|---|---|---|---|
| 1 | `bugun` (değişmez) | **Dashboard** | **Dashboard**, alt satır tarih ("Pazar, 15 Kasım") | `home` |
| 2 | `antrenman` | Antrenman | Antrenman | `bolt` |
| 3 | `gozlem` (eski `programlar`) | **Gözlem** | **Antrenman plan ve gözlem** | `calendar` (yeni simge, `Cns.tsx`'teki `Icon`'a ekle: 18×18 takvim, üstte iki halka) |
| 4 | `lab` | Lab | Lab | `flask` |

- Eski `#programlar` adresi açılırsa `#gozlem`'e yönlensin.
- Başlık uzunsa tek satırda kalsın: `.shead h1`'e bu sayfada `font-size: clamp(22px, 7vw, 28px)`.
- Arayüz metinlerinde "antrenman türü" → "antrenman planı" / "plan", "program" → "plan". Lab'daki bilimsel metinler hariç.
- `SHEET_TITLES`:
  - `wtype: 'Antrenman planı'`
  - `saveTemplate: 'Plan olarak kaydet'`
  - `plan: 'Haftalık yük'`
  - `goal: 'Hedef'`

---

## 2) Veri modeli: antrenman planı

Firestore kurallarına dokunmamak için yeni koleksiyon **açma**; `programs` koleksiyonu kullanılmaya devam eder.

- **Plan** = bir program belgesinin bir günü (`day`). Uygulama artık programı göstermez; bütün programlardaki bütün günler düz bir **plan listesi** olarak görünür.
- **Yeni plan** = **tek günlük yeni bir program belgesi**: `{ id, name, createdAt, updatedAt, days: [day] }`, `program.name === day.name`. Her plan ayrı belge olduğu için iki cihazda farklı planlar düzenlenince çakışma olmaz.
- Eski çok günlü programlar **bölünmez**. Her günü ayrı plan olarak listelenir. Bir planı düzenlemek o belgeyi günceller; silmek o günü belgeden çıkarır, gün kalmazsa belgeyi siler.
- Gün (plan) alanları:
  - `id`, `name`, `items` (bugünkü)
  - `weekdays: number[]`: her hafta tekrar edilen günler. Bugünkü `weekday` ile aynı kural: JS `getDay()`, 0 = Pazar … 6 = Cumartesi.
  - `dates: string[]`: tek seferlik günler, yerel saatle `'YYYY-MM-DD'`.
  - `skip: string[]`: haftalık tekrarın atlandığı günler, `'YYYY-MM-DD'`.
- **Geriye uyum:** `weekday` (tek sayı) okunurken `weekdays = weekday != null ? [weekday] : []` say. Kaydederken `weekdays` yaz, `weekday`'i sil.
- Yeni modül `src/features/plan/plans.ts` (saf fonksiyonlar, testli):
  - `allPlans(programs) → { programId, day }[]`: `updatedAt`'e göre yeni önce.
  - `dateKey(ts) → 'YYYY-MM-DD'` (yerel).
  - `plansOn(key, programs) → { programId, day, src: 'hafta' | 'tek' }[]`: `weekdays` içinde ve `skip`'te değilse ya da `dates` içindeyse. Hareketi olmayan planlar sayılmaz (bugünkü `nextPlanned` kuralı).
  - `nextPlanned(programs, sessions, from)`: bugünden başlayarak 14 gün içinde ilk planlı gün. Bugün o plan zaten yapıldıysa (aynı `dayId` ile bugün bitmiş oturum) bugünü atla. Mevcut `nextPlanned` / `core.tsx:155` mantığının yerine geçer.
  - `newPlanDoc(name) → program`
  - `upsertPlan(programs, programId, day) → program`
  - `removePlan(programs, programId, dayId) → { put?: program, del?: id }`
  - `addOnce(day, key)`, `addWeekly(day, wd)`, `removeOn(day, key)`: tek günse `dates`'ten çıkar, haftalıksa `skip`'e ekle.
  - `weekProgram(programs) → program`: haftalık tekrarlı her plan × her `weekday` için bir gün içeren **sanal** program. Sadece `simulatePlan`, `planStats` ve `PlanBody` için kullanılır, kaydedilmez.
- Oturumlar değişmez (`programId`, `dayId`, `dayName`). Plandan başlatma `sessionFromDay(program, day)` ile aynı.
- `SaveTemplateBody` ("Plan olarak kaydet"): hedef program seçimi kalksın. Her zaman yeni tek günlük plan belgesi oluşturur. Ad alanı plansızda boş, planlıda `"{ad} (yeni)"`.

---

## 3) Antrenman sekmesi

```
┌ Antrenman                                          ┐
│ Son: 15 Kas · Paz · Plansız antrenman              │
├────────────────────────────────────────────────────┤
│ [ + Plansız antrenman ]   [ + Yeni plan ]          │
│ PLANLARIM                                       3  │
│ ┌ Push              6 hareket · Pzt, Per   ⋮ ┐     │  ← dokun: plan menüsü (bugünkü WtypeMenuBody)
│ └ Bacak             5 hareket · Çar        ⋮ ┘     │
│ GEÇMİŞ                                         12  │
│ KASIM 2026                                         │
│ ┌ 15  Plansız antrenman   17:23–18:15 · 52 dk  51┐ │  ← bugünkü .hrow satırı; dokun: özet
│ │ Kas 14 set · 4,2 t                             │ │
│ └ …                                              ┘ │
│ EKİM 2026 …                                        │
│ [ Daha fazla göster ]                              │
└────────────────────────────────────────────────────┘
```

- Sağ üstteki **Geçmiş** düğmesi (`#hist-btn` ve sayacı) kalksın; `HistoryView` silinsin. Geri yığınındaki `antView: 'history'` dalı da gitsin.
- **Düğmeler:**
  - `#free-session` → `Plansız antrenman` (aynı).
  - `#new-type` → `#new-plan`, metin `Yeni plan`, simge `plus`. Boş bir plan oluşturup plan düzenleyiciyi açar; dokunmadan çıkılırsa kaydedilmez (bugünkü kural).
- **Planlarım** (`.plan-list`): `allPlans` sırasıyla.
  - Satır: ad, `n hareket`, haftalık günler kısa adlarla (`Pzt, Per`, yoksa gösterme).
  - Satıra dokununca bugünkü plan menüsü açılır (başlat / düzenle / kopyala / sil).
  - Plan yoksa bu bölüm yerine tek satır: `Planın yok. Plansız başla ya da bir plan oluştur.`
- **Geçmiş** (`.hist-inline`): bitmiş oturumlar, yeni önce, ay başlıklarıyla (`KASIM 2026`). Satır bugünkü `HistoryView` "Kayıtlar" satırının (`.hrow`) aynısı. İlk 30 satır, sonra `Daha fazla göster` (+30). Sayfa tek parça kayar (`.scr`). Kayıt yoksa: `Bitirdiğin antrenmanlar burada listelenir.`
- Aktif oturum varken Antrenman sekmesi bugünkü gibi oturum ekranını açar.

---

## 4) Plan düzenleyici (`ProgramEditor2` → `PlanEditor`)

Tek planı düzenler; gün sekmeleri (`.day-tabs`) kalkar.

```
‹  Plan                                          Sil
┌ Ad: [ Push                         ]           ┐
│ HER HAFTA  [Pzt][Sal][Çar][Per][Cum][Cmt][Paz] │  çoklu seçim (weekdays)
│ HAREKETLER                                     │  bugünkü kalem satırları + ItemSheetBody
│  Eğimli bench press   4×6–8 · 80 kg · RPE 8    │
│  + Hareket ekle                                │
│ [            Başlat            ]               │
```

- Haftalık yük şeridi ve "Program analizi" düğmesi buradan kalkar; Gözlem'e taşınır (bkz. 5).
- `Sil`: onaylı (`Planı sil?`), `removePlan`.
- Geri tuşu ve `‹` önce geldiği yere döner (Antrenman ya da Gözlem).

---

## 5) Gözlem sekmesi: "Antrenman plan ve gözlem"

```
┌ Antrenman plan ve gözlem                     ┐
│ ‹   Kasım 2026   ›                 [Bugün]   │  #cal-prev #cal-next #cal-today (yalnızca başka aydayken)
│ Pzt Sal Çar Per Cum Cmt Paz                  │
│  27  28  29  30  31   1   2                  │  ay dışı günler sönük
│   3   4 ○ 5   6   7   8   9                  │  ○ planlı (gelecek)
│ ● 10 ●11  12  13 ·14  15  16                 │  ● yapılmış, · kaçırılmış plan
│  …                                           │
├──────────────────────────────────────────────┤
│ 15 Kasım Pazar · Bugün                       │  #day-panel
│  ● Plansız antrenman  52 dk · 14 set   51    │  yapılan oturum → özet
│  ○ Push  · Her Pzt            [Başlat] ⋮     │  planlı; Başlat yalnızca bugünse
│  Uyku 6 sa · Yorgunluk 51                    │  geçmiş ve bugün
│  [ + Bu güne plan ekle ]                     │  bugün ve gelecek
├──────────────────────────────────────────────┤
│ KASIM ÖZETİ                                  │  gözlem (görüntülenen ay)
│ [Antrenman][Toplam süre][Set][Tonaj]         │  bugünkü Metric ızgarası
│ Yorgunluk kartı (ort. başta/sonda + çubuklar)│  bugünkü .fcard
│ Uyarılar                                     │  historyWarnings
│ Hareket gelişimi (çipler + E1Chart)          │  hedef çizgisi: aynı hareketin güç hedefi
│ Haftalık yük                            ›    │  PlanBody('plan') ← weekProgram
└──────────────────────────────────────────────┘
```

**Takvim ızgarası** (`.cal`):
- 7 sütun, hafta Pazartesi başlar. Her ay 6 satır sabit; yükseklik ay ay zıplamasın.
- **Hücre** (`.cal-d`, `button`, en az 40×44 px):
  - Gün numarası.
  - Altında en fazla 3 işaret:
    - Bitmiş oturum: dolu nokta `--neuro`. Beceri ağırlıklı oturum (setlerinin çoğu beceri): `--skill`.
    - Planlı (bugün ya da gelecek, henüz yapılmamış): içi boş halka `--muted`.
    - Kaçırılmış plan (geçmiş gün, o plandan oturum yok): kısa sönük çizgi `--faint`.
  - 3'ten fazlaysa son işaret `+`.
- **Durumlar:**
  - Bugün: çerçeve `--neuro`.
  - Seçili gün: zemin `--raised`.
  - Ay dışı günler: `opacity: .35`; tıklanınca o aya geçer.
- **Erişilebilirlik:** `aria-label="15 Kasım Pazar: 1 antrenman, 1 plan"`.
- Açılışta bugünün ayı ve bugün seçili.

**Gün paneli** (`#day-panel`):
- Başlık: `15 Kasım Pazar`, bugünse ` · Bugün`.
- Bitmiş oturumlar: `.hrow` küçük hali; dokununca `summary`.
- Planlı planlar (`plansOn`):
  - Satırda ad ve kaynak etiketi (`Her Pzt` ya da `Tek gün`).
  - `Başlat` yalnızca seçili gün bugünse görünür (`startSession(program, day)`).
  - `⋮` menüsü: `Bu günden kaldır` (`removeOn`), `Planı düzenle`.
  - O gün o plandan oturum bittiyse satır `✓` ile sönük gösterilir.
- Geçmiş ve bugün için tek satır: `Uyku {checkin} sa · Yorgunluk {fatigueAt(gün sonu ya da şimdi)}`. Uyku yoksa `Uyku –`.
- `+ Bu güne plan ekle` (`#day-add-plan`), yalnızca bugün ve gelecekte. Sheet `planPick`:
  - Plan listesi (radyo).
  - Altında anahtar: `Her hafta {Pazartesi} tekrarla` (varsayılan kapalı).
  - `Ekle`: kapalıyken `addOnce`, açıkken `addWeekly`.
  - Plan yoksa: `Önce bir plan oluştur` + `Yeni plan` düğmesi (düzenleyiciyi açar, geri dönünce bu güne eklemez).

**Gözlem bölümü:** dönem = takvimde görünen ay. Bugünkü `HistoryView`'daki parçalar buraya taşınır:
- `Metric` ızgarası (`periodMetrics(ayın oturumları, ayın gün sayısı)`).
- Yorgunluk kartı (`#hist-fatigue` → `#obs-fatigue`).
- Uyarılar.
- Hareket gelişimi: çipler + `E1Chart`, tüm zamanlar. Hedef çizgisi, o hareket için güç hedefi varsa onun `target`'ı.
- `Haftalık yük` satırı (`#obs-week`): `openSheet('plan', { getProgram: () => weekProgram(programs) })`. Haftalık tekrarlayan plan yoksa satır pasif: `Haftalık tekrarlayan planın yok`.
- 7 gün / 30 gün / Tümü sekmeleri kalkar.

---

## 6) Dashboard (eski Bugün)

- Başlık `Dashboard`, alt satır bugünkü tarih.
- **Plan kartı** (bugünkü "sıradaki antrenman" kartı) `nextPlanned`'a göre üç halde:
  1. **Bugün plan var:** bugünkü kart (plan adı, hareketler, `Başlat`).
  2. **Plan var ama bugün değil:** başlık `Bugün planlı antrenman yok`, alt satır `Sıradaki: Push · Perşembe`. Düğmeler: `Plansız antrenman` (birincil), `Takvim` (`goTab('gozlem')`).
  3. **Hiç plan yok:** başlık `Planın yok`, metin `Plansız başla ya da ilk planını oluştur.` Düğmeler: `Plansız antrenman` (birincil), `Plan oluştur` (`#new-plan` ile aynı iş).
- `WeekRow` (bu hafta şeridi): planlı günleri `plansOn` ile işaretlesin (bugünkü `weekday` mantığı yerine).
- **Hedefler** bölümü (bkz. 7).

---

## 7) Hedefler: güç + öğrenme

**Veri:**
- `settings` belgesi `key: 'goals'`, `value: Goal[]`:
  ```ts
  type Goal =
    | { id: string; type: 'perf'; exId: string; name: string; base: number; target: number; createdAt: number }
    | { id: string; type: 'skill'; exId: string | null; name: string; stage: 0 | 1 | 2 | 3; due?: string; createdAt: number; doneAt?: number };
  ```
- **Geçiş:** `goals` yoksa ve eski `goal` varsa onu `goals[0]` (`type: 'perf'`) olarak oku. İlk kayıtta `goals`'ı yaz, `goal`'u sil.
- Aşamalar: `SKILL_STAGES = ['Başladım', 'Parçalarını yapıyorum', 'İlk temiz tekrar', 'Oturdu']`.
- Pratik bilgisi kayıtlardan hesaplanır, saklanmaz. `skillStats(goal, sessions) → { n, last }`: o hareketi (`exId`, yoksa `name`) içeren ve en az bir seti olan bitmiş oturum sayısı + son tarih.

**Dashboard'da:**
- `HEDEFLER` başlığı, altında kartlar (eklenme sırasıyla), en sonda her zaman `#goal-add` kartı.
  - Hedef yokken bugünkü büyük `Hedef ekle` kartı.
  - Hedef varken tek satırlık küçük hali: `+ Hedef ekle`.
- **Güç kartı:** bugünkü `#goal-card` görünümü; her kart `.goal-card[data-goal]`.
- **Öğrenme kartı** (`.skill-card`):
  ```
  ÖĞRENME                              ⋯
  Kip-up
  [■■□□] Parçalarını yapıyorum
  6 pratik · son 2 gün önce          [Pratik et]
  ```
  - Göz atma rengi `--skill` (yeni değişken `#b48cff`).
  - 4 parçalı aşama çubuğu.
  - Alt satır: `n pratik · son X gün önce`; hiç yoksa `Henüz pratik yok`. `due` varsa sağda `· 31 Ara'ya kadar`.
  - `Pratik et` (`.skill-go`):
    - Aktif oturum yoksa plansız antrenman başlatır ve bu hareketi ekler.
    - Varsa harekete aktif oturuma ekler ve Antrenman sekmesine geçer.
  - Aşama `Oturdu` (3) olunca kart `Öğrenildi ✓` olur, `doneAt` yazılır ve kart listenin sonuna iner.
- Karta dokununca `goal` sayfası o hedefle açılır.

**`goal` sayfası (`GoalBody`):**
- Üstte segment (yalnızca yeni hedefte): `Güç (1RM)` | `Öğrenme`.
- **Güç:** bugünkü form.
- **Öğrenme:**
  - Hareket araması: çipler önce beceri hareketleri, sonra diğerleri, en fazla 8. Aramada sonuç yoksa `+ "…" adıyla özel hareket` (mevcut `addCustom`).
  - `Aşama` 4 çip (varsayılan 0).
  - `Hedef tarih (isteğe bağlı)`: `type="date"`.
  - `Kaydet` hareket seçiliyken etkin.
- Mevcut hedefte `Hedefi kaldır` (`#goal-remove`) yine var; yalnızca o hedefi siler.

**Özet sayfası (`SummaryBody`):** bitirilen oturumda bir öğrenme hedefinin hareketi varsa altta satır: `Kip-up · 3 temiz deneme`, yanında `Aşamayı ilerlet` (bir aşama artırır).

---

## 8) Beceri hareketleri (kütüphane + kayıt)

**Kütüphane** (`src/lib/data/exlib.ts`):
- `KIND`'e `b: 'Beceri'` ekle. `kind` tipine `'beceri'`. Satır eki `{ k: 'b', h?: 1 }`; `h: 1` = süreyle tutulan beceri.
- Şu 28 satırı yeni `/* ---------- BECERİ ---------- */` bölümüne ekle (sütun sırası bugünkü gibi):
```ts
['kip-up', 'Kip-up', 'Kip-up', 'K', 'KA,Q', 'bw', 1, 'd', { k: 'b' }],
['duvar-amut', 'Duvara karşı amut', 'Wall handstand', 'OO', 'TR,T', 'bw', 1, 'd', { k: 'b', h: 1 }],
['serbest-amut', 'Serbest amut', 'Freestanding handstand', 'OO', 'TR,T,K', 'bw', 1, 'd', { k: 'b', h: 1 }],
['amut-yurume', 'Amut yürüyüşü', 'Handstand walk', 'OO', 'TR,T,K', 'bw', 2, 'd', { k: 'b' }],
['bas-durusu', 'Baş duruşu', 'Headstand', 'K', 'OO,BO', 'bw', 1, 'd', { k: 'b', h: 1 }],
['karga-durusu', 'Karga duruşu', 'Crow pose', 'OO', 'TR,K', 'bw', 1, 'd', { k: 'b', h: 1 }],
['dirsek-dengesi', 'Dirsek dengesi', 'Elbow lever', 'K', 'OO,TR', 'bw', 1, 'd', { k: 'b', h: 1 }],
['tuck-front-lever', 'Toplu front lever', 'Tuck front lever', 'S', 'K,OA', 'bw', 1, 'd', { k: 'b', h: 1 }],
['front-lever', 'Front lever', 'Front lever', 'S', 'K,OA', 'bw', 2, 'd', { k: 'b', h: 1 }],
['back-lever', 'Back lever', 'Back lever', 'S', 'OO,BI,K', 'bw', 2, 'd', { k: 'b', h: 1 }],
['tuck-planche', 'Toplu planche', 'Tuck planche', 'OO', 'G,TR,K', 'bw', 2, 'd', { k: 'b', h: 1 }],
['planche', 'Planche', 'Full planche', 'OO', 'G,TR,K', 'bw', 3, 'd', { k: 'b', h: 1 }],
['insan-bayragi', 'İnsan bayrağı', 'Human flag', 'K', 'OY,S', 'bw', 2, 'd', { k: 'b', h: 1 }],
['v-sit', 'V-sit', 'V-sit', 'K', 'TR', 'bw', 1, 'd', { k: 'b', h: 1 }],
['manna', 'Manna', 'Manna', 'K', 'TR,OA', 'bw', 2, 'd', { k: 'b', h: 1 }],
['halka-muscle-up', 'Halkada muscle-up', 'Ring muscle-up', 'S', 'TR,G', 'bw', 2, 'd', { k: 'b' }],
['skin-the-cat', 'Skin the cat', 'Skin the cat', 'S', 'OO,K', 'bw', 1, 'd', { k: 'b' }],
['kopru', 'Köprü', 'Back bridge', 'B', 'OO,KA', 'bw', 1, 'd', { k: 'b', h: 1 }],
['ayaktan-kopru', 'Ayaktan köprüye iniş', 'Standing back bend to bridge', 'B', 'OO,KA', 'bw', 1, 'd', { k: 'b' }],
['yan-cember', 'Yan çember', 'Cartwheel', 'TV', 'OO', 'bw', 1, 'd', { k: 'b' }],
['round-off', 'Round-off', 'Round-off', 'TV', 'OO', 'bw', 1, 'd', { k: 'b' }],
['one-el-yaylanma', 'Öne el yaylanma', 'Front handspring', 'TV', 'OO,KA', 'bw', 2, 'd', { k: 'b' }],
['flik', 'Geri el yaylanma (flik)', 'Back handspring', 'TV', 'OO,KA', 'bw', 2, 'd', { k: 'b' }],
['one-salto', 'Öne salto', 'Front flip', 'TV', 'KA,Q', 'bw', 2, 'd', { k: 'b' }],
['geri-salto', 'Geri salto', 'Backflip', 'TV', 'KA,Q', 'bw', 2, 'd', { k: 'b' }],
['cift-gecis', 'İp atlama çift geçiş', 'Double under', 'BA', 'OY', 'dg', 1, 'd', { k: 'b' }],
['tek-kol-barfiks', 'Tek kol barfiks', 'One-arm pull-up', 'S', 'BI,OK', 'bw', 3, 'a', { k: 'b' }],
['tek-kol-sinav', 'Tek kol şınav', 'One-arm push-up', 'G', 'TR,K', 'bw', 2, 'a', { k: 'b' }],
```
- Toplam 466: 359 kuvvet, 28 olimpik, 51 pliometrik, 28 beceri. Var olan satırlara dokunma (`l-sit`, `pistol-squat`, `muscle-up` vb. kuvvet olarak kalır).
- Hareket filtresi tür sekmeleri: `Tümü / Kuvvet / Olimpik / Pliometrik / Beceri`. Dar ekranda yatay kayan sekme satırı.
- Liste satırında beceri rozeti `beceri` (`--skill`). Hareket sayfasında tür `Beceri`, varsa `Süreyle tutulur`. Doz kutusu yerine tek satır: `Beceri dinçken öğrenilir: antrenmanın başında, kalite düşünce bırak.`

**Kayıt** (pliometrik kaydın kardeşi; `isSkill(exId)`):
- `itemFromEx`: beceride `sets: 5, repMin: 3, repMax: 3, rpe yok, rest: 90`.
- **Dock:**
  - `Deneme` stepper (1–30).
  - `h: 1` ise ayrıca `En iyi süre (sn)` stepper (0–300, adım 1).
  - Kalite 3'lü seçici `#sq-0..2`: `Temiz` / `Kısmen` / `Olmadı` (renkler `--ok` / `--warn` / `--bad`).
  - Not düğmesi.
  - Kilo yok.
- Set kaydı: `{ kg: 0, reps: deneme, hold?: sn, skill: true, q, lvl: null, vl: 0, rpe: null, rir: 9, at }`. `RecordedSet` tipine `skill?`, `hold?` ekle.
- **Tablo:** `Set · Deneme · Süre (yalnızca h) · Kalite · Saat`. Plansızda yalnızca yapılan setler (V11 kuralı).
- **Orta alan:** dinlenme yoksa tek satır `SkillStage`: ilgili öğrenme hedefi varsa `Hedef: {aşama} · {n}. pratik`, yoksa `Kalite iki set üst üste düşerse bu hareketi bitir.`
- **Hesaplar:**
  - Beceri setleri zor set sayılmaz.
  - Tonaja, e1RM'ye, RPE ortalamasına ve "tükenişte" oranına girmez.
  - Yorgunluk: set yükü = deneme × `SKILL_W[fat]`, `SKILL_W = [0, 0.02, 0.04, 0.06]`; aynı 36 saatlik azalma.
  - `simulatePlan`'da: set × ortalama deneme × `SKILL_W`.
  - `sessionStats` `attempts` da döndürsün.
- Set ayrıntısı, özet ve geçmiş beceri setlerini `3 deneme · Temiz` (+ `· 12 sn`) olarak göstersin.

---

## 9) Taşınan ve silinenler

- Silinecekler:
  - `ProgramsList` ve `ProgramEditor2` → `PlanEditor`.
  - `HistoryView`.
  - Programlar sekmesi.
- `BackupPanel` (Yedekle / Geri yükle) → **Hesap sayfasına** (`AccountBody`), `Yedek` başlığı altına. "Verilerimi dışa aktar (JSON)" ile aynı yerde. Hesaptayken geri yükleme buluta yazar (bugünkü kural).
- `newWorkoutType` → `newPlan`. Mevcut ilk programa gün ekleme mantığı kalksın; her zaman yeni plan belgesi.

---

## 10) Testler

- **`plans.test.ts`:**
  - `allPlans` çok günlü eski programı düzleştiriyor.
  - `weekday` → `weekdays` geriye uyumu.
  - `plansOn`: haftalık, tek gün, `skip`.
  - `removeOn`: tek gün `dates`'ten, haftalık `skip`'e.
  - `nextPlanned`: bugün yapılmışsa sonraki gün.
  - `removePlan`: tek günlüde belge siliniyor, çok günlüde gün çıkıyor.
  - `weekProgram` + `simulatePlan`: `hipertrofiProgram()` fikstürüyle **kontrol değerleri değişmiyor** (≈21 / ≈76).
- **`goals.test.ts`:**
  - `goal` → `goals` geçişi.
  - `skillStats` sayımı (setsiz oturum sayılmaz).
  - Aşama 3'te `doneAt`.
- **`exlib.test.ts`:**
  - 466 kayıt ve 359 / 28 / 51 / 28 dağılım.
  - Beceri satırları geçerli kod kullanıyor.
  - Eski 17 id mevcut.
- **`fatigue.test.ts`:**
  - 10 denemelik beceri seti zor sete, tonaja ve e1RM'ye girmiyor.
  - 100 deneme, `fat` 2, yeni yapılmış → yük 4,0.
  - Mevcut kontrol değerleri aynı (5 sa → 23; Ağır gün + 8 sa → 52, + 5 sa → 75).
- **`screens.test.tsx`:**
  - Alt menü `Dashboard / Antrenman / Gözlem / Lab`; Dashboard başlığı.
  - Antrenman: `#hist-btn` yok; geçmiş satırları sayfada; `#new-plan` → düzenleyici → ad + `Pzt` + hareket → geri → `Planlarım`'da görünüyor.
  - Gözlem:
    - Takvim 42 hücre, bugün seçili.
    - Pazartesi'ye haftalık plan → gelecek Pazartesi hücresinde halka.
    - `#day-add-plan` ile yarına tek günlük plan → hücrede halka → `Bu günden kaldır` → halka yok.
    - `#cal-next` / `#cal-prev`.
    - Gözlem bölümünde `Metric` ve `E1Chart` görünüyor.
  - Hedef:
    - Öğrenme hedefi ekle → "kip" ara → Kip-up → aşama 1 → kaydet → `.skill-card` "Parçalarını yapıyorum".
    - `Pratik et` → plansız oturumda Kip-up.
    - 2 deneme seti (`#sq-0`) kaydet → bitir → özet "Aşamayı ilerlet" → kart "İlk temiz tekrar", "1 pratik".
  - Geçiş: eski `goal` ayarı olan kullanıcıda güç kartı görünüyor.
- **`npm run test:layout`:** sekme kimlikleri değişti (`#tab-gozlem`). Akışlara Gözlem takvimi, gün paneli, Antrenman geçmiş listesi ve beceri dock'u (Kip-up) eklensin. Tüm boyut matrisinde takvim 7 sütun taşmadan sığmalı.
- `npm test`, `npm run build`, `npm run test:layout` geçsin.

---

## 11) Belgeler

`AGENTS.md`:
- Sekmeler tablosu (bkz. 1).
- Veri bölümü:
  - plan = program belgesinin günü; yeni plan = tek günlük belge
  - `weekdays` / `dates` / `skip`
  - `settings.goals`
  - beceri set biçimi
- Kontrol değerleri satırına `weekProgram`'ın değerleri değiştirmediği notu.

README'de "Uygulama" bölümündeki sekme listesini güncelle.

---

## 12) Telefonda kabul (kullanıcı kontrol edecek)

1. Alt menü: Dashboard · Antrenman · Gözlem · Lab.
2. Antrenman'da Plansız antrenman ve Yeni plan düğmeleri, altında planlarım ve kaydırılabilir geçmiş var; sağ üstte Geçmiş düğmesi yok.
3. Yeni plan → ad + günler + hareketler. Gözlem takviminde o günlerde halka çıkıyor.
4. Takvimde bir güne dokununca altta o gün yaptıklarım, planlarım, uykum ve yorgunluğum görünüyor; o güne plan ekleyip kaldırabiliyorum.
5. Takvimin altında ayın özeti, uyarılar ve 1RM gelişimi var.
6. Dashboard'da öğrenme hedefi ekleyebiliyorum (Kip-up). "Pratik et" ile antrenman başlıyor. Deneme + kaliteyle kaydediyorum, aşamamı ilerletebiliyorum.
7. Yedekle / Geri yükle artık Hesap sayfasında.
