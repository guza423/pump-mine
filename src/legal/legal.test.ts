import { afterEach, describe, expect, it } from 'vitest';
import { LEGAL_BASES, LEGAL_DOCS, LEGAL_TEXT_LANGS, docIn, langsOf, legalDoc, linkTarget } from './docs';
import { APP_DOC_IDS, appDocId, appDocTitle } from './appDocs';
import { LANG_META, setLang } from '../i18n';
import { parseMd } from './LegalDoc';
import { LEGAL, LEGAL_L10N } from './meta';

describe('yasal metinler', () => {
  it('her metin doldurulmuş, şirket adını ve sürümü taşır', () => {
    for (const d of LEGAL_DOCS) {
      expect(d.md, d.id).not.toMatch(/\{\{[A-Z_]+\}\}/);
      expect(d.md, d.id).toContain(LEGAL.COMPANY);
      expect(d.md, d.id).toContain(LEGAL.VERSION);
      expect(parseMd(d.md)[0], d.id).toEqual({ t: 'h1', text: d.title });
    }
  });

  it('metinler arası bağlantılar var olan metinlere gider', () => {
    const ids = new Set(LEGAL_DOCS.map((d) => d.id));
    for (const d of LEGAL_DOCS) for (const m of d.md.matchAll(/\(#doc:([a-z-]+)\)/g)) expect(ids.has(m[1] as never), d.id + ' → ' + m[1]).toBe(true);
  });

  it('herkese açık depoya kişisel bilgi yazılmaz', () => {
    // Tek izinli e-posta şirketin iletişim adresi (meta.ts, 20 Kasım); metinlere başka adres yazılmaz.
    const all = LEGAL_DOCS.map((d) => d.md).join('\n').split(LEGAL.EMAIL).join('');
    expect(all).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
    expect(all).not.toMatch(/\b\d{2}-\d{7}\b/); // EIN biçimi
  });

  it('markdown: liste, tablo, alıntı ve paragraf', () => {
    const b = parseMd('# T\n\n- a\n- b\n\n1. x\n2. y\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n> söz\n\nsatır 1\nsatır 2');
    expect(b).toEqual([
      { t: 'h1', text: 'T' },
      { t: 'ul', items: ['a', 'b'] },
      { t: 'ol', items: ['x', 'y'] },
      { t: 'table', head: ['A', 'B'], rows: [['1', '2']] },
      { t: 'quote', text: 'söz' },
      { t: 'p', text: 'satır 1\nsatır 2' },
    ]);
  });
});

describe('yasal metinler her dilde (V25, çok dil V26)', () => {
  afterEach(() => setLang('tr', false));
  const shape = (md: string) => {
    const b = parseMd(md);
    const n = (t: string) => b.filter((x) => x.t === t).length;
    const items = b.reduce((a, x) => a + ('items' in x ? x.items.length : 0), 0);
    const rows = b.reduce((a, x) => a + (x.t === 'table' ? x.rows.length : 0), 0);
    return { h2: n('h2'), h3: n('h3'), items, rows };
  };
  const others = LEGAL_DOCS.filter((d) => d.lang !== 'tr');

  it('metin klasörleri dil listesindeki dillerle eşleşir; Türkçe ve İngilizce eksiksiz', () => {
    const ids = LANG_META.map((l) => l.id) as string[];
    for (const l of LEGAL_TEXT_LANGS) expect(ids, 'texts/' + l).toContain(l);
    for (const l of ['tr', 'en']) for (const b of LEGAL_BASES) expect(docIn(b, l).lang, `${l}/${b}`).toBe(l);
    for (const l of LEGAL_TEXT_LANGS.filter((x) => x !== 'tr')) expect(LEGAL_L10N[l], 'meta.ts › LEGAL_L10N.' + l).toBeTruthy();
  });

  it('çeviri eksiksiz: bölüm, alt bölüm, madde ve tablo satırı sayıları Türkçeyle aynı', () => {
    for (const d of others) expect(shape(d.md), d.id).toEqual(shape(docIn(d.base, 'tr').md));
  });

  it('Türkçe dışındaki metinlerde Türkçeye özgü harf yok (KVKK bent harfleri ç, ğ hariç); İngilizcede hiç Türkçe harf yok', () => {
    for (const d of others) {
      const rest = d.md.replace(/\((ç|ğ)\)|^- (ç|ğ)\)/gm, '');
      const re = d.lang === 'en' ? /\S*[çğıöşüÇĞİÖŞÜ]\S*/g : /\S*[ığşİĞŞ]\S*/g;
      expect(rest.match(re), d.id).toBeNull();
    }
  });

  it('bağlantılar okunan metnin dilinde açılır; Türkçe metin İngilizceyi yalnızca açıkça isterse açar', () => {
    for (const d of LEGAL_DOCS) {
      for (const m of d.md.matchAll(/\(#doc:([a-z-]+)\)/g)) {
        const to = legalDoc(linkTarget(d.id, m[1]));
        if (m[1] === 'privacy-en') expect(to.lang).toBe('en');
        else expect(to.lang, d.id + ' → ' + m[1]).toBe(docIn(to.base, d.lang).lang);
      }
    }
    expect(linkTarget('terms-en', 'riza')).toBe('consent-en');
    expect(linkTarget('gizlilik', 'riza')).toBe('riza');
    expect(linkTarget('gizlilik', 'privacy-en')).toBe('privacy-en');
    expect(langsOf('silme')).toEqual(['tr', 'en']);
  });

  it('uygulama metni etkin dilde açar; o dilde metin yoksa İngilizcesini; açıkça seçilen dilli metin olduğu gibi kalır', () => {
    setLang('en', false);
    expect(APP_DOC_IDS.map(appDocId)).toEqual(['terms-en', 'privacy-en', 'kvkk-en', 'consent-en', 'deletion-en']);
    expect(appDocTitle('kosullar')).toBe('Terms of Use');
    setLang('tr', false);
    expect(APP_DOC_IDS.map(appDocId)).toEqual(APP_DOC_IDS);
    expect(appDocId('privacy-en')).toBe('privacy-en');
    expect(appDocTitle('gizlilik')).toBe('Gizlilik Politikası');
    expect(docIn('gizlilik', 'xx').id).toBe('privacy-en');
  });
});
