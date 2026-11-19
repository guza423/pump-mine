import { fillLegal } from './meta';
import { FALLBACK_LANG, LANG_META, SOURCE_LANG } from '../i18n/langs';

/* Yasal metinler (V20; dillere göre klasör V26).
   Dosyalar: src/legal/texts/<dil>/<taban>.md — ör. texts/tr/gizlilik.md, texts/en/gizlilik.md. Yeni dilin metinleri
   kendi klasörüne aynı adlarla konur, kod değişmez; bir dilde olmayan metin İngilizcesiyle gösterilir.
   Başlık, metnin ilk satırındaki "# …" başlığıdır.
   Metin içi bağlantı [metin](#doc:riza) taban adla yazılır ve okunan metnin dilindeki karşılığını açar;
   belli bir dili açmak için dilli kimlik yazılır (ör. Türkçe metinden #doc:privacy-en). */
export const LEGAL_BASES = ['kosullar', 'gizlilik', 'aydinlatma', 'riza', 'silme'] as const;
export type LegalBase = (typeof LEGAL_BASES)[number];

// Adres kimliği: Türkçede taban ad (Google Play bağlantıları legal.html#gizlilik, #silme; değişmez),
// diğer dillerde "<kısa ad>-<dil>" (ör. privacy-en, deletion-en, terms-de).
const SLUG: Record<LegalBase, string> = { kosullar: 'terms', gizlilik: 'privacy', aydinlatma: 'kvkk', riza: 'consent', silme: 'deletion' };
export const legalId = (base: LegalBase, lang: string) => (lang === SOURCE_LANG ? base : `${SLUG[base]}-${lang}`);

export type LegalDocId = string;
export interface LegalDocInfo { id: LegalDocId; lang: string; base: LegalBase; title: string; md: string }

const RAW = import.meta.glob('./texts/*/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
/** Metin klasörü olan diller (testler, klasörlerin dil listesiyle eşleştiğini denetler). */
export const LEGAL_TEXT_LANGS = [...new Set(Object.keys(RAW).map((p) => p.split('/')[2]))];

const ORDER = [SOURCE_LANG, ...LANG_META.map((l) => l.id).filter((id) => id !== SOURCE_LANG)] as string[];

// Uygulamadaki ve web sayfasındaki metinlerin tek kaynağı. Sıra: dil, sonra LEGAL_BASES sırası.
export const LEGAL_DOCS: LegalDocInfo[] = ORDER.flatMap((lang) => LEGAL_BASES.flatMap((base) => {
  const raw = RAW[`./texts/${lang}/${base}.md`];
  if (raw == null) return [];
  const title = (/^#\s+(.+)$/m.exec(raw)?.[1] || base).trim();
  return [{ id: legalId(base, lang), lang, base, title, md: fillLegal(raw, lang) }];
}));

const BY_ID = new Map(LEGAL_DOCS.map((d) => [d.id, d]));
export const legalDoc = (id: string): LegalDocInfo => BY_ID.get(id) || BY_ID.get('gizlilik')!;
export const isLegalDocId = (id: string): boolean => BY_ID.has(id);

/** Bir metnin istenen dildeki karşılığı; o dilde yoksa İngilizcesi, o da yoksa Türkçesi. */
export function docIn(id: string, lang: string): LegalDocInfo {
  const base = legalDoc(id).base;
  return BY_ID.get(legalId(base, lang)) || BY_ID.get(legalId(base, FALLBACK_LANG)) || BY_ID.get(base)!;
}
/** Bir dilde gösterilecek metin listesi (eksikler İngilizce). */
export const legalDocsIn = (lang: string): LegalDocInfo[] => LEGAL_BASES.map((b) => docIn(b, lang));
/** Bu metnin hangi dillerde yazılı olduğu (web sayfasındaki dil bağlantıları). */
export const langsOf = (id: string): string[] => { const base = legalDoc(id).base; return ORDER.filter((l) => BY_ID.has(legalId(base, l))); };

/** Metin içi bağlantının açacağı metin: taban adla yazılmışsa okunan metnin dilindeki karşılığı, dilli kimlikse kendisi. */
export function linkTarget(fromId: string, toId: string): string {
  const to = legalDoc(toId);
  return to.lang === SOURCE_LANG && to.id === toId ? docIn(to.base, legalDoc(fromId).lang).id : to.id;
}
