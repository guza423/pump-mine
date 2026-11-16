# PERFORMANCE · nihai düzeltme görevi

Bu görevi baştan sona, kullanıcıya hiçbir şey sormadan tamamla. Kullanıcı ara adımlara bakmayacak. Tasarımı, Türkçe metinleri ve davranışı değiştirme; yalnızca aşağıdakileri yap. Bitince sonuçları "Bitiş kontrolü" bölümündeki komut çıktılarıyla kanıtla.

## 0) Kalıcı kural: AGENTS.md
`AGENTS.md`'nin en sonuna aşağıdaki bölümü ekle. Bu görev de bu kurala göre bitecek.

```md
## Her görevin sonunda (zorunlu, kullanıcıya sorma)
1. `npm test` ve `npm run build` çalıştır.
2. İkisi de geçerse: `git add -A`, kısa ve anlamlı bir mesajla commit, ardından `git push origin HEAD:main`.
3. PR veya ayrı branch açma; her zaman doğrudan `main`'e push et.
4. Bitince `git log -1 --oneline`, push çıktısını ve `git status` çıktısını göster.
5. Derleme çıktılarını asla commit etme: `dist/`, `android/app/build/`, `android/app/src/main/assets/public/`, `android/app/src/main/assets/capacitor.config.json`, `android/app/src/main/assets/capacitor.plugins.json`, `android/app/src/main/res/xml/config.xml`, `android/capacitor-cordova-android-plugins/`.
6. Testler veya build geçmezse hatayı düzelt ve tekrar dene; geçmeyen kodu push etme.
```

## 1) Repo temizliği
"historical" commit'i derleme çıktılarını repoya eklemiş. Bunları git takibinden çıkar (dosyaları diskten silme):
```sh
git rm -r --cached --ignore-unmatch android/app/src/main/assets/public android/app/src/main/assets/capacitor.config.json android/app/src/main/assets/capacitor.plugins.json android/app/src/main/res/xml/config.xml android/capacitor-cordova-android-plugins android/app/build
```
`android/.gitignore` bu yolları zaten içeriyor; kök `.gitignore`'a da aynı satırları ekle.

## 2) Çökmeleri onar
Sebep: `Biyomekanik.tsx` `Notes`'u, `Gunluk.tsx` `Notes` ve `Tile`'ı import etmeden kullanıyor (`ReferenceError: Notes is not defined`). Biyomekanik sekmesine dokununca ve antrenman özetinde uygulama kapanıyor.
- `Notes` ve `Tile` bileşenlerini ortak bir dosyaya taşı (`src/app/ui.tsx`) ve kullanıldıkları her dosyada import et: `Biyomekanik.tsx`, `Gunluk.tsx`, `Yorgunluk.tsx`.
- Tüm `.tsx` dosyalarında tanımsız bileşen veya değişken kalmadığını kontrol et. ESLint ekle (`react/jsx-no-undef`, `no-undef` kuralları açık) ve `npm run lint` script'i oluştur; lint hatasız geçsin.
- `App`'i bir React hata sınırı (Error Boundary) ile sar: bir ekran hata verirse uygulama kapanmasın; "Bir şeyler ters gitti" mesajı ve "Yeniden yükle" düğmesi görünsün.

## 3) CSS sırası
Sebep: `app.css`, `cns.css`'ten önce yükleniyor; `cns.css`'teki masaüstü kuralları (`.stage-grid` iki sütun vb.) mobil kuralları eziyor. Yorgunluk sekmesinde kutular bu yüzden üst üste biniyor.
`App.tsx`'teki CSS importları tam olarak bu sırada olsun:
```ts
import '../styles/cns.css';
import '../styles/app.css';
import '../styles/log.css';
import '../styles/mobile.css';
```

## 4) Çentik, sistem çubukları ve yazı boyutu
- `capacitor.config.ts` içine ekle:
```ts
plugins: {
  SystemBars: { insetsHandling: 'native', style: 'DARK' },
},
```
- `MainActivity.java` tam olarak şu olsun (`EdgeToEdge` bulunamazsa `androidx.activity` bağımlılığını ekle):
```java
package app.performance.training;

import android.os.Bundle;
import android.webkit.WebSettings;
import androidx.activity.EdgeToEdge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    EdgeToEdge.enable(this);
    super.onCreate(savedInstanceState);
    // Sistem yazı boyutu en fazla %115 uygulansın; daha büyüğü tasarımı bozuyor.
    WebSettings settings = getBridge().getWebView().getSettings();
    int zoom = Math.round(getResources().getConfiguration().fontScale * 100f);
    settings.setTextZoom(Math.max(100, Math.min(115, zoom)));
  }
}
```
- `android/app/src/main/res/values/colors.xml`'e `<color name="app_bg">#04060c</color>` ekle; `styles.xml`'de uygulama ve açılış temalarına `<item name="android:windowBackground">@color/app_bg</item>` koy.
- `index.html`'deki `viewport-fit=cover` kalsın.

## 5) Başlık fontu
- `npm uninstall @fontsource/saira` ve `npm install @fontsource-variable/saira`.
- `main.tsx`'te Saira importlarının yerine tek satır: `import '@fontsource-variable/saira/wdth.css';`
- `app.css`'te `--f-display: "Saira Variable", "Saira", "Arial Narrow", sans-serif;`

## 6) mobile.css
`src/styles/mobile.css` dosyasını bu içerikle birebir oluştur:

```css
/* Mobil sağlamlaştırma: 320–430 px, metin ölçeği %130'a kadar, çentik ve sistem çubukları */
:root {
  --sat: env(safe-area-inset-top, 0px);
  --sab: env(safe-area-inset-bottom, 0px);
  --sal: env(safe-area-inset-left, 0px);
  --sar: env(safe-area-inset-right, 0px);
  --gut-l: max(16px, var(--sal));
  --gut-r: max(16px, var(--sar));
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}
html, body, #root { height: 100%; overflow: hidden; }
.app-head { padding-top: calc(14px + var(--sat)); }
.tabbar { padding-bottom: calc(6px + var(--sab)); }
.toast { bottom: calc(84px + var(--sab)); }
.sheet { max-height: calc(100% - var(--sat) - 24px); }
.sheet-body { padding-bottom: calc(18px + var(--sab)); }
.app-main { overscroll-behavior-y: contain; -webkit-overflow-scrolling: touch; }

/* Tek sütunlu grid'ler içerik genişliğine göre büyümesin */
.hub, .hub-sec, .mods, .bio, .bio-panel, .fatigue, .stage, .stage-head, .stage-grid, .lab, .notes, .log, .log-sec, .editor, .session, .summary,
.card, .ex-card, .entry, .day-card, .fig-card, .prog, .sim-grid, .sim-out, .sim-inputs, .controls, .mu-groups, .speed, .rpe-pick, .field, .stepper,
.recs, .recov, .meter-card, .fpanel, .vel-box, .rpe-box, .setrow-x, .item-ed, .new-ex, .tmpls, .hist, .items, .setlist, .sum-ex, .wk { grid-template-columns: minmax(0, 1fr); min-width: 0; }

.tile, .mod-body, .prog-t, .pday-t, .item-t, .hist-row, .ex-row, .sopt-t, .se-top, .rest-t, .entry-h, .ses-title, .card-h, .sec-h, .field-top, .tab, .node, .axon-nodes li { min-width: 0; }
.tile-v, .sr-main, .exs-n, .hist-k, .fig-meta, .card-hint, .sec-k { white-space: nowrap; }
.card-hint, .sec-k, .fig-meta { overflow: hidden; text-overflow: ellipsis; }
.tab-l { max-width: 100%; overflow: hidden; text-overflow: ellipsis; font-size: 10px; letter-spacing: 0; }
.exc-h, .prog-h, .mod-top, .hc-top, .speed-h, .day-foot, .ed-top, .goal-top, .se-top, .rate-head { flex-wrap: wrap; row-gap: 6px; }
.exc-name, .ses-title h3, .hero-card h3, .sum-hero h3, h2 { overflow-wrap: anywhere; }
.goal-scale span:not(.start):not(.end) { font-size: 0; }
.goal-scale span:not(.start):not(.end) b { font-size: 11px; }
.axon-nodes { grid-template-columns: repeat(5, minmax(0, 1fr)); }
.node-label { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.setrow-b { grid-template-columns: 20px minmax(0, 1fr) auto 52px 34px; gap: 6px; }
.sr-rpe { white-space: nowrap; }
.rpe-chips small { font-size: 9px; white-space: nowrap; }
.wd-btn, .fchip, .day-tab, .segmented button { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.restbar { grid-template-columns: 40px minmax(0, 1fr) auto auto; gap: 8px; }
.rest-ring { width: 40px; height: 40px; }
.rest-v small { display: block; font-size: 10.5px; line-height: 1.2; }

@media (max-width: 380px) {
  .tab-title { font-size: 26px; }
  .pager { gap: 8px; }
  .pager .btn { padding: 9px 12px; }
  .pager-mid span:last-child { display: none; }
  .node:not(.current) .node-label { visibility: hidden; }
  .node-dot { width: 24px; height: 24px; }
  .speed-body { grid-template-columns: 100px minmax(0, 1fr); gap: 8px; }
  .lane2-track { height: 118px; }
  .sopt-t small { display: none; }
  .sopt { padding: 8px; }
  .entry-steps, .ied-grid { gap: 8px; }
  .st-row { grid-template-columns: 32px minmax(0, 1fr) 32px; }
  .tiles { gap: 6px; }
  .tile { padding: 9px 10px; }
  .tile-v { font-size: 21px; }
  .move-pick { grid-template-columns: minmax(0, 1fr); }
  .move { grid-template-columns: minmax(0, 1fr) auto; align-items: center; }
  .rate-out { grid-template-columns: minmax(0, 1fr); justify-items: center; }
  .perf-row { grid-template-columns: 64px minmax(0, 1fr); }
  .emph-row { grid-template-columns: 96px minmax(0, 1fr) auto; gap: 8px; }
  .setrow-b { grid-template-columns: 18px minmax(0, 1fr) 52px 34px; grid-template-areas: "i m b v" "i r b v"; row-gap: 0; }
  .sr-i { grid-area: i; } .sr-main { grid-area: m; } .sr-rpe { grid-area: r; } .setrow-b .repbars { grid-area: b; } .sr-vl { grid-area: v; }
  .wk-row { grid-template-columns: 80px minmax(0, 1fr) 24px; }
  .recruit-top { gap: 10px 20px; }
  .big-num { font-size: 34px; }
  .g-v { font-size: 40px; }
}
@media (max-width: 340px) {
  .tab-ic { width: 34px; }
  .exs { max-width: 140px; }
  .pday { grid-template-columns: 34px minmax(0, 1fr) 36px; gap: 8px; }
  .rpe-chips { gap: 3px; }
  .rchip .mono { font-size: 15px; }
}
```

## 7) Ekran testi
`jsdom` ve `@testing-library/react` ekle; mevcut `fake-indexeddb` ile `src/test/screens.test.tsx` yaz. Test `App`'i render etsin ve sırayla şunları yapsın; hiçbirinde hata fırlatılmamalı ve hata sınırı mesajı görünmemeli:
- Merkez, Günlük, Biyomekanik ve Yorgunluk sekmelerini aç.
- Biyomekanik'te bench, RDL ve yana açışı aç.
- Yorgunluk'ta beş aşamanın hepsini aç.
- Günlük'te bir antrenman başlat, bir set kaydet, antrenmanı bitir, özet ekranını aç.

Gerekiyorsa `requestAnimationFrame`, `ResizeObserver`, `matchMedia` ve canvas `getContext`'i test ortamında taklit et. Yalnızca bu dosya için jsdom ortamını kullan (`// @vitest-environment jsdom`); diğer testler `node`'da kalsın.

## 8) Sürüm
Kabuktaki `prototip v0.3` etiketini `v0.4` yap.

## 9) Teslim
0. maddedeki kurala göre bitir: test, build ve lint geçsin; tek commit (`fix: mobil uyum, çökme onarımı, otomatik push kuralı`); `git push origin HEAD:main`. PR açma. Bu dosyayı (`CODEX-GOREV.md`) repoya ekleme.

## Bitiş kontrolü
Görevi bitirmeden önce bu komutları çalıştır ve çıktılarını göster. Herhangi biri beklenenden farklıysa düzelt ve tekrar push et.
```sh
grep -n "import '../styles" src/app/App.tsx        # sıra: cns, app, log, mobile
grep -rn "from '.*ui'" src/features                  # Notes/Tile importları
grep -n "SystemBars" capacitor.config.ts
grep -n "setTextZoom" android/app/src/main/java/app/performance/training/MainActivity.java
grep -n "fontsource-variable/saira" src/main.tsx package.json
npm run lint && npm test && npm run build
git ls-files android/app/src/main/assets/public | wc -l   # 0 olmalı
git status --short                                         # boş olmalı
git fetch origin && git log -1 --oneline origin/main       # kendi commit'in görünmeli
```
