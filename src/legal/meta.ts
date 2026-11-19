// Hukuki metinlerin ortak bilgileri. Metinlerdeki {{ANAHTAR}} yer tutucuları buradan doldurulur.
// Boş bırakılan alanlar metinde "[… yayın öncesi eklenecek]" olarak görünür; yayından önce doldurulmalı.
// Metin içeriği değişirse VERSION güncellenir: kullanıcılar uygulamayı açınca yeni sürümü yeniden onaylar.

export const LEGAL = {
  /** Metin sürümü (yürürlük tarihi). Değişince onay ekranı yeniden çıkar. */
  VERSION: '2026-11-18',
  /** Açık rıza metninin sürümü. Değişince hesaplı kullanıcılardan rıza yeniden istenir. */
  CONSENT_VERSION: 2,
  APP: 'OUTMOVE',
  COMPANY: 'PRWAGON LLC',
  COMPANY_DESC: 'ABD Wyoming eyaletinde kurulu limited şirket',
  /** Şirketin resmî (kayıtlı) adresi. */
  ADDRESS: '',
  /** Gizlilik ve KVKK başvuruları için e-posta. */
  EMAIL: '',
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

/** İngilizce metinlerde Türkçe alanların karşılıkları (V25). Ad, adres, e-posta dilden bağımsızdır. */
const LEGAL_EN = {
  COMPANY_DESC: 'a limited liability company organized in the State of Wyoming, USA',
  REGION: 'Frankfurt, Germany (Google Cloud europe-west3)',
} as const;

const missing = (what: string, lang: 'tr' | 'en') => (lang === 'en' ? `[${what} to be added before launch]` : `[${what} yayın öncesi eklenecek]`);

/** Metindeki {{ANAHTAR}} yer tutucularını metnin diliyle doldurur. */
export function fillLegal(md: string, lang: 'tr' | 'en' = 'tr'): string {
  const en = lang === 'en';
  const map: Record<string, string> = {
    SURUM: LEGAL.VERSION,
    UYGULAMA: LEGAL.APP,
    SIRKET: LEGAL.COMPANY,
    SIRKET_ACIKLAMA: en ? LEGAL_EN.COMPANY_DESC : LEGAL.COMPANY_DESC,
    ADRES: LEGAL.ADDRESS || (en ? missing('Company address', lang) : missing('Şirket adresi', lang)),
    EPOSTA: LEGAL.EMAIL || (en ? missing('Contact email', lang) : missing('İletişim e-postası', lang)),
    TR_TEMSILCI: LEGAL.TR_REP || (en ? 'Will be announced in this text and in the VERBIS registry once appointed.' : 'Atandığında bu metinde ve VERBİS’te ilan edilir.'),
    AB_TEMSILCI: LEGAL.EU_REP || (en ? 'Will be announced in this text once appointed.' : 'Atandığında bu metinde ilan edilir.'),
    WEB: LEGAL.WEB,
    BOLGE: en ? LEGAL_EN.REGION : LEGAL.REGION,
    YAS: String(LEGAL.MIN_AGE),
  };
  return md.replace(/\{\{([A-Z_]+)\}\}/g, (m, k) => (k in map ? map[k] : m));
}
