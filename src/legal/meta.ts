// Hukuki metinlerin ortak bilgileri. Metinlerdeki {{ANAHTAR}} yer tutucuları buradan doldurulur.
// Boş bırakılan alanlar metinde "[… yayın öncesi eklenecek]" olarak görünür; yayından önce doldurulmalı.
// Metin içeriği değişirse VERSION güncellenir: kullanıcılar uygulamayı açınca yeni sürümü yeniden onaylar.

export const LEGAL = {
  /** Metin sürümü (yürürlük tarihi). Değişince onay ekranı yeniden çıkar. */
  VERSION: '2026-11-20',
  /** Açık rıza metninin sürümü. Değişince hesaplı kullanıcılardan rıza yeniden istenir. */
  CONSENT_VERSION: 2,
  APP: 'OUTMOVE',
  COMPANY: 'PRWAGON LLC',
  COMPANY_DESC: 'ABD Wyoming eyaletinde kurulu limited şirket',
  /** Şirketin resmî (kayıtlı) adresi. */
  ADDRESS: '30 N Gould St Ste N, Sheridan, WY 82801, USA',
  /** Gizlilik ve KVKK başvuruları için e-posta. */
  EMAIL: 'wworksof@gmail.com',
  /** KVKK m.11 uyarınca Türkiye'deki veri sorumlusu temsilcisi (VERBİS kaydından sonra doldurulur). */
  TR_REP: '',
  /** GDPR m.27 uyarınca AB temsilcisi (atanırsa). */
  EU_REP: '',
  /** Web sürümü ve bu metinlerin herkese açık adresi. */
  WEB: 'https://guza423.github.io/pump-mine/',
  /** Bulut verilerinin saklandığı bölge. */
  REGION: 'Frankfurt, Almanya (Google Cloud europe-west3)',
  MIN_AGE: 18,
} as const;

/** Dile bağlı yer tutucu metinleri (V25, çok dil V26). Ad, adres, e-posta dilden bağımsızdır.
    Yeni dilin yasal metinleri eklenince buraya o dilin satırı da eklenir; yoksa İngilizcesi kullanılır. */
interface LegalL10n { COMPANY_DESC: string; REGION: string; MISSING: string; ADDRESS: string; EMAIL: string; TR_REP: string; EU_REP: string }
export const LEGAL_L10N: Record<string, LegalL10n> = {
  tr: {
    COMPANY_DESC: LEGAL.COMPANY_DESC,
    REGION: LEGAL.REGION,
    MISSING: '[{x} yayın öncesi eklenecek]',
    ADDRESS: 'Şirket adresi',
    EMAIL: 'İletişim e-postası',
    TR_REP: 'Atandığında bu metinde ve VERBİS’te ilan edilir.',
    EU_REP: 'Atandığında bu metinde ilan edilir.',
  },
  en: {
    COMPANY_DESC: 'a limited liability company organized in the State of Wyoming, USA',
    REGION: 'Frankfurt, Germany (Google Cloud europe-west3)',
    MISSING: '[{x} to be added before launch]',
    ADDRESS: 'Company address',
    EMAIL: 'Contact email',
    TR_REP: 'Will be announced in this text and in the VERBIS registry once appointed.',
    EU_REP: 'Will be announced in this text once appointed.',
  },
};

/** Metindeki {{ANAHTAR}} yer tutucularını metnin diliyle doldurur. */
export function fillLegal(md: string, lang = 'tr'): string {
  const l = LEGAL_L10N[lang] || LEGAL_L10N.en;
  const missing = (what: string) => l.MISSING.replace('{x}', what);
  const map: Record<string, string> = {
    SURUM: LEGAL.VERSION,
    UYGULAMA: LEGAL.APP,
    SIRKET: LEGAL.COMPANY,
    SIRKET_ACIKLAMA: l.COMPANY_DESC,
    ADRES: LEGAL.ADDRESS || missing(l.ADDRESS),
    EPOSTA: LEGAL.EMAIL || missing(l.EMAIL),
    TR_TEMSILCI: LEGAL.TR_REP || l.TR_REP,
    AB_TEMSILCI: LEGAL.EU_REP || l.EU_REP,
    WEB: LEGAL.WEB,
    BOLGE: l.REGION,
    YAS: String(LEGAL.MIN_AGE),
  };
  return md.replace(/\{\{([A-Z_]+)\}\}/g, (m, k) => (k in map ? map[k] : m));
}
