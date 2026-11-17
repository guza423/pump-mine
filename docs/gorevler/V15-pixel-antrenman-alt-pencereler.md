# V15 · Pixel tema: Antrenman sekmesi, planlı oturum, plan düzenleyici, alt pencereler

Uygulayan: Claude (kullanıcı: "Tamam olmuş sıradakilere geçelim"). Yöntem V14 ile aynı: kök div'e `pxt`, kurallar `src/styles/px-theme.css`'te. Tuvalde ayrı tasarım yapılmadı; V13.1/V14'te onaylanan dil (dengeli doz, renkler, çentikli kenar) doğrudan uygulandı.

Kural: **"herşey korunucak … sadece stil değişicek"**. DOM, kimlikler, metinler, akışlar ve veri değişmedi (tek istisna: iki düğmede `Icon` yerine `PxIcon`).

## Yapılan
- **Alt pencereler** (`SheetFrame`, kök `sheet-wrap pxt`): hesap ve yedek, yorgunluk ölçer, hedef, not, hareket bilgisi, plan menüsü ve diğer bütün sheet'ler pixel. Form öğeleri (girdi, seçim, kaydırıcı) köşesiz; kaydırıcı başlığı kare.
- **Antrenman sekmesi** (`StartView`, kök `screen pxt`): `PLANSIZ ANTRENMAN` (ateş rengi) ve `YENİ PLAN` alt alta büyük pixel düğmeler; planlarım, antrenman tipi etiketleri, geçmiş (ay başlıkları + satırlar).
- **Planlı oturum** (`SessionView2`, kök `screen pxt ses2`): hedef kutusu, set tablosu, kilo/tekrar adımlayıcıları, hız ve RPE seçimi, dinlenme çubuğu, bitirme onayı.
- **Plan düzenleyici** (`PlanEditor`, kök `screen pxt editor2`): gün seçimi, hareket listesi, kesik çizgili `HAREKET EKLE`.
- **Düğme yazı tipi kuralı:** varsayılan `.btn` = Saira 700 16 px büyük harf; Press Start 2P (16 px) yalnızca tam genişlik/büyük düğmelerde (`.btn.full:not(.ghost)`, `.btn.big`, `.hc-actions .btn`, `.start-actions .btn`). Yan yana üç düğme (BAŞLAT/DÜZENLE/KOPYALA) ve uzun metinli hayalet düğmeler (GOOGLE İLE DEVAM ET) böylece taşmaz. 320 px'te büyük düğmeler iki satıra kırılır.
- Hover: birincil/ateş düğmeleri hover'da renk değiştirmez (eski turkuaz hover kapatıldı).

## Kontroller
`npm test` (15 dosya, 91 test), lint, `tsc -b`, build, `test:layout` (11 boyut) geçti. Gerçek tarayıcıda plan düzenleyici, planlı oturum, bitirme onayı, plan menüsü, hesap ve yorgunluk sheet'leri, 320 px Antrenman sekmesi ekran görüntüsüyle kontrol edildi.

## Kalan
- Gözlem (V16): takvim, grafikler, oradaki halka hâlâ eski stil.
- Lab (V17): biyomekanik animasyonlar, uzun metin okunurluğu.
