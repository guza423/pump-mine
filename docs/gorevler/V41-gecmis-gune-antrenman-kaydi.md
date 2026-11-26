# V41 · Takvimden geçmiş güne antrenman kaydı (dinlenmesiz)

Durum: **Claude (Claude Code) doğrudan uyguladı**, 2026-11-27.

## Kullanıcının isteği (birebir)

> Tamamdır. Ya bide şey. Bu takvim varda o takvimde geçmişteki istedimiz yere tıklayıncada geçmişte yaptımız idmanı kaydedebilelim. Bu kayıttta tabi dinlenme süresi değilde hemen seti kaydetme olucak dinlenme yerine. Başka yok. Oki

## Yapılan
- **Gözlem gün paneli (geçmiş gün):**
  - `+ Bu güne antrenman kaydet` (`#day-log-past`) o güne plansız kayıt açar.
  - O günün yapılmamış planlı satırında **Kaydet** (`.day-log-plan`) planlı kayıt açar (`dayId` ile). Bitince takvimde o gün yapıldı görünür.
  - Süren idman varsa düğme yerine "Geçmişe kayıt için önce süren antrenmanı bitir."
  - Bugün ve ilerisi değişmedi ("Bu güne plan ekle").
- **Oturum:** `backfill: true`, `ready` yok (hemen kayıtta), `startedAt` = seçilen gün 18:00.
- **Set saatleri:** ilk set `startedAt`, sonrakiler son setten bir dinlenme süresi sonra (`restDuration`, en az 30 sn). Bitiş = son set + 60 sn. Böylece süre, yorgunluk ve haftalık hesaplar gerçekçi kalır.
- **Dinlenme yok:** set kaydında `rest` yazılmaz, dinlenme ekranı (`#rest-big`) açılmaz, bildirim sayacı kurulmaz; aynı ekranda hemen sıradaki set.
- **Süren idman sayılmaz:** canlı bildirim, süren idman şeridi, V32 unutulan idman bekçisi, V37 telefonu bırak bekçisi kapalı.
- **Başlık:** o günün tarihi + "GEÇMİŞ KAYIT" (dar ekranda tek satır). Set yokken İPTAL (basılı tut) ile vazgeçilir. Dashboard kartında "GEÇMİŞ KAYIT".

## Kontroller
`npm test` (196, iki yeni V41 testi), lint, `tsc -b`, build, `test:layout` (yeni `gozlem-gecmis-gun`, `gecmis-kayit` ekranları).
