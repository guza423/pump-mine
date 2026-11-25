// V32 · dönem yorgunluğu + gece ortalaması uyku, bu haftanın yükü, hareket gelişimi ve unutulan antrenman.
import { describe, expect, it } from 'vitest';
import { fatigueAt, isoLocalDate, periodFatigue, periodSleep, sleepInfo, sleepNights, sleepPts, weekDoneStats, planStats } from './fatigue';
import { thisWeekProgram } from '../../features/plan/plans';
import { exerciseIndex, plyoSetScore, RECENT_DAYS } from './progress';
import { autoEnded, idleState, IDLE_ASK_MS, IDLE_END_MS, lastActivity } from './idle';

const H = 3_600_000;
const D = 24 * H;
const at = (y: number, m: number, d: number, h = 12) => new Date(y, m, d, h).getTime();
const key = (ts: number) => `c_${isoLocalDate(ts)}` as const;

describe('uyku: gece ortalaması girişi (V32)', () => {
  const now = at(2026, 10, 22, 20); // 22 Kasım Pazar 20:00

  it('span girişi o tarihle biten her geceyi kapsar; eski tek gecelik giriş yalnızca kendi gecesini', () => {
    const checkins = [{ id: key(now), sleep: 6, at: now, span: 7 }, { id: key(now - 10 * D), sleep: 8, at: now - 10 * D }];
    const nights = sleepNights(checkins, now, 12);
    expect(nights.slice(0, 7)).toEqual([6, 6, 6, 6, 6, 6, 6]);
    expect(nights[7]).toBeNull();
    expect(nights[10]).toBe(8);
  });

  it('aynı geceyi kapsayan girişlerden en son yapılan geçerli', () => {
    const checkins = [{ id: key(now - 2 * D), sleep: 5, at: now - 2 * D }, { id: key(now), sleep: 7, at: now, span: 7 }];
    expect(sleepNights(checkins, now, 3)).toEqual([7, 7, 7]);
    const later = [{ id: key(now), sleep: 7, at: now - H, span: 7 }, { id: key(now - 2 * D), sleep: 5, at: now }];
    expect(sleepNights(later, now, 3)).toEqual([7, 7, 5]);
  });

  it('anlık model (dün gece + son 3 gece) span girişini okur; kontrol değerleri değişmez', () => {
    const st = { sessions: [], checkins: [{ id: key(now), sleep: 5, at: now, span: 7 }] };
    const si = sleepInfo(st, now);
    expect(si).toMatchObject({ known: true, last: 5, avg3: 5, n: 3 });
    expect(fatigueAt(st, now).score).toBe(30);
    // eski tek gece girişi: ≈23
    expect(fatigueAt({ sessions: [], checkins: [{ id: key(now), sleep: 5, at: now }] }, now).score).toBeCloseTo(23.33, 1);
  });

  it('dönem uykusu yalnızca bilinen gecelerden; pay bilinen gece oranıyla küçülür', () => {
    const st = { sessions: [], checkins: [{ id: key(now), sleep: 5, at: now, span: 7 }] };
    expect(periodSleep(st, now, 7)).toEqual({ avg: 5, n: 7, days: 7 });
    expect(periodSleep(st, now, 30)).toEqual({ avg: 5, n: 7, days: 30 });
    expect(periodFatigue(st, 7, now).sleepPts).toBe(30);
    expect(periodFatigue(st, 30, now).sleepPts).toBeCloseTo(30 * 7 / 30, 6);
    // kontrol: ortalama 6 sa → 17, 7 sa → 4, 8 sa → 0
    expect(sleepPts(6, 6, 3)).toBeCloseTo(17, 6);
    expect(sleepPts(7, 7, 3)).toBeCloseTo(4, 6);
    expect(sleepPts(8, 8, 3)).toBe(0);
  });
});

describe('dönem yorgunluğu (V32)', () => {
  const now = at(2026, 10, 22, 20);
  const heavy = (startedAt: number, id = 's') => ({
    id, status: 'done', startedAt, endedAt: startedAt + H, dayId: null,
    // 10 tükenişe yakın set (RIR 1), ağır bileşik hareket (squat: fat 3)
    items: [{ exId: 'squat', name: 'Squat', muscle: 'Quadriceps', sets: Array.from({ length: 10 }, (_, i) => ({ kg: 100, reps: 5, rir: 1, at: startedAt + i * 300_000 })) }],
  });

  it('dönem ortalaması anlık değerden düşük: dünkü seans dönemin tamamını belirlemez', () => {
    const old = heavy(now - 30 * D, 'old');
    const st = { sessions: [old, heavy(now - 20 * H)], checkins: [] };
    const nowScore = fatigueAt(st, now).score;
    const p7 = periodFatigue(st, 7, now);
    expect(p7.train).toBeGreaterThan(0);
    expect(p7.train).toBeLessThan(nowScore);
    expect(p7.covered).toBe(7);
    // 30 günde aynı tek seans daha geniş zamana yayılır
    expect(periodFatigue(st, 30, now).train).toBeLessThan(p7.train);
  });

  it('kayıtlar dönemden sonra başlıyorsa ortalama ilk kayıt gününden alınır', () => {
    const st = { sessions: [heavy(now - 30 * H)], checkins: [] }; // 21 Kasım 14:00 → ilk kayıt günü 21 Kasım
    const p30 = periodFatigue(st, 30, now);
    expect(p30.covered).toBe(2);
    expect(p30.train).toBeCloseTo(periodFatigue(st, 7, now).train, 6);
  });

  it('kayıt yoksa 0; toparlanma süresi şimdiki yüke göre', () => {
    expect(periodFatigue({ sessions: [], checkins: [] }, 7, now).score).toBe(0);
    const st = { sessions: [heavy(now - 2 * H)], checkins: [] };
    expect(periodFatigue(st, 7, now).hrs).toBe(fatigueAt(st, now).hrs);
  });

  it('her gün aynı seans: dönem ortalaması anlık değerlerin ortalamasına eşit (saatlik örnek)', () => {
    const sessions = Array.from({ length: 14 }, (_, i) => heavy(now - (i + 1) * D, 'd' + i));
    const st = { sessions, checkins: [] };
    const p = periodFatigue(st, 7, now);
    let acc = 0, n = 0;
    for (let ts = now - 7 * D; ts < now; ts += H) { acc += fatigueAt(st, ts).train; n += 1; }
    acc += fatigueAt(st, now).train; n += 1;
    expect(p.train).toBeCloseTo(acc / n, 0);
  });
});

describe('bu haftanın yükü (V32)', () => {
  const now = at(2026, 10, 19, 18); // Perşembe
  it('yapılan: Pazartesi 00:00’dan bu yana kas başına zor set; süren antrenman dahil, geçen hafta hariç', () => {
    const s = (id: string, startedAt: number, status = 'done', rir = 2) => ({ id, status, startedAt, items: [{ exId: 'duz-bench', name: 'Düz bench press', muscle: 'Göğüs', sets: [{ kg: 80, reps: 8, rir, at: startedAt }, { kg: 80, reps: 8, rir: 5, at: startedAt }] }] });
    const w = weekDoneStats([s('a', at(2026, 10, 17)), s('b', at(2026, 10, 19, 17), 'active'), s('c', at(2026, 10, 15))], now);
    // V35: yardımcı kaslar yarım set
    expect(w.muscles).toEqual({ 'Göğüs': 2, 'Omuz (ön)': 1, 'Triceps': 1 });
    expect(w.n).toBe(1);
    expect(new Date(w.from).getDay()).toBe(1);
  });
  it('planlanan: haftalık tekrar + bu haftaya düşen tek gün; atlanan gün sayılmaz', () => {
    const item = (sets: number) => ({ id: 'i', exId: 'duz-bench', name: 'Düz bench press', muscle: 'Göğüs', sets, repMin: 6, repMax: 8, kg: 80, rpeMin: 8, rpeMax: 9, rest: 180, note: '' });
    const programs = [
      { id: 'p1', name: 'A', createdAt: 1, updatedAt: 1, days: [{ id: 'd1', name: 'A', weekdays: [1, 4], dates: [], skip: ['2026-11-16'], items: [item(4)] }] },
      { id: 'p2', name: 'B', createdAt: 1, updatedAt: 1, days: [{ id: 'd2', name: 'B', weekdays: [], dates: ['2026-11-21', '2026-11-30'], skip: [], items: [item(3)] }] },
    ];
    const wp = thisWeekProgram(programs as never, now);
    expect(wp.days.map((d) => d.weekday)).toEqual([4, 6]);
    expect(planStats(wp).muscles).toEqual({ 'Göğüs': 7, 'Omuz (ön)': 3.5, 'Triceps': 3.5 });
    expect(planStats(wp).sets).toBe(7);
  });
});

describe('hareket gelişimi (V32)', () => {
  const now = at(2026, 10, 22, 20);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ses = (id: string, startedAt: number, items: any[]) => ({ id, status: 'done', startedAt, items });
  const sessions = [
    ses('a', now - 30 * D, [{ exId: 'egimli-bench', name: 'Eğimli bench press', sets: [{ kg: 80, reps: 6, rir: 2, at: 1 }] }]),
    ses('b', now - 2 * D, [
      { exId: 'egimli-bench', name: 'Eğimli bench press', sets: [{ kg: 85, reps: 5, rir: 1, at: 2 }, { kg: 85, reps: 5, rir: 2, at: 3 }] },
      { exId: 'box-jump', name: 'Box jump', sets: [{ kg: 0, reps: 5, plyo: true, q: 0, rir: 9, at: 4 }, { kg: 10, reps: 5, plyo: true, q: 1, rir: 9, at: 5 }] },
      { exId: 'barfiks', name: 'Barfiks', sets: [{ kg: 0, reps: 10, rir: 2, at: 6 }] },
      { exId: 'kip-up', name: 'Kip-up', sets: [{ kg: 0, reps: 4, skill: true, q: 1, hold: 0, rir: 9, at: 7 }] },
    ]),
  ];
  it('bütün hareketler, son yapılandan eskiye; son 20 gün işaretli; tür doğru', () => {
    const idx = exerciseIndex(sessions, now);
    expect(idx.map((e) => [e.key, e.kind, e.recent])).toEqual([
      ['egimli-bench', 'e1', true], ['box-jump', 'plyo', true], ['barfiks', 'reps', true], ['kip-up', 'skill', true],
    ]);
    const old = exerciseIndex([sessions[0]], now)[0];
    expect(old.recent).toBe(false);
    expect(RECENT_DAYS).toBe(20);
  });
  it('kuvvet: seans başına en iyi e1RM ve tonaj', () => {
    const bench = exerciseIndex(sessions, now)[0];
    // Epley: 80 × (1 + 8/30) = 101,3 · 85 × (1 + 7/30) = 104,8
    expect(bench.points.map((p) => Math.round(p.e1! * 10) / 10)).toEqual([101.3, 104.8]);
    expect(bench.points[1].ton).toBe(850);
  });
  it('vücut ağırlığı: tekrar kapasitesi = tekrar + RIR; pliometrik: kalite ve yükle puan; beceri: temiz oran', () => {
    const idx = exerciseIndex(sessions, now);
    expect(idx.find((e) => e.key === 'barfiks')!.points[0].cap).toBe(12);
    const plyo = idx.find((e) => e.key === 'box-jump')!.points[0];
    expect(plyoSetScore({ reps: 5, q: 0, kg: 0 })).toBe(5);
    expect(plyoSetScore({ reps: 5, q: 1, kg: 10 })).toBeCloseTo(5 * 0.75 * (1 + 10 / 75), 6);
    expect(plyo.score).toBe(5);
    expect(plyo.contacts).toBe(10);
    expect(plyo.held).toBe(50);
    expect(idx.find((e) => e.key === 'kip-up')!.points[0].clean).toBe(50);
  });
});

describe('unutulan antrenman (V32)', () => {
  const t0 = at(2026, 10, 22, 18);
  const s = (extra = {}) => ({ id: 's1', status: 'active', startedAt: t0, items: [{ sets: [{ at: t0 + 5 * 60_000 }] }], ...extra });
  it('10 dk girişsiz → sor; 5 dk daha → bitir; dinlenme sürerken sayaç dinlenme bitince başlar', () => {
    const last = t0 + 5 * 60_000;
    expect(idleState(s(), null, last + IDLE_ASK_MS - 1)).toBe('ok');
    expect(idleState(s(), null, last + IDLE_ASK_MS)).toBe('ask');
    expect(idleState(s(), null, last + IDLE_ASK_MS + IDLE_END_MS)).toBe('end');
    expect(idleState(s(), last + 8 * 60_000, last + IDLE_ASK_MS + IDLE_END_MS)).toBe('ok');
    expect(idleState(s({ rest: { start: last, total: 300 } }), null, last + IDLE_ASK_MS + 1)).toBe('ok');
    expect(idleState(s({ ready: true }), null, t0 + D)).toBe('off');
  });
  it('kendiliğinden bitişte bitiş saati son giriş ve kayıtta belirtilir; set yoksa hazıra döner', () => {
    const now = t0 + 2 * H;
    const ended = autoEnded(s(), t0 + 7 * 60_000, now) as ReturnType<typeof s> & { endedAt: number; autoEnd: { at: number; last: number } };
    expect(ended.status).toBe('done');
    expect(ended.endedAt).toBe(t0 + 7 * 60_000);
    expect(ended.autoEnd).toEqual({ at: now, last: t0 + 7 * 60_000 });
    expect(lastActivity(s(), null)).toBe(t0 + 5 * 60_000);
    const empty = autoEnded({ id: 's2', status: 'active', startedAt: t0, rest: { start: t0, total: 60 }, items: [{ sets: [] }] }, null, now);
    expect(empty).toMatchObject({ status: 'active', ready: true, startedAt: now });
    expect((empty as { rest?: unknown }).rest).toBeUndefined();
  });
});
