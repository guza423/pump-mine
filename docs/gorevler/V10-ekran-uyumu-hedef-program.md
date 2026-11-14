# V10 · Her telefona oturan ekran, boş başlayan hedef, şablonsuz programlar

Kullanıcı geri bildirimi (Android telefon, sistem yazı boyutu büyük):
1. Uygulama ekrana oturmuyor: üstte beyaz bir şerit var, içinde soluk "OUTMOVE" yazısı ve ezilmiş mavi bir logo görünüyor.
2. Hedef kartı "Eğimli bench press 95 → 100 kg" olarak kendiliğinden dolu geliyor. Hedef yoksa sadece "Hedef ekle" olsun.
3. Programlar'daki hazır şablonlar ("Şablonla başla") kalksın.

Bu görev, aşağıdaki maddelerde `reference/v09/` prototipinden **bilerek** ayrılır; çelişkide bu dosya geçerlidir. Geri kalan görünüm ve davranış aynen kalsın.

---

## 1) Android: üstteki beyaz şerit (kök neden ve düzeltme)

**Teşhis.** `MainActivity.java` içinde `EdgeToEdge.enable(this)`, `super.onCreate()`'ten **önce** çağrılıyor. Bu çağrı pencere dekorunu erken kuruyor. O anda etkin tema hâlâ açılış teması `AppTheme.NoActionBarLaunch`. Bu temada `android:background=@drawable/splash` var ve bu dosya Capacitor'ın beyaz zeminli, ortasında mavi X logolu varsayılan splash görseli. Sonuç olarak dekor ve çerçeve görünümleri bu beyaz görseli arka plan olarak alıyor. Görsel, durum çubuğu bölgesine sıkıştırılınca ortaya beyaz şerit çıkıyor: içinde ezilmiş mavi logo ve etkinlik başlığı "OUTMOVE" var. Capacitor `BridgeActivity` temayı `AppTheme.NoActionBar`'a ancak `super.onCreate()` içinde geçiriyor, yani iş işten geçmiş oluyor.

**Düzeltme.**

`android/app/src/main/java/app/performance/training/MainActivity.java`:
```java
package app.performance.training;

import android.graphics.Color;
import android.os.Bundle;
import android.webkit.WebSettings;
import androidx.activity.EdgeToEdge;
import androidx.activity.SystemBarStyle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    // Önce Capacitor temayı (AppTheme.NoActionBar) ve WebView'i kursun; pencereye ondan önce dokunma.
    super.onCreate(savedInstanceState);
    // Uygulama tek koyu tema: sistem çubukları şeffaf, simgeler açık renk; açık tema telefonda bile beyaz perde yok.
    EdgeToEdge.enable(this, SystemBarStyle.dark(Color.TRANSPARENT), SystemBarStyle.dark(Color.TRANSPARENT));
    // Sistem yazı boyutu en fazla %115 uygulansın; daha büyüğü tasarımı bozuyor.
    WebSettings settings = getBridge().getWebView().getSettings();
    int zoom = Math.round(getResources().getConfiguration().fontScale * 100f);
    settings.setTextZoom(Math.max(100, Math.min(115, zoom)));
  }
}
```

`android/app/src/main/res/values/styles.xml`: her tema koyu olsun, hiçbir yerde başlık ya da eylem çubuğu kalmasın, splash görseli arka plan olarak hiçbir yerde kullanılmasın:
```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="Theme.AppCompat.NoActionBar">
        <item name="colorPrimary">@color/app_bg</item>
        <item name="colorPrimaryDark">@color/app_bg</item>
        <item name="colorAccent">@color/app_accent</item>
        <item name="android:windowBackground">@color/app_bg</item>
        <item name="android:statusBarColor">@android:color/transparent</item>
        <item name="android:navigationBarColor">@android:color/transparent</item>
        <item name="android:windowLightStatusBar">false</item>
    </style>

    <style name="AppTheme.NoActionBar" parent="Theme.AppCompat.NoActionBar">
        <item name="windowActionBar">false</item>
        <item name="windowNoTitle">true</item>
        <item name="android:background">@null</item>
        <item name="android:windowBackground">@color/app_bg</item>
        <item name="android:statusBarColor">@android:color/transparent</item>
        <item name="android:navigationBarColor">@android:color/transparent</item>
        <item name="android:windowLightStatusBar">false</item>
    </style>

    <style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
        <item name="windowSplashScreenBackground">@color/app_bg</item>
        <item name="windowSplashScreenAnimatedIcon">@mipmap/ic_launcher_foreground</item>
        <item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>
        <item name="android:windowBackground">@color/app_bg</item>
        <item name="android:windowNoTitle">true</item>
        <item name="android:windowActionBar">false</item>
    </style>
</resources>
```
- `colors.xml`'e `<color name="app_accent">#39d5ff</color>` ekle (`app_bg` = `#04060c` kalsın).
- `Theme.AppCompat.DayNight.*` kullanma; telefon açık temadayken de uygulama koyu kalmalı.
- `android:background` → `@drawable/splash` satırı tamamen kalktı. Beyaz Capacitor splash görsellerini sil: `drawable/splash.png`, `drawable-port-*/splash.png`, `drawable-land-*/splash.png`. Silmeden önce `grep -r "splash" android/app/src/main` ile başka referans olmadığını doğrula; `core-splashscreen` bağımlılığı kalsın.
- `AndroidManifest.xml`, `MainActivity` etkinliğine `android:screenOrientation="portrait"` ekle (PWA manifesti zaten `portrait`). Yatay ekranda arayüz kullanılamıyor.

`capacitor.config.ts`:
```ts
const config: CapacitorConfig = {
  appId: 'app.performance.training',
  appName: 'OUTMOVE',
  webDir: 'dist',
  backgroundColor: '#04060c',
  plugins: {
    SystemBars: { insetsHandling: 'native', style: 'DARK', initialViewportFitValueHint: 'cover' },
    FirebaseAuthentication: { skipNativeAuth: true, providers: ['google.com'] },
  },
};
```
- `backgroundColor`: WebView'in kendi zemini. Varsayılan beyaz; yükleme ve kenar boşluklarında beyaz parlama olmasın.
- `initialViewportFitValueHint: 'cover'`: açılışta yerleşim zıplamasın (`index.html` zaten `viewport-fit=cover`).

**Sistem çubukları davranışı (doğrulanacak):**
- WebView ≥ 140 olan telefonlarda içerik kenardan kenara çizilir; `env(safe-area-inset-*)` doğru değeri verir; `.shead` ve `.tabbar` mevcut `--sat`/`--sab` paylarıyla durum ve gezinme çubuğunun altına girmez.
- Eski WebView'de Capacitor dekoru doldurur; dolgu alanı `windowBackground` yani koyu olur.

Her iki durumda da durum çubuğu ve gezinme çubuğu bölgesi koyu (`#04060c` ya da başlık degradesi), simgeler açık renk olmalı.

---

## 2) Web arayüzü: her telefona oturma

Ölçüm (bu repo, `main` @ 4d96a6c, Chromium, CSS px):
- **Seans ekranı:** 360×640'ta ve sistem yazı boyutu %115'teyken 360×720'de "Set 1/5 kaydet" düğmesi sekme çubuğunun altında kalıyor; 320×568'de RPE satırı da görünmüyor. Kullanıcının asıl düğmesi kaydırmadan görünmüyor. Bu en önemli hata.
- **Geniş ekran:** 620×660 üstünde uygulama her zaman telefon çerçevesi içinde çiziliyor (`.device`, 400 px, yuvarlak köşe). Katlanabilir/tablette APK'da da bu çerçeve çıkıyor ve maket gibi duruyor.
- **Dar ekran:** ≤ 360 px'te set tablosundaki "SIRADA" etiketi kırpılıyor. Antrenman'daki "Boş antrenman / Yeni antrenman türü" düğmeleri 3 satıra bölünüyor.

### 2a) Seans ekranı: kaydet düğmesi her zaman görünür
Hedef: 320×568 dahil her boyutta ve %115 yazı ölçeğinde, aktif seansta `#log-set` (ve pliometrikte aynı düğme) kaydırmadan, sekme çubuğunun üstünde **tamamen** görünsün.
- `.ses2-body` kaydıran kap olmaktan çıksın: `overflow: hidden` ve dikey flex. Sığmama durumunda sırayla şunlar küçülsün:
  1. Önce `.ses2-mid` (zaten `flex: 1; min-height: 0`; sıfıra inebilir, kap sorgusu kendini gizler).
  2. Sonra set tablosu: `.stable` → `flex: 0 1 auto; min-height: 0; display: flex; flex-direction: column`; `.sbody` → `flex: 1 1 auto; min-height: 52px` (başlık satırı + en az ~1,5 satır görünür), `max-height: 137px` kalsın, içi kaydırılsın.
  3. `.dock`, `.exnav`, `.tgt2`, `.exprog` → `flex: none`.
- Bunlara rağmen sığmıyorsa (çok küçük ekran + büyük yazı): `.ses2-body` `overflow-y: auto` olabilir. Ancak `.dock-go` (kaydet düğmesi satırı) `position: sticky; bottom: 0` ile görünür kalsın; arkasına `var(--deep)` zemin ve üstte ince gölge koy.
- Kısa ekranda sekme çubuğu yer kaplamasın: `@media (max-height: 700px)` içinde `.tab-l` gizlensin. Simgeler kalsın; sekme düğmelerinde `aria-label` yok, `aria-label={t.label}` ekle, `.tab` dikey dolgusu 4 px'e insin.
- Kural: hiçbir yükseklik eşiği yazı ölçeğine güvenmesin. Sistem yazısı büyüdüğünde viewport küçülmez, içerik büyür. Bu yüzden asıl çözüm yukarıdaki esneme sırası; medya sorguları sadece ince ayar.

### 2b) Tablet / katlanabilir: çerçeve yok, ortalanmış sütun
- Telefon çerçevesi yalnızca masaüstü tarayıcıda kalsın: mevcut `@media (min-width: 620px) and (min-height: 660px)` kuralına `and (hover: hover) and (pointer: fine)` ekle.
- Dokunmatik geniş ekranda (`(min-width: 620px) and (hover: none)`): `.device { width: min(100%, 560px); height: 100%; margin-inline: auto; border-radius: 0; border: 0; box-shadow: none; }`. Kenarlarda `.device-wrap` zemini görünsün, sekme çubuğu sütunla aynı genişlikte olsun.

### 2c) Dar ekran ince ayarları (≤ 360 px)
- Set tablosu "SIRADA/saat" sütunu kırpılmasın: ≤ 360 px'te `.s-t.now-t` 9 px ve `letter-spacing: 0` ya da sütunu 44 px yap. Hangisi taşmıyorsa onu seç.
- Antrenman ekranındaki iki düğme (Boş antrenman / Yeni antrenman türü) ≤ 360 px'te alt alta (tek sütun) dizilsin, her biri tek satır.
- Program düzenleyicide gün sekmeleri yatay kayan satır olarak kalabilir. Ancak kaydırılabildiği belli olsun: sağ kenarda 16 px'lik koyu solma (mask ya da gradient) ekle.

### 2d) Otomatik yerleşim testi (yeni, kalıcı bekçi)
Bundan sonra hiçbir değişiklik bir telefonu bozmasın diye:
- `playwright`'ı devDependency olarak ekle. `scripts/layout-check.mjs` yaz ve `npm run test:layout` olarak bağla. Script `vite preview` ile web derlemesini açar, Chromium'da misafir modunda gerçek arayüzü sürer. Adres `vite.config.ts`'teki `base` mantığına uysun: CI'da `/pump-mine/`, yerelde `/`.
- Boyut matrisi (CSS px, `isMobile: true`, `hasTouch: true`): 320×568, 360×640, 360×800, 384×832, 393×873, 412×915, 430×932. Yazı ölçeği 1,15 ile ayrıca 360×720 ve 411×770.
  - Yazı ölçeğini taklit etmek için sayfa yüklendikten sonra tüm stil sayfalarındaki `px` cinsinden `font-size` değerlerini 1,15 ile çarp. Bunu, `document.styleSheets` kurallarını iç içe `@media`/`@container` dahil gezerek yap.
- Sürülecek akış:
  1. Bugün (boş)
  2. Hedef ekle → bench seç → hedef yaz → kaydet → Bugün
  3. Programlar → `+` → düzenleyici
  4. Antrenman → Boş antrenman → "bench" ekle → seans ekranı → 1 set kaydet
  5. Aynı seansa "box jump" ekle (pliometrik dock)
  6. Lab → Hareketler
  7. Hesap sayfası
- Her ekranda kontrol et:
  - `document.scrollingElement.scrollWidth <= innerWidth`.
  - Görünür hiçbir öğe viewport'un sağından/solundan taşmıyor. Atası `overflow-x: auto|scroll|hidden` olanlar hariç.
  - `.tabbar` tamamen ekranda.
  - Seans ekranında `#log-set`'in alt kenarı `.tabbar`'ın üst kenarından küçük ve üst kenarı ≥ 0. Kaydırma yapmadan.
- Ek olarak 884×1104 (`hover: none`) boyutunda `.device`'ın `border-radius`'u 0 olmalı.
- Hata olursa boyut + ekran + öğe seçicisini yazıp çıkış kodu 1 ver. Başarısız ekranların PNG'sini `layout-shots/` altına kaydet; bu klasör `.gitignore`'a eklensin.
- `.github/workflows/` içindeki "Test, build and deploy Pages" iş akışına build'den sonra `npx playwright install --with-deps chromium` ve `npm run test:layout` adımlarını ekle. Yerelde de bu görevin sonunda çalıştır (ilk sefer `npx playwright install chromium`).
- Firebase'e ağ isteği gitmesin. Misafir modu zaten Firebase oturumu açmaz. Yine de `firebase` istekleri için `page.route('**/*googleapis.com/**', r => r.abort())` ekle.

---

## 3) Hedef: boş başlasın, "Hedef ekle"

Şu an `src/app/App.tsx`'te `DEFAULT_GOAL = { exId: 'egimli-bench', base: 95, target: 100 }` var ve kayıtlı hedef yoksa bu gösteriliyor.
- `DEFAULT_GOAL` tamamen kalksın. Hedef = `st.settings.find(x => x.key === 'goal')?.value ?? null`.
- **Bugün, hedef yoksa:** `#goal-card` yerine aynı yerde `<button id="goal-add" className="tcard goal-add">` gösterilsin:
  - Sol: üstte `HEDEF` (mevcut `eyebrow fire`), altında "Hedef ekle" (`goal2-n` stili), altında tek satır `Bir hareket seç, ulaşmak istediğin 1RM'i yaz.` (11,5 px, `--muted`).
  - Sağ: 36 px yuvarlak, `--line-strong` çerçeveli `+` simgesi (`Icon name="plus"`).
  - Kart kesik çizgili çerçeve (`border-style: dashed`), zemin `--panel`.
  - Dokununca `openSheet('goal', {})`.
- **Bugün, hedef varsa:** bugünkü `#goal-card` aynen. "Hedef seç" yedek metni kalksın.
- **`GoalBody` (Hedef sayfası):**
  - Hedef yoksa form boş açılır: seçili hareket yok, başlık `Hareket` (iki noktasız), "Başlangıç 1RM" ve "Hedef 1RM" 0.
  - Arama boşken çip listesi şöyle sıralansın: önce kullanıcının kayıtlarında e1RM'i olan hareketler (en son yapılan önce), sonra bugünkü filtre (`kind !== 'plyo' && fat >= 2`). Toplam en fazla 8 çip.
  - Hareket seçilince kullanıcının o harekette kaydı varsa "Başlangıç 1RM" son e1RM'e (`e1Series(...)` son değeri, 2,5'e yuvarlı) dolsun. Yoksa 0 kalsın. "Hedef 1RM" kendiliğinden dolmasın.
  - `Kaydet` (`#goal-save`) ancak hareket seçiliyken, `base > 0` ve `target > base` olduğunda etkin. Pasifken altında küçük ipucu: hareket yoksa `Önce bir hareket seç`, hedef ≤ başlangıçsa `Hedef, başlangıçtan büyük olmalı`.
  - Hedef varsa formun altında `Hedefi kaldır` (`#goal-remove`, `btn danger-t full`) olsun. Dokununca `del('settings', 'goal')`, sayfa kapanır, Bugün'de `#goal-add` görünür. `GoalBody`'ye `del` prop'u geçir (`case 'goal'`).
- **Geçmiş (`HistoryView`):** hedef yoksa başlangıçta seçili hareket, kayıtlı ilk hareket olsun (`exs[0]`); grafikte hedef çizgisi çıkmasın.
- Mevcut kayıtlı hedefe dokunma: kullanıcı daha önce kaydettiyse aynen görünsün.

---

## 4) Programlar: hazır şablonlar kalksın

- `src/features/antrenman/core.tsx`: `TEMPLATES`, `tItem` ve `programFromTemplate` uygulamadan kalksın, export listesinden de çıksın. `blankProgram` kalsın.
- `ProgramsList`:
  - "Şablonla başla" bölümü (`.tmpl-row`, `#tmpl-*`) kalksın. `.tmpl-row` ve `.tmpl` CSS'i başka yerde kullanılmıyorsa silinsin.
  - **Karıştırma:** `#tmpl-save` ve `saveTemplate` sayfası "Antrenman türü olarak kaydet" özelliğidir; **kalacak**.
  - Boş hali şöyle olsun: `<strong>Henüz programın yok</strong><p>İlk programını oluştur; günlerini ve hareketlerini sen belirle.</p>` ve altında `<button id="prog-empty-new" className="btn primary full">Program oluştur</button>`. Bu düğme `createProgram()` çağırır.
- `App`'te `createProgram = (t, back)` → şablon dalı kalksın; her zaman `blankProgram()`.
- Bugün'deki "Programın yok" kartının `Program oluştur` düğmesi şu an sadece Programlar sekmesine götürüyor (`goTab('programlar')`), orada bir kez daha dokunmak gerekiyor. Doğrudan `createProgram(null, 'bugun')` çağırıp düzenleyiciyi açsın.
- **İlk açılış tohumu kalksın:** yeni misafir **boş** başlar.
  - `useLogStore(() => programFromTemplate(TEMPLATES[0]))` → `useLogStore()`.
  - `LogController` kurucusundaki `initial` parametresi ve `seedInitialProgram` çağrısı (`onUser(null)` içinde) kalksın.
  - `database.ts`'teki `seedInitialProgram` fonksiyonu silinsin. Dexie şemasına ve mevcut `initial-program-seeded` / `empty-guest` kayıtlarına dokunma; sadece artık okunmuyorlar.
- Kullanıcının mevcut programlarına dokunma. Daha önce tohumlanmış "Hipertrofi bloğu" birinin verisinde varsa durur, isterse "Programı sil" ile siler.
- Metin düzeltmeleri ("şablon" kelimesi artık yanıltıcı):
  - Antrenman boş hali: `Yeni bir tür oluştur ya da boş antrenmanla başlayıp sonunda antrenman türü olarak kaydet.`
  - Boş antrenman ipucu: `Bitirince antrenman türü olarak saklayabilirsin.`
  - Yorum başlığı `/* ---------- şablon ---------- */` → kaldır.

---

## 5) Testler

- **Fikstür:**
  - `src/test/fixtures.ts` oluştur. Eski `TEMPLATES[0]` (Hipertrofi bloğu) verisini **birebir** buraya taşı: `hipertrofiProgram()`, aynı `tItem` mantığıyla, `libById` kullanarak.
  - Uygulama kodu bu dosyayı import etmesin; yalnızca testler kullansın.
- **`fatigue.test.ts`:** `programFromTemplate(TEMPLATES[0])` → `hipertrofiProgram()`. Kontrol değerleri aynı kalmalı: plan simülasyonu seans başı ≈21, tepe ≈76; "Ağır gün" testi aynı sonucu vermeli.
- **`database.test.ts` / `controller.test.ts`:** `seedInitialProgram` testleri silinsin. Yerine: "yeni misafir boş başlar" (`start` sonrası `programs` boş) ve "çıkıştan sonra boş misafir açılır, program tohumlanmaz".
- **`screens.test.tsx`:**
  - "Ağır gün"e dayanan testler, render'dan önce `db.programs.put(hipertrofiProgram())` ile kendi programını yazsın.
  - Yeni testler:
    1. Hedef yok → `#goal-add` var, `#goal-card` yok → dokun → `#goal-save` pasif → "bench" ara, "Eğimli bench press" seç → başlangıç 0 iken pasif → başlangıç 95, hedef 100 → etkin → kaydet → `#goal-card` "Eğimli bench press" ve "100" gösteriyor → tekrar aç → `#goal-remove` → `#goal-add` geri geldi.
    2. Programlar boşken "Şablonla başla" metni ve `.tmpl` yok; `#prog-empty-new` program düzenleyiciyi açıyor.
    3. Yeni misafir ilk açılışta Programlar boş.
- `npm test`, `npm run build` ve `npm run test:layout` geçsin.

---

## 6) Belgeler

`AGENTS.md`'de şunları güncelle:
- "Store arayüzü …" paragrafındaki `İlk açılışta TEMPLATES[0] (Hipertrofi bloğu) örnek program olarak yüklensin.` cümlesini sil. Yerine: `İlk açılışta veri yoktur; uygulama boş başlar (örnek program, şablon ve varsayılan hedef yok).`
- Kontrol değerleri listesinde `simulatePlan(programFromTemplate(TEMPLATES[0]))` → `simulatePlan(hipertrofiProgram())` (test fikstürü, `src/test/fixtures.ts`).
- "Kurallar"a ekle:
  - `Her telefona oturma: 320–430 px genişlik, 568 px'ten itibaren yükseklik ve %115'e kadar sistem yazısı desteklenir. Ana eylem düğmeleri kaydırmadan görünür. Her görevde npm run test:layout geçmeli.`
  - `Android: pencereye/temaya super.onCreate() öncesinde dokunma; tüm temalar koyu ve başlıksız; sistem çubukları şeffaf, simgeler açık.`
- "Referans prototip" bölümüne: `V10 ve sonraki görev dosyaları referanstan farklı bir şey söylüyorsa görev dosyası geçerlidir.`

README'de "Telefona kurulum" altına: `Telefon yatay çevrilse de uygulama dikey kalır.`

---

## 7) Telefonda kabul (kullanıcı kontrol edecek)

1. Açılış ekranı koyu zemin üzerinde uygulama simgesi. Beyaz ekran ya da Capacitor logosu yok.
2. Bugün'de durum çubuğu bölgesi koyu, saat ve simgeler açık renk. Beyaz şerit ve "OUTMOVE" başlığı yok.
3. Alt gezinme çubuğu (hem hareket hem 3 düğmeli gezinmede) koyu. Telefon açık temadayken de öyle.
4. Hedef kaydı yoksa Bugün'de "Hedef ekle" kartı var; ekleyip kaldırabiliyorum.
5. Programlar'da şablon yok; boşken "Program oluştur" var.
6. Sistem yazı boyutu büyükken seansta "Set kaydet" düğmesi kaydırmadan görünüyor.
