// V32 · Hareket gelişimi: yapılmış her hareketin türüne göre seans seans performansı.
// Saf işlevler; ekran `src/features/gozlem/ProgressSheets.tsx`.
import { EX_LIB } from '../data/exlib';
import { bestE1, e1Ok, e1rm } from './training';
import { dbMultiplier } from './session';

const DAY = 864e5;
/** "Son 20 gün" listesi (kullanıcı kararı): daha eski hareketler soluk, son yapıldığı tarihle. */
export const RECENT_DAYS = 20;

export type ProgKind = 'e1' | 'reps' | 'plyo' | 'skill' | 'fight';

type AnySet = { kg?: number; reps: number; rir?: number; rom?: number; plyo?: boolean; skill?: boolean; fight?: boolean; warm?: boolean; q?: number; hold?: number; dur?: number; z?: number; at?: number };
type AnyItem = { exId?: string | null; name: string; muscle?: string; sets: AnySet[] };
type AnySession = { id: string; status: string; ready?: boolean; startedAt: number; items: AnyItem[] };

const libOf = (exId?: string | null, name?: string) =>
  (exId ? EX_LIB.find((e) => e.id === exId) : undefined) || (name ? EX_LIB.find((e) => e.name === name) : undefined);
export const exKey = (it: { exId?: string | null; name: string }) => it.exId || it.name;

/* Pliometrik puan (göreli ölçek): bir setin puanı = temas × kalite × yük katsayısı.
   - Kalite: yükseklik ve hız korundu 1 · biraz düştü 0,75 · belirgin düştü 0,5. Pliometrikte performans tekrar
     sayısı değil, kalitenin korunduğu temastır (NSCA: kalite düşünce set biter).
   - Yük: 1 + ek kg / 75. Sıçramada kaldırılan kütle vücut + ek yüktür; uygulama vücut ağırlığı tutmadığı için
     75 kg referans alınır. Puan yalnızca kendi seanslarını karşılaştırmak içindir, mutlak bir güç değeri değildir.
   Seansın puanı en iyi setidir; toplam temas ayrıca hacim olarak gösterilir. */
export const PLYO_QF = [1, 0.75, 0.5];
export const PLYO_REF_KG = 75;
export const plyoSetScore = (s: AnySet) => (Number(s.reps) || 0) * (PLYO_QF[s.q ?? 0] ?? 1) * (1 + Math.max(0, Number(s.kg) || 0) / PLYO_REF_KG);
/* Dövüş (V39): seans-RPE yükü = dakika × yoğunluğun CR-10 karşılığı (Foster ve ark. 2001), keyfi birim (AU). */
const FIGHT_CR10 = [2, 4, 6, 8, 10];
// Beceri: temiz deneme 1, kısmen 0,5, olmadı 0.
const SKILL_QF = [1, 0.5, 0];

export interface ProgPoint {
  t: number;
  sid: string;
  sets: number;
  // kuvvet (ağırlıklı)
  e1?: number; ton?: number; topKg?: number; topReps?: number;
  // vücut ağırlığı
  cap?: number; maxReps?: number; totReps?: number;
  // pliometrik
  score?: number; contacts?: number; held?: number; maxKg?: number; bestReps?: number; bestQ?: number; bestKg?: number;
  // beceri
  hold?: number; clean?: number; attempts?: number;
  // dövüş (V39): raund, toplam dakika, seans-RPE yükü (dk × CR-10), en sert raund yoğunluğu
  rounds?: number; mins?: number; load?: number; maxZ?: number;
}

export interface ProgEntry {
  key: string;
  exId: string | null;
  name: string;
  kind: ProgKind;
  last: number;
  n: number;
  recent: boolean;
  points: ProgPoint[];
}

export function kindOf(exId: string | null | undefined, name: string, sets: AnySet[]): ProgKind {
  const lib = libOf(exId, name);
  if ((lib && lib.kind === 'dovus') || sets.some((s) => s.fight)) return 'fight';
  if ((lib && lib.kind === 'plyo') || sets.some((s) => s.plyo)) return 'plyo';
  if ((lib && lib.kind === 'beceri') || sets.some((s) => s.skill)) return 'skill';
  return sets.some((s) => !s.plyo && !s.skill && Number(s.kg) > 0) ? 'e1' : 'reps';
}

export function pointFor(kind: ProgKind, exId: string | null | undefined, name: string, sets: AnySet[], t: number, sid: string): ProgPoint {
  const p: ProgPoint = { t, sid, sets: sets.length };
  if (kind === 'e1') {
    const mult = dbMultiplier(exId, name);
    const str = sets.filter((s) => !s.plyo && !s.skill);
    p.e1 = bestE1(str as never);
    p.ton = str.reduce((a, s) => a + (Number(s.kg) || 0) * (Number(s.reps) || 0) * mult, 0);
    const top = str.reduce<AnySet | null>((b, s) => (!b || Number(s.kg) > Number(b.kg) || (Number(s.kg) === Number(b.kg) && s.reps > b.reps) ? s : b), null);
    p.topKg = top ? Number(top.kg) || 0 : 0;
    p.topReps = top ? top.reps : 0;
  } else if (kind === 'reps') {
    const str = sets.filter((s) => !s.plyo && !s.skill);
    // Tahmini tekrar kapasitesi = tekrar + kalan tekrar; yalnızca tükenişe yakın (RIR ≤ 4) ve tam açıklıklı setler.
    p.cap = str.filter((s) => (s.rom ?? 100) >= 90 && (s.rir ?? 9) <= 4).reduce((a, s) => Math.max(a, s.reps + (s.rir ?? 0)), 0);
    p.maxReps = str.reduce((a, s) => Math.max(a, Number(s.reps) || 0), 0);
    p.totReps = str.reduce((a, s) => a + (Number(s.reps) || 0), 0);
  } else if (kind === 'plyo') {
    const ps = sets.filter((s) => s.plyo || !s.skill);
    const best = ps.reduce<AnySet | null>((b, s) => (!b || plyoSetScore(s) > plyoSetScore(b) ? s : b), null);
    p.score = best ? Math.round(plyoSetScore(best) * 10) / 10 : 0;
    p.contacts = ps.reduce((a, s) => a + (Number(s.reps) || 0), 0);
    const heldC = ps.filter((s) => (s.q ?? 0) === 0).reduce((a, s) => a + (Number(s.reps) || 0), 0);
    p.held = p.contacts ? Math.round((heldC / p.contacts) * 100) : 0;
    p.maxKg = ps.reduce((a, s) => Math.max(a, Number(s.kg) || 0), 0);
    p.bestReps = best ? best.reps : 0;
    p.bestQ = best ? best.q ?? 0 : 0;
    p.bestKg = best ? Number(best.kg) || 0 : 0;
  } else if (kind === 'fight') {
    const fs = sets.filter((s) => s.fight);
    p.rounds = fs.length;
    p.mins = fs.reduce((a, s) => a + (Number(s.dur) || 0), 0);
    p.load = Math.round(fs.reduce((a, s) => a + (Number(s.dur) || 0) * (FIGHT_CR10[(Number(s.z) || 3) - 1] || 6), 0));
    p.maxZ = fs.reduce((a, s) => Math.max(a, Number(s.z) || 0), 0);
  } else {
    const ss = sets.filter((s) => s.skill || !s.plyo);
    p.attempts = ss.reduce((a, s) => a + (Number(s.reps) || 0), 0);
    const cleanW = ss.reduce((a, s) => a + (Number(s.reps) || 0) * (SKILL_QF[s.q ?? 0] ?? 1), 0);
    p.clean = p.attempts ? Math.round((cleanW / p.attempts) * 100) : 0;
    // Tutuş: yalnızca en azından kısmen çıkan denemelerin süresi sayılır.
    p.hold = ss.filter((s) => (s.q ?? 0) < 2).reduce((a, s) => Math.max(a, Number(s.hold) || 0), 0);
  }
  return p;
}

/** Yapılmış bütün hareketler, son yapılandan eskiye. `recent`: son RECENT_DAYS gün içinde yapıldı. */
export function exerciseIndex(sessions: AnySession[], now = Date.now()): ProgEntry[] {
  const done = (sessions || []).filter((s) => s.status === 'done' && !s.ready).sort((a, b) => a.startedAt - b.startedAt);
  const map = new Map<string, { exId: string | null; name: string; per: Map<string, { t: number; sets: AnySet[] }> }>();
  for (const s of done) {
    for (const it of s.items || []) {
      // V33 · ısınma setleri ve antrenman öncesi ısınma gelişime girmez
      const lib = libOf(it.exId, it.name);
      if (lib && lib.kind === 'isinma') continue;
      const work = (it.sets || []).filter((x) => !x.warm);
      if (!work.length) continue;
      const key = exKey(it);
      let e = map.get(key);
      if (!e) { e = { exId: it.exId || null, name: it.name, per: new Map() }; map.set(key, e); }
      const cur = e.per.get(s.id) || { t: s.startedAt, sets: [] };
      cur.sets.push(...work);
      e.per.set(s.id, cur);
    }
  }
  const out: ProgEntry[] = [];
  for (const [key, e] of map) {
    const all = [...e.per.values()].flatMap((x) => x.sets);
    const kind = kindOf(e.exId, e.name, all);
    const points = [...e.per.entries()].map(([sid, x]) => pointFor(kind, e.exId, e.name, x.sets, x.t, sid)).sort((a, b) => a.t - b.t);
    const last = points.length ? points[points.length - 1].t : 0;
    out.push({ key, exId: e.exId, name: e.name, kind, last, n: points.length, recent: now - last <= RECENT_DAYS * DAY, points });
  }
  return out.sort((a, b) => b.last - a.last);
}

/** Grafik için ölçüler: tür başına iki seçenek; ilk değeri olmayan seçenek gizlenir. */
export const METRICS: Record<ProgKind, Array<keyof ProgPoint>> = {
  e1: ['e1', 'ton'],
  reps: ['cap', 'totReps'],
  plyo: ['score', 'contacts'],
  skill: ['hold', 'clean'],
  fight: ['load', 'mins'],
};
export function seriesOf(entry: ProgEntry, metric: keyof ProgPoint) {
  return entry.points.map((p) => ({ t: p.t, v: Number(p[metric]) || 0 })).filter((p) => p.v > 0);
}
export const bestOf = (entry: ProgEntry, metric: keyof ProgPoint) => entry.points.reduce((a, p) => Math.max(a, Number(p[metric]) || 0), 0);
export const lastOf = (entry: ProgEntry, metric: keyof ProgPoint) => {
  for (let i = entry.points.length - 1; i >= 0; i--) { const v = Number(entry.points[i][metric]) || 0; if (v > 0) return v; }
  return 0;
};
// Kuvvette tek setlik en iyi e1RM'i veren set (açıklama için).
export function bestE1Set(sessions: AnySession[], key: string) {
  let best: { kg: number; reps: number; rir: number; v: number; t: number } | null = null;
  for (const s of sessions || []) {
    if (s.status !== 'done' || s.ready) continue;
    for (const it of s.items || []) {
      if (exKey(it) !== key) continue;
      for (const x of it.sets || []) {
        if (x.warm || !e1Ok(x as never)) continue;
        const v = e1rm(Number(x.kg), x.reps, x.rir ?? 0);
        if (!best || v > best.v) best = { kg: Number(x.kg), reps: x.reps, rir: x.rir ?? 0, v, t: s.startedAt };
      }
    }
  }
  return best;
}
