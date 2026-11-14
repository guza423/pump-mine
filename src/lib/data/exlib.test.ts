import { describe, expect, it } from 'vitest';
import { EX_LIB, MUS_CODE, EQ } from './exlib';
import referenceSource from '../../../reference/v09/exlib.js?raw';

describe('hareket kütüphanesi', () => {
  it('438 referans kaydını değiştirmeden taşır', () => {
    const reference = new Function(referenceSource + ';return JSON.stringify(EX_LIB)')();
    expect(EX_LIB).toEqual(JSON.parse(reference));
    expect(EX_LIB).toHaveLength(438);
    expect(['kuvvet', 'olimpik', 'plyo'].map(kind => EX_LIB.filter(ex => ex.kind === kind).length)).toEqual([359, 28, 51]);
  });

  it('benzersiz kimlik, ad ve geçerli kas/ekipman kullanır', () => {
    expect(new Set(EX_LIB.map(ex => ex.id)).size).toBe(438);
    expect(new Set(EX_LIB.map(ex => ex.name)).size).toBe(438);
    const muscles = Object.values(MUS_CODE);
    expect(muscles).toHaveLength(19);
    for (const ex of EX_LIB) {
      expect(ex.id).toMatch(/^[a-z0-9-]+$/);
      expect(muscles).toContain(ex.muscle);
      expect(EQ).toHaveProperty(ex.eq);
      for (const secondary of ex.sec) {
        expect(muscles).toContain(secondary);
        expect(secondary).not.toBe(ex.muscle);
      }
    }
    for (const id of ['egimli-bench', 'duz-bench', 'egimli-db-press', 'kablo-fly', 'db-omuz-press', 'on-omuz-kaldiris', 'yana-acis', 'band-yana-acis', 'kablo-yana-acis', 'barfiks', 'shrug', 'triceps-pushdown', 'rdl', 'leg-curl', 'band-leg-curl', 'squat', 'boyun']) {
      expect(EX_LIB.some(ex => ex.id === id)).toBe(true);
    }
  });
});
