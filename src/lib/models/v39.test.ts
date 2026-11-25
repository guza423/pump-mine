import { describe, expect, it } from 'vitest';
import { fightW, FIGHT_K, setLoads, planStats, weekDoneStats } from './fatigue';
import { exerciseIndex } from './progress';
import { EX_LIB } from '../data/exlib';
import { itemFromEx, targetTxt, sessionStats } from '../../features/antrenman/core';

const lib = (id: string) => EX_LIB.find((e) => e.id === id)!;
const now = Date.now();
const round = (z: number, dur = 3, at = now - 3600e3) => ({ kg: 0, reps: 1, dur, z, fight: true, lvl: null, vl: 0, rpe: null, rir: 9, at });
const ses = (sets: unknown[], id = 's1') => ({ id, status: 'done', startedAt: now - 4000e3, endedAt: now - 1000e3, items: [{ id: 'i', exId: 'agir-torba', name: 'Ağır torba', muscle: 'Tüm vücut', sets }] });

describe('V39 · dövüş raundu', () => {
  it('yük seans-RPE ile: dakika × CR-10 × 0,035 × maliyet', () => {
    expect(FIGHT_K).toBe(0.035);
    // ağır torba (fat 2, maliyet 1): 3 dk Sert (RPE 8) = 0,84
    expect(fightW({ dur: 3, z: 4 }, lib('agir-torba'))).toBeCloseTo(0.84, 5);
    // gölge boksu (fat 1, maliyet 0,8): 3 dk Orta (RPE 6) = 0,504
    expect(fightW({ dur: 3, z: 3 }, lib('golge-boksu'))).toBeCloseTo(0.504, 5);
    // canlı güreş (fat 3, maliyet 1,25): 6 dk Maç (RPE 10) = 2,625
    expect(fightW({ dur: 6, z: 5 }, lib('canli-gures'))).toBeCloseTo(2.625, 5);
  });

  it('yorgunluğa girer, zor sete, kas setine ve tonaja girmez', () => {
    const s = ses([round(4), round(4), round(5)]);
    const loads = setLoads([s], now);
    expect(loads).toHaveLength(3);
    expect(loads.every((x: { fight?: boolean }) => x.fight)).toBe(true);
    const w = weekDoneStats([s], now);
    expect(w.hard).toBe(0);
    expect(w.muscles).toEqual({});
    const ss = sessionStats(s);
    expect(ss.hard).toHaveLength(0);
    expect(ss.tonnage).toBe(0);
    expect(ss.rounds).toBe(3);
    expect(ss.fightMin).toBe(9);
  });

  it('plan: raund × süre × yoğunluk; haftalık kas setine girmez', () => {
    const it0 = itemFromEx(lib('agir-torba'));
    expect(it0).toMatchObject({ sets: 3, dur: 3, z: 3, rest: 60 });
    expect(targetTxt({ sets: 6, dur: 2.5, z: 4 }, 'agir-torba')).toBe('6 raund × 2,5 dk · Sert');
    const prog = { days: [{ id: 'd', name: 'Boks', weekdays: [2], items: [it0] }] };
    expect(planStats(prog).sets).toBe(0);
  });

  it('gelişim: raund, dakika ve seans yükü', () => {
    const [e] = exerciseIndex([ses([round(4), round(4, 2), round(5)]) as never], now);
    expect(e.kind).toBe('fight');
    expect(e.points[0]).toMatchObject({ rounds: 3, mins: 8, load: 3 * 8 + 2 * 8 + 3 * 10, maxZ: 5 });
  });
});
