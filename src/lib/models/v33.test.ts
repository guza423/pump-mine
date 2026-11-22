// V33 · barbell en az 20 kg, ısınma setleri ve antrenman öncesi ısınma hesaplara girmez, vücut ağırlığı seçeneği,
// planlı antrenman hazır açılır, plan hatırlatması bir gün önce 20:00.
import { describe, expect, it } from 'vitest';
import { eqConfig } from '../../features/antrenman/pixelHelpers';
import { e1Ok, bestE1 } from './training';
import { fatigueAt, planStats, weekDoneStats } from './fatigue';
import { exerciseIndex } from './progress';
import { freeEntry } from './session';
import { canBodyweight, EX_LIB, warmFirst, WARMUP_ID } from '../data/exlib';
import { isWarmEx, itemFromEx, sessionFromDay, sessionStats, targetTxt } from '../../features/antrenman/core';
import { planReminders } from '../../features/plan/reminders';

const lib = (id: string) => EX_LIB.find((e) => e.id === id)!;
const now = new Date(2026, 10, 22, 12).getTime();

describe('barbell ve vücut ağırlığı', () => {
  it('barbell en az 20 kg (0 kg yok); diğer ekipman 0’dan başlar', () => {
    expect(eqConfig('bb').min).toBe(20);
    expect(eqConfig('db').min).toBe(0);
    expect(eqConfig('mk').min).toBe(0);
  });
  it('vücut ağırlığı seçeneği: bw/plaka ekipmanı ve ek yüksüz yapılan dumbbell hareketleri; barbell ve makine yok', () => {
    expect(canBodyweight(lib('barfiks'))).toBe(true);
    expect(canBodyweight(lib('agirlikli-dips'))).toBe(true);
    expect(canBodyweight(lib('one-lunge'))).toBe(true);
    expect(canBodyweight(lib('bulgarian-split-squat'))).toBe(true);
    expect(canBodyweight(lib('duz-bench'))).toBe(false);
    expect(canBodyweight(lib('goblet-squat'))).toBe(false);
    expect(canBodyweight(lib(WARMUP_ID))).toBe(false);
    expect(targetTxt({ sets: 3, repMin: 8, repMax: 12, kg: 0, rpeMin: 8, rpeMax: 9 }, 'barfiks')).toContain('vücut ağırlığı');
  });
});

describe('ısınma setleri', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ses = (sets: any[], id = 's1', startedAt = now - 3600_000) => ({
    id, status: 'done', startedAt, endedAt: startedAt + 3000_000, dayId: null,
    items: [{ exId: 'egimli-bench', name: 'Eğimli bench press', muscle: 'Göğüs', target: { rest: 180 }, sets }],
  });
  const warm = { kg: 40, reps: 10, warm: true, lvl: null, vl: 0, rpe: null, rir: 9, rom: 100, at: now - 3500_000 };
  const work = { kg: 80, reps: 6, lvl: 3, vl: 0.47, rpe: null, rir: 1, rom: 100, at: now - 3400_000 };

  it('1RM, tonaj, zor set ve yorgunluğa girmez', () => {
    expect(e1Ok({ ...warm, rir: 1 })).toBe(false);
    expect(bestE1([warm, work])).toBeCloseTo(80 * (1 + 7 / 30), 6);
    const ss = sessionStats(ses([warm, work]));
    expect(ss.tonnage).toBe(480);
    expect(ss.hard).toHaveLength(1);
    expect(ss.warm).toBe(1);
    const a = fatigueAt({ sessions: [ses([warm, work])], checkins: [] }, now).train;
    const b = fatigueAt({ sessions: [ses([work])], checkins: [] }, now).train;
    expect(a).toBeCloseTo(b, 9);
    expect(weekDoneStats([ses([warm, work])], now).hard).toBe(1);
  });
  it('gelişimde yalnızca iş setleri; yalnızca ısınma yapılan hareket listeye girmez', () => {
    const idx = exerciseIndex([ses([warm, work]), ses([warm], 's2')], now);
    expect(idx).toHaveLength(1);
    expect(idx[0].points).toHaveLength(1);
    expect(idx[0].points[0].ton).toBe(480);
  });
  it('sonraki antrenman önceki iş setinden başlar (ısınma atlanır)', () => {
    const e = freeEntry({ id: 'x', exId: 'egimli-bench', name: 'Eğimli bench press', muscle: 'Göğüs', note: '', target: {} as never, sets: [] }, [ses([work, warm]) as never]);
    expect(e.kg).toBe(80);
    expect(e.reps).toBe(6);
  });
});

describe('antrenman öncesi ısınma', () => {
  it('listelerin başında; yalnızca süre ve yoğunluk; plan yüküne ve gelişime girmez', () => {
    expect(warmFirst(EX_LIB)[0].id).toBe(WARMUP_ID);
    expect(isWarmEx(WARMUP_ID)).toBe(true);
    const it0 = itemFromEx(lib(WARMUP_ID));
    expect(it0).toMatchObject({ sets: 1, dur: 10, z: 2, rpeMin: null });
    expect(targetTxt(it0, WARMUP_ID)).toBe('10 dk · Hafif');
    const prog = { id: 'p', name: '', createdAt: 0, updatedAt: 0, days: [{ id: 'd', name: 'A', weekday: 1, items: [it0, { ...itemFromEx(lib('duz-bench')), sets: 3, rpeMin: 8, rpeMax: 9 }] }] };
    expect(planStats(prog).muscles).toEqual({ 'Göğüs': 3 });
    const s = { id: 'w', status: 'done', startedAt: now - 3600_000, items: [{ exId: WARMUP_ID, name: 'Antrenman öncesi ısınma', muscle: 'Tüm vücut', sets: [{ kg: 0, reps: 1, dur: 10, z: 3, warm: true, rir: 9, at: now - 3500_000 }] }] };
    expect(exerciseIndex([s], now)).toEqual([]);
    expect(fatigueAt({ sessions: [s], checkins: [] }, now).train).toBe(0);
  });
});

describe('planlı antrenman ve hatırlatma', () => {
  it('planlı antrenman da hazır açılır (süre İDMANI BAŞLAT ya da ilk sette başlar)', () => {
    const day = { id: 'd', name: 'Buff', weekdays: [2], items: [{ id: 'i', exId: 'duz-bench', name: 'Düz bench press', muscle: 'Göğüs', sets: 3, repMin: 8, repMax: 12, kg: 60, rpeMin: 8, rpeMax: 9, rest: 120, note: '' }] };
    expect(sessionFromDay({ id: 'p', name: '' }, day)).toMatchObject({ ready: true, status: 'active', dayId: 'd' });
  });
  it('planlı günden bir gün önce 20:00; geçmiş saat kurulmaz; ısınma set sayısına girmez', () => {
    const programs = [{ id: 'p', name: '', createdAt: 0, updatedAt: 0, days: [{ id: 'd', name: 'Buff', weekdays: [2], dates: [], skip: [], items: [
      { id: 'w', exId: WARMUP_ID, name: 'Antrenman öncesi ısınma', muscle: 'Tüm vücut', sets: 1, repMin: 1, repMax: 1, kg: null, rpeMin: null, rpeMax: null, rest: 60, note: '', dur: 10, z: 2 },
      { id: 'i', exId: 'duz-bench', name: 'Düz bench press', muscle: 'Göğüs', sets: 4, repMin: 8, repMax: 12, kg: 60, rpeMin: 8, rpeMax: 9, rest: 120, note: '' },
    ] }] }];
    // Pazar 22 Kasım 12:00 → Salı 24 Kasım planı, hatırlatma Pazartesi 23 Kasım 20:00
    const r = planReminders(programs as never, now, 14);
    expect(r[0].at).toBe(new Date(2026, 10, 23, 20).getTime());
    expect(r[0].title).toBe('Yarın: Buff');
    expect(r[0].body).toContain('4 set');
    expect(r).toHaveLength(2);
    // Pazartesi 21:00: yarınki planın hatırlatma saati geçti
    expect(planReminders(programs as never, new Date(2026, 10, 23, 21).getTime(), 14)[0].at).toBe(new Date(2026, 10, 30, 20).getTime());
  });
});
