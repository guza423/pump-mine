import { describe, expect, it } from 'vitest';
import { EX_LIB, MUS_CODE, EQ, exShare, itemShares, addShares, searchAlias } from './exlib';
import { DET, DET_BY_GROUP, exDetail, addDetail } from './exdetail';
import referenceSource from '../../../reference/v09/exlib.js?raw';

describe('hareket kütüphanesi', () => {
  it('438 referans kaydını değiştirmeden taşır; 28 beceri, ısınma, V35 ve V39 eklemeleri (toplam 782)', () => {
    const reference = JSON.parse(new Function(referenceSource + ';return JSON.stringify(EX_LIB)')());
    expect(EX_LIB.slice(0, 438)).toEqual(reference);
    expect(EX_LIB).toHaveLength(782);
    // V39 öncesi 470 kaydın sırası değişmez (eski kimlikler aynı yerde)
    expect(EX_LIB[469].id).toBe('capraz-squat-jump');
    expect(['kuvvet', 'olimpik', 'plyo', 'beceri', 'isinma', 'dovus'].map(kind => EX_LIB.filter(ex => ex.kind === kind).length)).toEqual([575, 56, 91, 31, 1, 28]);
  });

  it('benzersiz kimlik, ad ve geçerli kas/ekipman kullanır', () => {
    expect(new Set(EX_LIB.map(ex => ex.id)).size).toBe(782);
    expect(new Set(EX_LIB.map(ex => ex.name.toLocaleLowerCase('tr'))).size).toBe(782);
    expect(new Set(EX_LIB.map(ex => ex.en.toLowerCase())).size).toBe(782);
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

  it('V39 · iki katman: 52 ayrıntılı kas, her biri bir gruba bağlı; grup sayısı 19 kalır', () => {
    expect(Object.keys(DET)).toHaveLength(52);
    const groups = Object.values(MUS_CODE);
    for (const d of Object.values(DET)) expect(groups).toContain(d.group);
    expect(DET_BY_GROUP['Göğüs']).toEqual(['GU', 'GO', 'GA', 'PM', 'SA']);
  });

  it('V39 · ayrıntı payı = grup payı × bölge ağırlığı; kurallar hareketin türüne göre', () => {
    const det = (id: string) => Object.fromEntries(exDetail(EX_LIB.find(ex => ex.id === id)!));
    // eğimli press üst göğüs, aşağı eğimli ve dips alt göğüs
    expect(det('egimli-bench')).toMatchObject({ GU: 1, GO: 0.5, ODO: 0.5, TRY: 0.5, TRU: 0.25 });
    expect(det('asagi-egimli-bench').GA).toBe(1);
    expect(det('gogus-dips').GA).toBe(1);
    // triceps: baş üstünde uzun baş, pushdown'da lateral/medial
    expect(det('halat-bas-ustu')).toMatchObject({ TRU: 1, TRY: 0.5 });
    expect(det('triceps-pushdown')).toMatchObject({ TRY: 1, TRU: 0.5 });
    // hamstring: oturarak curl iç hamstring, RDL uzun baş
    expect(det('oturarak-leg-curl')).toMatchObject({ SM: 1, BFU: 1 });
    expect(det('rdl')).toMatchObject({ BFU: 1, SM: 1, ES: 0.5 });
    // baldır: oturarak soleus; kalça içe rotasyonu gluteus medius/minimus + TFL; vakum TVA
    expect(det('oturarak-calf-raise')).toEqual({ SOL: 1 });
    expect(det('kablo-kalca-ice-rotasyon')).toEqual({ GMD: 1, TFL: 1 });
    expect(det('karin-vakumu')).toEqual({ TVA: 1 });
    // grubu harekette olmayan ayrıntı ana kasa göre sayılır (leg raise → kalça fleksörü ½)
    expect(det('asili-bacak-kaldirma')).toMatchObject({ RA: 1, HF: 0.5 });
    // her kütüphane hareketinin (tüm vücut ve ısınma hariç) en az bir ayrıntısı var
    for (const ex of EX_LIB) if (ex.muscle !== 'Tüm vücut') expect(exDetail(ex).length, ex.id).toBeGreaterThan(0);
    const map: Record<string, number> = {};
    addDetail(map, EX_LIB.find(ex => ex.id === 'egimli-bench'), 3);
    expect(map.GU).toBe(3);
    expect(map.GO).toBe(1.5);
  });

  it('V39 · dövüş türü: raund × süre, 60 sn varsayılan dinlenme', () => {
    const fight = EX_LIB.filter(ex => ex.kind === 'dovus');
    expect(fight.map(ex => ex.id)).toEqual(expect.arrayContaining(['golge-boksu', 'agir-torba', 'ip-atlama', 'sparring', 'sprawl-drili', 'canli-gures', 'grappling']));
    expect(fight.every(ex => ex.rest === 60)).toBe(true);
  });
});
