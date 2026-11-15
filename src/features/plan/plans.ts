import type { Program, ProgramDay, Session } from '../../lib/store/types';

const clone = <T>(o: T): T => JSON.parse(JSON.stringify(o));
const rid = () => Math.random().toString(36).slice(2, 8);
const newId = (p: string) => p + '_' + Date.now().toString(36) + rid();

export function dateKey(ts: number | Date = Date.now()): string {
  const d = ts instanceof Date ? ts : new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function weekdaysOf(day: Partial<ProgramDay> | null | undefined): number[] {
  if (!day) return [];
  if (Array.isArray(day.weekdays)) {
    return [...new Set(day.weekdays.filter((w) => Number.isInteger(w) && w >= 0 && w <= 6))];
  }
  if (day.weekday != null && Number.isInteger(Number(day.weekday)) && Number(day.weekday) >= 0 && Number(day.weekday) <= 6) {
    return [Number(day.weekday)];
  }
  return [];
}

export function normalizeDay(day: ProgramDay): ProgramDay {
  const weekdays = weekdaysOf(day);
  const dates = Array.isArray(day.dates) ? [...new Set(day.dates.filter(Boolean))].sort() : [];
  const skip = Array.isArray(day.skip) ? [...new Set(day.skip.filter(Boolean))].sort() : [];
  const next: ProgramDay = {
    ...clone(day),
    weekdays,
    dates,
    skip,
    items: Array.isArray(day.items) ? clone(day.items) : [],
  };
  delete next.weekday;
  return next;
}

export function allPlans(programs: Program[] = []): { programId: string; day: ProgramDay }[] {
  const sorted = [...programs].sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
  const out: { programId: string; day: ProgramDay }[] = [];
  for (const p of sorted) {
    for (const d of p.days || []) {
      out.push({ programId: p.id, day: normalizeDay(d) });
    }
  }
  return out;
}

export function plansOn(
  keyOrTs: string | number | Date,
  programs: Program[] = [],
): { programId: string; day: ProgramDay; src: 'hafta' | 'tek' }[] {
  const key = typeof keyOrTs === 'string' ? keyOrTs : dateKey(keyOrTs);
  const wd = parseDateKey(key).getDay();
  const out: { programId: string; day: ProgramDay; src: 'hafta' | 'tek' }[] = [];
  for (const { programId, day } of allPlans(programs)) {
    if (!day.items || !day.items.length) continue;
    const isWeekly = (day.weekdays || []).includes(wd) && !(day.skip || []).includes(key);
    const isOnce = (day.dates || []).includes(key);
    if (isWeekly) out.push({ programId, day, src: 'hafta' });
    else if (isOnce) out.push({ programId, day, src: 'tek' });
  }
  return out;
}

const sameDayKey = (ts: number, key: string) => dateKey(ts) === key;

export function nextPlanned(
  programs: Program[] = [],
  sessions: Session[] = [],
  from: number | Date = Date.now(),
) {
  const base = from instanceof Date ? from : new Date(from);
  for (let off = 0; off < 14; off++) {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + off);
    const key = dateKey(d);
    const plans = plansOn(key, programs);
    const hit = plans.find(
      (pl) =>
        !(
          off === 0 &&
          (sessions || []).some(
            (s) => (s.status == null || s.status === 'done') && s.dayId === pl.day.id && sameDayKey(s.startedAt, key),
          )
        ),
    );
    if (hit) {
      const program = programs.find((p) => p.id === hit.programId) || null;
      return {
        program,
        programId: hit.programId,
        day: hit.day,
        off,
        key,
        date: key,
        weekday: d.getDay(),
        src: hit.src,
      };
    }
  }
  return null;
}

export function newPlanDoc(name = ''): Program {
  const now = Date.now();
  const day: ProgramDay = {
    id: newId('d'),
    name,
    weekdays: [],
    dates: [],
    skip: [],
    items: [],
  };
  return {
    id: newId('p'),
    name,
    createdAt: now,
    updatedAt: now,
    days: [day],
  };
}

export function upsertPlan(programs: Program[] = [], programId: string, day: ProgramDay): Program {
  const clean = normalizeDay(day);
  const existing = programs.find((p) => p.id === programId);
  const now = Date.now();
  if (!existing) {
    return {
      id: programId || newId('p'),
      name: clean.name,
      createdAt: now,
      updatedAt: now,
      days: [clean],
    };
  }
  const np = clone(existing);
  np.days = (np.days || []).map(normalizeDay);
  const idx = np.days.findIndex((d) => d.id === clean.id);
  if (idx >= 0) np.days[idx] = clean;
  else np.days.push(clean);
  if (np.days.length === 1) np.name = clean.name;
  np.updatedAt = now;
  return np;
}

export function removePlan(
  programs: Program[] = [],
  programId: string,
  dayId: string,
): { put?: Program; del?: string } {
  const existing = programs.find((p) => p.id === programId) || programs.find((p) => (p.days || []).some((d) => d.id === dayId));
  if (!existing) return { del: programId };
  const remaining = (existing.days || []).filter((d) => d.id !== dayId).map(normalizeDay);
  if (remaining.length === 0) return { del: existing.id };
  const np: Program = {
    ...clone(existing),
    days: remaining,
    updatedAt: Date.now(),
  };
  return { put: np };
}

export function addOnce(day: ProgramDay, key: string): ProgramDay {
  const nd = normalizeDay(day);
  if (!nd.dates!.includes(key)) nd.dates = [...nd.dates!, key].sort();
  if (nd.skip!.includes(key)) nd.skip = nd.skip!.filter((k) => k !== key);
  return nd;
}

export function addWeekly(day: ProgramDay, wd: number): ProgramDay {
  const nd = normalizeDay(day);
  if (!nd.weekdays!.includes(wd)) nd.weekdays = [...nd.weekdays!, wd];
  return nd;
}

export function removeOn(day: ProgramDay, key: string): ProgramDay {
  const nd = normalizeDay(day);
  const wd = parseDateKey(key).getDay();
  if (nd.dates!.includes(key)) {
    nd.dates = nd.dates!.filter((k) => k !== key);
  }
  if (nd.weekdays!.includes(wd) && !nd.skip!.includes(key)) {
    nd.skip = [...nd.skip!, key].sort();
  }
  return nd;
}

export function weekProgram(programs: Program[] | Program = []): Program {
  const list = Array.isArray(programs) ? programs : [programs];
  const days: ProgramDay[] = [];
  for (const p of list) {
    for (const d of p.days || []) {
      const wds = weekdaysOf(d);
      for (const wd of wds) {
        const clean = normalizeDay(d);
        days.push({
          ...clean,
          id: wds.length > 1 ? `${clean.id}_${wd}` : clean.id,
          weekday: wd as ProgramDay['weekday'],
          weekdays: [wd],
        });
      }
    }
  }
  return {
    id: 'week',
    name: 'Haftalık yük',
    createdAt: 0,
    updatedAt: 0,
    days,
  };
}
