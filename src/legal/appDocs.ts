import { getLang } from '../i18n';
import { SOURCE_LANG } from '../i18n/langs';
import { docIn, legalDoc, type LegalDocId } from './docs';

// Herkese açık sayfa (page.tsx) bu dosyayı içe aktarmaz; böylece uygulamanın dil katmanı ve sözlükleri o sayfaya yüklenmez.
/* ---------- uygulama içi gösterim (V25, çok dil V26) ----------
   Uygulama metinlere Türkçe taban adla (kosullar, gizlilik…) başvurur; gösterirken etkin dildeki karşılığı açılır
   (o dilde metin yoksa İngilizcesi). Dilli kimlikle açılan metin (ör. privacy-en) olduğu gibi kalır. */
export const APP_DOC_IDS: LegalDocId[] = ['kosullar', 'gizlilik', 'aydinlatma', 'riza', 'silme'];
export const appDocId = (id: string): LegalDocId => {
  const d = legalDoc(id);
  return d.lang === SOURCE_LANG && d.id === id ? docIn(d.base, getLang()).id : d.id;
};
export const appDocTitle = (id: string): string => legalDoc(appDocId(id)).title;
export const appDocs = (): LegalDocId[] => APP_DOC_IDS;
