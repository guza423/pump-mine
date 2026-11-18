import kosullar from './texts/kosullar.md?raw';
import gizlilik from './texts/gizlilik.md?raw';
import aydinlatma from './texts/aydinlatma.md?raw';
import riza from './texts/riza.md?raw';
import silme from './texts/silme.md?raw';
import privacyEn from './texts/privacy-en.md?raw';
import { fillLegal } from './meta';
import { getLang, t } from '../i18n';

export type LegalDocId = 'kosullar' | 'gizlilik' | 'aydinlatma' | 'riza' | 'silme' | 'privacy-en';
export interface LegalDocInfo { id: LegalDocId; title: string; md: string }

// Uygulamadaki ve web sayfasındaki metinlerin tek kaynağı. Sıra, listelerde görünen sıradır.
export const LEGAL_DOCS: LegalDocInfo[] = [
  { id: 'kosullar', title: 'Kullanım Koşulları', md: kosullar },
  { id: 'gizlilik', title: 'Gizlilik Politikası', md: gizlilik },
  { id: 'aydinlatma', title: 'KVKK Aydınlatma Metni', md: aydinlatma },
  { id: 'riza', title: 'Açık Rıza Metni', md: riza },
  { id: 'silme', title: 'Hesap ve veri silme', md: silme },
  { id: 'privacy-en', title: 'Privacy Policy (English)', md: privacyEn },
].map((d) => ({ ...d, md: fillLegal(d.md) })) as LegalDocInfo[];

export const legalDoc = (id: string): LegalDocInfo => LEGAL_DOCS.find((d) => d.id === id) || LEGAL_DOCS[1];
export const isLegalDocId = (id: string): id is LegalDocId => LEGAL_DOCS.some((d) => d.id === id);

/* ---------- uygulama içi gösterim (V21) ----------
   Metin içerikleri şimdilik Türkçe; İngilizce gizlilik politikası hazır. Uygulama İngilizceyken "Gizlilik Politikası"
   bağlantısı İngilizce metni açar ve listede ikinci kez görünmez. Diğer metinlerin İngilizcesi V25'te. */
export const appDocId = (id: string): string => (getLang() === 'en' && id === 'gizlilik' ? 'privacy-en' : id);
export const appDocTitle = (id: string): string => t(legalDoc(appDocId(id)).title);
export const appDocs = (): LegalDocInfo[] => LEGAL_DOCS.filter((d) => getLang() !== 'en' || d.id !== 'privacy-en');
