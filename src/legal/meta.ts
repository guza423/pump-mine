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

const missing = (what: string) => `[${what} yayın öncesi eklenecek]`;

/** Metindeki {{ANAHTAR}} yer tutucularını doldurur. */
export function fillLegal(md: string): string {
  const map: Record<string, string> = {
    SURUM: LEGAL.VERSION,
    UYGULAMA: LEGAL.APP,
    SIRKET: LEGAL.COMPANY,
    SIRKET_ACIKLAMA: LEGAL.COMPANY_DESC,
    ADRES: LEGAL.ADDRESS || missing('Şirket adresi'),
    EPOSTA: LEGAL.EMAIL || missing('İletişim e-postası'),
    TR_TEMSILCI: LEGAL.TR_REP || 'Atandığında bu metinde ve VERBİS’te ilan edilir.',
    AB_TEMSILCI: LEGAL.EU_REP || 'Atandığında bu metinde ilan edilir.',
    WEB: LEGAL.WEB,
    BOLGE: LEGAL.REGION,
    YAS: String(LEGAL.MIN_AGE),
  };
  return md.replace(/\{\{([A-Z_]+)\}\}/g, (m, k) => (k in map ? map[k] : m));
}
