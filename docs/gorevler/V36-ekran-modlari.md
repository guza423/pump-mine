# V36 · Ekran modları: sakin, ısınma, idman, lab (palet + efekt + geçiş), süren idman şeridi

Durum: **Claude (Claude Code) doğrudan uyguladı**, 2026-11-25. Bu dosya kayıt içindir; kodlayan başka bir AI için bekleyen iş yok.

Tasarım: claude.ai Design tuvali "OUTMOVE · Set kayıt konsepti (pixel)", sayfa **Ekran modları (V35)** (adı tuvalde V35 kaldı; repoda V35 başka göreve verildiği için bu iş V36). Tuvaldeki ekranlar **temsilîdir**: yalnızca modu göstermek için çizildi, uygulamanın düzeni birebir onlar değil. Uygulamaya yalnızca **mod katmanı** girer; ekranların düzeni, kimlikleri ve akışları aynı kalır.

## Kullanıcının isteği (2026-11-25, birebir)

> Bizim bu outmove app için diyomki renk paletleri ayrı mı olsa.  Diyelim hareketin içi farklı dashboard ayrı falan falan. Ekranlar arası gezinirken idman adrebalini ile hemen anlaşılmio. Renk paletleri falan fatklı olsa daha iyi gibi ne dion

> Anlamı olanlar aynı kalsın aynen o başka. Ama onun dışında böyle efekt mefekt bişi yapak

> idman set ekranındaki o flickerin olmasas iyi . ora sabit kalsın ya . peki antrenman sekmesine tıklayınca nası yapalım onada bişler yapak

> (ekran görüntüsü: idman modunda SETLER kutusu, "70×8 · 7", "70×7 · 8", sıradaki "SET 3 · 70 / 6–8 tekrar" altın çerçeveli, "SET 4 · 70 / 6–8 tekrar") burası bi tık darklı olsun göze batsın falan . nası? bide burdaki arayüzler temsili demi birebir böyle değil çünkü şuankilerde o yüzdne bu misali olsun yeter. tüm repoyu okuyup buraya birebir girmene gerek yok zaten

> tamam direkt yapabiliosan okey. yap .

## Kural

**Anlamı olan renkler her modda aynı:** yeşil yapıldı, kırmızı kaçırıldı/kötü, altın vurgu/bugün/seçili, ateş turuncusu ana eylem, pixel mavi beceri/ısınma. Moda göre değişen yalnızca **zemin paleti** (zemin, panel, çizgi, soluk metin), **ortam efekti** ve **geçişler**.

## Modlar (`screenMode()`, `src/app/modes.ts`)

| Mod | Nerede | Palet | Ortam |
|---|---|---|---|
| **sakin** | Dashboard, Gözlem, plan düzenleyici, idman bitiş özeti | koyu mor (V13 paleti) | seyrek, yavaş göz kırpan pixel yıldızlar (içeriğin arkasında) |
| **ısınma** | Antrenman sekmesi: idman yokken başlangıç ekranı ve **hazır** bekleyen oturum (`ready`) | mor-kor arası (`#140b10`) | alttan basamaklı kor bantları yükselir, kıvılcımlar içeriğin arkasından süzülür; Plansız/Yeni plan ve plan listesi kart dağıtır gibi düşer; İDMANI BAŞLAT'tan dışa halka yayılır |
| **idman** | süren idman (oturum ekranı) | kor (`#150a08`) | **sabit**: kenarlarda durağan kor çerçeve, altta durağan ısı bantları ve alev sırası. Titreşen, yanıp sönen ya da süzülen efekt yok (kullanıcı: "ora sabit kalsın") |
| **lab** | Lab | soğuk lacivert (`#08111f`) | akan mavi veri pikselleri, yavaş kayan CRT bandı, durağan tarama çizgileri |

- Palet `.app2` kökündeki `px-mode-<mod>` sınıfıyla `.pxt` (pixel tema ekranları, alt pencereler), `.px.night` (oturum ekranı) ve sekme çubuğu değişkenlerini ezer. Alt pencereler de bulunduğu modun paletini alır.
- Zemin `.app2-main`'de çizilir, ekran kökü saydamdır; ortam katmanı (`.px-md-amb`) içeriğin arkasında, çerçeve (`.px-md-heat`, `.px-md-scan`) üstünde ve dokunulmaz.
- **idman · SETLER kutusu:** neredeyse siyah, içe gömük kuyu (`#0a0403` + iç gölge); biten set kutucukları kor dolgu + parlak kenar, sıradaki altın çerçeve; ısınma (ISN) mavi kalır. Kural `pixel.css` sonunda `[data-px-mode='idman']` ile (sınıf çakışması testi için öznitelik).

## Geçişler (`ModeTransition`, `src/app/ModeLayer.tsx`)

Hepsi süsleme: dokunmayı engellemez (`pointer-events: none`), ekranın durumunu değiştirmez, süresi bitince kalkar.

| Geçiş | Ne zaman | Görünüm |
|---|---|---|
| `start` | idman başladığı an (İDMANI BAŞLAT ya da ilk set/set ekranıyla kendiliğinden), Antrenman sekmesindeyken | alt ortadan yayılan kor pixel bloklar + **BAŞLA!** (EN: GO!), 1,5 sn; ses oturum ekranının kendi başlatma sesi |
| `end` | İDMANI BİTİR'in "İDMAN BİTTİ" damgasından sonra | ortadan yayılan mor bloklar, yazısız soğuma; özet sakin modda açılır |
| `into` / `out` | süren idmanda Antrenman sekmesine girerken / çıkarken | yatay şeritler soldan sağa, 0,6 sn, kısa 8-bit ses |
| `warm` | idman yokken Antrenman sekmesine girerken | alttan yukarı ısı dalgası, sekme ikonu bir kez "kaldırır", alçak ses |

## Süren idman şeridi (`LiveStrip`)

İdman sürerken Antrenman sekmesi dışındaki her ekranda **sekme çubuğunun hemen üstünde** kor şerit: yanıp sönen nokta, "ANTRENMAN SÜRÜYOR", ileri sayan süre (Press Start 16), set sayısı (360 px altında gizli), ok. Dokununca idmana döner (`into` geçişi). Tuvalde üstteydi; uygulamada Android'in şeffaf durum çubuğu ve ekranların üst güvenli alan payı yüzünden alta, telefonda başparmağın eriştiği yere alındı.

## Hareket ayarı

Geçişler ve ortam hareketi Hesap › **Animasyonlar** açıksa her zaman oynar; kapalıysa cihaz "animasyonları azalt" demiyorsa oynar (pixel.css'teki `.px-motion` kuralıyla aynı). Azaltılmışta palet ve durağan çerçeve kalır, hareket kalkar.

## Dosyalar

- `src/app/modes.ts` (+ `modes.test.ts`): `screenMode`, `tabTransition`, `motionAllowed`, `TR_MS`.
- `src/app/ModeLayer.tsx`: `ModeAmbient`, `ModeFrame`, `ModeTransition`, `LiveStrip`.
- `src/styles/modes.css`: paletler, ortam, çerçeve, geçişler, şerit, ısınma süsleri. `pixel.css` sonu: idman SETLER kutusu.
- `src/app/App.tsx`: mod hesabı, `.app2` sınıfı ve `data-px-mode`, geçiş tetikleri (sekme değişimi, idman başlangıcı, bitiş), şerit.
- `src/lib/native/fx.ts`: `modeInto`, `modeOut`, `modeWarm` sesleri.
- `src/i18n/en/workout.ts`: "BAŞLA!" → "GO!", "İdmana dön" → "Back to workout".

## Kontrol

`npm test`, `tsc -b`, `npm run build`, `npm run test:layout` (bütün boyutlar, TR + EN). Yerleşim ekran görüntülerinde idman (kor + çerçeve), ısınma (Antrenman sekmesi), Lab (soğuk + şerit) gözle denetlendi.
