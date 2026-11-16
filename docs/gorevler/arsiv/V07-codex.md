# Görev: sabit APK imzası + v0.7 arayüzünü prototipe birebir taşı

Bu dosyayı ve yanındaki klasörleri repo köküne kopyaladım:
- `android/app/debug.keystore`: sabit debug anahtarı.
- `reference/v07/`: Claude'daki güncel, çalışan prototip (v0.7). Tasarımın ve davranışın tek kaynağı bu.

## Sorunlar
1. **APK telefona kurulmuyor.** `android/app/build.gradle`'da imza ayarı yok. Her Actions çalışması yeni ve rastgele bir debug anahtarı üretiyor. Telefonda eski sürüm yüklüyken yeni APK "Uygulama yüklenmedi" hatası veriyor.
2. **Arayüz prototip değil.** `6f88ddb` yorgunluk modelini doğru taşıdı (`src/lib/models/fatigue.ts`). Ama ekranlar eski v0.4 Günlük'ten türetildi; `reference/` yalnızca eski v0.3'ü içeriyordu. Eksikler: hedef kartı, set tablosu, ⋮ tür menüsü, Geçmiş ekranı, dinlenme çipi, set ayrıntısı, Lab ve ölçüm sayfası, yeni simülatör, program analizi. Ayrıca prototipte üst uygulama çubuğu (PERFORMANCE v0.7 yazısı) yok.

## 1) Sabit imza (önce bunu yap, ayrı commit)
- `android/app/debug.keystore` dosyasını olduğu yerde bırak ve commit et. Debug anahtarıdır, gizli değildir.
- `android/app/build.gradle`:
```gradle
android {
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }
    defaultConfig {
        versionCode Integer.parseInt(System.getenv('GITHUB_RUN_NUMBER') ?: '1')
        versionName '0.7.' + (System.getenv('GITHUB_RUN_NUMBER') ?: '0')
        // diğer satırlar aynı
    }
    buildTypes {
        debug { signingConfig signingConfigs.debug }
        // release aynı
    }
}
```
- `.github/workflows/android.yml`'e, APK derlendikten sonra imza doğrulama adımı ekle. Sertifika farklıysa iş başarısız olsun:
```yaml
      - name: Verify signing certificate
        run: |
          APKSIGNER=$(ls $ANDROID_HOME/build-tools/*/apksigner | sort -V | tail -1)
          $APKSIGNER verify --print-certs android/app/build/outputs/apk/debug/app-debug.apk | tee certs.txt
          grep -q "ee7115421bbfbe4dddf8ee5ac35a36a9fcd7b0e2f5d24732a2dd4f21c6dc7bf6" certs.txt
```
- Artifact adı sürümü göstersin: `name: performance-v0.7-${{ github.run_number }}`.

## 2) Arayüzü prototipe birebir getir
`reference/v07/performance.html`'i tarayıcıda aç; ekranlar, metinler, sıralama, renkler ve davranış birebir aynı olacak. Kaynaklar:
- `app.jsx`: tüm ekranlar, sayfalar (sheet) ve uygulama kabuğu
- `core.jsx`: sabitler, hareket kütüphanesi, hız ve RIR modeli, şablonlar, ortak bileşenler (Stepper, Lane, SetReplay, RepBars)
- `cns.jsx`: ikonlar, ders kartları, NeedleGauge, Range, Switch
- `bio-ui.jsx` + `biomech.js`: biyomekanik
- CSS sırası: `cns.css → app.css → log.css → mobile.css → app5.css`. `build5.js`'teki artifact'e özel `:root { --sat: 0px; --sab: 0px; }` satırını alma; uygulamada güvenli alan `env()` ile gelir.

Dosya yerleşimi (bileşen adları prototiptekiyle aynı kalsın):
- `features/bugun/`: TodayScreen, WeekRow, Spark, Ring
- `features/antrenman/`: StartView, WtypeMenuBody, SessionView2, SetTable, SpeedStage, RestChip, SetDetailBody, NoteSheetBody, ExListBody, SummaryBody, SaveTemplateBody, HistoryView, FatigueBars, Metric, E1Chart
- `features/programlar/`: ProgramsList, ProgramEditor2, ItemSheetBody, PickerBody, PlanBody
- `features/lab/`: LabScreen, MeasureBody, LessonBody, FatigueBody, ExerciseBody, GoalBody
- `app/App.tsx`: App. Sheet yığını (openSheet, closeTop, closeAll), SHEET_TITLES, sheetSize, `antView` (start/history), program taslağı mantığı (taslak yalnızca kayıtlı sürümden yeniyse kullanılır), dört sekme (Bugün, Antrenman, Programlar, Lab)
- `lib/models/`: saf fonksiyonlar ve testleri. planStats, logStats, setLoads, sleepInfo, sleepPts, fatigueAt, steadyWeek, simFromLogs, simFromPlan, simulatePlan, fatigueRecs, sessionFatigue, periodMetrics, historyWarnings, nextPlanned, rirFromSpeed, animVl, e1Ok, bestE1, e1Series, prevPerf. Mevcut `fatigue.ts` ve `training.ts` bunlara göre düzenlensin.

Kurallar:
- Veri katmanı Dexie olarak kalsın (`useLogStore`). Prototipteki `put`/`del` aynı mantıkla çalışıyor.
- `settings` farkı: prototipte `{ id: 'goal', exId, base, target }`, repoda `{ key, value }`. Hedefi `key: 'goal'` altında sakla.
- Uyku eşlemesi prototipteki gibi: `checkins` kaydı `c_YYYY-MM-DD` ve "o sabah girilen, dün geceki uyku". Bugüne kayıt yoksa uyku puanı 0'dır. Şimdiki `sleepScore`, dün geceki kayıt eksikken bir önceki geceyi "dün gece" sayıyor; bunu düzelt.
- Yedekleme: prototipte yok ama veri yalnızca telefonda tutuluyor. Mevcut `BackupPanel`'i (Yedekle / Geri yükle) Programlar listesinin en altına koy.
- Artık kullanılmayan eski kabuğu (`App.tsx` v0.4, `AppV7.tsx`, Merkez, İlerleme, eski Yorgunluk/Biyomekanik sekmeleri) kaldır. Bileşenleri yeni yerlerinde kullan, kod kopyası bırakma.
- `window.claude` kullanan hiçbir kod kalmasın.

## 3) Testler
Model testleri, prototipteki fonksiyonlarla aynı sonucu vermeli (±1):
- Antrenman yok, bugün 5 sa uyku girişi (başka gece yok) → skor 23. Üç gece 5 sa → 30. Uyku girişi yok → 0.
- `TEMPLATES[0]`'ın "Ağır gün"ü: her hareketin hedef set sayısı kadar set; tekrar = repMax; RIR = 10 − hedef RPE ortası (RPE yoksa 8). Antrenman 16 sa önce başlamış; her set bir öncekinden (o hareketin rest + 40) sn sonra (ilk set, başlangıçtan bu kadar sonra). Bugün 8 sa → 52, 5 sa → 75.
- `rirFromSpeed(20, 4) = 0`, `rirFromSpeed(20, 2) = 2`, `rirFromSpeed(5, 0) = 5`.
- `bestE1([{ kg: 40, reps: 20, rir: 1 }]) = 0`, `e1rm(75, 8, 2) = 100`.
- `simulatePlan(programFromTemplate(TEMPLATES[0]))` → seans başı ortalama ≈ 21, en yüksek tepe ≈ 76.

`src/test/screens.test.tsx` akışı (hiçbir adımda hata olmamalı):
- Bugün → uyku 5 → yorgunluk sayfası.
- Antrenman → "Ağır gün" başlat → 2 set kaydet → set ayrıntısı → Bitir → özet. Kapatınca Antrenman'da kalmalı.
- ⋮ menü → tür adı değiştir → sil onayı.
- Geçmiş → dönem değiştir → geri.
- Boş antrenman → Bitir → "Kaydetmeden çık" → Antrenman sekmesinde kalmalı.
- Programlar → editör → hareket ekle → program analizi → simülatör.
- Lab → "Yorgunluk nasıl ölçülür?" → hareket kartı.

## 4) AGENTS.md ve README
- AGENTS.md "Referans prototip": `reference/v07/` olsun. Eski `reference/` dosyalarını `reference/v03/`'e taşı. Eski model kontrol değerlerini (`rirFromSpeed(8, 3) ≈ 2,5` vb.) bu dosyadaki yeni değerlerle değiştir. Sekme listesini güncelle.
- README'ye kurulum notu: "İmza sabitlendi. Bu sürümden önceki bir APK yüklüyse telefondan bir kez kaldır, sonra yenisini kur. Bundan sonraki sürümler üstüne kurulur, veriler kalır."

## 5) Teslim
AGENTS.md'deki "Her görevin sonunda" kuralı geçerli: `npm test` ve `npm run build` geçsin, doğrudan `main`'e push et. Bu dosyayı (`CODEX-V07.md`) commit etme.
