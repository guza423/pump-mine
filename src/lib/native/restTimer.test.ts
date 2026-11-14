// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { startRest, stopRest } from './restTimer';
import { changeRest, restDuration } from '../models/rest';
import { freeEntry, isFree } from '../models/session';
import type { Session, SessionItem } from '../store/types';

const native = vi.hoisted(() => ({ enabled: true, start: vi.fn(), stop: vi.fn(), checkPermissions: vi.fn(), requestPermissions: vi.fn() }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => native.enabled }, registerPlugin: () => native }));
const item = (exId: string | null): SessionItem => ({ id: 'i', exId, name: 'Bench', muscle: 'Göğüs', note: '', target: { sets: 2, repMin: 8, repMax: 10, kg: 75, rpeMin: 8, rpeMax: 9, rest: 240 }, sets: [] });
const free = { dayId: null } as Session;
const planned = { dayId: 'd' } as Session;
const rest = { start: 1000, total: 120, exId: 'duz-bench', setNo: 1 };

beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); native.enabled = true;
  native.checkPermissions.mockResolvedValue({ notifications: 'granted' });
  native.requestPermissions.mockResolvedValue({ notifications: 'granted' });
  native.start.mockResolvedValue(undefined); native.stop.mockResolvedValue(undefined);
});

describe('dinlenme süresi ve plansız giriş', () => {
  it('hareket tercihi, kütüphane ve 120 sn sırasını; programda hedef süresini kullanır', () => {
    expect(restDuration(free, item('duz-bench'), { 'duz-bench': 90 })).toBe(90);
    expect(restDuration(free, item('duz-bench'))).toBe(180);
    expect(restDuration(free, item('custom'))).toBe(120);
    expect(restDuration(planned, item('duz-bench'), { 'duz-bench': 90 })).toBe(240);
  });
  it('15–600 sn sınırlarını korur, yalnızca plansızda tercihi değiştirir', () => {
    expect(changeRest(free, { ...rest, total: 15 }, -15, {}).rest.total).toBe(15);
    expect(changeRest(free, { ...rest, total: 600 }, 15, {}).rest.total).toBe(600);
    expect(changeRest(free, rest, 15, { squat: 90 }).prefs).toEqual({ squat: 90, 'duz-bench': 135 });
    expect(changeRest(planned, rest, -15, {}).prefs).toBeNull();
  });
  it('plansızlığı gün kimliğiyle belirler; ekipman ve türe uygun ilk değerleri verir', () => {
    expect(isFree(free)).toBe(true); expect(isFree(planned)).toBe(false);
    expect(freeEntry(item('duz-bench'), [])).toMatchObject({ kg: 20, reps: 10 });
    expect(freeEntry(item('barfiks'), [])).toMatchObject({ kg: 0, reps: 10 });
    expect(freeEntry(item('custom'), [])).toMatchObject({ kg: 0, reps: 10 });
    expect(freeEntry(item('box-jump'), [])).toMatchObject({ kg: 0, reps: 5 });
    expect(freeEntry(item('snatch'), [])).toMatchObject({ kg: 20, reps: 3 });
  });
});

describe('yerel bildirim sarmalayıcısı', () => {
  it('sonraki set için epoch bitişi yollar ve yeni sayaçtan önce durdurur', async () => {
    await startRest(rest, 'Bench');
    await stopRest(); await startRest({ ...rest, start: 5000 }, 'Bench');
    expect(native.start).toHaveBeenNthCalledWith(1, { endAt: 121000, title: 'Dinlenme · Bench', body: '2. set sırada', doneTitle: 'Dinlenme bitti', doneBody: 'Bench · 2. set zamanı' });
    expect(native.start.mock.invocationCallOrder[0]).toBeLessThan(native.stop.mock.invocationCallOrder[0]);
    expect(native.stop.mock.invocationCallOrder[0]).toBeLessThan(native.start.mock.invocationCallOrder[1]);
  });
  it('izni yalnızca bir kez ister ve ret sonrası sessizce devam eder', async () => {
    native.checkPermissions.mockResolvedValue({ notifications: 'prompt' });
    native.requestPermissions.mockResolvedValue({ notifications: 'denied' });
    await startRest(rest, 'Bench'); await startRest(rest, 'Bench');
    expect(native.requestPermissions).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('restNotifyAsked')).toBe('1');
    expect(native.start).not.toHaveBeenCalled();
  });
  it('izin sorulurken Atla gelirse en son durdurur', async () => {
    let respond!: (value: { notifications: string }) => void;
    native.checkPermissions.mockResolvedValue({ notifications: 'prompt' });
    native.requestPermissions.mockImplementation(() => new Promise(resolve => { respond = resolve; }));
    const starting = startRest(rest, 'Bench');
    await vi.waitFor(() => expect(respond).toBeTypeOf('function'));
    const stopping = stopRest();
    respond({ notifications: 'granted' }); await starting; await stopping;
    expect(native.start.mock.invocationCallOrder[0]).toBeLessThan(native.stop.mock.invocationCallOrder[0]);
  });
  it('eklenti hatalarını yutar ve sonraki işlemi engellemez', async () => {
    native.start.mockRejectedValue(new Error('native failure'));
    await expect(startRest(rest, 'Bench')).resolves.toBeUndefined();
    native.stop.mockRejectedValue(new Error('stop failure'));
    await expect(stopRest()).resolves.toBeUndefined();
    native.checkPermissions.mockRejectedValue(new Error('permission failure'));
    await expect(startRest(rest, 'Bench')).resolves.toBeUndefined();
  });
  it('webde bildirim veya izin çağrısı yapmaz', async () => {
    native.enabled = false;
    await startRest(rest, 'Bench'); await stopRest();
    expect(native.start).not.toHaveBeenCalled(); expect(native.stop).not.toHaveBeenCalled();
    expect(native.checkPermissions).not.toHaveBeenCalled();
  });
});
