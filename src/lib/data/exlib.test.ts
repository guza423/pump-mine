import { describe, expect, it } from 'vitest';
import { EX_LIB, MUS_CODE, EQ, exShare, itemShares, addShares, searchAlias } from './exlib';
import referenceSource from '../../../reference/v09/exlib.js?raw';

describe('hareket kütüphanesi', () => {
  it('438 referans kaydını değiştirmeden taşır; 28 beceri, antrenman öncesi ısınma ve V35 eklemeleri (toplam 470)', () => {
    const reference = JSON.parse(new Function(referenceSource + ';return JSON.stringify(EX_LIB)')());
    expect(EX_LIB.slice(0, 438)).toEqual(reference);
    expect(EX_LIB).toHaveLength(470);
    expect(['kuvvet', 'olimpik', 'plyo', 'beceri', 'isinma'].map(kind => EX_LIB.filter(ex => ex.kind === kind).length)).toEqual([360, 28, 53, 28, 1]);
  });

  it('benzersiz kimlik, ad ve geçerli kas/ekipman kullanır', () => {
    expect(new Set(EX_LIB.map(ex => ex.id)).size).toBe(470);
    expect(new Set(EX_LIB.map(ex => ex.name)).size).toBe(470);
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
      if (ex.kind === 'beceri' && ex.h !== undefined) {
        expect(ex.h).toBe(1);
      }
    }
    for (const id of ['egimli-bench', 'duz-bench', 'egimli-db-press', 'kablo-fly', 'db-omuz-press', 'on-omuz-kaldiris', 'yana-acis', 'band-yana-acis', 'kablo-yana-acis', 'barfiks', 'shrug', 'triceps-pushdown', 'rdl', 'leg-curl', 'band-leg-curl', 'squat', 'boyun']) {
      expect(EX_LIB.some(ex => ex.id === id)).toBe(true);
    }
  });

  it('V35 · kas başına set payı: ana 1, yardımcı ½, dengeleyici ¼, kurala uymayanda satırdaki pay', () => {
    const lib = (id: string) => EX_LIB.find(ex => ex.id === id)!;
    const share = (id: string) => Object.fromEntries(exShare(lib(id)));
    expect(share('egimli-bench')).toEqual({ 'Göğüs': 1, 'Omuz (ön)': 0.5, 'Triceps': 0.5 });
    expect(share('ayakta-ohp')).toEqual({ 'Omuz (ön)': 1, 'Omuz (yan)': 0.5, 'Triceps': 0.5, 'Karın': 0.25 });
    expect(share('squat')).toEqual({ 'Quadriceps': 1, 'Kalça': 0.5, 'Adduktor': 0.5, 'Bel': 0.25 });
    expect(share('deadlift')).toEqual({ 'Kalça': 1, 'Hamstring': 0.5, 'Bel': 0.5, 'Quadriceps': 0.25, 'Trapez': 0.25, 'Ön kol': 0.25 });
    expect(share('bb-row')).toEqual({ 'Sırt': 1, 'Omuz (arka)': 0.5, 'Biceps': 0.5, 'Bel': 0.25 });
    expect(share('hip-thrust')).toEqual({ 'Kalça': 1, 'Hamstring': 0.25, 'Quadriceps': 0.25 });
    expect(share('db-fly')).toEqual({ 'Göğüs': 1, 'Omuz (ön)': 0.25 });
    expect(share('face-pull')).toEqual({ 'Omuz (arka)': 1, 'Trapez': 0.5 });
    expect(share('bant-rotasyonel-row')).toEqual({ 'Sırt': 1, 'Karın': 0.5, 'Omuz (arka)': 0.5, 'Biceps': 0.5 });
    expect(share('pogo')).toEqual({ 'Baldır': 1, 'Quadriceps': 0.25 });
    for (const ex of EX_LIB) {
      const sh = exShare(ex);
      expect(sh[0]).toEqual([ex.muscle, 1]);
      expect(sh.slice(1).map(([m]) => m)).toEqual(ex.sec);
      for (const [, f] of sh.slice(1)) expect([0.25, 0.5, 0.75]).toContain(f);
    }
    // kütüphane dışı ya da kası değiştirilmiş hareket: yalnız kendi kası
    expect(itemShares({ exId: null, muscle: 'Göğüs' })).toEqual([['Göğüs', 1]]);
    expect(itemShares({ exId: 'egimli-bench', muscle: 'Triceps' })).toEqual([['Triceps', 1]]);
    const map: Record<string, number> = {};
    addShares(map, { exId: 'egimli-bench', muscle: 'Göğüs' }, 4);
    expect(map).toEqual({ 'Göğüs': 4, 'Omuz (ön)': 2, 'Triceps': 2 });
  });

  it('V35 · yeni hareketler ve arama adları', () => {
    const ids = ['bant-rotasyonel-row', 'capraz-pogo', 'capraz-squat-jump'];
    for (const id of ids) expect(EX_LIB.some(ex => ex.id === id)).toBe(true);
    expect(EX_LIB.find(ex => ex.id === 'bant-rotasyonel-row')).toMatchObject({ kind: 'kuvvet', eq: 'bd', muscle: 'Sırt' });
    expect(EX_LIB.filter(ex => ['capraz-pogo', 'capraz-squat-jump'].includes(ex.id)).every(ex => ex.kind === 'plyo')).toBe(true);
    expect(searchAlias('ardisik-makas')).toContain('jump lunge');
    expect(searchAlias('dizden-sicrama')).toContain('kneel to squat');
  });
});
