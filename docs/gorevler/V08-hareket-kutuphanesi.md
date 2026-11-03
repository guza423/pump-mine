# V08 · Hareket kütüphanesini 438 harekete büyüt + pliometrik kayıt

Referans: `reference/v09/` (güncel, çalışan prototip; `performance.html`'i tarayıcıda açıp davranışı gör). Bu prototip V09'un hesap ekranlarını da içerir (`AccountChip`, `AccountBody`, `ConsentBody`, `PrivacyBody`, misafir bandı); bunlar **bu görevin işi değil**, V09'da yapılacak. Bu görevde v0.7'den farkı yalnızca aşağıdakiler; geri kalan her şey aynı kalsın.

## 1) Hareket veritabanı
- `reference/v09/exlib.js` → `src/lib/data/exlib.ts` olarak taşı. Veri satırları **birebir** aynı kalsın (438 hareket: 359 kuvvet, 28 olimpik, 51 pliometrik). Sadece tip ekle:
  `kind: 'kuvvet' | 'olimpik' | 'plyo'`, `eq` (EQ anahtarları), `prof: 'a' | 'u' | 'o' | 'd'`, `fat: 1 | 2 | 3`, `int?: 1 | 2 | 3 | 4`, `en`, `sec`, `bio?`, `not?`.
- `MUS_CODE`, `EQ`, `KIND`, `PLYO_INT` de bu dosyadan dışa aktarılsın. `MUSCLES = Object.values(MUS_CODE)` (19 kas grubu; yeni olanlar: Omuz (arka), Bel, Ön kol, Adduktor, Baldır, Tibialis, Tüm vücut).
- `src/features/antrenman/core.tsx` içindeki eski 17 satırlık `EX_LIB`, `MUSCLES` ve `PROF` silinsin; yenileri import edilsin. `PROF` artık a/u/o/d anahtarlı ("Ortada ağır" yeni). Eski `alt/ust/dengeli` anahtarları takma ad olarak kalsın (prototipteki `PROF.alt = PROF.a` satırları).
- Eski 17 hareketin id'leri aynı; kayıtlı programlar bozulmaz.
- `libById` Map ile çalışsın (prototipteki `LIB_MAP`).

## 2) Pliometrik kayıt
Prototipteki davranışı birebir taşı (`core.jsx` ve `app.jsx`'te `plyo`, `PLYO_W`, `PLYO_Q`, `isPlyo`, `PlyoTable`, `PlyoStage` aramasıyla bulunur):
- Pliometrik harekette dock: "Ek yük (kg)" + "Temas" stepper'ları, hız seçici ve RPE yerine 3'lü kalite seçici (`#pq-0..2`: Korundu / Biraz düştü / Belirgin düştü) ve not düğmesi.
- Set kaydı: `{ kg, reps, plyo: true, q, lvl: null, vl: 0, rpe: null, rir: 9, at }`. `RecordedSet` tipini buna göre genişlet (`plyo?`, `q?`, `rpe: number | null`, `lvl: number | null`).
- Set tablosu pliometrikte: Set · Ek yük · Temas · Kalite · Saat. Hedef kartı "set × temas", RPE hücresi yerine yoğunluk.
- Orta alanda `PlyoStage`: yoğunluk, yönerge (kalite düşünce "bu hareketi bitir" uyarısı), seans toplam teması (140 üstü kırmızı).
- Set ayrıntısı, özet ve hareket geçmişi pliometrik setleri "temas" olarak gösterir.
- `itemFromEx` türe göre varsayılan: pliometrik 3 × 5 (RPE yok), olimpik 4 × 2–3 RPE 7–8, kuvvet 3 × 8–12 RPE 7–9. Boş antrenmanda eklenen hareket de bu varsayılanları kullanır. `ItemEditor` pliometrikte "Temas" ve "Ek yük (kg)" yazar, RPE alanını gizler.
- `targetTxt(t, exId)` pliometrikte "temas" ekler.

## 3) Hesaplar
- Pliometrik setler zor set sayılmaz; tonaja, e1RM'ye, RPE ortalamasına ve "tükenişte" oranına girmez. `sessionStats` artık `contacts` da döndürür.
- Yorgunluk: pliometrik set yükü = temas × `PLYO_W[yoğunluk]` (`[0, 0.03, 0.05, 0.08, 0.12]`), diğer setlerle aynı 36 saatlik azalma. `fatigueAt` `contacts` döndürür; `hard` ve `fail` pliometriği saymaz.
- `simulatePlan`: pliometrik hareketin günlük yükü = set × ortalama temas × `PLYO_W`. `planStats` ve `simFromPlan` pliometriği zor set saymaz; `simFromLogs` pliometrik setleri dışarıda bırakır.
- Geçmiş uyarısı: bir seansta 140'tan fazla temas varsa uyarı ver (metin prototipteki gibi).

## 4) Arayüz
- **Lab:** üstte iki sekme: "01 Temeller" ve "02 Hareketler 438". Bölüm başlıkları kalktı.
- **Hareket filtresi** (`useExFilter` + `ExFilterBar`, Lab ve "Hareket ekle"de ortak): arama (Türkçe ad, İngilizce ad, kas ve ekipmanda, kelime kelime), tür sekmesi (Tümü / Kuvvet / Olimpik / Pliometrik), kas çipleri ve ekipman çipleri (sayılarıyla), sonuç sayısı, ilk 40 sonuç + "Daha fazla göster".
- "Hareket ekle"de sonuç varken özel hareket paneli kapalı; altta "+ '…' adıyla özel hareket ekle" düğmesi açar. Sonuç yoksa doğrudan açık.
- Liste satırı: kuvvette yorgunluk noktası, pliometrikte yoğunluk elması (`.pdot`); alt satır "kas · ekipman · direnç profili" ya da "· yoğunluk". Olimpikte "olimpik" rozeti, biyomekaniği olanda "tork".
- **Hareket sayfası:** kas ve ikincil kaslar, ekipman, tür, yorgunluk ya da yoğunluk, direnç profili, İngilizce adı, varsa not. Pliometrikte doz kutusu (seans başına 80–100 / 100–120 / 120–140 temas; 48–72 sa ara; kaynak NSCA).
- **Hedef seçimi:** arama + en fazla 8 sonuç (pliometrik hariç, yorgunluk ≥ 2).
- CSS: `app5.css`'in sonundaki "HAREKET KÜTÜPHANESİ" bölümü ve `.setd-grid.two`, `.labseg` kuralları.

## 5) Testler
- Veri: 438 kayıt; id'ler ve Türkçe adlar benzersiz; id yalnızca `a-z0-9-`; her kas, ikincil kas ve ekipman kodu geçerli; ikincil kas ana kasla aynı değil; eski 17 id mevcut; tür dağılımı 359 / 28 / 51.
- Model: 20 tekrarlı ve 5 temaslı bir pliometrik set zor sete, tonaja ve e1RM'ye girmez. 100 orta yoğunlukta temas (yeni yapılmış) yükü 5,0 eder. Mevcut kontrol değerleri değişmez (tek gece 5 sa → 23; Ağır gün + 8 sa → 52, + 5 sa → 75; plan simülasyonu 21 / 76).
- `screens.test.tsx`'e ekle: Lab → Hareketler → "bench" ara → Pliometrik sekmesi → derinlik sıçraması sayfası. Boş antrenman → "box jump" ara → ekle → kalite seç → 2 set kaydet → set ayrıntısı → başka bir kuvvet hareketi ekle → set kaydet → Bitir → özet.

## 6) Teslim
- AGENTS.md'deki "Her görevin sonunda" kuralı geçerli: `npm test` ve `npm run build` geçsin, doğrudan `main`'e push et.
- `GOREV.md`'de bu görevi "Tamamlanan"a taşı (tarih + commit kısa kodu).
