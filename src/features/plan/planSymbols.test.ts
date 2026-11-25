import { describe, expect, it } from 'vitest';
import { FREE_SKILL_SYMBOL, FREE_SYMBOL, PLAN_COLORS, PLAN_SHAPES, daySymbol, planOrder, sessionSymbol, symbolAt, symbolPath } from './planSymbols';
import type { Program } from '../../lib/store/types';

const prog = (id: string, createdAt: number, days: string[]): Program => ({ id, name: id, createdAt, updatedAt: createdAt, days: days.map((d) => ({ id: d, name: d, items: [] })) });

describe('V38 · antrenman çeşidi sembolleri', () => {
  it('her plan farklı şekil ve renk alır; plansız kare', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 36; i++) {
      const s = symbolAt(i);
      expect(PLAN_SHAPES).toContain(s.shape);
      expect(PLAN_COLORS).toContain(s.color);
      seen.add(s.shape + s.color);
    }
    expect(seen.size).toBe(36);
    expect(symbolAt(0).shape).not.toBe(symbolAt(1).shape);
    expect(symbolAt(0).color).not.toBe(symbolAt(1).color);
    expect(PLAN_SHAPES).not.toContain('square');
    expect(FREE_SYMBOL.shape).toBe('square');
  });

  it('sıra planın oluşturulmasına göre: yeni plan eskilerin sembolünü değiştirmez', () => {
    const a = prog('a', 1, ['a1']);
    const b = prog('b', 2, ['b1', 'b2']);
    const before = planOrder([b, a]);
    expect(before).toEqual(['a1', 'b1', 'b2']);
    const after = planOrder([prog('c', 3, ['c1']), b, a]);
    expect(daySymbol('b2', after)).toEqual(daySymbol('b2', before));
  });

  it('oturum: plandan geldiyse planın sembolü, değilse plansız (beceri ağırlıklı mavi)', () => {
    const order = ['a1', 'b1'];
    expect(sessionSymbol({ dayId: 'b1' }, order)).toEqual(symbolAt(1));
    expect(sessionSymbol({ dayId: null } as never, order)).toEqual(FREE_SYMBOL);
    expect(sessionSymbol({ dayId: null } as never, order, true)).toEqual(FREE_SKILL_SYMBOL);
    // silinmiş plan: kimlikten türetilir, hep aynı
    expect(daySymbol('silinmis', order)).toEqual(daySymbol('silinmis', order));
  });

  it('içi boş şekil yalnızca kenar piksellerini çizer', () => {
    const full = symbolPath('square').match(/M/g)!.length;
    const hollow = symbolPath('square', true).match(/M/g)!.length;
    expect(full).toBe(64);
    expect(hollow).toBe(28);
  });
});
