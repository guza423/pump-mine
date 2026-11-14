import { describe, expect, it } from 'vitest';
import { mergeGuestIntoCloud } from './merge';
import { emptyData } from '../store/backend';
import type { Program, Session } from '../store/types';

const program = (updatedAt: number): Program => ({ id: 'p', name: 'Program', createdAt: 1, updatedAt, days: [] });
const session = (n: number) => ({ id: 's', items: [{ sets: Array.from({ length: n }, () => ({ reps: 5 })) }] }) as Session;

describe('misafir ve bulut birleştirme', () => {
  it('boş bulut için tüm yerel veriyi, boş yerel için hiçbir yazmayı döndürür', () => {
    const local = { ...emptyData(), programs: [program(2)] };
    expect(mergeGuestIntoCloud(local, emptyData())).toEqual(local);
    expect(mergeGuestIntoCloud(emptyData(), local)).toEqual(emptyData());
  });
  it('programlarda yeni updatedAt kazanır; eşitte bulut korunur', () => {
    const cloud = { ...emptyData(), programs: [program(2)] };
    expect(mergeGuestIntoCloud({ ...emptyData(), programs: [program(3)] }, cloud).programs).toEqual([program(3)]);
    expect(mergeGuestIntoCloud({ ...emptyData(), programs: [program(2)] }, cloud).programs).toEqual([]);
    expect(mergeGuestIntoCloud({ ...emptyData(), programs: [program(1)] }, cloud).programs).toEqual([]);
  });
  it('seansta fazla set kazanır; eşitte bulut korunur', () => {
    const cloud = { ...emptyData(), sessions: [session(2)] };
    expect(mergeGuestIntoCloud({ ...emptyData(), sessions: [session(3)] }, cloud).sessions).toEqual([session(3)]);
    expect(mergeGuestIntoCloud({ ...emptyData(), sessions: [session(2)] }, cloud).sessions).toEqual([]);
    expect(mergeGuestIntoCloud({ ...emptyData(), sessions: [session(1)] }, cloud).sessions).toEqual([]);
  });
  it('uykuda yeni at, özel harekette birleşim, ayarda bulutu kullanır', () => {
    const local = emptyData(), cloud = emptyData();
    local.checkins = [{ id: 'c_today', sleep: 5, at: 2 }]; cloud.checkins = [{ id: 'c_today', sleep: 8, at: 1 }];
    local.exercises = [{ id: 'x', name: 'Özel', muscle: 'Sırt', createdAt: 1, pending: true }];
    local.settings = [{ key: 'goal', value: 100 }, { key: 'new', value: 1 }]; cloud.settings = [{ key: 'goal', value: 120 }];
    const before = JSON.stringify([local, cloud]);
    const result = mergeGuestIntoCloud(local, cloud);
    expect(result.checkins).toEqual(local.checkins);
    expect(result.exercises).toEqual(local.exercises);
    expect(result.settings).toEqual([{ key: 'new', value: 1 }]);
    expect(JSON.stringify([local, cloud])).toBe(before);
    cloud.exercises = [...local.exercises]; cloud.checkins[0].at = 3;
    expect(mergeGuestIntoCloud(local, cloud).exercises).toEqual([]);
    expect(mergeGuestIntoCloud(local, cloud).checkins).toEqual([]);
  });
});
