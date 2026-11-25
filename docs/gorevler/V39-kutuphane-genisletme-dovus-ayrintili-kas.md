# V39 · Kütüphane genişletmesi (782 hareket), dövüş türü, ayrıntılı kaslar

Uygulayan: Claude (doğrudan). Kullanıcı (26 Kasım 2026): "Bizim kütüphane biraz boş biraz daha dolduralım burayı. Kas sayısı neredeyse çalışılan her kası yazalım. Hem vücut geliştirme hem body building hem fitness hem halter hem boks hem güreş bunların drilleri falan. Pliometrikte daha fazla hareketler. Kütüphaneyi büyütelim hadi."

Kullanıcı seçimleri (soru kartı):
- Kas detayı: **iki katman** (19 grup aynı kalır, altına ayrıntılı kaslar; set hem grupta hem ayrıntıda sayılır; eski kayıtlar bozulmaz).
- Boks/güreş drilleri: **yeni tür Dövüş** (raund × süre + yoğunluk; yorgunluğa süreden girer).
- Boyut: **~750** (sonuç 782).

## 1. Yeni hareketler (`src/lib/data/exlib-v39.ts`, 312 satır, `EX_ROWS` sonuna eklenir)
İlk 470 kaydın kimliği ve sırası değişmez (`EX_LIB[469]` = `capraz-squat-jump`).

| Tür | Önce | Sonra |
|---|---|---|
| Kuvvet | 360 | 575 |
| Olimpik | 28 | 56 |
| Pliometrik | 53 | 91 |
| Beceri | 28 | 31 |
| Isınma | 1 | 1 |
| Dövüş (yeni) | 0 | 28 |
| **Toplam** | 470 | **782** |

- Vücut geliştirme / fitness: düşük eğimli bench ve dumbbell (üst göğüs), manşetli kablo ön kaldırış ve eğimli sehpada ön kaldırış (ön omuz izolasyonu), Lu raise, manşetli kablo yana açış, Y-T-W, bant ve kablo rotator cuff, havlu ve okçu barfiks, ipe tırmanma, Helms / gorilla row, trap-3, kalça içe/dışa rotasyon (kablo ve bant), Peterson step-down, ATG split squat, tek bacak leg curl'ler, razor curl, band RDL, adduktor ve tibialis/peroneus hareketleri, biceps/triceps varyasyonları, ön kol (radyal/ulnar sapma, pronasyon-supinasyon, el yayı, hub lift, fat grip), karın vakumu ve karın varyasyonları, boyun (chin tuck, izometrik 4 yön, rotasyon), strongman ve kondisyon (kum torbası, axle, burpee, wall ball, devil press…).
- Halter drilleri: high-hang / diz altı hang clean ve snatch, bloktan snatch ve jerk, tall snatch/clean, sots press, pressing/heaving snatch balance, drop snatch, segment pull'lar, mid-thigh pull, IMTP, jerk dip squat / dip & drive / balance, squat jerk, enseden split jerk, dumbbell ve kettlebell türevleri.
- Pliometrik (+38): ankle hops, yanal pogo, dört kare, altıgen, yanal/zikzak bound, tek bacak derinlik ve engel sıçramaları, ardışık kutu, koşarak dikey (iki ayak / tek ayak), kolsuz CMJ, ardışık CMJ, yelekli / bant destekli / bant dirençli sıçrama, A-skip, B-skip, yüksek diz, topuk vurma, kısa sprint, yokuş sprinti, kızakla sprint; üst vücut: süpermen şınavı, kutuya plyo şınav, Smith'te balistik bench (bar atma), landmine punch, patlayıcı barfiks, sağlık topu varyasyonları (yumruk atışı dahil).
- Boks (dövüş türü): gölge boksu, ağır torba, hız topu, çift uçlu top, pao, Thai pad, tekme torbası, ip atlama, ayak çalışması, ip altında kafa kaçırma, savunma drili, dambıllı/bantlı gölge boksu, teknik sparring, sparring, klinç, savaş halatı, balyozla lastik. Kuvvet türünde: bantlı yumruk, kablo yumruk, kablo kroşe, sağlık topuyla yumruk atışı (pliometrik).
- Güreş: dövüş türünde duruş ve hareket, dalma (shot), sprawl, tutuş kavgası, eşli drill, alttan kalkış, durum güreşi, yer güreşi (parter), canlı güreş, grappling/BJJ; kuvvet türünde güreşçi köprüsü (ön/arka), köprüde dönüş, kum torbasıyla suplex, güreş mankeniyle atış, eşi omuzda taşıma, bant dirençli dalma, bantla arm drag, hip heist, sit-out, karides; beceri: öne/geri takla, Granby.
- Taşımalarda not "Tekrar = tur", sprintlerde "Tekrar = koşu", IMTP'de "Tekrar = 3–5 sn maksimal itiş".

Yeni tek eklem hareketleri `ISO_IDS`'e eklendi (yardımcı kaslar ¼).

## 2. Ayrıntılı kaslar (`src/lib/data/exdetail.ts`)
- 52 ayrıntılı kas, her biri bir gruba bağlı (`DET`, `DET_BY_GROUP`). Göğüs: üst (klaviküler), orta (sternal), alt (abdominal), pec minor, serratus. Omuz: ön/yan/arka deltoid, subskapularis, supraspinatus, dış rotatorlar. Sırt: lat, teres major, romboid. Trapez: üst/orta/alt, levator scapulae. Bel: erector spinae, QL. Biceps uzun/kısa baş, brachialis. Triceps uzun baş, lateral+medial. Ön kol: brachioradialis, fleksörler, ekstansörler, pronator/supinatör. Karın: rectus, oblik, TVA. Quadriceps: rectus femoris, vastus lateralis, vastus medialis, kalça fleksörleri (iliopsoas). Hamstring: BF uzun/kısa baş, semitendinosus+semimembranosus. Kalça: gluteus maximus, medius+minimus, TFL, derin rotatorlar. Adduktor magnus, longus/brevis/gracilis. Gastroknemius, soleus. Tibialis anterior, peroneuslar. Boyun: SCM, ekstansörler, derin fleksörler.
- Pay: grubun set payı (exShare: 1 / ½ / ¼) × bölge ağırlığı (1 / .5 / .25). Grubu harekette olmayan bölge ana kasın payına göre (leg raise'te kalça fleksörü ½). ¼'ün altı gösterilmez.
- Kurallar hareketin İngilizce adından (`RULES`); kurala uymayanlar `DET_BY_ID`. Örnek: eğimli press → üst göğüs 1, orta ½; dips/decline → alt göğüs; baş üstü triceps → uzun baş; oturarak leg curl → iç hamstring + BF uzun baş; oturarak calf → soleus; kalça içe rotasyonu → gluteus medius/minimus + TFL; vakum → TVA; hammer curl → brachialis + brachioradialis ½.
- Grup sayısı 19 kalır: kayıtlar (`muscle`), haftalık set, hedefler, plan istatistikleri aynı.

Nerede görünür:
- Hareket bilgisi (`FactChips`): kas payı çipinin altında kesik çizgili ayrıntı çipi.
- Antrenman özeti: "Bu antrenmanda çalışan kaslar" altında açılır **Ayrıntılı kaslar** (zor set, ½ altı gizli; yalnız kütüphane hareketleri, kası değiştirilmemişse).
- Arama: ayrıntılı kas adları (Türkçe + İngilizce) aranır ("soleus", "üst göğüs", "brachialis").

## 3. Dövüş türü (`kind: 'dovus'`, satırda `k: 'd'`)
- Set = raund: `{ kg: 0, reps: 1, dur (dk, 0,5 adım), z 1–5, fight: true, lvl: null, rpe: null, rir: 9, at }`.
- Yoğunluk ölçeği (`FIGHT_Z`): Teknik · Hafif · Orta · Sert · Maç → CR-10: 2 / 4 / 6 / 8 / 10.
- **Yük (seans-RPE, Foster ve ark. 2001):** `fightW = dk × CR-10 × 0,035 × maliyet` (fat 1/2/3 → 0,8 / 1 / 1,25). Kontrol: ağır torba 3 dk Sert = 0,84 (orta maliyetli, bitişe ~3 tekrar kala bir zor set kadar); 12 sert raund sparring ≈ 10 zor set.
- Zor sete, kas setine, tonaja, 1RM'ye girmez; anlık ve dönem yorgunluğuna, plan simülasyonuna girer (`setLoads`, `periodFatigue`, `simulatePlan`). Simülatörün log'dan zor set tahmini dövüşü saymaz.
- Set ekranı: ısınma gibi; raund süresi sürgüsü (0,5–5 dk) + 5 kademeli yoğunluk (`#fz-1…5`), "RAUND n BİTTİ", dinlenme ekranı (varsayılan 60 sn), set özelliği sorulur. Planlıda hedef kutucuk yok, başlıkta `RAUND n/m`.
- Plan düzenleyici: raund (1–15), raund süresi (0,5–5 dk), yoğunluk, raund arası dinlenme (30 sn'den). Hedef metni `6 raund × 2,5 dk · Sert`. "Plan olarak kaydet" raund sayısı + son raundun süresi/yoğunluğu. Gün süresi tahmini raund × (süre + dinlenme).
- Özet: hareket satırında `n raund` ve toplam dakika.
- Hareket gelişimi: tür `fight`; ölçüler seans yükü (AU = dk × CR-10) ve seansta dakika; raund sayısı.
- Güç hedefi ve öğrenme hedefi seçeneklerinde dövüş hareketleri yok.
- Filtrelerde yeni çip **Dövüş**.

## Testler
- `exlib.test.ts`: 782 / tür sayıları, ilk 470 sıra, ad ve İngilizce ad tekliği, 52 ayrıntı, ayrıntı payı örnekleri, her hareketin (tüm vücut hariç) ayrıntısı, dövüş hareketleri.
- `src/lib/models/v39.test.ts`: `fightW` kontrol değerleri, yorgunluğa girip zor sete/kas setine/tonaja girmemesi, `sessionStats.rounds/fightMin`, plan hedef metni ve `planStats`, gelişim noktası.
- `layout-check.mjs`: `seans-dovus`, `seans-dovus-dinlenme`.
- İngilizce sözlük: yeni metinler `workout.ts`, `lab.ts`, `insights.ts`; ayrıntılı kas adları `byLang('musdet')`.
