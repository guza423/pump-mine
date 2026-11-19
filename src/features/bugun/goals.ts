import { EX_LIB } from '../../lib/data/exlib';
import { byLang } from '../../i18n';
import type { Goal, PerfGoal, Session, SessionItem, Setting, SkillGoal } from '../../lib/store/types';

const exMeta = (id?: string | null, name?: string | null) =>
  (id ? EX_LIB.find((e) => e.id === id) : null) ||
  (name ? EX_LIB.find((e) => e.name === name) : null) ||
  null;

export type { Goal, PerfGoal, SkillGoal };

// Gösterim etiketleri; dile göre (V21). Aşama verisi sayı olarak (0–3) saklanır.
export const SKILL_STAGES = byLang<readonly string[]>('skillstages', {
  tr: ['Başladım', 'Parçalarını yapıyorum', 'İlk temiz tekrar', 'Oturdu'],
  en: ['Started', 'Working on the parts', 'First clean rep', 'Locked in'],
});

export function sortGoals(goals: Goal[]): Goal[] {
  const active: Goal[] = [];
  const done: Goal[] = [];
  for (const g of goals) {
    if (g.type === 'skill' && g.stage === 3) done.push(g);
    else active.push(g);
  }
  return [...active, ...done];
}

export function normalizeGoal(raw: any): Goal | null {
  if (!raw || typeof raw !== 'object') return null;
  if (raw.type === 'skill') {
    const stage = ([0, 1, 2, 3].includes(Number(raw.stage)) ? Number(raw.stage) : 0) as 0 | 1 | 2 | 3;
    const m = raw.exId ? exMeta(raw.exId, raw.name) : null;
    const goal: SkillGoal = {
      id: String(raw.id || 'goal-skill'),
      type: 'skill',
      exId: raw.exId ?? null,
      name: String(raw.name || (m ? m.name : raw.exId || 'Hareket')),
      stage,
      createdAt: Number(raw.createdAt) || 0,
    };
    if (raw.due) goal.due = String(raw.due);
    if (stage === 3) goal.doneAt = Number(raw.doneAt) || Number(raw.createdAt) || Date.now();
    return goal;
  }
  if (!raw.exId && !raw.name) return null;
  const m = exMeta(raw.exId, raw.name);
  const perf: PerfGoal = {
    id: String(raw.id || 'goal'),
    type: 'perf',
    exId: String(raw.exId || (m ? m.id : '')),
    name: String(raw.name || (m ? m.name : raw.exId || '')),
    base: Number(raw.base) || 0,
    target: Number(raw.target) || 0,
    createdAt: Number(raw.createdAt) || 0,
  };
  return perf;
}

export function readGoals(settings: Setting[] = []): Goal[] {
  const goalsDoc = settings.find((x) => x.key === 'goals');
  if (goalsDoc && Array.isArray(goalsDoc.value)) {
    return sortGoals(goalsDoc.value.map(normalizeGoal).filter((x): x is Goal => x != null));
  }
  const legacyDoc = settings.find((x) => x.key === 'goal');
  if (legacyDoc && legacyDoc.value && typeof legacyDoc.value === 'object') {
    const g = normalizeGoal({ ...(legacyDoc.value as Record<string, unknown>), type: 'perf' });
    return g ? [g] : [];
  }
  return [];
}

export function upsertGoal(goals: Goal[], draft: Goal, now = Date.now()): Goal[] {
  const normalized = normalizeGoal(draft);
  if (!normalized) return sortGoals(goals);
  let item: Goal = normalized;
  if (item.type === 'skill') {
    if (item.stage === 3) {
      item = { ...item, doneAt: draft.type === 'skill' && draft.doneAt ? draft.doneAt : now };
    } else {
      const copy: SkillGoal = { ...item };
      delete copy.doneAt;
      item = copy;
    }
  }
  const idx = goals.findIndex((g) => g.id === item.id);
  const next = idx >= 0 ? goals.map((g, i) => (i === idx ? item : g)) : [...goals, item];
  return sortGoals(next);
}

export function removeGoal(goals: Goal[], id: string): Goal[] {
  return sortGoals(goals.filter((g) => g.id !== id));
}

export function advanceSkillStage(goals: Goal[], id: string, now = Date.now()): Goal[] {
  const cur = goals.find((g) => g.id === id);
  if (!cur || cur.type !== 'skill') return goals;
  const nextStage = Math.min(3, cur.stage + 1) as 0 | 1 | 2 | 3;
  const updated: SkillGoal = {
    ...cur,
    stage: nextStage,
    ...(nextStage === 3 ? { doneAt: cur.doneAt || now } : {}),
  };
  if (nextStage < 3) delete updated.doneAt;
  return upsertGoal(goals, updated, now);
}

export function matchesSkillGoal(goal: Pick<SkillGoal, 'exId' | 'name'>, it: Pick<SessionItem, 'exId' | 'name'>): boolean {
  if (goal.exId) return it.exId === goal.exId || (!it.exId && it.name === goal.name);
  return it.name === goal.name;
}

export function skillStats(
  goal: Pick<SkillGoal, 'exId' | 'name'>,
  sessions: Session[] = []
): { n: number; last: number | null } {
  let n = 0;
  let last: number | null = null;
  for (const s of sessions) {
    if (!s || s.status !== 'done') continue;
    const hasPractice = (s.items || []).some(
      (it) => it && Array.isArray(it.sets) && it.sets.length > 0 && matchesSkillGoal(goal, it)
    );
    if (hasPractice) {
      n += 1;
      const t = s.startedAt || s.endedAt || 0;
      if (last == null || t > last) last = t;
    }
  }
  return { n, last };
}
