import kosullar from './texts/kosullar.md?raw';
import gizlilik from './texts/gizlilik.md?raw';
import aydinlatma from './texts/aydinlatma.md?raw';
import riza from './texts/riza.md?raw';
import silme from './texts/silme.md?raw';
import termsEn from './texts/terms-en.md?raw';
import privacyEn from './texts/privacy-en.md?raw';
import kvkkEn from './texts/kvkk-notice-en.md?raw';
import consentEn from './texts/consent-en.md?raw';
import deletionEn from './texts/deletion-en.md?raw';
import { fillLegal } from './meta';
import type { Lang } from '../i18n';

export type LegalDocId =
  | 'kosullar' | 'gizlilik' | 'aydinlatma' | 'riza' | 'silme'
  | 'terms-en' | 'privacy-en' | 'kvkk-en' | 'consent-en' | 'deletion-en';
export interface LegalDocInfo { id: LegalDocId; lang: Lang; pair: LegalDocId; title: string; md: string }

// Uygulamadaki ve web sayfasındaki metinlerin tek kaynağı. Her metnin diğer dildeki karşılığı `pair`.
// Sıra, listelerde görünen sıradır. Başlık, metnin ilk satırındaki (# …) başlıkla aynı olmalı.
// Türkçe kimlikler (kosullar, gizlilik, silme…) Play Store bağlantılarında kullanılır; değiştirme.
export const LEGAL_DOCS: LegalDocInfo[] = ([
  { id: 'kosullar', lang: 'tr', pair: 'terms-en', title: 'Kullanım Koşulları', md: kosullar },
  { id: 'gizlilik', lang: 'tr', pair: 'privacy-en', title: 'Gizlilik Politikası', md: gizlilik },
  { id: 'aydinlatma', lang: 'tr', pair: 'kvkk-en', title: 'KVKK Aydınlatma Metni', md: aydinlatma },
  { id: 'riza', lang: 'tr', pair: 'consent-en', title: 'Açık Rıza Metni', md: riza },
  { id: 'silme', lang: 'tr', pair: 'deletion-en', title: 'Hesap ve veri silme', md: silme },
  { id: 'terms-en', lang: 'en', pair: 'kosullar', title: 'Terms of Use', md: termsEn },
  { id: 'privacy-en', lang: 'en', pair: 'gizlilik', title: 'Privacy Policy', md: privacyEn },
  { id: 'kvkk-en', lang: 'en', pair: 'aydinlatma', title: 'KVKK Privacy Notice', md: kvkkEn },
  { id: 'consent-en', lang: 'en', pair: 'riza', title: 'Explicit Consent Notice', md: consentEn },
  { id: 'deletion-en', lang: 'en', pair: 'silme', title: 'Account and data deletion', md: deletionEn },
] as const).map((d) => ({ ...d, md: fillLegal(d.md, d.lang) })) as LegalDocInfo[];

export const legalDoc = (id: string): LegalDocInfo => LEGAL_DOCS.find((d) => d.id === id) || LEGAL_DOCS[1];
export const isLegalDocId = (id: string): id is LegalDocId => LEGAL_DOCS.some((d) => d.id === id);
/** Bir metnin istenen dildeki karşılığı. */
export const docIn = (id: string, lang: Lang): LegalDocInfo => { const d = legalDoc(id); return d.lang === lang ? d : legalDoc(d.pair); };
export const legalDocsIn = (lang: Lang): LegalDocInfo[] => LEGAL_DOCS.filter((d) => d.lang === lang);
