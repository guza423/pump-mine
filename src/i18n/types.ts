// Sözlük tipleri (V26). Değer düz metin ya da çoğul biçimleridir.
// [tekil, çoğul]: İngilizce gibi iki biçimli diller. Nesne biçimi ({ one, few, many, other }) daha çok biçimli diller için;
// hangisinin seçileceğine Intl.PluralRules karar verir (ör. Fransızcada 0 tekildir).
export type PluralForms = Readonly<Partial<Record<Intl.LDMLPluralRule, string>> & { other: string }>;
export type Entry = string | readonly [string, string] | PluralForms;
export type Dict = Record<string, Entry>;
/** Bir dil paketi: arayüz sözlüğü ve isteğe bağlı kütüphane hareket adları (kimlik → ad; yoksa İngilizce ad). */
export interface LangPack { dict: Dict; exercises?: Readonly<Record<string, string>> }
