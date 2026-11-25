import { describe, expect, it } from 'vitest';
import {
  addOnce,
  addWeekly,
  allPlans,
  dateKey,
  nextPlanned,
  plansOn,
  removeOn,
  removePlan,
  stampProgram,
  upsertPlan,
  weekdaysOf,
  weekProgram
} from './plans';
import { simulatePlan } from '../../lib/models/fatigue';
import { hipertrofiProgram } from '../../test/fixtures';
import type { Program, ProgramDay, Session } from '../../lib/store/types';

// Testlerdeki tarihler (Kasım 2026) planın oluşturulmasından sonra kalsın: createdAt 0 = hep vardı.
const old = (p: Program): Program => ({ ...p, createdAt: 0 });

describe('plans model', () => {
  it('allPlans flattens multi-day legacy programs', () => {
    const prog: Program = {
      id: 'p1',
      name: 'PPL',
      createdAt: 1,
      updatedAt: 2,
      days: [
        { id: 'd1', name: 'Push', weekday: 1, items: [] },
        { id: 'd2', name: 'Pull', weekday: 3, items: [] }
      ]
    };
    const plans = allPlans([prog]);
    expect(plans).toHaveLength(2);
    expect(plans[0].day.id).toBe('d1');
    expect(plans[0].programId).toBe('p1');
    expect(plans[1].day.id).toBe('d2');
  });

  it('weekday -> weekdays backward compatibility and normalization on save', () => {
    const legacyDay: ProgramDay = { id: 'd1', name: 'Push', weekday: 1, items: [] };
    expect(weekdaysOf(legacyDay)).toEqual([1]);
    expect(weekdaysOf({ id: 'd2', name: 'Bos', weekday: null, items: [] })).toEqual([]);

    const saved = upsertPlan([], 'p1', { ...legacyDay, weekdays: [1, 4] });
    expect(saved.days[0].weekdays).toEqual([1, 4]);
    expect('weekday' in saved.days[0]).toBe(false);
  });

  it('plansOn matches weekly, single-day (dates), and respects skip', () => {
    const mon = new Date(2026, 10, 16, 12, 0, 0); // Monday 2026-11-16
    const tue = new Date(2026, 10, 17, 12, 0, 0); // Tuesday 2026-11-17
    const monKey = dateKey(mon);
    const tueKey = dateKey(tue);
    const dummyItem = { id: 'i1', exId: 'squat', name: 'Squat', muscle: 'Quadriceps', sets: 3, repMin: 5, repMax: 5, kg: 100, rpeMin: 8, rpeMax: 8, rest: 180, note: '' };

    const p1 = old(upsertPlan([], 'p1', { id: 'd1', name: 'Weekly Mon', weekdays: [1], dates: [tueKey], skip: [], items: [dummyItem] }));
    expect(plansOn(mon, [p1])).toHaveLength(1);
    expect(plansOn(tue, [p1])).toHaveLength(1);

    const pSkipped = old(upsertPlan([], 'p1', { id: 'd1', name: 'Weekly Mon', weekdays: [1], dates: [], skip: [monKey], items: [dummyItem] }));
    expect(plansOn(mon, [pSkipped])).toHaveLength(0);
  });

  it('removeOn removes single-day date from dates and adds weekly occurrence to skip', () => {
    const mon = new Date(2026, 10, 16, 12, 0, 0); // Monday 2026-11-16
    const tue = new Date(2026, 10, 17, 12, 0, 0); // Tuesday 2026-11-17
    const monKey = dateKey(mon);
    const tueKey = dateKey(tue);
    const dummyItem = { id: 'i1', exId: 'squat', name: 'Squat', muscle: 'Quadriceps', sets: 3, repMin: 5, repMax: 5, kg: 100, rpeMin: 8, rpeMax: 8, rest: 180, note: '' };

    let day: ProgramDay = { id: 'd1', name: 'Push', weekdays: [], dates: [], skip: [], items: [dummyItem] };
    day = addOnce(day, tueKey);
    expect(plansOn(tue, [old(upsertPlan([], 'p1', day))])).toHaveLength(1);

    day = removeOn(day, tueKey);
    expect(day.dates).not.toContain(tueKey);
    expect(plansOn(tue, [old(upsertPlan([], 'p1', day))])).toHaveLength(0);

    day = addWeekly(day, 1);
    expect(plansOn(mon, [old(upsertPlan([], 'p1', day))])).toHaveLength(1);

    day = removeOn(day, monKey);
    expect(day.skip).toContain(monKey);
    expect(plansOn(mon, [old(upsertPlan([], 'p1', day))])).toHaveLength(0);
  });

  it('nextPlanned skips today when today plan was already completed', () => {
    const mon = new Date(2026, 10, 16, 10, 0, 0); // Monday 2026-11-16
    const dummyItem = { id: 'i1', exId: 'squat', name: 'Squat', muscle: 'Quadriceps', sets: 3, repMin: 5, repMax: 5, kg: 100, rpeMin: 8, rpeMax: 8, rest: 180, note: '' };
    const prog = old(upsertPlan([], 'p1', { id: 'd1', name: 'Push', weekdays: [1, 4], dates: [], skip: [], items: [dummyItem] }));

    const beforeDone = nextPlanned([prog], [], mon);
    expect(beforeDone?.off).toBe(0);

    const doneSession: Session = {
      id: 's1',
      programId: prog.id,
      programName: prog.name,
      dayId: 'd1',
      dayName: 'Push',
      startedAt: new Date(2026, 10, 16, 9, 0, 0).getTime(),
      endedAt: new Date(2026, 10, 16, 9, 45, 0).getTime(),
      status: 'done',
      items: []
    };

    const afterDone = nextPlanned([prog], [doneSession], mon);
    expect(afterDone?.off).toBe(3); // Thursday
  });

  it('removePlan deletes 1-day doc and removes only the day from multi-day doc', () => {
    const single = upsertPlan([], 'p_single', { id: 'd1', name: 'Push', weekdays: [1], items: [] });
    expect(removePlan([single], single.id, 'd1')).toEqual({ del: single.id });

    const multi: Program = {
      id: 'p_multi',
      name: 'PPL',
      createdAt: 1,
      updatedAt: 2,
      days: [
        { id: 'd1', name: 'Push', weekdays: [1], items: [] },
        { id: 'd2', name: 'Pull', weekdays: [3], items: [] }
      ]
    };
    const res = removePlan([multi], 'p_multi', 'd1');
    expect(res.put?.id).toBe('p_multi');
    expect(res.put?.days.map((d) => d.id)).toEqual(['d2']);
  });

  it('weekProgram + simulatePlan preserves hipertrofiProgram control values (pre ~21, post ~76)', () => {
    const hip = hipertrofiProgram() as unknown as Program;
    const wp = weekProgram([hip]);
    const sim = simulatePlan(wp)!;
    expect(Math.abs(sim.pre - 21)).toBeLessThanOrEqual(1);
    expect(Math.abs(sim.post - 76)).toBeLessThanOrEqual(1);
  });

  it('V38 · haftalık plan oluşturulduğu/gün eklendiği tarihten önce sayılmaz', () => {
    const dummyItem = { id: 'i1', exId: 'squat', name: 'Squat', muscle: 'Quadriceps', sets: 3, repMin: 5, repMax: 5, kg: 100, rpeMin: 8, rpeMax: 8, rest: 180, note: '' };
    const created = new Date(2026, 10, 25, 9, 0, 0).getTime(); // Çarşamba
    const base: Program = { id: 'p1', name: 'Homie', createdAt: created, updatedAt: created, days: [{ id: 'd1', name: 'Homie', weekdays: [1, 2, 4, 5], dates: [], skip: [], items: [dummyItem] }] };
    // eski kayıt (wdFrom yok): oluşturulduğu günden önce plan yok
    expect(plansOn(new Date(2026, 10, 24, 12), [base])).toHaveLength(0);
    expect(plansOn(new Date(2026, 10, 26, 12), [base])).toHaveLength(1);
    // kayıtta damga: eski kayıt oluşturma gününden, sonradan eklenen gün eklendiği günden sayılır
    const stamped = stampProgram(base, '2026-11-25');
    expect(stamped.days[0].wdFrom).toEqual({ 1: '2026-11-25', 2: '2026-11-25', 4: '2026-11-25', 5: '2026-11-25' });
    const later = stampProgram({ ...stamped, days: [{ ...stamped.days[0], weekdays: [1, 2, 4, 5, 6] }] }, '2026-12-03');
    expect(later.days[0].wdFrom).toMatchObject({ 1: '2026-11-25', 6: '2026-12-03' });
    expect(plansOn(new Date(2026, 10, 28, 12), [later])).toHaveLength(0); // Cumartesi, gün henüz eklenmemişti
    expect(plansOn(new Date(2026, 11, 5, 12), [later])).toHaveLength(1);
    // gün kaldırılınca tarihi silinir
    const off = stampProgram({ ...later, days: [{ ...later.days[0], weekdays: [1] }] }, '2026-12-04');
    expect(off.days[0].wdFrom).toEqual({ 1: '2026-11-25' });
  });
});
