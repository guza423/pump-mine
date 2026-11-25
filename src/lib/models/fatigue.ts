// @ts-nocheck
import { EX_LIB, PLYO_W, SKILL_W, FIGHT_RPE, isPlyo, isSkill, isWarmEx, isFight, fightSetTxt, skillSetTxt, sessionStats, bestE1, hasNum, nf } from "../../features/antrenman/core";
import { weekProgram } from "../../features/plan/plans";
import { addShares } from "../data/exlib";
import { clamp } from "./training";
import { muscleName, pct, t } from "../../i18n";
import { exName } from "../../i18n/names";
const DAY_MS = 864e5;
const MAIN_MUSCLES = ["Göğüs", "Omuz (ön)", "Omuz (yan)", "Sırt", "Trapez", "Triceps", "Hamstring", "Quadriceps"];
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

const exMeta = (exId, name) => EX_LIB.find((e) => e.id === exId) || EX_LIB.find((e) => e.name === name) || null;
const rpeMid = (a, b) => (hasNum(a) ? (hasNum(b) ? (Number(a) + Number(b)) / 2 : Number(a)) : 8);
const repMid = (a, b) => (hasNum(a) ? (hasNum(b) ? (Number(a) + Number(b)) / 2 : Number(a)) : 8);
const zoneOf = (score) => (score < 40 ? { k: t('Yönetilebilir'), c: 'var(--ok)', cls: 'ok' } : score < 70 ? { k: t('Birikiyor'), c: 'var(--warn)', cls: 'warn' } : { k: t('Yüksek'), c: 'var(--bad)', cls: 'bad' });
export function planStats(program) {
  const muscles = {};
  let sets = 0; // planlanan zor set sayısı (kas paylarının toplamı değil)
  (program ? program.days : []).forEach((d) => {
    const mult = d.weekday == null && Array.isArray(d.weekdays) && d.weekdays.length ? d.weekdays.length : 1;
    d.items.forEach((it) => {
      if (isPlyo(it.exId) || isSkill(it.exId) || isWarmEx(it.exId) || isFight(it.exId) || 10 - rpeMid(it.rpeMin, it.rpeMax) > 4) return;
      addShares(muscles, it, Number(it.sets || 0) * mult);
      sets += Number(it.sets || 0) * mult;
    });
  });
  return { muscles, sets };
}
// V32 · bu hafta (Pazartesi 00:00'dan şu ana) yapılan yük: kas başına zor set (RIR ≤ 4), temas ve deneme.
// Süren antrenmanın setleri de sayılır ("o ana dek").
export function weekStartTs(now = Date.now()) {
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)).getTime();
}
export function weekDoneStats(sessions, now = Date.now()) {
  const from = weekStartTs(now);
  const muscles = {};
  let n = 0, hard = 0, contacts = 0, attempts = 0;
  (sessions || []).filter((s) => (s.status === 'done' || s.status === 'active') && !s.ready && s.startedAt >= from && s.startedAt <= now).forEach((s) => {
    if (s.status === 'done') n += 1;
    s.items.forEach((it) => it.sets.forEach((x) => {
      if (x.plyo) contacts += Number(x.reps) || 0;
      else if (x.skill) attempts += Number(x.reps) || 0;
      else if (!x.warm && x.rir <= 4) { addShares(muscles, it, 1); hard += 1; }
    }));
  });
  return { muscles, n, hard, contacts, attempts, from };
}
export function logStats(sessions, endTs) {
  const from = endTs - 7 * DAY_MS;
  const muscles = {};
  sessions.filter((s) => (s.status === 'done' || s.status === 'active') && !s.ready && s.startedAt >= from && s.startedAt <= endTs + 1000).forEach((s) => s.items.forEach((it) => {
    it.sets.forEach((x) => { if (!x.plyo && !x.skill && !x.warm && x.rir <= 4) addShares(muscles, it, 1); });
  }));
  return { muscles };
}

/* ---------- yorgunluk modeli ----------
   Antrenman yorgunluğu: son 7 günün zor setleri (RIR ≤ 4). Her set = tükenişe yakınlık × hareketin sistemik maliyeti
   ve zamanla üstel azalır (τ 36 sa: 24 sa sonra %51, 48 sa sonra %26 kalır). Tükenişe giden setler toparlanmayı
   24–48 sa uzatır (Morán-Navarro ve ark. 2017). Skor = 100 × (1 − e^(−toplam/20)).
   Uyku ayrı eklenir. Tek gece kısa uyku maksimal kuvveti ortalama ~%3, kuvvet-dayanıklılığını ~%10 düşürür
   (Craven ve ark. 2022); birkaç gece üst üste daha fazla. Ağırlıklar bu çalışmalardan türetilmiş tahmindir. */
export const TAU_H = 36, FK = 20;
export const FRESH = -FK * Math.log(0.75); // antrenman skoru 25'in altı: toparlanmış
/* V39 · dövüş raundu yükü (seans-RPE, Foster ve ark. 2001): dakika × CR-10 yoğunluk × FIGHT_K × hareket maliyeti.
   FIGHT_K = 0,035: 3 dk "Sert" (RPE 8) raund ≈ 0,84 ≈ bitişe 3 tekrar kala bir orta maliyetli zor set;
   12 sert raund sparring ≈ 10 zor set. Maliyet: fat 1 → 0,8 · 2 → 1 · 3 → 1,25 (gölge boksu < torba < canlı güreş). */
export const FIGHT_K = 0.035;
export const fightW = (x, lib) => (Number(x.dur) || 0) * (FIGHT_RPE[(Number(x.z) || 3) - 1] || 6) * FIGHT_K * [1, 0.8, 1, 1.25][(lib && lib.fat) || 2];
export const proxW = (rir) => (rir <= 0.5 ? 1.6 : rir <= 1.5 ? 1.3 : rir <= 2.5 ? 1.1 : rir <= 3.5 ? 1 : 0.8);
export const costW = (exId, name) => { const m = exMeta(exId, name); return m ? [1, 0.6, 1, 1.5][m.fat] : 1; };
export const loadScore = (sum) => 100 * (1 - Math.exp(-sum / FK));
export const hoursToFresh = (sum) => (sum > FRESH ? Math.ceil(TAU_H * Math.log(sum / FRESH)) : 0);
export const decayK = (h) => Math.exp(-h / TAU_H);
export function setLoads(sessions, t) {
  const out = [];
  sessions.forEach((s) => {
    if ((s.status !== 'done' && s.status !== 'active') || s.ready) return;
    s.items.forEach((it) => {
      const c = costW(it.exId, it.name);
      const lib = exMeta(it.exId, it.name);
      it.sets.forEach((x) => {
        if (!x.at || x.at > t || t - x.at >= 7 * DAY_MS) return;
        if (x.plyo) { out.push({ at: x.at, w: x.reps * PLYO_W[(lib && lib.int) || 2], plyo: true, contacts: x.reps }); return; }
        if (x.skill) { out.push({ at: x.at, w: x.reps * SKILL_W[(lib && lib.fat) || 1], skill: true, attempts: x.reps }); return; }
        if (x.fight) { out.push({ at: x.at, w: fightW(x, lib), fight: true, mins: Number(x.dur) || 0 }); return; }
        if (!x.warm && x.rir <= 4) out.push({ at: x.at, w: proxW(x.rir) * c, rir: x.rir, heavy: c >= 1.5 });
      });
    });
  });
  return out;
}
/* ---------- uyku girişleri (V32) ----------
   Giriş: { id: 'c_<YYYY-MM-DD>', sleep, at, span? }. `span` varsa `sleep` o tarihle biten `span` gecenin günlük
   ortalamasıdır (Dashboard'da "son 7/10/30 gün" seçiliyken girilir); yoksa yalnızca o tarihin gecesi (eski giriş).
   Tarih = sabahı: c_2026-11-22 → 21'i 22'ye bağlayan gece. Bir geceyi birden çok giriş kapsıyorsa en son yapılan
   (`at` büyük olan) geçerlidir. Bilinmeyen gece varsayılmaz. */
const shiftKey = (key, days) => { const [y, m, d] = key.split('-').map(Number); return isoLocalDate(new Date(y, m - 1, d + days).getTime()); };
const KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
export function sleepNights(checkins, endTs, n) {
  return sleepNightEntries(checkins, endTs, n).map((e) => (e ? e.v : null));
}
// Gece başına değer ve hangi girişten geldiği (`span` > 1: dönem ortalamasından, o gecenin kendi ölçümü değil).
export function sleepNightEntries(checkins, endTs, n) {
  const d0 = new Date(endTs);
  const keys = Array.from({ length: Math.max(0, n) }, (_, i) => isoLocalDate(new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() - i).getTime()));
  if (!keys.length) return [];
  const oldest = keys[keys.length - 1];
  const entries = (checkins || []).map((c) => {
    const k = String(c && c.id || '').slice(2);
    const span = Math.min(366, Math.max(1, Math.round(Number(c && c.span) || 1)));
    return { k, span, start: KEY_RE.test(k) ? shiftKey(k, -(span - 1)) : k, sleep: Number(c && c.sleep), at: Number(c && c.at) || 0 };
  }).filter((e) => KEY_RE.test(e.k) && Number.isFinite(e.sleep) && e.k >= oldest);
  return keys.map((k) => {
    let best = null;
    for (const e of entries) if (k <= e.k && k >= e.start && (!best || e.at > best.at)) best = e;
    return best ? { v: best.sleep, span: best.span } : null;
  });
}
export function sleepInfo(st, t) {
  const ent = sleepNightEntries(st.checkins, t, 3);
  const got = ent.filter(Boolean).map((e) => e.v);
  const avg3 = got.length ? got.reduce((a, v) => a + v, 0) / got.length : null;
  // lastAvg: dün gecenin değeri bir dönem ortalamasından geliyor (metinde "dün gece" denmez).
  return { known: ent[0] != null, last: ent[0] ? ent[0].v : null, lastAvg: !!(ent[0] && ent[0].span > 1), avg3, n: got.length };
}
// Seçili dönemin uyku ortalaması: yalnızca bilinen gecelerden; `n` bilinen gece, `days` dönem.
export function periodSleep(st, t, days) {
  const nights = sleepNights(st.checkins, t, days);
  const got = nights.filter((v) => v != null);
  return { avg: got.length ? got.reduce((a, v) => a + v, 0) / got.length : null, n: got.length, days };
}
// Dün gece: 7,5 sa altı en çok +20 (5 sa ve altı). Son 3 gece ortalaması 7 sa altı en çok +10; bilinmeyen geceler varsayılmaz.
export const sleepPts = (last, avg3, n) => (last == null ? 0 : 20 * clamp((7.5 - last) / 2.5) + 10 * clamp((7 - avg3) / 2) * ((n || 3) / 3));
export function fatigueAt(st, t, sessions = st.sessions) {
  const loads = setLoads(sessions || st.sessions, t);
  const sum = loads.reduce((a, x) => a + x.w * decayK((t - x.at) / 3.6e6), 0);
  const train = loadScore(sum);
  const sl = sleepInfo(st, t);
  const sp = sleepPts(sl.last, sl.avg3, sl.n);
  const score = clamp(train + sp, 0, 100);
  return {
    sum, train, sleep: sl, sleepPts: sp, score, zone: zoneOf(score), hrs: hoursToFresh(sum),
    hard: loads.filter((x) => !x.plyo && !x.skill && !x.fight).length, fail: loads.filter((x) => !x.plyo && !x.skill && !x.fight && x.rir <= 0.5).length, contacts: loads.reduce((a, x) => a + (x.contacts || 0), 0), attempts: loads.reduce((a, x) => a + (x.attempts || 0), 0),
  };
}
/* ---------- dönem yorgunluğu (V32, Dashboard) ----------
   Kullanıcı isteği: "son 7 gün baz alınsın" (seçilirse 10 / 30 gün). Antrenman payı, dönem boyunca saatlik
   örneklenen antrenman skorunun ortalamasıdır: her günün yükü eşit sayılır, dünkü seans dönemin tamamını
   belirlemez. Kayıtlar dönemden sonra başlıyorsa ortalama ilk kayıt gününden alınır (kayıt öncesi "dinlenmiş"
   varsayılmaz). Uyku payı dönemin gece ortalamasından, eski modelle aynı ölçekte: her gece h saat uyunmuşsa
   sleepPts(h, h, 3); bilinmeyen geceler varsayılmaz, pay bilinen gece oranıyla küçülür.
   Toparlanma süresi (hrs) şimdiki yüke göredir. */
export const FATIGUE_SPANS = [7, 10, 30];
export function periodFatigue(st, days, now = Date.now()) {
  const sessions = (st.sessions || []).filter((s) => (s.status === 'done' || s.status === 'active') && !s.ready);
  const from = now - days * DAY_MS;
  const first = sessions.reduce((a, s) => Math.min(a, Number(s.startedAt) || Infinity), Infinity);
  const firstDay = Number.isFinite(first) ? (() => { const d = new Date(first); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); })() : now;
  const start = Math.min(now, Math.max(from, firstDay));
  // Dönem başında kalan yük için başlangıçtan 7 gün öncesinin setleri de katılır (e^(−168/36) ≈ %1).
  const loads = [];
  sessions.forEach((s) => s.items.forEach((it) => {
    const c = costW(it.exId, it.name);
    const lib = exMeta(it.exId, it.name);
    it.sets.forEach((x) => {
      if (!x.at || x.at > now || x.at < start - 7 * DAY_MS) return;
      if (x.plyo) loads.push({ at: x.at, w: x.reps * PLYO_W[(lib && lib.int) || 2] });
      else if (x.skill) loads.push({ at: x.at, w: x.reps * SKILL_W[(lib && lib.fat) || 1] });
      else if (x.fight) loads.push({ at: x.at, w: fightW(x, lib) });
      else if (!x.warm && x.rir <= 4) loads.push({ at: x.at, w: proxW(x.rir) * c });
    });
  }));
  loads.sort((a, b) => a.at - b.at);
  const H = 3.6e6;
  let sum = 0, prev = start - 7 * DAY_MS, i = 0, acc = 0, n = 0;
  const step = (ts) => {
    sum *= decayK((ts - prev) / H);
    while (i < loads.length && loads[i].at <= ts) { sum += loads[i].w * decayK((ts - loads[i].at) / H); i += 1; }
    prev = ts;
  };
  for (let ts = start; ts < now; ts += H) { step(ts); acc += loadScore(sum); n += 1; }
  step(now); acc += loadScore(sum); n += 1;
  const train = acc / n;
  const sl = periodSleep(st, now, days);
  const sp = sl.avg == null ? 0 : sleepPts(sl.avg, sl.avg, 3) * (sl.n / days);
  const score = clamp(train + sp, 0, 100);
  return { days, train, sleep: sl, sleepPts: sp, score, zone: zoneOf(score), hrs: hoursToFresh(sum), covered: sessions.length ? Math.max(1, Math.ceil((now - start) / DAY_MS)) : null, sum };
}
// Simülatör: haftalık düzen sabit kalırsa seans başında ve sonunda ulaşılan denge değerleri
export function steadyWeek(v) {
  const n = Math.max(1, v.n);
  const sets = v.deload ? v.sets * 0.5 : v.sets;
  const rir = v.deload ? Math.min(4, v.rir + 1) : v.rir;
  const c = 0.6 * (1 - v.heavy / 100) + 1.5 * (v.heavy / 100);
  const per = (sets / n) * proxW(rir) * c;
  const k = decayK(168 / n);
  const resid = (per * k) / (1 - k);
  const sp = sleepPts(v.sleepLast, v.sleepAvg, 3);
  const pre = clamp(loadScore(resid) + sp, 0, 100);
  return { per, resid, pre, post: clamp(loadScore(resid + per) + sp, 0, 100), train: loadScore(resid), sleepPts: sp, hrs: hoursToFresh(resid + per), perSession: sets / n, zone: zoneOf(pre) };
}
export function simFromLogs(st) {
  const now = Date.now();
  const loads = setLoads(st.sessions, now).filter((x) => !x.plyo && !x.skill && !x.fight);
  const sl = sleepInfo(st, now);
  const n = st.sessions.filter((s) => s.status === 'done' && !s.ready && now - s.startedAt < 7 * DAY_MS).length;
  const avg3 = sl.n ? (sl.avg3 * sl.n + 7.5 * (3 - sl.n)) / 3 : 7.5;
  const base = { sleepLast: sl.last != null ? sl.last : 7.5, sleepAvg: Math.round(avg3 * 2) / 2, deload: false };
  if (loads.length && n) {
    return { ...base, sets: Math.max(4, Math.round(loads.length / 2) * 2), rir: clamp(Math.round((loads.reduce((a, x) => a + x.rir, 0) / loads.length) * 2) / 2, 0, 4), n: clamp(n, 1, 6), heavy: Math.round((loads.filter((x) => x.heavy).length / loads.length) * 10) * 10, src: t('Son 7 günün kayıtlarından') };
  }
  const wp = weekProgram(st.programs);
  if (wp.days.length) return { ...simFromPlan(wp), ...base, src: t('Planına göre') };
  const p = st.programs.find((x) => x.days.some((d) => d.items.length));
  if (p) return { ...simFromPlan(p), ...base, src: t('Planına göre') };
  return { ...base, sets: 30, rir: 2, n: 3, heavy: 40, src: t('Örnek değerler') };
}
export function simFromPlan(p) {
  let sets = 0, rir = 0, heavy = 0;
  const days = p.days.filter((d) => d.items.length);
  days.forEach((d) => d.items.forEach((it) => {
    const r = 10 - rpeMid(it.rpeMin, it.rpeMax);
    if (isPlyo(it.exId) || isSkill(it.exId) || isWarmEx(it.exId) || isFight(it.exId) || r > 4) return;
    const n = Number(it.sets || 0);
    sets += n; rir += r * n;
    const m = exMeta(it.exId, it.name);
    if (m && m.fat === 3) heavy += n;
  }));
  return { sets: Math.max(4, sets), rir: sets ? clamp(Math.round((rir / sets) * 2) / 2, 0, 4) : 2, n: clamp(days.length || 1, 1, 6), heavy: sets ? Math.round((heavy / sets) * 10) * 10 : 0, sleepLast: 7.5, sleepAvg: 7.5, deload: false };
}
// Programı 3 hafta boyunca, her tür kendi gününde 18:00'de yapılmış gibi işletir; 3. haftanın değerleri raporlanır
export function simulatePlan(p) {
  const days = p.days.filter((d) => d.items.length);
  if (!days.length) return null;
  const dayLoad = (d) => d.items.reduce((a, it) => {
    const lib = exMeta(it.exId, it.name);
    if (lib && lib.kind === 'plyo') return a + Number(it.sets || 0) * repMid(it.repMin, it.repMax) * PLYO_W[lib.int || 2];
    if (lib && lib.kind === 'beceri') return a + Number(it.sets || 0) * repMid(it.repMin, it.repMax) * SKILL_W[lib.fat || 1];
    if (lib && lib.kind === 'dovus') return a + Number(it.sets || 0) * fightW({ dur: Number(it.dur) || 3, z: Number(it.z) || 3 }, lib);
    if (lib && lib.kind === 'isinma') return a;
    const r = 10 - rpeMid(it.rpeMin, it.rpeMax);
    return r > 4 ? a : a + Number(it.sets || 0) * proxW(r) * costW(it.exId, it.name);
  }, 0);
  const fixed = days.filter((d) => d.weekday != null);
  const slots = days.map((d, i) => {
    const wd = d.weekday != null ? (d.weekday + 6) % 7 : fixed.length ? null : Math.round((i * 7) / days.length);
    return { d, h: wd == null ? null : wd * 24 + 18, w: dayLoad(d) };
  }).filter((x) => x.h != null);
  if (!slots.length) return null;
  const events = [];
  for (let wk = 0; wk < 3; wk++) slots.forEach((x) => events.push({ h: wk * 168 + x.h, w: x.w, d: x.d, wk }));
  events.sort((a, b) => a.h - b.h);
  const at = (h) => events.filter((e) => e.h < h).reduce((a, e) => a + e.w * decayK(h - e.h), 0);
  const per = events.filter((e) => e.wk === 2).map((e) => { const pre = at(e.h); return { d: e.d, pre: loadScore(pre), post: loadScore(pre + e.w) }; });
  return { per, pre: per.reduce((a, x) => a + x.pre, 0) / per.length, post: Math.max(...per.map((x) => x.post)), unplaced: days.length - slots.length };
}
// Toparlanmış önerisi: ekranda başka önerilerle birleşirken bu metinle ayıklanır (dile bağlı regex yok).
export const REC_FRESH = 'Toparlanmış görünüyorsun. Plana göre yüklen; ilerlemeyi küçük adımlarla yap.';
export function fatigueRecs(f) {
  // f: { pre|score, post?, sleepLast, sleepAvg, n?, rir?, perSession?, fail? }
  const r = [];
  const score = f.score != null ? f.score : f.pre;
  if (f.sleepLast != null && f.sleepLast < 6.5) r.push(t('Dün gece {h} sa: maksimal kuvvet ortalama ~%3, çok tekrarlı setler ~%10 düşebilir ve aynı yük daha ağır hissedilir. Ağır setlerde hedefi 1 tekrar erken bitir.', { h: nf(f.sleepLast) }));
  if (f.sleepAvg != null && f.sleepAvg < 6.5 && f.sleepN !== 1) r.push(t('Son gecelerin ortalaması {h} sa. Birkaç gece üst üste kısa uyku tek geceden daha çok düşürür; önce uykuyu 7 saatin üstüne çıkar.', { h: nf(Math.round(f.sleepAvg * 10) / 10) }));
  if (score >= 70) r.push(t('Yorgunluk yüksek: bugün hafif çalış ya da dinlen. Birkaç gün üst üste böyleyse 1 hafta hacmi %40–50 azalt (deload).'));
  else if (score >= 40) r.push(t('Yorgunluk birikiyor: setleri 2–3 tekrar kala bitir, aynı kas grubunu ağır çalışmadan önce 48 sa ver.'));
  if (f.rir != null && f.rir <= 1) r.push(t('Setlerin çoğu tükenişte. Tükeniş toparlanmayı 24–48 sa uzatır; 1–3 tekrar kala bitirmek benzer kazanım sağlar.'));
  if (f.perSession != null && f.perSession > 24) r.push(t('Seans başına {n} zor set çok. Hacmi daha fazla seansa böl.', { n: Math.round(f.perSession) }));
  if (f.post != null && f.post >= 85) r.push(t('Seans sonrası tepe çok yüksek; en ağır günleri arka arkaya koyma.'));
  if (score < 40 && !r.length) r.push(t(REC_FRESH));
  return r.slice(0, 3);
}
export function e1Series(sessions, exId, name) {
  return sessions.filter((s) => s.status === 'done').map((s) => {
    let best = 0;
    s.items.forEach((it) => { if ((exId && it.exId === exId) || (!exId && it.name === name)) best = Math.max(best, bestE1(it.sets)); });
    return { t: s.startedAt, v: best };
  }).filter((p) => p.v > 0).sort((a, b) => a.t - b.t);
}
export function prevPerf(sessions, item, beforeTs) {
  const s = sessions.filter((x) => x.status === 'done' && x.startedAt < beforeTs).sort((a, b) => b.startedAt - a.startedAt)
    .find((x) => x.items.some((it) => (item.exId && it.exId === item.exId) || it.name === item.name));
  if (!s) return null;
  const it = s.items.find((i) => (item.exId && i.exId === item.exId) || i.name === item.name);
  return it && it.sets.length ? it.sets.map((z) => z.fight ? fightSetTxt(z) : z.skill ? skillSetTxt(z) : z.plyo ? (Number(z.kg) ? '+' + nf(Number(z.kg)) + '×' : '') + z.reps : nf(Number(z.kg)) + '×' + z.reps).join(', ') : null;
}

// Antrenmana başlarken ve bitirirken yorgunluk (o günün uykusu dahil)
export function sessionFatigue(s, st) {
  if (s.fatigue && s.fatigue.v === 2) return s.fatigue;
  const pre = fatigueAt(st, s.startedAt - 1).score;
  const post = fatigueAt(st, s.endedAt || s.startedAt).score;
  return { v: 2, pre, post };
}
export function periodMetrics(list, days) {
  let dur = 0, sets = 0, hard = 0, ton = 0, rpe = 0, rset = 0, contacts = 0;
  list.forEach((s) => {
    const ss = sessionStats(s);
    dur += ss.dur; sets += ss.sets.length; hard += ss.hard.length; ton += ss.tonnage;
    rpe += ss.sets.reduce((a, x) => a + (x.plyo || x.skill ? 0 : Number(x.rpe || 0)), 0);
    rset += ss.sets.filter((x) => !x.plyo && !x.skill && !x.fight).length; contacts += ss.contacts;
  });
  const n = list.length;
  const span = days || Math.max(7, n ? (Date.now() - list[n - 1].startedAt) / DAY_MS : 7);
  return { n, dur, avgDur: n ? dur / n : 0, sets, hard, ton, contacts, avgRpe: rset ? rpe / rset : 0, perWeek: n / (span / 7) };
}
export function historyWarnings(st, list) {
  const w = [];
  const now = Date.now();
  const done = st.sessions.filter((s) => s.status === 'done');
  const fz = fatigueAt(st, now);
  const sc = Math.round(fz.score);
  if (sc >= 70) w.push({ lv: 'bad', t: t('Yorgunluk yüksek · {n}', { n: sc }), d: t('Bugün hafif çalış ya da dinlen. Günlerce böyleyse 1 hafta hacmi %40–50 azalt.') });
  else if (sc >= 40) w.push({ lv: 'warn', t: t('Yorgunluk birikiyor · {n}', { n: sc }), d: t('Setleri 2–3 tekrar kala bitir; aynı kası ağır çalışmadan önce 48 sa ver.') });
  if (fz.sleep.known && !fz.sleep.lastAvg && fz.sleep.last < 6.5) w.push({ lv: 'warn', t: t('Dün gece {h} sa uyku', { h: nf(fz.sleep.last) }), d: t('Maksimal kuvvet ~%3, çok tekrarlı setler ~%10 düşebilir. Ağır setlerde 1 tekrar erken bitir.') });
  const ls = logStats(st.sessions, now);
  Object.entries(ls.muscles).filter(([, n]) => n > 20).sort((a, b) => b[1] - a[1]).forEach(([m, n]) => w.push({ lv: 'bad', t: t('{m} · 7 günde {n} zor set', { m: muscleName(m), n }), d: t('20 setin üstünde toparlanma uzar. Hacmi azalt ya da 2–3 güne böl.') }));
  const sets = [];
  list.forEach((s) => s.items.forEach((it) => it.sets.forEach((x) => { if (!x.plyo && !x.skill && !x.fight) sets.push(x); })));
  if (sets.length >= 6) {
    const avgRpe = sets.reduce((a, x) => a + Number(x.rpe || 0), 0) / sets.length;
    if (avgRpe >= 9) w.push({ lv: 'warn', t: t('Ortalama RPE {n}', { n: nf(Math.round(avgRpe * 10) / 10) }), d: t('Setlerin çoğunu 1–3 tekrar kala bitir. Kazanım benzer, yorgunluk daha az.') });
    const fail = sets.filter((x) => x.rir <= 0.5).length / sets.length;
    if (fail >= 0.3) w.push({ lv: 'warn', t: t('Setlerin {p}’i tükenişte', { p: pct(Math.round(fail * 100)) }), d: t('Tükeniş toparlanmayı 24–48 sa uzatır. 1–3 tekrar kala bitirmek benzer kazanım sağlar.') });
  }
  const sl = periodSleep(st, now, 7);
  if (sl.n >= 2 && sl.avg < 7) {
    w.push({ lv: 'warn', t: t('Uyku ortalaması {h} sa', { h: nf(Math.round(sl.avg * 10) / 10) }), d: t('Son 7 gün. 7 saatin altı aynı yükü daha ağır hissettirir.') });
  }
  const seen = {};
  done.forEach((s) => s.items.forEach((it) => { if (bestE1(it.sets)) seen[it.exId || it.name] = it; }));
  Object.values(seen).forEach((it) => {
    const ser = e1Series(st.sessions, it.exId, it.name);
    if (ser.length < 3) return;
    const last = ser[ser.length - 1];
    if (now - last.t > 14 * DAY_MS) return;
    const best = Math.max(...ser.slice(0, -1).map((x) => x.v));
    const drop = 1 - last.v / best;
    if (drop >= 0.05) w.push({ lv: 'warn', t: t('{x} · e1RM {p} düştü', { x: exName(it), p: pct(Math.round(drop * 100)) }), d: t('En iyi {a} kg, son {b} kg. Yorgunluk birikmiş olabilir.', { a: nf(Math.round(best * 2) / 2), b: nf(Math.round(last.v * 2) / 2) }) });
  });
  if (done.some((s) => now - s.startedAt < 7 * DAY_MS)) {
    const plan = {};
    st.programs.forEach((p) => p.days.forEach((d) => d.items.forEach((i) => { plan[i.muscle] = 1; })));
    const low = MAIN_MUSCLES.filter((m) => plan[m] && (ls.muscles[m] || 0) < 10);
    if (low.length) w.push({ lv: 'info', t: t('Az çalışan: {list}', { list: low.map((m) => muscleName(m) + ' ' + nf(ls.muscles[m] || 0)).join(', ') }), d: t('Son 7 gün zor set. Kas başına haftada 10–20 sık önerilir.') });
  }
  const bigPlyo = list.map((s) => sessionStats(s).contacts).filter((c) => c > 140);
  if (bigPlyo.length) w.push({ lv: 'warn', t: t('Seans başına {n} sıçrama teması', { n: Math.max(...bigPlyo) }), d: t('Pliometrikte ileri seviye için bile 120–140 temas önerilir; fazlası kaliteyi düşürür, sakatlık riskini artırır.') });
  if (done.length) {
    const gap = Math.floor((now - done[0].startedAt) / DAY_MS);
    if (gap >= 6) w.push({ lv: 'info', t: t('{n} gündür antrenman yok', { n: gap }), d: t('Uzun aradan sonra ilk antrenmanda yükü %5–10 düşük başla.') });
  }
  return w;
}
