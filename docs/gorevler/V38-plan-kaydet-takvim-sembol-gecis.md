# V38 · Plan ekranında Kaydet, plan tarihinden önce "kaçırıldı" yok, antrenman çeşidi sembolleri, yana kaymayan geçiş

Durum: **Claude (Claude Code) doğrudan uyguladı**, 2026-11-25.

## Kullanıcının isteği (birebir)

> İlk resimde: idman kaydederken plan olarak direkt start yazio o tuş kaydetme tuşu olucak burda plan yapioz çünkü plan sayfasında plam bitince kaydet yada onayla gibi tuş olsun
>
> İkinci resimde. Bugün bile plan oluştursam eski olan tüm günleri işaretlio yapmadı olarak. Plan yapılınca yapıldığı günden itibaren sayıcak sadece. Ve idman npktaları var ya takvimde onlarda her idmana göre başka bir sembolle göster. İdman çeşidi farklı çünkü. İşte kimi yıldız mavi kimi üçgen kimi kare mimi daire falan falan
>
> Üçüncü resimdeki ise ekran videoda göreceğin gibi böyle sayfalar arası geçerken sağ taraftan bişiler çıkıo onuda düzeltek.

(Ekler: plan düzenleyici "Homie" ve altta START; Gözlem takvimi, plan bugün oluşturulduğu hâlde geçmiş günlerde kırmızı çizgiler; ekran videosu.)

## Yapılan

### 1. Plan ekranı kaydeder
- `PlanEditor` alt düğmesi `#ed-save` **Kaydet**: yazılmamış değişikliği kaydeder ve geri döner. Hareket yoksa pasif.
- Başlatma artık plan ekranında değil:
  - plan menüsü `#wtype-start` (basılı tut);
  - Dashboard `#start-next`;
  - Gözlem gün panelinde **Başlat**.

### 2. Haftalık plan başladığı günden sayılır
- `ProgramDay.wdFrom`: gün → `YYYY-MM-DD`, o haftalık gün hangi tarihten beri planda.
- `stampProgram()` her plan kaydında (`App.put('programs')`) yazar:
  - yeni eklenen gün bugünden başlar;
  - kaldırılan günün tarihi silinir;
  - `wdFrom` hiç olmayan eski kayıtta mevcut günler planın `createdAt` gününden başlar (geçmiş değişmez).
- `plansOn()` haftalık günü yalnızca `key >= weeklyFrom(day, wd, createdAt)` ise sayar. Bu yüzden takvim, Dashboard hafta şeridi ve unutulan idman hatırlatması plan öncesi günleri "kaçırıldı" saymaz.
- `allPlans()` artık `createdAt` da döndürür.

### 3. Antrenman çeşidi sembolleri (`src/features/plan/planSymbols.ts`, `PlanSym.tsx`)
- **Her plan günü kendi şekli ve rengini alır:**
  - şekiller daire, üçgen, karo, yıldız, artı, kalp;
  - renkler yeşil, mavi, mor, turkuaz, pembe, turuncu (36 farklı çift).
  - Sıra planın oluşturulma zamanına göre; yeni plan eskilerin sembolünü değiştirmez. Silinmiş planın kayıtları kimlikten türetilen sabit sembolü alır.
- **Plansız antrenman** açık renkli kare; beceri ağırlıklıysa mavi kare.
- **Durum gösterimi:** yapılan dolu, planlanan (bugün ve sonrası) içi boş, kaçırılan yine kırmızı çizgi. Anlamlı renk kuralı (V36) korunur: kırmızı = kaçırıldı.
- **Nerede:**
  - Gözlem takvim hücreleri;
  - takvimin altında **semboller açıklaması** (o ayda görünen planlar + Kaçırıldı);
  - gün panelinde antrenman satırı ve plan satırı;
  - Dashboard **Bu hafta** şeridi.
- 8×8 pixel şekil, SVG tek yol, `shapeRendering="crispEdges"`. İçi boş hâl yalnız kenar pikselleri.

### 4. Sekme geçişi yana kaymıyor
- Süren idmanda Antrenman sekmesine girip çıkarken (`into` / `out`) şeritler soldan sağa kayıyordu. Video karelerinde sağ kenarda koyu bloklar ve takvimin Pazar sütununu kesen şeritler olarak görünüyordu.
- Şimdi şeritler **yerinde** perde gibi kapanıp açılıyor (`scaleY`); yana hareket yok. Süre aynı (0,64 sn).
- Not: ekran görüntülerinde sağ kenardaki beyaz yuvarlak tutamak Samsung'un Kenar paneli; uygulamanın değil.

## Testler
- `plans.test.ts`: eski tarihli testlerde plan "hep vardı" (`createdAt: 0`); yeni test oluşturma ve gün ekleme tarihi, damgalama.
- `planSymbols.test.ts`: 36 farklı çift, sıra kararlılığı, plansız/beceri, içi boş kenar.
- `screens.test.tsx`: Kaydet düğmesi, takvimde şekiller ve açıklama, bugün oluşturulan planla geçmişte kaçırıldı yok.
- `i18n-screens.test.tsx`: İngilizce akış Kaydet → plan menüsü → Başlat; açıklama adları kullanıcı verisi.
- `layout-check.mjs`: planlı akış adlandırılmış planı kaydedip menüden başlatır.

## Kontroller
`npm test` (187), lint, `tsc -b`, build, `test:layout`.
