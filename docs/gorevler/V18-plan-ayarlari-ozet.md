# V18 · Sürüklemeli plan ayarları, not seçenekleri, özette set ayrıntısı ve çalışan kaslar

Uygulayan: Claude. Kullanıcının istediği altı madde:
1. geçmiş idman özetinde sete dokununca ayrıntı;
2. "son 7 gün zor set" bölümü bir şey anlatsın, çalışan kaslar ve uyarılar;
3. "Kaydetmeden çık" penceresi sığmıyor;
4. plana hareket seçince ayar ekranı hemen açılsın;
5. set/tekrar elle yazılmasın, set kaydeder gibi sürüklensin;
6. not için hazır seçenekler listesi.

## Yapılan
- **Sürüklemeli plan ayarları** (`src/features/antrenman/PxDrag.tsx`, yeni):
  - `PxStair` pixel merdiven: tek değer ya da aralık. Dokun = o değere atla, sürükle = adım adım; aralıkta dokunulan yere en yakın uç oynar, uçlar birbirini geçmez. Ok tuşlarıyla da çalışır (her uç ayrı `role="slider"`). Ses ve titreşim set ekranındakiyle aynı (`pixelFx`).
  - `PxKgTape`: isteğe bağlı kilo. 40 kg pencere, 2,5 kg adım; kenarda tutunca pencere kayar, bırakınca değere ortalanır. "Kilo hedefini kaldır" düğmesi var.
  - `ItemEditor` (`core.tsx`) bunları kullanıyor: Set 1–12, Tekrar/Temas/Deneme 1–30 aralık, Kilo/Ek yük, RPE 5–10 aralık (0,5 adım). Dinlenme çipleri aynı kaldı.
- **Hareket seçilince ayar penceresi açılır** (`PlanEditor.addItem`): seçici kapandıktan sonra yeni hareketin penceresi açılıyor.
- **"Nasıl yapılacak" seçenekleri:**
  - 15 çip: Hissederek yap, Ağırlığa odaklan, Altta beklet, Ortada beklet, Üstte beklet, İzometrik, Yavaş eksantrik, Patlayıcı kaldır, Overload yük, Pump seti, Drop set, Rest-pause, Kısmi tekrar, Tükenişe kadar, Tam ROM.
  - Altında "Ek not" serbest metin. Seçilenler ve ek not `it.note` içinde ` · ` ile birleşir; eski notlar ek not olarak görünür.
  - Not şu yerlerde görünür: plan listesi, plan menüsü (yeni, altın küçük yazı), planlı oturumun hedef kartı.
- **Özette set ayrıntısı:**
  - Set kutucukları artık düğme; dokununca `setdetail` penceresi salt okunur açılıyor (silme düğmesi yok, `onDelete` yoksa gizli).
  - Kuvvet setinde yeni satır: son tekrar hızı (renkli), ROM, tonaj (dambılda iki el).
- **Çalışan kaslar** (`SessionMuscles`):
  - "Bu antrenmanda çalışan kaslar" çipleri (kas + zor set) ve yardımcı kaslar (kütüphanedeki `sec`).
  - "Son 7 gün · kas başına zor set (hedef 10–20)": çubuklarda bu antrenmanın katkısı `+n` ve durum (az / iyi / fazla).
  - Açıklama ve uyarı satırları: Az (10'un altı), Bu hafta hiç (ana kaslar), Fazla (20'nin üstü), ya da Dengeli.
- **Kaydetmeden çık penceresi:** düğmeler alt alta, Press Start yalnızca 16 px (satır içi 17/18 px kaldırıldı); 320 px'te sığıyor.

## Kontroller
- `npm test` (91 test; ekran testine eklenenler: ayar penceresinin kendiliğinden açılması, set kaydırıcısı, tekrar aralığı, "Altta beklet" çipi, özette set ayrıntısının salt okunur açılması), lint, `tsc -b`, build.
- `test:layout` (11 boyut; yeni ekran: `plan-hareket-ayar`) geçti.
- 390 ve 320 px'te ekran görüntüsüyle kontrol edildi.
