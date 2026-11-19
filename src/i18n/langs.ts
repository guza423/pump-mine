/* ================= OUTMOVE · diller (V26) =================
   Uygulamanın sunduğu diller. Yalnızca Latin alfabeli, soldan sağa diller (kullanıcı kararı, V26).
   Bu dosya bilinçli olarak sözlük içermez: herkese açık yasal sayfa (legal.html) da okur, hafif kalmalı.

   Yeni dil eklemek (ör. Almanca): bkz. AGENTS.md › Dil › "Yeni dil ekleme".
   1. Buraya bir satır: { id: 'de', label: 'Deutsch', locale: 'de-DE' }
   2. src/i18n/de/index.ts (sözlük + isteğe bağlı hareket adları), src/i18n/dicts.ts'ye bir satır
   3. src/legal/texts/de/ altına beş yasal metin (yoksa İngilizcesi gösterilir) ve meta.ts'de yer tutucu karşılıkları */
export const LANG_META = [
  { id: 'en', label: 'English', locale: 'en-US' },
  { id: 'tr', label: 'Türkçe', locale: 'tr-TR' },
] as const;

export type Lang = (typeof LANG_META)[number]['id'];
export interface LangMeta { id: string; label: string; locale: string }

/** Kaynak dil: koddaki metinler bu dilde yazılır ve sözlük anahtarıdır. */
export const SOURCE_LANG = 'tr' as const;
/** Varsayılan ve yedek dil: bir dilin sözlüğünde eksik olan metin bu dilde gösterilir. */
export const FALLBACK_LANG = 'en' as const;
