import { describe, expect, it } from 'vitest';
import { LEGAL_DOCS } from './docs';
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
