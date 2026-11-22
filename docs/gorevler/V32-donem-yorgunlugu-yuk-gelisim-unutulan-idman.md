# V32 · Dönem yorgunluğu, haftalık yük (yapılan / planlanan), hareket gelişimi, unutulan antrenman

Durum: **Claude (Claude Code) doğrudan uyguladı**, 2026-11-22. Bu dosya kayıt içindir; kodlayan başka bir AI için bekleyen iş yok.

## Kullanıcının isteği (2026-11-22, birebir)

> outmove için
>
> 1. ilk resimdeki yerde son 7 gün baz alınsın hep. o günden itibaren. ve ordaki uyku barıda o hafta günlük ortalama kaç saat uydumuzu girelim hergünün uykusu değil.  ve orda son 7 gün baz alındığı belli olsun. istersek son 10 gün ve son 30 günde seçelim ordan ona görede hesaplayabilsin. hızlıca.
> 2.  ikinci resimdede burda weekly load var ama bunu ikiye ayıralım. bir yapılan weekly load bide planned weekly load. yani birisi program yaptıysak o program içinde bu hafta nekdr bir yük yapıcağını hesaplasın kaslar başına. diğeri ise yapılmış olanı göstersin o hafta içinde o ana dek. iki ayrı kategori olucak onun içinde ayrı bir buton yap. planı olmayanlar için o buton deaktif durucak
> 3. exercises progress kısmında icra etmiş oldumuz tüm egzersziler olucak istersek ama sadece son  20 gün içindekiler olucak. diğerleir 20 geçince ve eğer yapmadıysak üstü silik olucak ama eskiden ypamış oldumuz belli olucak son yaptımız tarih not düşücek. ve direkt böyle chart olmuyacak oraya exercises progress button koyucaz ona basınca yaptıkımız hareketlerin bir lisstesi açılıcak ve ordan basınca ozmn progress bar açılıcak 1rm max hesaplicak ağrılık ise yada plyometric ise ona göre bişi hespalicak yadda performans hesaplicak. mesela bench te 1rm max ve tek sessionda yapılabilen toplam tonaj yazarekn plyometricste ise harketin performansını plyo  içinde ölçülücek mesela nkdr süre yapılsı nkdr tekrar yapıldı ağırlık varmı yokmu bunları bir skala yapıcaz.
> 4. idmanı başlattım yada plansız bir idmana başladım ama idman bittikten sonra idmanı bitir demeyi unttum diyelim ozmn hiç bir girdi olmayınca telefon bildiirm atıcak titricek falan. bu süre 10dk olucak . hala ordamısın misali . eğer 5dk içinde hala cevap gelmezse idmanı  bitiricek otomatik. ve kendisi bitirdğini belirticek kayıtlarda.

Ekran görüntüleri: Dashboard yorgunluk kartı (ok "Training 48 / Sleep ? / ~30 h to recover" satırlarını gösteriyor) ve Insights'ta "EXERCISE PROGRESS 101.5 kg" grafiği altındaki "WEEKLY LOAD · 1 planned day · weekly sets per muscle" düğmesi (ok bu düğmeyi gösteriyor).

## Yapılan

### 1 · Dashboard: dönem yorgunluğu (`periodFatigue`, `src/lib/models/fatigue.ts`)
- Kartta **SON [7] [10] [30] gün** seçici (varsayılan 7; seçim cihazda `localStorage['outmove.fspan']`). Halkanın erişilebilir adı "Son N gün ortalama yorgunluk".
- **Antrenman payı:** dönem boyunca saatlik örneklenen antrenman skorunun ortalaması (aynı set ağırlıkları, τ 36 sa, `100(1 − e^(−toplam/20))`). Dönem başında kalan yük için 7 gün öncesinin setleri de sayılır. Kayıtlar dönemden sonra başladıysa ortalama ilk kayıt gününden alınır ("n gün kayıt" yazar).
- **Uyku:** girilen değer artık **seçili dönemin gece ortalaması** (`checkins` belgesine `span: 7|10|30`). Puan eski ölçekle: her gece h saat → `sleepPts(h, h, 3)` (5 sa → 30, 6 sa → 17, 7 sa → 4, 8 sa → 0). Bilinmeyen gece varsayılmaz: pay bilinen gece oranıyla küçülür ("7/30 gece").
- **Toparlanma süresi** şimdiki yüke göre (değişmedi). Kısa uyku uyarısı dönem ortalaması 6,5 sa altındaysa.
- Anlık model (seans başı/sonu yorgunluk, Gözlem gün paneli, "Şu an") aynı kaldı; gece değerlerini `sleepNights()` ile okur, dönem girişi kapsadığı her geceye yazılmış sayılır. Ortalamadan gelen değer için "Dün gece X sa" uyarısı çıkmaz, ortalama uyarısı çıkar.

### 2 · Gözlem: haftalık yük ikiye ayrıldı
- **Yapılan** (`#obs-done`, pencere "Yapılan haftalık yük"): bu hafta Pazartesi 00:00'dan şu ana kas başına zor set (süren antrenman dahil), temas ve deneme; plan varsa her kasta planlanan çizgi ve `yapılan/planlanan`.
- **Planlanan** (`#obs-plan`, pencere "Planlanan haftalık yük"): bu takvim haftasının planı (`thisWeekProgram`: haftalık tekrarlar + bu haftaya düşen tek gün planlar, atlanan günler hariç) ile kas başına zor set ve seans başı/sonu yorgunluk simülasyonu. **Bu hafta plan yoksa düğme kapalı.**

### 3 · Hareket gelişimi (`src/lib/models/progress.ts`, `src/features/gozlem/ProgressSheets.tsx`)
- Gözlem'deki grafik kalktı; yerine **Hareket gelişimi** düğmesi (`#obs-progress`) → yapılmış bütün hareketlerin listesi. **Son 20 gün** üstte; daha eskiler soluk ve "Son: tarih" notlu. Satırda tür etiketi (1RM / Tekrar / Pliometrik / Beceri) ve son değer.
- Harekete dokununca gelişim penceresi (tür başına iki ölçü arasında grafik seçimi):
  - **Ağırlıklı kuvvet:** en iyi tahmini 1RM (hangi setten), son 1RM, tek seansta en çok tonaj, en ağır set; grafik 1RM / seans tonajı; güç hedefi varsa hedef çizgisi.
  - **Ek yüksüz (vücut ağırlığı):** 1RM hesaplanmaz. Tekrar kapasitesi = tekrar + RIR (yalnızca RIR ≤ 4, ROM ≥ %90), tek sette en çok tekrar, seansta toplam tekrar.
  - **Pliometrik puan:** set puanı = temas × kalite (korundu 1 · biraz düştü 0,75 · belirgin düştü 0,5) × yük (1 + ek kg / 75); seansın puanı en iyi set. Uygulama vücut ağırlığı tutmadığı için 75 kg referans; puan yalnızca kendi seanslarını karşılaştırır. Ayrıca seansta temas, kalitesi korunan temas yüzdesi, en çok ek yük.
  - **Beceri:** en uzun tutuş (en az kısmen çıkan denemeler), temiz deneme yüzdesi (temiz 1, kısmen 0,5, olmadı 0), toplam deneme.
- Pliometrikte "süre" kaydı yok (set alanlarında bulunmuyor); süre yalnızca beceride (tutuş).

### 4 · Unutulan antrenman (`src/lib/models/idle.ts`, `src/features/antrenman/idleWatch.ts`, Android `IdleReceiver`)
- Başlamış (hazır olmayan) bir antrenman açıkken uygulamadaki her dokunuş/tuş giriş sayılır (cihazda `localStorage['outmove.idle']`, oturum kimliğiyle). Dinlenme sayacı sürerken sayaç dinlenme bitince başlar.
- **10 dk giriş yok:** telefon bildirimi + titreşim (kanal "Antrenman kontrolü", alarmla; uygulama kapalıyken de) ve uygulamada **"Hâlâ orada mısın?"** penceresi (kalan süre sayacı, "Buradayım, devam" / "Antrenmanı bitir").
- **5 dk daha cevap yok:** antrenman **son girişin saatinde** biter, kayda `autoEnd: { at, last }` yazılır; geçmiş satırında "Kendiliğinden bitirildi", özetlerde açıklama. Uygulama arka plandaysa bildirim zamanında çıkar, kayıt uygulama öne gelince kapanır (öne gelmek 15 dk dolmadıysa cevap sayılır).
- **Set kaydı yoksa** kayıt açılmaz: oturum "hazır" durumuna döner (süre durur, seçilen hareketler kalır).
- Pencerede "Antrenmanı bitir" de son giriş saatinde bitirir (kullanıcı bitirdiği için `autoEnd` yazılmaz).

## Kontroller
- `npm test` (155), `tsc -b`, lint, `npm run build`, `npm run test:layout` (yeni ekranlar akışa eklendi: kayıt dolu Gözlem, hareket gelişimi listesi ve penceresi, yapılan yük).
- Yeni testler: `src/lib/models/v31.test.ts` (gece ortalaması, dönem yorgunluğu, bu haftanın yükü, gelişim ölçüleri, unutulan antrenman), `src/test/screens.test.tsx` (10 dk sorusu, Bitir, 15 dk kendiliğinden bitiş, setsiz oturumun hazıra dönmesi), İngilizce ve sözde dil ekran taramaları.

## Telefonda kabul
1. Dashboard: SON 7 · 10 · 30 seçilebiliyor; uyku düğmesi seçili dönemin gece ortalaması olarak kaydoluyor; 30'a geçince "7/30 gece" görünüyor.
2. Gözlem: Hareket gelişimi listesi (eski hareketler soluk + son tarih), harekete dokununca 1RM / tonaj, pliometrik puan, beceri tutuşu.
3. Gözlem: Yapılan ve Planlanan ayrı düğmeler; bu hafta plan yoksa Planlanan kapalı.
4. Bir antrenman başlat, telefonu 10 dk bırak: bildirim + titreşim; 5 dk daha bırak: antrenman son giriş saatinde bitmiş, geçmişte "Kendiliğinden bitirildi".
