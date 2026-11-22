# V33 · Isınma setleri ve ısınma seansı, bar 20 kg, set özellikleri, hedef aralık, sürgü hızı, planlı set kutucukları, basılı tutmalı plan penceresi, vücut ağırlığı, kalıcı antrenman bildirimi, plan hatırlatması, kaydırmalı takvim

Durum: **Claude (Claude Code) doğrudan uyguladı**, 2026-11-22. Bu dosya kayıt içindir; kodlayan başka bir AI için bekleyen iş yok.

## Kullanıcının isteği (2026-11-22, birebir)

> Tamam müq bide şimdi şunlar var 1. Barla yapılan hiçbir idman 20kg dan aşşağı olamaz. 0 kilo seçeneği kaldır. 2. Setlere istersek ısınma seti diyebilelim. Ve ısınma seti ekleyebilelim. Rpe 6 dan solda seçenek olsun ısınma seti olarak. Yada bilmiom sıkıştıralım bir şekilde. Isınma setlerinde ne kilo ne rpe ne tekrar önemli olucak. Progress takibide olmıyacak 3. İdmana başladıysak yani idman sayacı başladıysa bilidirm panelde idman sayacı hep görünsün kapanana dek. 4. Planlanan idmandan 1 gün önce bildirim gelsin telefona. Ve mail gelsin eğer hesapları varsa sistemde o maile. 5. Program hazırlarken harketi seçioz sona listeye eklip sona biz o harekete tekrar basıp tekrar set falan seçioz ama seti onayla tuşu yok. Geri çıkınca zaten kaydetmiş oluyor ama onayla tuşuda olsun altta 6. Quick idman yaparken falan o setin attributesinide belirleyebilelim mesela sağ üstte falan basınca özel olarak attribute ekliyelim. İşte drop set oldu. Hell fail oldu. Falan diye. 7. İsteyen tekrar değil tekrar aralığı seçebilsin Quick idmanda setin tekrarını girerken. 8. Bu ağırlık tekrar kilo seçme scrollbarı aşşağı kaydırıp sağa sola çekme hassasiyeti çok hızlı değişiyor. İki tür hassasiyet olsun. Normal hız ve hızın %40 olarak. 9. İlk resimdeki yerde planlanmış idmanı yaparken previous session öyle yazmasın yukarda. Ve önden belirlediğimiz setler tek tek orda yazsın yaptıkça içleri dolsun animasyonlu falan olsun. 10.ikinci resimdeki yerde yanlışlıkla elim değio ordan yeni günler seçmem çok kolay. Ordaki günlerdr basılı tutma usulü olsun. start ve duplicate tuşlarıda basılı tutmalı olsun. Start tuşuna basalım sona ready desin sona bida basınca idman başlasın. 11. İdman planı yaparken kilo sürgüsünde vücut ağırlığı seçenekide olsun. Tabiki vücut ağırlığı ile yapılabilen egzersizler gibi. Bar ve ekipmansız olanlar. Mesela dips, barfiks, lunge falan falan 12. İdman kütüphanesine bir tane idman öncesi ısınma sessionu ekle sadece süre ve nabız skalası belirlenebilsin. Nabız sayılarla değil bir skala ile seçilsin. Ve sayfanın başlarında olsun. 13. Takvim kısmı sadece tuşlarla değil parmakla kaydırakta gezinilebilsin sağa sola.

Ekran görüntüleri: planlı set ekranı (üstte "Last time 20×14, 60×6…") ve "BUFF" plan penceresi (EVERY WEEK günleri, START / EDIT / DUPLICATE, DELETE PLAN basılı tut).

Sorulan ve cevaplanan:
- 7 · aralık neyin? → **"Hareketin hedef aralığı"** (setler yine tek sayı kaydedilir).
- 4 · e-posta → **"Şimdilik sadece telefon"**.
- 4 · saat → **"Bir gün önce 20:00"**.

## Yapılan

### 1 · Bar 20 kg altına inmez
- Pixel set ekranında `bar` ölçeği `min: 20` (`pixelHelpers.ts`); plan düzenleyicide bar hareketlerinde kilo şeridi 20'den başlar (`kgMin`). Pliometrik bar hareketleri (ör. sıçramalı) etkilenmez.

### 2 · Isınma seti
- Hız/RPE satırında RPE 6'nın solunda **ISN** düğmesi (`#speed-warm`). Seçilince kilo/tekrar istenirse girilir ama önemsizdir, RPE çizgileri boş görünür, düğme "ISINMA SETİ BİTTİ" olur.
- Kayıt: `{ warm: true, lvl: null, rpe: null, rir: 9 }`. Dinlenme en çok 60 sn. Her kayıttan sonra seçim kapanır (bir sonraki set iş setidir), set numarası iş setlerini sayar.
- **Hiçbir hesaba girmez:** 1RM/e1RM, tonaj, zor set, yorgunluk (anlık, dönem, haftalık yük), hareket gelişimi, "son sefer" önerileri, şablon. Hem `warm` bayrağı hem `rir: 9` (zor set eşiği RIR ≤ 4) ile korunur.

### 3 · Kalıcı antrenman bildirimi
- Antrenman sayacı başladığı andan bitene kadar bildirim panelinde süren kronometreli, kaydırılamaz bildirim ("Süren antrenman" kanalı, düşük önem, ses yok). Dokununca uygulama açılır. Antrenman bitince/silinince kalkar. Native: `RestTimerPlugin.workoutShow/workoutHide`.

### 4 · Plan hatırlatması
- Planlı günden **bir gün önce 20:00** telefon bildirimi: "Yarın: {gün adı}" · "{n} hareket · {s} set". Önümüzdeki 14 günün en fazla 30 hatırlatması AlarmManager ile kurulur; plan değişince yeniden kurulur, telefon yeniden başlayınca/uygulama güncellenince `BootReceiver` yeniden kurar.
- Hesap ve ayarlar'da anahtar: "Plan hatırlatması (bir gün önce 20:00)" (varsayılan açık).
- **E-posta yok (kullanıcı kararı).** Açık iş: Firebase Blaze + e-posta gönderici gerekir.

### 5 · Plan düzenleyicide Onayla
- Hareket ayar penceresinin altında **Onayla** (`#item-ok`); kaydeder ve kapatır (geri çıkmak da kaydetmeye devam eder).

### 6 · Set özellikleri
- Set ekranının sağ üstündeki not düğmesi artık "Set özelliği ve not": Drop set, Tükenişe kadar, Rest-pause, Kısmi tekrar, Yardımlı tekrar, Yavaş eksantrik, Altta beklet, Patlayıcı kaldır, Pump seti, Süperset. Seçilenler setin `tags`'ine yazılır, başlıkta görünür, düğmede sayı rozeti.
- **Tükenişe kadar** seçilince hız "Zar zor" (RIR 0) olur.

### 7 · Hedef tekrar aralığı (plansız antrenman)
- Set ekranında **HEDEF** çipi (`#rep-range`) → aralık penceresi (alt–üst). Aralık hareketin hedefi olur (`item.range`), sürgüde bant olarak görünür; setler yine tek sayı kaydedilir.
- Hareket başına hatırlanır (`settings.repRanges`), sonraki plansız antrenmanda aynı hareket eklenince hazır gelir.

### 8 · Sürgü hızı
- Kilo başlığındaki düğme (`#drag-speed`) ve Hesap ve ayarlar'da "Sürgüler yavaş (hızın %40'ı)": bütün sürgülerin (kilo, tekrar, plan düzenleyici) sürükleme ve kenarda bekleme hızı ×0,4. `fx.slow`.

### 9 · Planlı antrenmanda set kutucukları
- Planlı set ekranında "Son sefer" satırı yok. Planlanan setler **kutucuk** olarak sıralanır (hedef kilo×tekrar); sıradaki kutucuk yanıp söner, set kaydedilince içi animasyonla dolar (kaydedilen değeri yazar). Plandan fazla set yapılırsa dolu kutucuk olarak eklenir; ısınma setleri kutucukların önünde ayrı renkte.

### 10 · Plan penceresi
- Gün düğmeleri **basılı tutmalı** (0,45 sn); kısa dokunuş bir şey değiştirmez.
- **Başlat** ve **Çoğalt** basılı tutmalı (0,6 sn).
- Başlat artık antrenmanı **hazır** açar ("başlamadı"); ekrandaki BAŞLAT'a basınca sayaç başlar.

### 11 · Vücut ağırlığı (plan düzenleyici)
- Ekipmansız (vücut ağırlığı) ve barfiks/paralel bar gibi hareketlerde, ayrıca lunge/split squat/step-up/tek bacak RDL gibi dambıl ya da ekipmansız yapılabilenlerde kilo şeridinin 0 noktası **Vücut ağırlığı**; şeritte "VA" düğmesi. Ekipmansız hareketlerde üstü "VA +x kg" (ek yük). Barlı hareketlerde seçenek yok.

### 12 · Antrenman öncesi ısınma (kütüphane)
- Yeni hareket türü **Isınma** (`isinma`, kütüphane 467). Hareket seçicide ve Laboratuvar listesinde en üstte; tür filtresinde "Isınma".
- Yalnız **süre** (1–30 dk, varsayılan 10) ve **nabız skalası** (5 renk: Çok hafif · Hafif · Orta · Yüksek · Çok yüksek, konuşma testi açıklamalı; sayı yok). Plan düzenleyicide de aynı iki ayar.
- Kaydı `{ warm: true, dur, z }`; yorgunluğa, tonaja, gelişime ve plan set sayılarına girmez.

### 13 · Takvim kaydırma
- Gözlem takviminde parmakla sola kaydırma sonraki aya, sağa önceki aya geçer (45 px eşik, kayma animasyonu); kaydırma gün seçmez, dikey kaydırma sayfayı kaydırır.

## Okuma kararları (kullanıcı belirtmedi)
- Isınma seti seçimi set başına; kayıttan sonra kendiliğinden kapanır.
- "Tükenişe kadar" özelliği hızı RIR 0 yapar (yorgunluk hesabı tutarlı kalsın).
- Hedef aralık yalnız plansız antrenmanda (planlıda hedef zaten planda).
- Hatırlatma ayarlardan kapatılabilir; e-posta ertelendi.

## Kontroller
`npx vitest run` (21 dosya, 168 test; yeni `src/lib/models/v33.test.ts` ve 5 ekran testi), `tsc -b`, lint, build, yerleşim kontrolü (yeni ekranlar: ısınma seti, hedef aralık penceresi, aralıklı set ekranı, ısınma seansı, TR + EN).
