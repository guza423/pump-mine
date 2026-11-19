import { getLang } from '../i18n';
import { legalDoc, type LegalDocId } from './docs';

// Herkese açık sayfa (page.tsx) bu dosyayı içe aktarmaz; böylece uygulamanın dil katmanı ve sözlükleri o sayfaya yüklenmez.
/* ---------- uygulama içi gösterim (V25) ----------
   Uygulama metinlere Türkçe kimlikle (kosullar, gizlilik…) başvurur; gösterirken etkin dildeki karşılığı açılır.
   Metinler arası bağlantılar zaten kendi dilindeki kimliği taşır (İngilizce metinler -en kimliklerine bağlanır). */
export const APP_DOC_IDS: LegalDocId[] = ['kosullar', 'gizlilik', 'aydinlatma', 'riza', 'silme'];
export const appDocId = (id: string): LegalDocId => {
  const d = legalDoc(id);
  return d.lang === 'tr' && getLang() === 'en' ? d.pair : d.id;
};
export const appDocTitle = (id: string): string => legalDoc(appDocId(id)).title;
export const appDocs = (): LegalDocId[] => APP_DOC_IDS;
