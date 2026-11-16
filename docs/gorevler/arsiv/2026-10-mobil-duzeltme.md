# Mobil düzeltme ve çökme onarımı

Telefon ekran kaydında görülen sorunlar ve sebepleri:

| Sorun | Sebep |
|---|---|
| Biyomekanik sekmesine basınca uygulama çöküyor | `Biyomekanik.tsx` içinde `Notes` bileşeni kullanılıyor ama import edilmemiş: `ReferenceError: Notes is not defined`. Hata sınırı olmadığı için tüm uygulama kapanıyor. |
| Antrenman özeti açılınca da aynı çökme olacak | `Gunluk.tsx` içinde `Notes` ve `Tile` kullanılıyor ama import edilmemiş. |
| Yorgunluk sekmesinde kutular üst üste biniyor, içerik dar bir sütuna sıkışıyor | `App.tsx` CSS'i yanlış sırada import ediyor. `app.css`, `cns.css`'ten önce yükleniyor ve `cns.css`'teki masaüstü kuralları (`.stage-grid` 2 sütun, `.lab`, `h2`, `.big-num` vb.) `app.css`'teki mobil kuralları eziyor. Prototipte sıra `cns.css → app.css → log.css` idi. |
| Üstteki yazılar kamera çentiğinin ve saat çubuğunun altına giriyor | Güvenli alan boşlukları uygulanmamış; Android 15+ uygulamayı kenardan kenara çiziyor. |
| Yazılar taşıyor, iç içe giriyor | Android'in sistem yazı boyutu WebView'e de uygulanıyor. Ayrıca tek sütunlu grid'ler içerik genişliğine göre büyüyor. |
| Başlıklar tasarımdan geniş | `@fontsource/saira` sabit genişlikli; tasarımdaki `font-stretch` yalnızca genişlik ekseni olan değişken fontla çalışıyor. |

Tasarımı, metinleri ve davranışı değiştirme. Yalnızca aşağıdakileri yap.

## 1) Çökmeleri onar
- `Notes` ve `Tile` bileşenlerini ortak bir dosyaya taşı (ör. `src/app/ui.tsx`) ve kullanıldıkları her dosyada import et: `Biyomekanik.tsx`, `Gunluk.tsx`, `Yorgunluk.tsx`.
- Tüm `.tsx` dosyalarında tanımsız bileşen veya değişken kalmadığını kontrol et. `// @ts-nocheck` satırlarını kaldırmak mümkünse kaldır; değilse en azından ESLint `react/jsx-no-undef` ve `no-undef` kurallarını ekleyip `npm run lint` komutunu çalıştır.
- `App` bileşenini bir React hata sınırı (Error Boundary) ile sar. Bir ekran hata verirse uygulama kapanmasın; "Bir şeyler ters gitti" mesajı ve "Yeniden yükle" düğmesi göstersin.

## 2) CSS sırası
`App.tsx`'te import sırası tam olarak şu olsun:
```ts
import '../styles/cns.css';
import '../styles/app.css';
import '../styles/log.css';
import '../styles/mobile.css';
```

## 3) Çentik ve sistem çubukları
- `capacitor.config.ts` içine ekle:
```ts
plugins: {
  SystemBars: { insetsHandling: 'native', style: 'DARK' },
},
```
- `MainActivity.java` şu hale gelsin (EdgeToEdge bulunamazsa `androidx.activity` bağımlılığını ekle):
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
- `android/app/src/main/res/values/styles.xml`: uygulama ve açılış temalarında `android:windowBackground` `#04060c` olsun (`colors.xml`'e `app_bg` olarak ekle). Sistem çubuklarının arkası beyaz görünmesin.
- `index.html`'deki `viewport-fit=cover` kalsın.

## 4) Başlık fontu
- `@fontsource/saira`'yı kaldır, `@fontsource-variable/saira` ekle.
- `main.tsx`'te Saira importlarının yerine `import '@fontsource-variable/saira/wdth.css';` yaz.
- `app.css`'te `--f-display` değeri `"Saira Variable", "Saira", "Arial Narrow", sans-serif` olsun.

## 5) mobile.css
`src/styles/mobile.css` dosyasını aşağıdaki içerikle birebir oluştur:

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

## 6) Ekran testi (aynı hatalar tekrar gelmesin)
`fake-indexeddb` ve jsdom ile bir Vitest testi ekle. Test `App`'i render etsin ve şunları sırayla yapsın; hiçbirinde hata fırlatılmamalı:
- Beş sekmenin hazır olanlarına geç: Merkez, Günlük, Biyomekanik, Yorgunluk.
- Biyomekanik'te üç hareketi aç: bench, RDL, yana açış.
- Yorgunluk'ta beş aşamanın hepsini aç.
- Günlük'te bir antrenman başlat, bir set kaydet, antrenmanı bitir ve özet ekranını aç.
`requestAnimationFrame`, `ResizeObserver`, `matchMedia` ve canvas `getContext` gerekiyorsa test ortamında taklit et.

## 7) Teslim
- `npm test` ve `npm run build` geçsin.
- Tüm değişiklikleri tek commit yap ve doğrudan `main`'e push et. PR açma.
- Bu dosyayı (`mobil-duzeltme.md`) repoya ekleme; sadece talimat olarak kullan.
