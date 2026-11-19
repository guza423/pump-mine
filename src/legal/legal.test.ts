import { afterEach, describe, expect, it } from 'vitest';
import { LEGAL_DOCS, docIn, legalDoc } from './docs';
import { APP_DOC_IDS, appDocId, appDocTitle } from './appDocs';
import { setLang } from '../i18n';
import { parseMd } from './LegalDoc';
import { LEGAL } from './meta';

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
    const all = LEGAL_DOCS.map((d) => d.md).join('\n');
    expect(all).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/); // e-posta adresi meta.ts'den gelir, şimdilik boş
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

describe('yasal metinlerin İngilizcesi (V25)', () => {
  afterEach(() => setLang('tr', false));
  const shape = (md: string) => {
    const b = parseMd(md);
    const n = (t: string) => b.filter((x) => x.t === t).length;
    const items = b.reduce((a, x) => a + ('items' in x ? x.items.length : 0), 0);
    const rows = b.reduce((a, x) => a + (x.t === 'table' ? x.rows.length : 0), 0);
    return { h2: n('h2'), h3: n('h3'), items, rows };
  };

  it('her Türkçe metnin İngilizcesi var, eşleşme iki yönlü', () => {
    for (const d of LEGAL_DOCS) {
      const p = legalDoc(d.pair);
      expect(p.id, d.id).toBe(d.pair);
      expect(p.pair, d.id).toBe(d.id);
      expect(p.lang, d.id).not.toBe(d.lang);
    }
    expect(LEGAL_DOCS.filter((d) => d.lang === 'tr').length).toBe(LEGAL_DOCS.filter((d) => d.lang === 'en').length);
  });

  it('çeviri eksiksiz: bölüm, alt bölüm, madde ve tablo satırı sayıları aynı', () => {
    for (const d of LEGAL_DOCS.filter((x) => x.lang === 'tr')) expect(shape(docIn(d.id, 'en').md), d.id).toEqual(shape(d.md));
  });

  it('İngilizce metinlerde Türkçe yok (KVKK bent harfleri ç, ğ hariç); bağlantılar aynı dildeki metne gider', () => {
    for (const d of LEGAL_DOCS.filter((x) => x.lang === 'en')) {
      const rest = d.md.replace(/\((ç|ğ)\)|^- (ç|ğ)\)/gm, '');
      expect(rest.match(/\S*[çğıöşüÇĞİÖŞÜ]\S*/g), d.id).toBeNull();
      for (const m of d.md.matchAll(/\(#doc:([a-z-]+)\)/g)) expect(legalDoc(m[1]).lang, d.id + ' → ' + m[1]).toBe('en');
    }
    for (const d of LEGAL_DOCS.filter((x) => x.lang === 'tr')) {
      for (const m of d.md.matchAll(/\(#doc:([a-z-]+)\)/g)) if (m[1] !== 'privacy-en') expect(legalDoc(m[1]).lang, d.id + ' → ' + m[1]).toBe('tr');
    }
  });

  it('uygulama metni etkin dilde açar; açıkça seçilen İngilizce metin Türkçede de İngilizce kalır', () => {
    setLang('en', false);
    expect(APP_DOC_IDS.map(appDocId)).toEqual(['terms-en', 'privacy-en', 'kvkk-en', 'consent-en', 'deletion-en']);
    expect(appDocTitle('kosullar')).toBe('Terms of Use');
    setLang('tr', false);
    expect(APP_DOC_IDS.map(appDocId)).toEqual(APP_DOC_IDS);
    expect(appDocId('privacy-en')).toBe('privacy-en');
    expect(appDocTitle('gizlilik')).toBe('Gizlilik Politikası');
  });
});
