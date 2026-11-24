# V34 · Sürgüde parmakla yavaşlama, ısınma seti yalnız ISN, set özelliği dinlenmede, RIR yerine setin 1RM'si, planlı kutucuklar iki satır

Durum: **Claude (Claude Code) doğrudan uyguladı**, 2026-11-24. Bu dosya kayıt içindir; kodlayan başka bir AI için bekleyen iş yok.

## Kullanıcının isteği (2026-11-24, birebir)

Ekran görüntüleri (7): 1) kilo başlığında "SPEED 100%" düğmesi (ok); 2) hız satırının solundaki ısınma (damla) düğmesi; 3) setler kutusunda "20×19 WU" kutucuğu; 4) dinlenme ekranı, GİZLE/GEÇ üstündeki boş alan kırmızıyla işaretli; 5) eski "NEXT SET TYPE" set özelliği penceresi; 6) 20×16 "Grind" sette RIR kutusu daire içinde, e1RM "—"; 7) planlı sette "GOAL 5 × 4–8 · RPE 9–10" ve yan yana kayan 4–8 kutucukları, altında küçük kaydırma çubuğu.

> tamam . şimdi olmayan kısımları hemen söylüyorum. 
>
> 1. ilk resimdede olduğu gibi orda öyle %100 falan yazmicak. sadece dedimki. şu aşşağı çekip kaydırırkenki hassasiyet iki türlü olucak normal çekince 100 aşşağı iyice kaydırıp çekersek. 40 olucak. ve orda oranın hassasiyeti yazmıyacak. ve tüm side scroll barlar için geçerli olucak. yavaş sürgü olayını böyle yapıcaz.
> 2. resim 2 ve 3 te gördüğün gibi wğer seti wu seçersek lütfen oraya ağırlık ve rep yazma .  sadece wu yazcan okdr. ağırlık falan önemsiz. yukarıda belirtme resim 3 teki gibi. 
> 3. resim 4 te şu bizim malum attributeler var ya onlar şöyle olluca. o setin attributesi fakrlı olabilir o yüzden böyle dinlenme sayacı gelince ekrana resim 4 te kırmızı ile belirlediğim yerde. bu setin bir attributesi var mı yok mu yu sorsun basınca attribute screen açılsın ve eklesin. attribute screende hastalık falanda ekelnsin bazen hasata oluncada idmana gidioz yada yorgun oluncada falan. yani hareketin attributesi yerine setlerin olucak ve setin detaylarını okuyunca ozmn görebilicez. 
> 4. resim 6 da hareketin o sette yapmış olduğumuz 1rm sini hesaplasın. rir yazmaya gerek yok zaten rpe yazio. 
> 5. resim 7 de ise planlamış idmanı açtımız zaman orda öyle yukarda setler yazio gayet güzel ama orda minik bir scrool bar simgesi var onu kaldırlaım. ve ilk set 4-8 yazio orda bide yanına ibare olarak 4-8 set şeklinde yazalım sığacak şekilde. o yukardaki set barıda acaba iki satır mı olsun öyle yan yana kayıdrmalı olucağına. eğer iki satırda dolarsa aşşağı kaydırmalı olur ve sırdaki set öyle yanıp söner otomatik. ve ayrıca diyelim gittik ilk set 4-8 tekrarlı bir set istiyor diyelim ama biz ısınma yaptıysak ve ısınma seçtiysek yukarıya wu seti eklesin ve sıradaki set olarak hala o 1. set yanıp sönsün şuan olduğu gibi. diyelim 3. sete geçtik 3. set yanıp sönerken o set ayrıca hizalansın orda yani .

Soru sorulmadı; okuma kararları aşağıda.

## Yapılan

### 1 · Sürgü hızı parmağın konumuyla (bütün yatay sürgüler)
- Normal sürükleme %100. Parmak sürgünün alt kenarından **56 px aşağı inince %40**; 36 px'in üstüne dönünce yine %100 (eşik arası titremesin diye). Ekranda yazı ya da oran yok.
- Geçerli olduğu yerler: set ekranında kilo şeridi, tekrar merdiveni, ROM, dinlenme süresi; plan düzenleyicide ve ısınma süresinde bütün merdiven ve kilo şeritleri (`PxStair`, `PxKgTape`). Hız seçimi (5 bölge) sürgü değil, dokunulan bölgeyi seçer; değişmedi.
- Kaldırılan: V33'teki "HIZ %100" düğmesi (`#drag-speed`), Hesap ve ayarlar'daki "Sürgüler yavaş" anahtarı, `fx.slow` ayarı; eski 1/2–1/4–1/8 "HASSAS" kademeleri ve yazısı.
- Ortak işlev: `dragRate(clientY, rect, önceki)` (`pixelHelpers.ts`), sürükleme artımlı birikir; hız değişince değer sıçramaz.

### 2 · Isınma seti yalnız ISN (EN: WU)
- Setler kutusunda, planlı kutucuklarda, dinlenme ekranında, hareket listesi çiplerinde, set ayrıntısında ve geçmişte ısınma setinde kilo ve tekrar yazılmaz; yalnızca **ISN**. Kilo ve tekrar yine kayda geçer ama hiçbir yerde gösterilmez ve hiçbir hesaba girmez (V33).

### 3 · Set özelliği sete ait, dinlenmede sorulur
- Set kaydedilince dinlenme ekranında, GİZLE/GEÇ'in üstünde: **"Bu sette özel bir durum var mı? + EKLE"** (`#set-attr-btn`). Basınca set özelliği penceresi açılır; seçilenler **az önce kaydedilen sete** yazılır ve düğmede görünür (DÜZENLE).
- Pencere üç grup: **Set tipi** (Drop set, Tükenişe kadar, Rest-pause, Kısmi tekrar, Yardımlı tekrar, Yavaş eksantrik, Altta beklet, Patlayıcı kaldır, Pump seti, Süperset; yalnız kuvvet setinde), **Durum** (Hasta, Yorgun, Uykusuz, Stresli, Ağrı), **Nasıl geçti** (Kolay geldi, Form bozuldu, Takıldı, Pump, Yardım aldım) + set notu.
- Set ayrıntısından da açılır ("+ Özellik ekle" / "Özelliği düzenle"); özellikler set ayrıntısında ve geçmişte görünür, kutucukta küçük işaret.
- Sağ üstteki düğme artık yalnızca **hareket notu** (plandaki nota yazma seçeneğiyle). Eski "sıradaki setin özelliği" ve başlıktaki özellik yazısı kaldırıldı.
- Isınma setinde sorulmaz.
- "Tükenişe kadar" sonradan eklenirse setin hızı Zar zor (RIR 0) olur; çıkarılınca hız kendiliğinden geri dönmez (gerekirse set silinip yeniden kaydedilir).

### 4 · RIR yerine setin 1RM'si
- Set ekranının alt satırı: **RPE · 1RM · ROM**. 1RM her setin kendi tahmini (Epley, tekrar + kalan tekrar) ve her zaman yazılır.
- Güvenilir aralıkta (RIR ≤ 4, tekrar + RIR ≤ 12, ROM ≥ %90) altın renkte; dışında (yüksek tekrar, hız "Aynı" = RIR 5+, kısmi tekrar) **≈** ile soluk ve 1RM serisine, gelişime girmez (fizyolojik doğruluk: formüller bu bölgede sapar). Kilosuz (vücut ağırlığı) sette "—".
- Set ayrıntısında RIR kutusu yerine SAAT; 1RM aynı kuralla. Geçmişteki set ayrıntısında da ≈ gösterilir. `setE1()` (`training.ts`).

### 5 · Planlı set kutucukları
- Kaydırma çubuğu yok (setler kutusunun hiçbir yerinde).
- Kutucuk iki satırlı: üstte **"SET 1 · 60 kg"** (hedef kilo varsa), altta **"4–8 tekrar"** (pliometrikte temas, beceride deneme). Dolunca "60×8" ve RPE rozeti.
- Kutu **iki satır, üçer kutucuk**; fazlası aşağı kayar. Sıradaki kutucuk yanıp söner ve **satırı kutunun en üstüne hizalanır** (her set sonrası ve hareket açılınca).
- Isınma seti kutucukların önüne ISN olarak eklenir; sıradaki yine 1. set.
- Çok kısa ekranda (kullanılabilir yükseklik ≤ 540 px) tek satır, aşağı kayar. Orta boy ekranda (≤ 820 px) kutu iki satıra çıkınca plaka çizimi gizlenir (kilo sayısı ve "taraf başına" yazısı kalır), BİTTİ düğmesi sekmelerin altına kaymasın diye.
- Düzeltme: V33'te dolan kutucuk kilo çubuğunun `.fill` sınıfıyla çakışıp yerinden kayıyordu (ısınmadan sonra 1. set görünmüyordu); sınıf `slot-done` oldu.

## Okuma kararları (kullanıcı belirtmedi)
- %40'a geçiş eşiği 56 px (alt kenardan), dönüş 36 px; yalnız aşağı yön.
- "4–8 set şeklinde": kutucuğa set numarası ve "tekrar" ibaresi yazıldı (4–8 tekrar sayısıdır).
- "Durum" seçenekleri: Hasta, Yorgun, Uykusuz, Stresli, Ağrı. Hesaplara etki etmez.
- Eski "Sonraki set" notları (Kolay geldi, Form bozuldu…) ve set notu da sete sonradan yazılıyor.

## Kontroller
`npx vitest run` (22 dosya, 174 test; yeni `src/lib/models/v34.test.ts`, güncellenen ekran testleri), `tsc -b`, lint, build, yerleşim kontrolü (yeni: set özelliği penceresi, özellikli dinlenme, planlı iki satır; TR + EN).
