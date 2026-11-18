# V17 · Pixel tema: Lab sekmesi, dersler, animasyonlar, biyomekanik + kalan ikonlar

Uygulayan: Claude (kullanıcı: "Geri ne kaldı peki yapalım onlarıda"). Yöntem V14–V16 ile aynı: kök div'e `pxt`, kurallar `src/styles/px-theme.css`'in "Lab (V17)" bölümünde. Bu işle uygulamanın bütün ekranları pixel temaya geçmiş oldu.

Kural: **"herşey korunucak … sadece stil değişicek"**. DOM, kimlikler, metinler, akışlar, hesaplar ve animasyonların hareketi değişmedi.

## Lab animasyonları için seçilen yol
V16'da üç seçenek konuşulmuştu (bkz. `docs/PROJE.md` §8):
1. kare kare sprite;
2. var olan çizimleri pixel paletiyle ve keskin kenarla boyamak;
3. yalnızca çerçeveyi pixel yapmak.

**Seçenek 2 uygulandı.** Gerekçe: "sadece stil değişicek" kuralına birebir uyuyor, animasyonların öğrettiği her şey aynı kalıyor. Kare kare sprite (seçenek 1) istenirse ileride ayrı bir iş olarak yapılabilir.

## Yapılan
- **Lab listesi** (`LabScreen`, kök `screen pxt lab-screen`): Temeller/Hareketler sekmesi; çentikli ders kartları (numara Press Start 16, altın); hareket listesi tek panelde çizgiyle ayrılmış satırlar; filtre çubuğu ve kas/ekipman çipleri pixel. Dar ekranda başlıklar kesilmez, iki satıra iner; 360 px altında sekmedeki hareket sayısı gizlenir (listenin üstünde zaten yazıyor).
- **Dersler** (sinyal, motor ünite, ateşleme hızı, yorgunluk) ve **ölçüm/yorgunluk ölçer**:
  - bütün SVG çizimler `crispEdges` + kare uç;
  - parlama filtreleri kapalı; yuvarlak köşeli dikdörtgenler köşesiz;
  - sinir sinyali Lab içinde pixel mavi (`--px-sk`), kas turuncu;
  - büyük sayılar Press Start (32/16);
  - çubuklar eski oyunlardaki can barı gibi bölmeli (CSS mask);
  - RPE ölçeği pixel paletinde; paneller çerçeveli.
- **Osiloskop** (`Oscilloscope`, canvas): `.pxt` içindeyken renkleri kapsayıcıdan okur. Parlama yok, keskin köşe, kuvvet eğrisi basamaklı çizilir. `.pxt` dışında eski çizim aynen duruyor.
- **Biyomekanik** (hareket bilgisi): figür pixel morunda, kalın kare uçlu uzuvlar (bloklu görünüm). Moment kolu etiketleri, plakalar, tork grafiği, oynatma düğmesi (altın çerçeve), değer kutuları ve kas vurgusu çubukları pixel.
- **İkonlar:** ortak `Icon` bileşeni, `PxIcon`'da karşılığı olan her ikonu pixel çiziyor; boyut 12/18/24'e yuvarlanır. Eklenen pixel ikonlar: check, info, clock, edit, trash, pulse, target, reset, moon, up, send, book, pause, mail, shield. Böylece bütün uygulamadaki eski çizgi ikonlar da pixel oldu.
- **Diğer:**
  - "Çıkmak için tekrar bas" uyarısı pixel;
  - uzun alt pencere başlıkları ("YORGUNLUK NASIL ÖLÇÜLÜR?") kesilmeyip iki satıra iniyor;
  - Google düğmesi Press Start yerine Saira, ikiye bölünmüyor.
- **Teknik borç kapandı:** `app.css`'teki `--f-display` artık paketli fontun adını (`Saira Variable`) kullanıyor.

## Kontroller
`npm test` (15 dosya, 91 test), lint, `tsc -b`, build, `test:layout` (11 boyut) geçti. 390 ve 320 px'te ekran görüntüsüyle kontrol edilenler:
- Lab listesi ve hareketler;
- dört ders ve ölçüm/yorgunluk ölçer;
- eğimli bench, Romanian deadlift ve yana açış biyomekaniği;
- Dashboard, Antrenman, hesap penceresi, plan düzenleyici.

## Kalan
Pixel geçişi bitti. İstenirse ileride: Lab için kare kare sprite animasyonları (ayrı iş).
