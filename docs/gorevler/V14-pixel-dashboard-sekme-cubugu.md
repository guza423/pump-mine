# V14 · Pixel tema: Dashboard ve alt sekme çubuğu

Uygulayan: Claude (kullanıcı: "Basit bişi ise sen yap ozmn"). Tasarım kaynağı: tuvaldeki "Sekmeler (V14)" sayfası; repo kopyası `reference/v14-pixel/Dashboard.dc.html`.

Kullanıcının kuralı: **"herşey korunucak … sadece stil değişicek"**. DOM, kimlikler, metinler, akışlar ve veri değişmez.

## Yapılan
- **Tema katmanı** `src/styles/px-theme.css`: var olan global sınıfları `.pxt` kökü altında pixel'e çevirir. Bir ekran pixel'e geçmek için kök div'ine `pxt` sınıfını alır. Jetonlar V13.1'deki dengeli dozla aynı (`--px-f-big`, `--px-f-head`, `--px-f-body` ve renkler).
- **Dashboard** (`TodayScreen`, kök `screen pxt`). Her öğe pixel'e geçti:
  - başlık, hesap düğmesi, misafir uyarısı;
  - yorgunluk kartı: halka 24 kare segment (`Ring pixel`), bölge etiketi, kırılım, uyku 5–9 düğmeleri tam genişlikte, kısa uyku uyarısı;
  - plan/oturum kartının dört hali; düğmeler Press Start 16 px, ikili düğmeler alt alta;
  - bu hafta şeridi: yapıldı yeşil kare, planlı altın çerçeve, kaçırıldı kırmızı çizgi, bugün altın çerçeve;
  - güç hedefi (sayılar Press Start 16, kesik çizgili hedef çizgisi, parçalı ilerleme çubuğu), öğrenme hedefi (4 mavi aşama bloğu, `PRATİK ET`), hedef ekle.
- **Alt sekme çubuğu** bütün uygulamada pixel: pixel ikonlar (`src/app/PxIcon.tsx`), seçili sekme altın çerçeveli, canlı oturum noktası yanıp sönen kare.
- `Ring` bileşenine `pixel` seçeneği eklendi. Gözlem'deki halka V16'ya kadar eski haliyle kalır.

## Kalan (sonraki adımlar)
- Alt pencereler (sheet'ler: hesap, yorgunluk ayrıntısı, hedef, not, hareket bilgisi …)
- Antrenman sekmesi listeleri, planlı oturum, plan düzenleyici (V15)
- Gözlem (V16)
- Lab (V17)
