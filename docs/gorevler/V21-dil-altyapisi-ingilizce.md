# V21 · Dil altyapısı, İngilizce varsayılan, Hesap ve ayarlar'da dil seçimi + Dashboard

Uygulayan: Claude. Kullanıcı isteği (2026-11-19):
> "Outmove için dil seçenekleri olsun ya. İngilizce ile başlayalım ve asıl default dil olsun. Bunu yapabiliri miyiz. Yine sekme sekme mi gidelim herşeyi proper ingilizce yapmak için. Ayarlardan dil seçeneği olsun tabiki."

Karar: evet, pixel geçişi gibi **sekme sekme**. Bu adım altyapı + ortak katman + Dashboard + Hesap + yasal kapının arayüzü. Kalanlar V22–V25.

## Nasıl çalışır (`src/i18n/`)
- **Kaynak dil Türkçe, anahtar da Türkçe metin** (gettext gibi): `t('Kaydet')` → `Save`. Türkçede metin aynen döner; böylece eski metinler ve testler bozulmaz.
- Sözlük `src/i18n/en/<alan>.ts` (şimdilik `common`, `dashboard`, `account`, `legal`); `en/index.ts` birleştirir. Değer `[tekil, çoğul]` olabilir; `{n}`'e göre seçilir: `t('{n} antrenman', { n })` → `1 workout` / `3 workouts`.
- Değişken: `t('Sıradaki: {x}', { x })`. Türkçe ek alan cümleler değişkenle yazılır, İngilizcede sıra değişebilir (`"{d} {m}'ya kadar"` → `by {m} {d}`).
- Bağlam: `tc('load', 'Antrenman')` → önce `load|Antrenman` (Training), yoksa düz anahtar (Workout).
- Yapısal sabitler (gün/ay adları, direnç profili, hız seviyeleri, ekipman, beceri aşamaları): `byLang({ tr: [...], en: [...] })`. Okunduğu an etkin dili döndürür; anahtarlar iki dilde aynı.
- Biçim: `num()` (TR 82,5 · EN 82.5), `numIn()` (giriş kutusu, binlik ayırıcısız), `pct()` (TR %40 · EN 40%), `clock()`, `upper()/lower()`.
- **Veri değişmez.** Kas adları, kütüphane hareket adları, `Plansız antrenman`, `1. gün` belgelerde Türkçe kalır; yalnızca ekranda çevrilir: `muscleName(m)`, `exName(item)` (kütüphane hareketi İngilizcede kütüphanenin `en` adıyla; özel hareket yazıldığı gibi), `dayLabel(name)` (`2. gün` → `Day 2`; kullanıcının verdiği ad aynen).
- Dil: varsayılan **İngilizce** (telefon dili ne olursa olsun). Seçim cihazda `localStorage['outmove.lang']`. Dil değişince `App` içindeki `.device-wrap` `key={lang}` ile yeniden kurulur; sekme, açık pencereler ve veri `App` state'inde kalır (Hesap penceresi açık kalır). `<html lang>` güncellenir.
- Hata mesajları Türkçe atılır, gösterimde `t()` ile çevrilir (`accountError`, `st.error`, yedek hataları).

## Arayüz
- **Hesap ve ayarlar** (eski "Hesap ve yedek"; dil seçimi ayar olduğu için ad değişti): en üstte `Language · Dil` seçici (`#lang-en`, `#lang-tr`). Etiket iki dilde birden yazılı ki yanlış dilde kalan da bulsun.
- İngilizce adlar: sekmeler **Dashboard · Workout · Insights · Lab**; "Plansız antrenman" **Quick workout**; yorgunluk bölgeleri Manageable / Building / High; hesap silme onayı İngilizcede **DELETE**.
- Çevrilen: alt sekme çubuğu, pencere başlıkları, Dashboard (yorgunluk halkası, uyku, plan kartı, bu hafta, hedef kartları), Hedef penceresi, Yorgunluk ölçer penceresi (ders kısayolları hariç, V24), yorgunluk önerileri ve Gözlem uyarıları (`fatigue.ts`), Hesap/açık rıza/gizlilik özeti/yedek, yasal kapının arayüzü, Açık/Kapalı anahtarı, ortak birimler ve tarih biçimleri.
- Yasal kapı İngilizceyken "Privacy Policy" hazır İngilizce metni (`privacy-en`) açar; listede ikinci kez görünmez. Diğer yasal metinlerin İngilizcesi V25'te; o zamana kadar başlık İngilizce, içerik Türkçe.

## Testler
- `src/test/setup.ts` her test dosyasını **Türkçe** başlatır (eski testler Türkçe metinle yazıldı).
- `src/i18n/i18n.test.ts`: işlevler, varsayılan dil, kaynakta `t()`/`tc()` ile çevrilen **her literal anahtarın İngilizcesi var**, İngilizce değerlerde Türkçe harf yok, değişkenler aynı, alan dosyaları çakışmıyor, **`t` çağrısı yerel bir `t` değişkeniyle gölgelenmiyor** (TypeScript AST).
- `src/test/i18n-screens.test.tsx`: İngilizce Dashboard (boş ve dolu), Yorgunluk ölçer, Hesap ve ayarlar, dil değişince pencerenin açık kalması ve tercihin saklanması, DELETE onayı, yasal kapı. Ekranda Türkçe harf aranır (kullanıcının yazdığı adlar hariç).
- `scripts/layout-check.mjs`: ana akış Türkçe çalışır; her ekran boyutunda ayrıca İngilizce akış (`flowEn`). `CHROME_PATH` verilirse sistem Chrome'u kullanılır.
- `scripts/i18n-keys.mjs`: kaynaktaki anahtarları listeler.

## Kural (bundan sonra her AI için; `AGENTS.md`'de)
Arayüze giren her yeni metin `t()` / `tc()` / `byLang()` ile yazılır ve İngilizcesi aynı committe `src/i18n/en/*.ts`'ye eklenir. `t` adını yerel değişkene verme. Veri (kas adı, hareket adı) Türkçe saklanır, gösterimde çevrilir.

## Sıradaki adımlar
- V22 Antrenman sekmesi, V23 Gözlem, V24 Lab, V25 yasal metinlerin İngilizcesi ve son tarama (görev dosyaları `docs/gorevler/`).
