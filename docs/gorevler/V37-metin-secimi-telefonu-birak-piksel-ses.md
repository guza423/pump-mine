# V37 · Metin seçimi kapalı, idmanda telefonu bırak (2 dk'da geri aç), 8-bit bildirim sesi, 40 dk sonrası titreşim

Tarih: 2026-11-25 · Claude doğrudan uyguladı (Claude Code).

## Kullanıcının isteği (birebir)
> Outmove için app özellikleri ekleyelim.
> 1. Ekrandaki yazılara basılı tutunca telefonda kopyala ekranı falan açılıo.textlerle etkileşime geçilemeycek
> 2. İdman seansı anında. İdman sayacı açıkken yani. Telefonj rahatsız edicez. 2 dk da bir otomatik uygulama açılıcak. Telefonla meşgul olmuyacaz. Ekranı kapayınca idman anında yada appden çıkınca hop açılıcak 2dk ya geri. İdmanı hatırlatacak.
> 3. App bildirim sesi böyle güzel pixelli bişi olsun. Yüksek ses olsun.
> 4. Süresi 40dk falan olunca yavaştan idmanın sonu geldiği için app her 3dk boyunca etkileşime girmeme süresi için titresin telefon. İdman bitince appden sonlandırmayı hatırlatmak için.

## 1 · Metinlerle etkileşim yok
- `body` (app.css): `user-select: none`, `-webkit-touch-callout: none`; yalnız `input`, `textarea`, `select`, `contenteditable` seçilebilir. Resim/SVG sürüklenmez.
- `main.tsx`: `contextmenu` yazı alanları dışında engellenir (basılı tutma menüsü açılmaz).

## 2 · İdmanda telefonu bırak (Android, `FocusGuard`)
- Yalnız **süren** idmanda (başlamış, hazır değil). Uygulamadan çıkılınca ya da ekran kapanınca (`MainActivity.onStop`) 2 dk'lık alarm kurulur; öne gelince (`onStart`) iptal.
- Alarm (`FocusReceiver`): uygulama hâlâ arkadaysa açılır (ekranı yakar, kilit ekranının üstünde gösterir: `setShowWhenLocked` + `setTurnScreenOn`, yalnız bu açılışta; uygulamadan çıkınca kalkar) ve sesli "İdmana dön" bildirimi; sonraki tur 2 dk sonra (uygulama öne gelince iptal).
- Android 10+ arka plandan açmak için **"Diğer uygulamaların üzerinde göster"** (`SYSTEM_ALERT_WINDOW`) izni gerekir. Hesap ve ayarlar'da izin yoksa not + **İzni aç**. İzin yoksa 2 dk'da bir yalnız sesli bildirim gelir.
- Kendiliğinden açılış **giriş sayılmaz**: JS öne gelince `focusResume()` sorar; `auto` ise unutulan idman bekçisi (V32) dokunuş yazmaz. Böylece 15 dk'da kendiliğinden bitirme çalışmaya devam eder.
- Güvenlik: son dokunuştan 25 dk sonra yerel bekçi kendini durdurur.

## 3 · 8-bit bildirim sesi
- `res/raw/outmove_ping.wav` (`scripts/pixel-sound.py`): kare dalga arpej (C6–E6–G6–C7, sonra G6–C7), 0,5 sn, tam genlik (−0,5 dBFS), 16 basamaklı zarf.
- Android kanal sesi sonradan değişmediği için sesli kanallar yeni kimlik aldı ve eskiler silinir: `rest-done` → `rest-done-px`, `workout-idle` → `workout-idle-px`, `plan-reminder` → `plan-reminder-px`; yeni `workout-back-px`. Kullanım `USAGE_NOTIFICATION` (sesi telefonun bildirim sesi düzeyi belirler; sessiz modda çalmaz).

## 4 · 40 dk sonrası "bitirmeyi unutma" titreşimi
- Süre ≥ 40 dk ve uygulamaya 3 dk dokunulmadıysa titreşim; dokunulmadıkça her 3 dk'da bir. Dokunuşu `MainActivity.dispatchTouchEvent` sayar (her ekran, 5 sn'de bir kayıt).
- Uygulama öndeyse yalnız titreşim (`Vibrator`); arkadaysa sessiz, titreşimli bildirim "İdman bitti mi?" (kanal `workout-end-buzz`).

## Ayarlar
`settings` › `reminders` = `{ plan, back, end }` (hepsi varsayılan açık). Hesap ve ayarlar'da iki anahtar: "İdmanda uygulamadan çıkarsan 2 dk sonra geri aç", "40 dk sonra 3 dk dokunmazsan titret".

## Kod
- Android: `FocusGuard.java`, `FocusReceiver.java`, `MainActivity.java`, `RestTimerPlugin.java` (`focusSet`, `focusStop`, `focusResume`, `overlay`, `openOverlaySettings`; ses yardımcıları), alıcılarda eski Android ses yedeği, manifest (`SYSTEM_ALERT_WINDOW`, alıcı).
- JS: `src/lib/native/restTimer.ts` (`setFocus`, `stopFocus`, `focusResumedByApp`, `overlayStatus`), `src/app/App.tsx` (süren idmanda kurulum), `src/features/antrenman/idleWatch.ts`, `src/features/plan/reminders.ts` (`focusPrefs`, `remindPrefs`), `src/features/hesap/Account.tsx`.
