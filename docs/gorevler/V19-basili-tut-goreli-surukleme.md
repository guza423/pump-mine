# V19 · Basılı tutma düğmeleri, göreli/hassas sürükleme, hareketi bitir, başlık bilgisi

Uygulayan: Claude. Kullanıcı istekleri:
1. set inişi tam animasyon;
2. hareket eklenince ekran son eklenene odaklansın;
3. set ekranında basılı tutmalı HAREKETİ BİTİR ve animasyonla listeye dönüş;
4. silme düğmeleri 1 sn basılı tutulsun ve bu belli olsun;
5. dambılda kilo yazısı okunmuyor;
6. başlıkta tarih, başlama saati, sayaç;
7. İDMANI BİTİR yarım saniye basılı + animasyon;
8. kilo/tekrar barı dokunulan yere atlamasın, her yerden sürüklensin, parmak uzaklaşınca hassaslaşsın.

## Yapılan
- **`HoldButton`** (`src/app/HoldButton.tsx`, yeni; stiller `pixel.css` `.px-hold*`):
  - basılı tutunca içi soldan sağa dolar (12 adım); erken bırakılırsa çalışmaz, "BASILI TUT" ipucu yanıp söner;
  - başlarken ve bitince kısa titreşim;
  - klavye / ekran okuyucu etkinleştirmesi (`click.detail === 0`) basılı tutmadan çalışır.
- **Basılı tutmalı silmeler (1 sn; araya giren "emin misin" adımları kalktı):**
  - plansız idman: İPTAL (başlık), setsiz hareketi çıkar (×), set ayrıntısında Seti sil, "Kaydetmeden çık";
  - özetlerde Kaydı sil (plansız ve geçmiş);
  - plan: Planı sil (menü), Sil (düzenleyici), Hareketi sil;
  - planlı oturum: Kaydetmeden çık / Sil;
  - set ayrıntısı Seti sil, Hesabı kalıcı sil (SİL yazma kuralı duruyor).
- **Basılı tutmalı bitirmeler (0,5 sn):**
  - İDMANI BİTİR: set varsa doğrudan "İDMAN BİTTİ" animasyonu (sarı flaş, büyüyen yazı, pixel kıvılcımlar, 650 ms), sonra özet. Set yoksa "Hiç set yok" penceresi açılır.
  - Planlı oturumda Bitir: set varsa doğrudan özete gider.
- **HAREKETİ BİTİR** (set ekranı, en az bir set varsa SET n BİTTİ'nin yanında, yeşil):
  - "HAREKET BİTTİ" animasyonu, ardından listeye dönüş, sıradaki bitmemiş hareket seçili olur;
  - kartta yeşil **BİTTİ** etiketi (`item.done`); o harekete yeni set kaydedilince etiket kalkar.
- **Göreli ve hassas sürükleme** (set ekranında kilo ve tekrar; plan ayarlarında `PxStair` / `PxKgTape`):
  - dokunmak değeri değiştirmez; bar her yerinden tutulur, değer parmağın yatay hareketi kadar değişir;
  - parmak bardan yukarı/aşağı uzaklaştıkça hassaslık 1 → 1/2 → 1/4 → 1/8 olur (YouTube'da ileri sarmak gibi), başlıkta "HASSAS 1/n" görünür;
  - kilo barında pencere değeri izler; kenarda tutmak hâlâ hızlanarak kaydırır.
- **Son eklenen harekete odak:** hareket eklenince son eklenen seçili olur ve liste ona kayar.
- **Başlık:** tarih, "HH:MM'de başladı" ve süre ("18 KAS ÇAR · 20:15'DE BAŞLADI · SÜRE 0:08"); başlamadıysa "HAZIR · başlamadı".
- **Okunurluk:**
  - kilo görselinin yükseklikleri her ekran kademesinde toplamla eşit (820 px: 40+28+18, 710 px: 30+26+18); dambıl, kilo sayısı ve "tek el · iki dambıl toplam …" üst üste binmiyor;
  - 320 px'te "SON TEKRARIN HIZI" tek satır kalıyor, açıklama kısalıyor.
- **Animasyonlar:** `fx.motion` varsayılanı artık açık; cihaz azaltsa da set inişi tam oynar, Hesap'tan kapatılabilir.

## Kontroller
- `npm test` (16 dosya, 94 test); yeni: `HoldButton.test.tsx` 3 test; ekran testine HAREKETİ BİTİR, başlık bilgisi, basılı tutma sınıfları eklendi.
- Lint, `tsc -b`, build, `test:layout` (11 boyut; bitirme artık basılı tutularak) geçti.
- 393×800, 360×640 ve 320×568'de ekran görüntüsüyle kontrol edildi.
