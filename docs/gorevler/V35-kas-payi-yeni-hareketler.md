# V35 · Kas başına set payı (kesirli haftalık set) ve yeni hareketler

Uygulayan: Claude. Kullanıcı: bant rotasyonel row ve pliometrikler (pogo, criss-cross, tek bacak pogo, jump lunge, dizden squata sıçrama) kütüphaneye; bileşik hareketlerde hangi kasa ne kadar set sayıldığı ("yarım set ön omuz, yarım set triceps") ki haftalık set doğru hesaplansın; pliometrikte de hangi kasa vurduğu yazsın.

## Kural (`src/lib/data/exlib.ts`, dosya başı ve `shareOf`)
- Bir zor set: ana kas **1**, her yardımcı kas **½** (Pelland ve ark. 2024: dolaylı seti 0,5 saymak kas gelişimini en iyi açıklıyor).
- Dengeleyiciler (karın, ön kol, boyun) **¼**.
- Trapez: hareketi yapıyorsa (row/çekiş, arka omuz, dik çekiş, olimpik) ½, yoksa (deadlift, squat, yana açış, taşıma) ¼.
- Bel: kalça menteşesinde (deadlift, RDL, good morning, swing) ½; squat ve row'da ¼.
- Tek eklem hareketleri (`ISO_IDS`: fly, pullover, yana açış, leg curl, kickback, karın izolasyonları): yardımcılar ¼.
- Kurala uymayan satırda pay elle: `'H:.25'`. Elle yazılanlar:
  - klasik/deficit/duraklamalı deadlift'te quadriceps ¼;
  - hip thrust ve glute bridge'de hamstring (ve quadriceps) ¼;
  - pogo ve tek bacak pogoda quadriceps ¼.
- `exShare(ex)`, `itemShares(item)` (kütüphane dışı ya da kası değiştirilmiş harekette yalnız kendi kası 1), `addShares(map, item, n)`.

## Nerede kullanılır
`planStats` (+ `sets`: planlanan gerçek set sayısı), `weekDoneStats`, `logStats`, `weeklyHard`, antrenman özeti "Bu antrenmanda çalışan kaslar" (yardımcı kaslar artık ayrı liste değil, payıyla sayılır; altta "Yardımcı kaslar yarım, dengeleyiciler çeyrek set sayılır."). Sayılar `nf()` ile (7,5). "bu hafta n zor set" toplamları gerçek set sayısı kalır.

Pliometrik ve beceri setleri yine zor sete girmez (temas/deneme). Kas payları kütüphanede yazılı ve hareket bilgisinde görünür.

## Hareket bilgisi
Kas çipi payları gösterir: `Kalça + Hamstring ½, Bel ½, Quadriceps ¼, Trapez ¼, Ön kol ¼` (başlık: "Bir zor set kaslara bu paylarla sayılır").

## Yeni hareketler (sona eklendi; ilk 438 kayıt referansla aynı)
- `bant-rotasyonel-row`: Bantla tek kol rotasyonel row. **Kuvvet › Sırt**, band. Pay: Sırt 1, Karın ½, Arka omuz ½, Biceps ½.
- `capraz-pogo`: Çapraz pogo sıçrama (criss-cross). Pliometrik, düşük. Pay: Baldır 1, Adduktor ½, Kalça ¼.
- `capraz-squat-jump`: Çapraz squat sıçrama (criss-cross). Pliometrik, orta. Pay: Quadriceps 1, Kalça ½, Adduktor ½, Baldır ½.

Zaten vardı:
- Pogo sıçrama (`pogo`), Tek bacak pogo (`tek-bacak-pogo`).
- Jump lunge = Ardışık makas sıçrama (`ardisik-makas`); tek tek iniş için Makas sıçrama (`makas-sicrama`).
- Kneel-to-squat jump = Dizden ayağa sıçrama (`dizden-sicrama`).

Arama için `SEARCH_ALIAS` ("jump lunge", "kneel to squat jump").

Toplam 470 hareket: 360 kuvvet, 28 olimpik, 53 pliometrik, 28 beceri, 1 ısınma.

## Testler
- `exlib.test.ts`: sayılar, pay örnekleri (eğimli bench, OHP, squat, deadlift, row, hip thrust, fly, face pull, bant row, pogo), her hareketin ana kası 1 ve yardımcı listesiyle payların uyumu, `itemShares` kütüphane dışı, yeni hareketler, arama adları.
- `v32` / `v33` testlerinde haftalık/plan beklentileri paylı.
- `layout-check.mjs`: yeni ekran `hareket-bilgi` (deadlift bilgisi).
