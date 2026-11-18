# V22 · İngilizce: Antrenman sekmesi

Önce `docs/gorevler/V21-dil-altyapisi-ingilizce.md`'yi oku (yöntem ve kural orada). Yalnızca metin çevrilir; davranış, DOM kimlikleri ve veri aynı kalır.

## Kapsam
- `App.tsx`: `StartView`, `WtypeMenuBody`, `SessionView2` (planlı oturum), `SetTable` / `PlyoTable` / `SkillTable`, `SetDetailBody`, `RestChip` / `RestBig`, `NoteSheetBody`, `ExListBody`, `SummaryBody`, `SessionMuscles`, `MuscleBars` (`MBAR_ST`), `SaveTemplateBody`, `PlanEditor`, `PickerBody`, `ItemSheetBody`, `ExFilterBar` / `useExFilter` (`EX_KINDS`), `exDot`, `exLine`, `FactChips`, `SPEED_SHORT`.
- `features/antrenman/`: `FreePixelSession.tsx`, `PixelSummaryScreen.tsx`, `PxDrag.tsx`, `PixelWeightVisual.tsx`, `pixelHelpers.ts` (`PX_SPEED`, `PX_PLYO_Q`, `PX_SKILL_Q`, `eqLabel`, `upTr`), `core.tsx` bileşenleri (`ItemEditor`, `Lane`, `SetReplay`, `RestBar`).
- `toLocaleString('tr-TR')`, `toLocaleUpperCase('tr')`, `toLocaleTimeString('tr-TR')` → `num()`, `upper()`, `clock()`.
- **Kayıtlı Türkçe değerler gösterimde çevrilir:** hareket adı `exName()`, kas `muscleName()`, set notu etiketleri (`NOTE_TAGS`, `set.tags`), plan notundaki hazır seçenekler (`NOTE_PRESETS`, notta ` · ` ile birleşik; parça parça çevir, kullanıcının serbest metni aynen), kütüphanedeki kısa notlar (`not`).
- Arama: hareket arayınca İngilizce kas ve ekipman adları da eşleşsin (samanlığa `muscleName(e.muscle)` ekle).
- Dinlenme bildirimi: `lib/native/restTimer.ts` metinleri `t()` ile; Android kanal adı "Dinlenme sayacı" (`RestTimerPlugin.java`) `res/values/strings.xml` (EN) + `values-tr/strings.xml` ile.

## Test
- `i18n-screens.test.tsx`: plansız oturum (liste, set ekranı, dinlenme, özet), planlı oturum, plan düzenleyici İngilizce ve Türkçe harf yok.
- `layout-check.mjs` → `flowEn`'e Antrenman ekranlarını ekle (İngilizce metinler daha uzun olabilir; büyük düğmeler 8'in katı Press Start 2P).

## Yapılan (2026-11-19, Claude)
- Antrenman sekmesinin tamamı `t()` ile: başlangıç, Planlarım, satır içi geçmiş, plan menüsü, plan düzenleyici ve hareket ayar penceresi (sürüklemeli barlar, hazır "nasıl yapılacak" seçenekleri), hareket seçici ve filtreler, planlı oturum (hedef kartı, set tablosu, hız animasyonu, not, set ayrıntısı, dinlenme), özet penceresi ve kas bölümü, pixel plansız oturum (liste, çoklu seçici, set ekranı, büyük dinlenme, set ayrıntısı, İDMAN/HAREKET BİTTİ), pixel özet, ağırlık görseli.
- Kayıtlı Türkçe değerler ekranda çevrilir: hareket adı (`exName`), kas (`muscleName`), set etiketleri (`set.tags`), plan notundaki hazır seçenekler (`noteLabel`; kullanıcının serbest notu aynen).
- Arama iki dilde: İngilizce hareket, kas ve ekipman adlarıyla da bulur.
- Sayılar dile göre (`num`, `fk`, `pct`, `clock`); `toLocaleString('tr-TR')` kalmadı.
- Dinlenme bildirimi metinleri ve Android bildirim kanalı adları uygulama dilinde (`channelRunning`, `channelDone`; `RestTimerPlugin.createChannels` var olan kanalın adını günceller).
- Yerel `t` gölgelemeleri kaldırıldı (`tg`, `nowTs`, `timer`, `tag`, `line`).
- Testler: İngilizce plansız oturum (liste → seçici → set → dinlenme → set ayrıntısı → hareketi bitir → özet → bildirim), planlı oturum + özet + plan menüsü + plan düzenleyici; `flowEn` Antrenman ekranlarını da kapsar.
- Kısa set rozetleri İngilizcede `3a` (attempts) ve `5c` (contacts).

