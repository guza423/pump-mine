export type FatigueLevel = 1 | 2 | 3;

export interface HardSetInput {
  at: number;
  rir: number;
  fatigue: FatigueLevel;
}

export interface SleepInput {
  date: string;
  hours: number;
}

export interface FatigueResult {
  training: number;
  sleep: number;
  total: number;
  recoveryHours: number;
  label: 'Yönetilebilir' | 'Birikiyor' | 'Yüksek';
}

const DAY = 86_400_000;
const HOUR = 3_600_000;
const TAU_HOURS = 36;

export const proximityWeight = (rir: number) => {
  if (rir <= 0) return 1.6;
  if (rir <= 1) return 1.3;
  if (rir <= 2) return 1.1;
  if (rir <= 3) return 1;
  if (rir <= 4) return 0.8;
  return 0;
};

export const movementCost = (fatigue: FatigueLevel) =>
  fatigue === 3 ? 1.5 : fatigue === 2 ? 1 : 0.6;

export function trainingLoad(sets: HardSetInput[], now = Date.now()): number {
  const from = now - 7 * DAY;
  return sets
    .filter((set) => set.at >= from && set.at <= now && set.rir <= 4)
    .reduce((sum, set) => {
      const ageHours = (now - set.at) / HOUR;
      return sum + proximityWeight(set.rir) * movementCost(set.fatigue) * Math.exp(-ageHours / TAU_HOURS);
    }, 0);
}

export const trainingScoreFromLoad = (load: number) =>
  100 * (1 - Math.exp(-Math.max(0, load) / 20));

export function sleepScore(nights: Array<number | null | undefined>): number {
  const known = nights.slice(0, 3).filter((value): value is number => Number.isFinite(value));
  if (!known.length) return 0;
  const last = known[0];
  const lastNight = 20 * Math.min(1, Math.max(0, (7.5 - last) / 2.5));
  const average = known.reduce((sum, value) => sum + value, 0) / known.length;
  // Bilinmeyen geceler iyi/kötü varsayılmaz; üç gecelik etkinin yalnızca bilinen payı kullanılır.
  const threeNight = 10 * Math.min(1, Math.max(0, (7 - average) / 2)) * (known.length / 3);
  return lastNight + threeNight;
}

export function recoveryHours(load: number): number {
  const targetLoad = -20 * Math.log(0.75); // training score < 25
  if (load <= targetLoad) return 0;
  return TAU_HOURS * Math.log(load / targetLoad);
}

export function fatigueResult(sets: HardSetInput[], nights: Array<number | null | undefined>, now = Date.now()): FatigueResult {
  const load = trainingLoad(sets, now);
  const training = trainingScoreFromLoad(load);
  const sleep = sleepScore(nights);
  const total = Math.min(100, training + sleep);
  return {
    training,
    sleep,
    total,
    recoveryHours: recoveryHours(load),
    label: total >= 70 ? 'Yüksek' : total >= 40 ? 'Birikiyor' : 'Yönetilebilir',
  };
}

export function isoLocalDate(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

type StoreState = { sessions: any[]; checkins: any[]; programs: any[] };

const FATIGUE_COST: Record<string, FatigueLevel> = {
  'egimli-bench': 3, 'duz-bench': 3, 'egimli-db-press': 2, 'kablo-fly': 1,
  'db-omuz-press': 2, 'on-omuz-kaldiris': 1, 'yana-acis': 1,
  'band-yana-acis': 1, 'kablo-yana-acis': 1, barfiks: 2, shrug: 1, 'triceps-pushdown': 1,
  rdl: 3, 'leg-curl': 1, 'band-leg-curl': 1, squat: 3, boyun: 1,
};

const clampScore = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));
const prototypeProximityWeight = (rir: number) => rir <= 0.5 ? 1.6 : rir <= 1.5 ? 1.3 : rir <= 2.5 ? 1.1 : rir <= 3.5 ? 1 : 0.8;
const rpeMid = (a: unknown, b: unknown) => Number.isFinite(Number(a))
  ? (Number.isFinite(Number(b)) ? (Number(a) + Number(b)) / 2 : Number(a))
  : 8;
const setCost = (exId?: string | null) => movementCost(FATIGUE_COST[exId || ''] || 2);
const decay = (hours: number) => Math.exp(-hours / TAU_HOURS);

export function planStats(program: any) {
  const muscles: Record<string, number> = {};
  (program?.days || []).forEach((day: any) => day.items.forEach((item: any) => {
    if (10 - rpeMid(item.rpeMin, item.rpeMax) > 4) return;
    muscles[item.muscle] = (muscles[item.muscle] || 0) + Number(item.sets || 0);
  }));
  return { muscles };
}

export function logStats(sessions: any[], endTs: number) {
  const muscles: Record<string, number> = {};
  sessions.filter((session) => (session.status === 'done' || session.status === 'active')
    && session.startedAt >= endTs - 7 * DAY && session.startedAt <= endTs + 1000)
    .forEach((session) => session.items.forEach((item: any) => item.sets.forEach((set: any) => {
      if (set.rir <= 4) muscles[item.muscle] = (muscles[item.muscle] || 0) + 1;
    })));
  return { muscles };
}

export function setLoads(sessions: any[], at: number) {
  const result: Array<{ at: number; w: number; rir: number; heavy: boolean }> = [];
  sessions.forEach((session) => {
    if (session.status !== 'done' && session.status !== 'active') return;
    session.items.forEach((item: any) => {
      const cost = setCost(item.exId);
      item.sets.forEach((set: any) => {
        if (set.rir <= 4 && set.at && set.at <= at && at - set.at < 7 * DAY) {
          result.push({ at: set.at, w: prototypeProximityWeight(set.rir) * cost, rir: set.rir, heavy: cost >= 1.5 });
        }
      });
    });
  });
  return result;
}

export function sleepInfo(state: Pick<StoreState, 'checkins'>, at: number) {
  const date = new Date(at);
  const keys = [0, 1, 2].map((offset) => {
    const value = new Date(date.getFullYear(), date.getMonth(), date.getDate() - offset).getTime();
    return `c_${isoLocalDate(value)}`;
  });
  const known = keys.map((key) => state.checkins.find((checkin) => checkin.id === key)).filter(Boolean);
  const last = state.checkins.find((checkin) => checkin.id === keys[0]);
  return {
    known: Boolean(last),
    last: last ? Number(last.sleep) : null,
    avg3: known.length ? known.reduce((sum, checkin) => sum + Number(checkin.sleep), 0) / known.length : null,
    n: known.length,
  };
}

export const sleepPts = (last: number | null, avg3: number | null, count = 3) => last == null || avg3 == null
  ? 0
  : 20 * clampScore((7.5 - last) / 2.5, 0, 1)
    + 10 * clampScore((7 - avg3) / 2, 0, 1) * (count / 3);

export function fatigueAt(state: StoreState, at: number, sessions = state.sessions) {
  const loads = setLoads(sessions, at);
  const sum = loads.reduce((total, load) => total + load.w * decay((at - load.at) / HOUR), 0);
  const training = trainingScoreFromLoad(sum);
  const sleep = sleepInfo(state, at);
  const sleepPoints = sleepPts(sleep.last, sleep.avg3, sleep.n);
  const score = clampScore(training + sleepPoints);
  return {
    sum, train: training, sleep, sleepPts: sleepPoints, score,
    zone: score < 40 ? { k: 'Yönetilebilir' } : score < 70 ? { k: 'Birikiyor' } : { k: 'Yüksek' },
    hrs: recoveryHours(sum), hard: loads.length,
    fail: loads.filter((load) => load.rir <= 0.5).length,
  };
}

export function steadyWeek(value: any) {
  const count = Math.max(1, value.n);
  const sets = value.deload ? value.sets * 0.5 : value.sets;
  const rir = value.deload ? Math.min(4, value.rir + 1) : value.rir;
  const cost = 0.6 * (1 - value.heavy / 100) + 1.5 * (value.heavy / 100);
  const per = (sets / count) * prototypeProximityWeight(rir) * cost;
  const k = decay(168 / count);
  const resid = (per * k) / (1 - k);
  const sleepPoints = sleepPts(value.sleepLast, value.sleepAvg, 3);
  const pre = clampScore(trainingScoreFromLoad(resid) + sleepPoints);
  return {
    per, resid, pre, post: clampScore(trainingScoreFromLoad(resid + per) + sleepPoints),
    train: trainingScoreFromLoad(resid), sleepPts: sleepPoints, hrs: recoveryHours(resid + per),
    perSession: sets / count,
  };
}

export function simFromPlan(program: any) {
  let sets = 0, rir = 0, heavy = 0;
  const days = program.days.filter((day: any) => day.items.length);
  days.forEach((day: any) => day.items.forEach((item: any) => {
    const itemRir = 10 - rpeMid(item.rpeMin, item.rpeMax);
    if (itemRir > 4) return;
    const count = Number(item.sets || 0);
    sets += count; rir += itemRir * count;
    if (setCost(item.exId) >= 1.5) heavy += count;
  }));
  return {
    sets: Math.max(4, sets), rir: sets ? clampScore(Math.round((rir / sets) * 2) / 2, 0, 4) : 2,
    n: clampScore(days.length || 1, 1, 6), heavy: sets ? Math.round((heavy / sets) * 10) * 10 : 0,
    sleepLast: 7.5, sleepAvg: 7.5, deload: false,
  };
}

export function simFromLogs(state: StoreState) {
  const at = Date.now();
  const loads = setLoads(state.sessions, at);
  const sleep = sleepInfo(state, at);
  const n = state.sessions.filter((session) => session.status === 'done' && at - session.startedAt < 7 * DAY).length;
  const avg3 = sleep.n ? (sleep.avg3! * sleep.n + 7.5 * (3 - sleep.n)) / 3 : 7.5;
  const base = { sleepLast: sleep.last ?? 7.5, sleepAvg: Math.round(avg3 * 2) / 2, deload: false };
  if (loads.length && n) return {
    ...base, sets: Math.max(4, Math.round(loads.length / 2) * 2),
    rir: clampScore(Math.round((loads.reduce((sum, load) => sum + load.rir, 0) / loads.length) * 2) / 2, 0, 4),
    n: clampScore(n, 1, 6), heavy: Math.round((loads.filter((load) => load.heavy).length / loads.length) * 10) * 10,
    src: 'Son 7 günün kayıtlarından',
  };
  const program = state.programs.find((item) => item.days.some((day: any) => day.items.length));
  return program ? { ...simFromPlan(program), ...base, src: 'Programına göre' }
    : { ...base, sets: 30, rir: 2, n: 3, heavy: 40, src: 'Örnek değerler' };
}

export function simulatePlan(program: any) {
  const days = program.days.filter((day: any) => day.items.length);
  if (!days.length) return null;
  const loadFor = (day: any) => day.items.reduce((total: number, item: any) => {
    const rir = 10 - rpeMid(item.rpeMin, item.rpeMax);
    return rir > 4 ? total : total + Number(item.sets || 0) * prototypeProximityWeight(rir) * setCost(item.exId) * 1.07;
  }, 0);
  const hasFixed = days.some((day: any) => day.weekday != null);
  const slots = days.map((day: any, index: number) => ({
    day, hour: day.weekday == null ? (hasFixed ? null : Math.round((index * 7) / days.length) * 24 + 18) : ((day.weekday + 6) % 7) * 24 + 18,
    load: loadFor(day),
  })).filter((slot: any) => slot.hour != null);
  if (!slots.length) return null;
  const events: any[] = [];
  for (let week = 0; week < 3; week += 1) slots.forEach((slot: any) => events.push({ ...slot, hour: week * 168 + slot.hour, week }));
  events.sort((a, b) => a.hour - b.hour);
  const loadAt = (hour: number) => events.filter((event) => event.hour < hour)
    .reduce((total, event) => total + event.load * decay(hour - event.hour), 0);
  const per = events.filter((event) => event.week === 2).map((event) => {
    const pre = loadAt(event.hour);
    return { d: event.day, pre: trainingScoreFromLoad(pre), post: trainingScoreFromLoad(pre + event.load) };
  });
  return {
    per, pre: per.reduce((sum, item) => sum + item.pre, 0) / per.length,
    post: Math.max(...per.map((item) => item.post)), unplaced: days.length - slots.length,
  };
}

export function fatigueRecs(value: any) {
  const score = value.score ?? value.pre;
  const recommendations: string[] = [];
  if (value.sleepLast != null && value.sleepLast < 6.5) recommendations.push('Dün gece kısa uyku: ağır setlerde hedefi 1 tekrar erken bitir.');
  if (score >= 70) recommendations.push('Yorgunluk yüksek: bugün hafif çalış ya da dinlen.');
  else if (score >= 40) recommendations.push('Yorgunluk birikiyor: setleri 2–3 tekrar kala bitir.');
  if (value.rir != null && value.rir <= 1) recommendations.push('Setlerin çoğu tükenişte; 1–3 tekrar kala bitir.');
  if (score < 40 && !recommendations.length) recommendations.push('Toparlanmış görünüyorsun. Plana göre yüklen.');
  return recommendations.slice(0, 3);
}

export function sessionFatigue(session: any, state: StoreState) {
  if (session.fatigue?.v === 2) return session.fatigue;
  return { v: 2, pre: fatigueAt(state, session.startedAt - 1).score, post: fatigueAt(state, session.endedAt || session.startedAt).score };
}

export function periodMetrics(list: any[], days?: number) {
  let duration = 0, sets = 0, hard = 0, tonnage = 0, rpe = 0;
  list.forEach((session) => {
    const all = session.items.flatMap((item: any) => item.sets);
    duration += (session.endedAt || Date.now()) - session.startedAt;
    sets += all.length; hard += all.filter((set: any) => set.rir <= 4).length;
    tonnage += all.reduce((sum: number, set: any) => sum + Number(set.kg || 0) * Number(set.reps || 0), 0);
    rpe += all.reduce((sum: number, set: any) => sum + Number(set.rpe || 0), 0);
  });
  const n = list.length;
  const span = days || Math.max(7, n ? (Date.now() - list[n - 1].startedAt) / DAY : 7);
  return { n, dur: duration, avgDur: n ? duration / n : 0, sets, hard, ton: tonnage, avgRpe: sets ? rpe / sets : 0, perWeek: n / (span / 7) };
}

export function historyWarnings(state: StoreState, list: any[]) {
  const warnings: Array<{ lv: string; t: string; d: string }> = [];
  const current = fatigueAt(state, Date.now());
  if (current.score >= 70) warnings.push({ lv: 'bad', t: `Yorgunluk yüksek · ${Math.round(current.score)}`, d: 'Bugün hafif çalış ya da dinlen.' });
  else if (current.score >= 40) warnings.push({ lv: 'warn', t: `Yorgunluk birikiyor · ${Math.round(current.score)}`, d: 'Setleri 2–3 tekrar kala bitir.' });
  const metrics = periodMetrics(list);
  if (metrics.sets >= 6 && metrics.avgRpe >= 9) warnings.push({ lv: 'warn', t: `Ortalama RPE ${metrics.avgRpe.toFixed(1)}`, d: 'Tükenişten biraz daha uzak kal.' });
  return warnings;
}
