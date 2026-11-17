# V13 · Pixel arayüz: plansız idman akışı ve sürüklemeli set kaydı

Kullanıcının amacı: salonda telefona bakmadan, **küçük tuşlara basmadan**, parmağını kaydırarak çok hızlı set kaydetmek. Her etkileşim oyun gibi hissettirsin: pixel art görünüm, her adımda küçük bir efekt, ses ve titreşim.

Tasarım Claude'un Design tuvalinde kullanıcıyla birlikte yapıldı ve onaylandı ("dizayn bitti gibi"). Tasarımın kaynağı:
- Tuval: https://claude.ai/artifact/94H2oKR9f9Qh3H6kbYN9Bv (kullanıcının hesabında)
- Repo kopyası: `reference/v13-pixel/Main.dc.html` (nasıl okunacağı: `reference/v13-pixel/README.md`)

Renkler, ölçüler, animasyonlar, sesler ve sürükleme mantığı referanstan **birebir** alınır. Bu dosya referansla çelişirse bu dosya geçerlidir. Referanstaki hareket listesi, varsayılan kilolar ve örnek setler **demo verisidir**, uygulamaya girmez.

**Kapsam:** yalnızca **plansız antrenman** (`isFree(s)`, yani `dayId == null`), ve plansız oturumdaki **kuvvet / olimpik** hareketlerin set ekranı. Planlı oturum, Dashboard, Gözlem, Lab ve diğer ekranlar bu görevde **görsel olarak değişmez**; tüm sekmelere yayma işi V14'te yapılacak. Pliometrik ve beceri hareketleri plansız oturumda yeni kabuğun içinde görünür ama girişleri (temas, ek yük, deneme, süre, kalite) bugünkü mantıkla kalır.

---

## 0) Bozma (zorunlu)

- **Veri uyumu:** Eski oturum ve setler aynen okunur, hiçbir alan silinmez, adı değişmez. Yeni alanlar isteğe bağlıdır: set `rom?: number` (yoksa 100), oturum `ready?: true` (yoksa başlamış sayılır). Firestore kuralları ve koleksiyonlar değişmez.
- **Planlı oturum** bugünkü gibi çalışır. Hedef kartı, planlı set satırları, "Set 1/4 kaydet", "Ek set / Sonraki hareket", ExListBody aynen kalır.
- **Dinlenme sayacının mantığı aynen kalır:** oturum belgesindeki `rest`, kilit ekranı bildirimi, bitince ses + titreşim, `restPrefs` (hareket başına süre). Değişen yalnızca görünüm.
- **Android geri tuşu** zinciri bozulmaz. Yeni adım: set ekranı → aynı oturumun hareket listesi (bkz. §2).
- Not (✎), set silme, hareket bilgisi, özel hareket ekleme, "Plan olarak kaydet", "Kaydetmeden çık" özellikleri kalır.
- Pixel stilleri yalnızca yeni ekranların kökündeki `.px` sınıfı altında yazılır, global seçici kullanılmaz. Planlı oturumun ve diğer sekmelerin görünümü piksel piksel aynı kalmalı.
- Testler, build ve `npm run test:layout` geçmeden push yok. Test ve layout betiği yeni akışa göre güncellenir, eski kontroller silinmez, uyarlanır.

---

## 1) Görsel dil

**Fontlar** (çevrimdışı, paket içine gömülü):
- `@fontsource/pixelify-sans` (400, 500, 600, 700) ve `@fontsource/press-start-2p`. Paket adı farklıysa (ör. `@fontsource-variable/pixelify-sans`) çalışan adı kullan.
- **Press Start 2P yalnızca büyük sayılarda** (≥ 20 px): kilo (38 px), tekrar (22 px), dinlenme sayacı (64 px), set penceresindeki "kilo × tekrar" (24 px), yorgunluk skoru (40 px).
- **Diğer her şey Pixelify Sans.** Küçük sayılar Pixelify 700 + `tabular-nums`, en az 14 px. Etiketler en az 13–14 px. Kullanıcı küçük Press Start yazıların okunmadığını söyledi; küçük boyutta Press Start kullanma.
- Türkçe büyük harf: başlıklarda `toLocaleUpperCase('tr')` kelime bazında uygulanır. Türkçe harf içeren kelime tr ile, içermeyen İngilizce kelime normal büyütülür ("LEG EXTENSION", "EĞİMLİ BENCH PRESS"). Referanstaki `up()` fonksiyonunu kullan.

**Renk jetonları** (referanstaki `.night` sınıfı; `.px` köküne CSS değişkeni olarak):
`--bg #100e1b · --pn #1b1830 · --pn2 #252140 · --ln #3c3660 · --tx #f5f1e8 · --mt #aaa4ca · --fire #ff5b3a · --fireD #a32e1a · --gold #ffc53d · --dim #302b4c · --btx #160f0c · --sh #07060d`, arka planda 12 px ızgara.

Hız renkleri: Aynı `#52e07c` · Hafif `#c6e04a` · Belirgin `#ffc53d` · Çok `#ff8a3a` · Zar zor `#ff3b4e`.

Game Boy teması referansta var ama bu görevde **eklenmez**.

**Pixel kenarlık:** köşeleri çentikli kalır. `box-shadow: 0 -3px 0 0 X, 0 3px 0 0 X, -3px 0 0 0 X, 3px 0 0 0 X` kullanılır, `border-radius` yok. Büyük düğmelerde 4 px ve altta 10 px koyu gölge; basınca 5 px aşağı iner.

**Animasyonlar** `steps()` ile yapılır (pixel hissi): pop (`popA/popB` çift sınıf hilesiyle her değişimde yeniden tetiklenir), parçacık patlaması (8–14 kare), adım adım kayma, ekran sarsıntısı, altın flaş. `prefers-reduced-motion: reduce` varsa sarsıntı, parçacık ve kayma kapanır; değer değişimi anında görünür.

**Ses ve titreşim:**
- Ses: WebAudio kare dalga; frekanslar referanstaki `blip()` çağrılarıyla aynı. Kilo ve tekrar pentatonik dizide yükselir; 10 kg'da ve her 5 tekrarda vurgu var; Zar zor seçilince testere dalga. Kayıtta dört notalı arpej, dinlenme bitince üç nota.
- Titreşim: Android'de `navigator.vibrate`; `VIBRATE` izni zaten var. Değerler referanstaki `buzz()` ile aynı.
- Ayar: `settings` içinde yeni anahtar `key: 'fx'`, `value: { sound: true, haptic: true }`. Anahtar yoksa ikisi de açık sayılır. "Hesap ve yedek" penceresine iki anahtar ekle: **Sesler**, **Titreşim**.
- `AudioContext` ilk dokunuşta açılır (tarayıcı kuralı). Hata verirse sessizce geçilir.

---

## 2) Plansız idman akışı

```
Antrenman sekmesi ─► [Plansız antrenman] ─► HAREKET LİSTESİ ─(karta dokun)─► SET EKRANI
                                              │  ▲                              │
                                              │  └──── geri ok / Android geri ──┘
                                              └─(Hareket ekle)─► HAREKET SEÇİCİ (çoklu) ─► listeye döner
                                              └─(İdmanı bitir)─► onay ─► ÖZET
```

### 2.1 Oturumun başlaması (`ready`)
- `#free-session` artık oturumu **hazır** durumda açar: `{ ...yeni plansız oturum, ready: true }`. `startedAt` şimdilik oluşturma anıdır (sıralama bozulmasın diye).
- Oturum üç yoldan başlar:
  1. **İdmanı başlat** düğmesi.
  2. Hazır oturumda bir hareketin **set ekranı ilk kez açıldığında**. Kullanıcı başlatmayı unuttuysa süre kendiliğinden başlar ve üstte altın renkli bir bildirim kayar: başlık `İDMAN BAŞLADI`, metin `Set ekranını açtın, süreyi başlattım`. Bildirim 3,6 sn kalır, `role="status"`, üç notalı ses çalar.
  3. Yedek yol: hazır oturumda **set kaydedilirse**. Bildirim metni: `İlk setini kaydettin, süreyi başlattım`.
- Başlarken `startedAt = Date.now()` yazılır ve `ready` silinir. Böylece süre, `sessionStats().dur`, yorgunluğun "önce" anı (`startedAt - 1`) ve geçmiş doğru kalır.
- Hazır oturumda süre gösterilen her yerde (oturum başlığı, Dashboard'daki aktif oturum kartı vb.) `başlamadı` yazar ve `dur = 0` sayılır.

### 2.2 Hareket listesi (plansız oturumun ana ekranı)
Plansız oturumdaki bugünkü hareket şeridinin (`.fx-strip`) yerini alır. Yukarıdan aşağı (referansta `scrList`):
- **Başlık:** `PLANSIZ ANTRENMAN`. Alt satır hazırken `HAZIR · başlamadı`, başladıktan sonra `SÜRE 24:13` (bir saati geçince `1:02:05`).
- **Özet kutusu:** hareket sayısı · set · tonaj.
- **Hareket kartları** (kaydırılabilir liste, oturumdaki sırayla). Her kartta:
  - hareketin adı ve sağda `>` oku;
  - `Ekipman · kas`, sağda `n set · tonaj` (set yoksa `set yok`);
  - son 4 setin çipleri (`kilo×tekrar`, hız renginde; dahası varsa `+N`).

  Karta dokununca o hareketin set ekranı açılır. Son çalışılan hareketin kartı altın çerçevelidir. Seti olmayan kartın sağında 44 px `×` düğmesi bulunur (`aria-label="… hareketini çıkar"`); bugünkü "setsiz hareketi çıkar" işlevini korur.
- **Listenin son satırı:** kesikli çerçeveli `+ HAREKET EKLE` satırı (`#fx-add`). Liste kaydırıldıkça bu satır da en altta görünür. Liste boşsa aynı satır `#ses-add-first` kimliğiyle tek öğe olarak durur.
- **Alt çubuk:** dinlenme sürüyorsa solda küçük sayaç çipi (100 px, altın çerçeve, eriyen bar). Çipe dokununca son çalışılan hareketin set ekranına dönülür ve büyük sayaç açılır. Sağda büyük düğme:
  - hazırken `İDMANI BAŞLAT` (ateş rengi);
  - başlamışken `İDMANI BİTİR` (`#finish-btn`, altın).

### 2.3 Hareket seçici (çoklu seçim)
Plansız oturumda `PickerBody` çoklu seçim modunda açılır. Arama, filtreler ve özel hareket ekleme aynen kalır.
- Satıra dokunmak seçimi açar ya da kapatır (sağda pixel kutu, seçilince altın çerçeve). Satır en az 60 px yüksektir ve `aria-pressed` taşır.
- Oturumda zaten olan hareketler `listede` etiketiyle görünür ve `disabled` olur.
- Alt düğme hiçbir şey seçili değilken `HAREKET SEÇ` (devre dışı), seçim yapılınca `N HAREKET EKLE` olur. Basınca hareketler oturuma sırayla eklenir ve **her zaman listeye dönülür**. Doğrudan set ekranına gitmez; kullanıcı "ekle ve başla" istemedi.
- Planlı oturumdaki seçici bugünkü gibi tekli kalır.

### 2.4 İdmanı bitir ve özet
- `İDMANI BİTİR` bugünkü onayı açar, ama pixel pencere olarak:
  - Seti varsa: `İdmanı bitir? N set · tonaj X kg` + [İDMANA DÖN] [BİTİR].
  - Seti yoksa: bugünkü `Kaydetmeden çık`.
- **BİTİR** bugünkü `finish()` işlevini çağırır (`status: 'done'`, `endedAt`, `fatigue: { v: 2, pre, post }`); sonra özet açılır.
- **Özet:** bugünkü `SummaryBody` içeriği korunur ve pixel kabuğa alınır. Aşağıdakiler mutlaka görünsün:
  - Süre · tonaj · hareket sayısı · `set · zor set` (zor set = RIR ≤ 4, kuvvet setleri).
  - **Yorgunluk:** mevcut önce → sonra skoru. Büyük sayı sonrası gösterir. 25 parçalı bölge çubuğunun 40 ve 70'te işaretleri var, renkler yönetilebilir / birikiyor / yüksek.
  - **Toparlanma:** `recoveryHours()` sonucu (`~X saat` ya da `hemen hazır`). Mevcut modelden hesapla, yeni formül yazma.
  - Hareket başına: set sayısı, tonaj, en iyi e1RM.
  - "Plan olarak kaydet" bugünkü gibi.

---

## 3) Set ekranı (plansız oturum, kuvvet / olimpik hareket)

Yukarıdan aşağı (referansta `scrLog`). Tek sayfaya sığar, kaydırma yok (bkz. §5).

### 3.1 Başlık
`[←] HAREKET ADI ▸ alt satır: PLANSIZ · SET n · EKİPMAN [✎]`
- `←` hareket listesine döner (Android geri tuşu da).
- Hareket adına dokunmak bugünkü hareket bilgi penceresini (`ExerciseBody`) açar.
- `✎` bugünkü not penceresini açar.

### 3.2 Setler kutusu
Başlıkta `SETLER` yazar, sağda `n set · tonaj X kg`. Altında 3 sütunlu kutucuk ızgarası:
- **Sıralama yeniden eskiye:** en yeni set sol üstte ve altın çerçeveli, kaydedilince pop animasyonu oynar.
- Kutucukta **yalnızca** `kilo×tekrar` ve sağ üstte küçük RPE sayısı (hız renginde) var. ROM ve set numarası kutucukta yazmaz.
- 2 satır görünür, üçüncü satırın birkaç pikseli görünür. 6'dan fazla set varsa alt kenar soluklaşır (mask) ve altta zıplayan `▼ N eski set daha` ipucu çıkar. Kutu kendi içinde kayar; en alta inince ipucu kaybolur. Yeni sette kutu en üste döner.
- Kutucuğa dokunmak **set penceresini** açar. Bu bugünkü `SetDetailBody`'nin pixel hali; silme dahil her şey korunur. Pencerede şunlar var:
  - `SET n`, `kilo × tekrar`;
  - hız, tonaj, RIR, RPE, ROM, e1RM. e1RM yoksa nedeni yazar: `RIR 4 üstü` / `tekrar + RIR 12 üstü` / `ROM %90 altı`;
  - saat, not ve etiketler;
  - `Seti sil`.

### 3.3 Ağırlık görseli (ekipmana göre, `lib.eq`)
| Ekipman | Görsel | Alt yazı |
|---|---|---|
| `bb` | 20 kg bar + iki tarafa plakalar (25 kırmızı, 20 mavi, 15 sarı, 10 yeşil, 5 beyaz, 2,5 koyu, 1,25 krom). Açgözlü dağılım, en ağır içte. | `taraf başına: 20 + 2,5` / `boş bar` / `bar ağırlığının altında` |
| `mk`, `cb` | Dikey ağırlık yığını, 5 kg'lık 20 plaka. Kilo arttıkça **pim aşağı iner**, seçili plakalar yanar, pim altın. 100 kg'ı geçerse yığın dolu ve `+N kg`. | `pim: N. plaka` · `20 plaka × 5 kg` |
| `db` | Tek dambıl; kilo arttıkça disk sayısı ve yüksekliği büyür. | `tek el · iki dambıl toplam X kg` (ad `Tek ` ile başlıyorsa `tek el`) |
| diğerleri (`sm, ez, tb, lm, kb, pl, bw, …`) | Görsel yok, yalnızca büyük sayı | `bw`: `ek yük`; diğerleri boş |

Altında büyük kilo sayısı (Press Start 38 px) ve `KG`. Her değişimde pop animasyonu oynar ve dıştaki plaka, disk ya da pim de poplar.

Makine plakalarının salona göre değişmesi (7 kg, libre) bu görevin konusu değil.

### 3.4 Kilo barı (`#kg-<itemId>`, `role="slider"`)
Yatay bar, telefonun ses barı gibi. Mantık referanstaki `kgDown / kgMove / edgeTick / kgUp` ile birebir:
- Bar bir **pencere** gösterir. Bar ve dambılda 50 kg genişliğindedir, adım 2,5 kg, aralık 0–300 (dambılda 0–80). Makine ve kabloda pencere 100 kg (bütün yığın), adım 5 kg, aralık 0–200.
- **Dokun:** parmağın altındaki değere atlar.
- **Sürükle:** adım adım ilerler.
- **Kenarda tut** (%7'lik uç bölgeler): pencere kayar ve değer hızlanarak artar ya da azalır (önce 260 ms bekler, sonra 120 ms'den 35 ms'ye iner); uçta `<<` ya da `>>` yanıp söner.
- **Bırak:** pencere seçili değerin etrafında adım adım (`steps(6)`) ortalanır.
- Görünüm: 2,5'luk kısa çentikler, 5'te orta, 10'da uzun çentik ve etiket. Seçili değere kadar çentikler ve şerit ateş rengindedir, başparmak altın bloktur. Önceki setin kilosu üstte küçük üçgenle işaretlenir.
- **Efektler:** her adımda başparmak poplar, 8 parçacık çıkar, ses ve 5 ms titreşim; 10'un katlarında altın flaş, ikinci nota ve 14 ms titreşim.
- Klavye: ←/→ bir adım, PageUp/PageDown dört adım.
- `touch-action: none` ve `setPointerCapture` kullanılır. Değer kesir (`clientX - left) / width`) ile hesaplanır, ölçek ve zoom'dan etkilenmez.

### 3.5 Tekrar barı (`#reps-<itemId>`, `role="slider"`)
1–30 arası 30 dilimli, yükselen merdiven (ses seviyesi göstergesi gibi), mutlak sürükleme. Seçili dilim altın, altındakiler ateş rengi, her 5'inci dilim hafif belirgin. Altında 1 · 5 · 10 · 15 · 20 · 25 · 30 ölçeği var. Sağ üstte büyük tekrar sayısı (Press Start 22 px). Değişince pop, parçacık, pentatonik ses ve 5 ms titreşim; 5'in katlarında vurgu.

Plansızda pliometrik temas ve beceri denemesi bu bara geçmez, bugünkü girişleriyle kalır.

### 3.6 Son tekrarın hızı (`#speed-0` … `#speed-4`)
- 5 blok (Aynı / Hafif / Belirgin / Çok / Zar zor). Her blokta hız kaybına göre yükseklikte bir sütun var, seçili blok altın çerçeveli.
- Kap bir `radiogroup`; bloklar `role="radio"` ve `aria-checked` taşır (test bunu kullanıyor). Kabın üstünde **sürükleme** de çalışır: parmak hangi bloğun üstündeyse o seçilir.
- Başlıkta seçili seviyenin açıklaması renkli yazar ("Biraz yavaşladı · ~3 kaldı").
- Zar zor seçilince ekran kısa süre sarsılır, testere dalga sesi çalar, titreşim `[18, 30, 18]`.
- **RPE çipleri bu ekrandan kalkar.** RPE ve RIR hızdan gelir (`training.ts` → `SPEED[lvl].rir` / `.rpe`; Aynı = 6). Bu, 2026-11-14 kararını kullanıcının onayıyla değiştirir.
- Yeni setlerde `rpe: null` kalır. Eski setlerde `rpe` varsa her yerde o gösterilir, yoksa hızdan gelen değer.

### 3.7 Gösterge sırası
4 kutu: `RIR` · `RPE` · `e1RM` · **`ROM`**. ROM kutusu sürüklenebilir ve en geniştir.
- e1RM canlı hesaplanır (Epley, kalan tekrarla). Uygun değilse `—` yazar.
- **ROM** (`role="slider"`, 10–100, adım 5):
  - Her set **%100** ile başlar. Kutuyu sola ya da sağa sürüklemek göreli değiştirir (kutu genişliğinin 1/7'si = %5).
  - %100'ün altındayken kutu altın çerçeveli olur ve değer altın yazar.
  - Set kaydedilince sonraki set yine %100'den başlar.
  - Ses ve titreşim efektleri var.

### 3.8 Kaydet
- Tam genişlik ateş renkli düğme (`#log-set`): `SET n · KAYDET`.
- Kaydedince dört notalı arpej çalar, 14 parçacık çıkar, titreşim `[12, 40, 24]`.
- Set `{ kg, reps, lvl, vl, rpe: null, rir, rom, at }` olarak yazılır. Set `rom` alanını alır; 100 ise de yaz.
- Dinlenme bugünkü gibi başlar ve **büyük dinlenme ekranı** açılır (§4).

---

## 4) Dinlenme ekranı

Set kaydedilince başlığın altındaki her şeyin üstüne açılır (`#rest-big`). Referansta `restBig`:
- **Üstte:** `SET n KAYDEDİLDİ` (ROM %100 değilse ` · %80 ROM`), `kilo × tekrar` ve hız.
- **Ortada:** `DİNLEN` ve dev geri sayım (Press Start 64 px), altında süreyle eriyen 30 parçalı çubuk.
- **Sayaç sürüklenebilir** (`role="slider"`): sağa kaydırma +15 sn, sola −15 sn (kutu genişliğinin 1/9'u bir adım). Her adımda pop, ses ve titreşim olur.
- Altında **büyük** `-15 SN` / `+15 SN` düğmeleri var. Bugünkü `adjustRest` mantığı (hareket başına süreyi hatırlama dahil) kullanılır.
- `sıradaki: SET n+1 · X kg`.
- **Alt düğmeler:**
  - **GİZLE:** sayaç küçülür ve kaydet düğmesinin soluna 100 px çip olarak iner. Bu sırada kilo ve tekrar ayarlanabilir, set kaydedilebilir. Çipe dokununca sayaç yeniden büyür.
  - **GEÇ:** dinlenmeyi bitirir (bugünkü `skipRest`).
- Süre dolunca bütün ekran altın renkte bir kez yanıp söner, üç nota çalar, titreşim `[30, 60, 30]`; büyük ekran kapanır. Kilit ekranı bildirimi bugünkü gibi.
- Plansız listede dinlenme sürüyorsa küçük çip görünür (§2.2).

---

## 5) Ekrana sığma

`AGENTS.md` kuralı: her telefona oturur. `npm run test:layout` 320×568'den 884×1104'e kadar (yazı 1,15 ölçek dahil) geçmeli. **`#log-set` hiçbir boyutta kaydırmadan gizlenmez.**

Referans 390×844 içindir. Kısa ekranlarda yüksekliğe göre (`@media (max-height: …)`) şu sırayla küçült:
1. Ağırlık görseli 136 → ~84 px. Plakalar ve yığın oranla küçülür; alt yazı tek satır kalır.
2. Setler kutusu 2 satırdan 1 satıra iner (yatay kayar).
3. Kilo barı 70 → 56, tekrar barı 70 → 52, hız blokları 66 → 52 px.
4. En kısa ekranda (≤ 600 px) ağırlık görseli tamamen gizlenir; kilo sayısı kilo barının başlık satırına iner.

Dokunma hedefleri en az 44 px. Metinler küçülmez; en az 13 px kalır.

---

## 6) Hesap ve model değişiklikleri

- **e1RM:** `training.ts` → `e1Ok` artık `(set.rom ?? 100) >= 90` ister. Yarım tekrar 1RM tahminini şişirir. `bestE1`, `e1Series`, hedef ilerlemesi ve özet bu tek fonksiyondan beslenir. Test ekle: ROM 85 olan set e1RM'e girmez, ROM'suz eski set girer.
- **Tonaj:** tek kaynak `sessionStats().tonnage`. Dambıl (`eq === 'db'`) setlerinde tonaj **iki el** sayılır (`kg × tekrar × 2`). Adı `Tek ` ile başlayan dambıl hareketleri (tek kol / tek bacak) ×1 kalır. Liste, özet, set penceresi, Gözlem ve haftalık metrikler aynı fonksiyonu kullanır. Test ekle.
- **Yorgunluk modeli değişmez** (zor set = RIR ≤ 4; ROM yorgunluğu etkilemez).
- **Hazır oturum:** `sessionStats().dur` hazırken 0 döner. Yorgunluk ve "bu hafta" hesapları `ready` oturumu antrenman saymaz (zaten seti yoktur; yine de test ekle).

---

## 7) Testler ve layout betiği

- `src/test/screens.test.tsx` ve `scripts/layout-check.mjs` yeni akışa uyarlanır. Yeni yol:
  `#free-session` → liste → `#ses-add-first` → seçici: bir hareket seç → `N HAREKET EKLE` → liste → karta dokun → `#log-set`.
- Korunacak kimlikler: `#free-session`, `#ses-add-first`, `#fx-add`, `#log-set`, `#finish-btn`, `#speed-0…4`, `#rest-big`, `#kg-<id>`, `#reps-<id>`, `#note-btn`, `#set-del`, `#set-del-yes`, `#finish-yes`, `#discard-yes`.
- **Yeni testler:**
  - set ekranı açılınca hazır oturum başlar ve bildirim çıkar;
  - çoklu seçimle iki hareket eklenince listeye dönülür;
  - set kutucukları yeniden eskiye sıralanır;
  - ROM %100'e döner;
  - geri tuşu set ekranından listeye döner;
  - Gizle ve küçük çip çalışır;
  - kilo barı klavye okuyla 2,5 kg (makinede 5 kg) adım atar.
- Layout betiği: plansız akışta liste, seçici, set ekranı, dinlenme ekranı ve özet her boyutta ekran görüntüsüne girer. `#log-set` görünürlük kontrolü kalır.

---

## 8) Bitirme

`AGENTS.md` → "Her görevin sonunda" + "Kayıt kuralı":
- test, build ve layout geçsin;
- `GOREV.md`'de V13'ü "Tamamlanan"a taşı;
- `docs/KONUSMA-KAYDI.md`'ye "uygulandı" satırı ekle; referanstan sapma varsa onu da yaz;
- `docs/PROJE.md` §2 (bugünkü uygulama) ve §5 (veri modeli: `rom`, `ready`, `settings.fx`) güncellensin;
- doğrudan `main`'e push.
