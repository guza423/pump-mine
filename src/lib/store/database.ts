import Dexie, { type EntityTable } from 'dexie';
import type { BackupData, Checkin, Exercise, PerformanceBackup, Program, Session, Setting } from './types';

export class PerformanceDatabase extends Dexie {
  programs!: EntityTable<Program, 'id'>;
  sessions!: EntityTable<Session, 'id'>;
  exercises!: EntityTable<Exercise, 'id'>;
  checkins!: EntityTable<Checkin, 'id'>;
  settings!: EntityTable<Setting, 'key'>;
  snapshots!: EntityTable<{ id?: number; at: number; uid: string; data: BackupData }, 'id'>;
  meta!: EntityTable<Setting, 'key'>;

  constructor(name = 'performance-training') {
    super(name);
    this.version(1).stores({
      programs: 'id, updatedAt, createdAt',
      sessions: 'id, programId, dayId, startedAt, status',
      exercises: 'id, name, muscle, createdAt',
      settings: 'key',
    });
    this.version(2).stores({
      programs: 'id, updatedAt, createdAt',
      sessions: 'id, programId, dayId, startedAt, status',
      exercises: 'id, name, muscle, createdAt',
      checkins: 'id, at',
      settings: 'key',
    });
    this.version(3).stores({ snapshots: '++id, at, uid', meta: 'key' });
  }
}

export const db = new PerformanceDatabase();

export async function readBackup(): Promise<PerformanceBackup> {
  const [programs, sessions, exercises, checkins, settings] = await Promise.all([
    db.programs.toArray(),
    db.sessions.toArray(),
    db.exercises.toArray(),
    db.checkins.toArray(),
    db.settings.toArray(),
  ]);
  return {
    format: 'performance-backup',
    version: 2,
    exportedAt: new Date().toISOString(),
    data: { programs, sessions, exercises, checkins, settings },
  };
}

export function parseBackup(value: unknown): PerformanceBackup {
  if (!value || typeof value !== 'object') throw new Error('Yedek bir JSON nesnesi olmalı.');
  const candidate = value as Omit<Partial<PerformanceBackup>, 'version'> & { version?: number };
  if (candidate.format !== 'performance-backup' || (candidate.version !== 1 && candidate.version !== 2)) {
    throw new Error('Bu dosya desteklenen bir OUTMOVE yedeği değil.');
  }
  const data = candidate.data as Partial<PerformanceBackup['data']> | undefined;
  if (!data || !Array.isArray(data.programs) || !Array.isArray(data.sessions) || !Array.isArray(data.exercises)) {
    throw new Error('Yedekte v0.7 veri tablolarından biri eksik.');
  }
  const everyHasId = [...data.programs, ...data.sessions, ...data.exercises].every(
    (item) => item && typeof item === 'object' && typeof item.id === 'string' && item.id.length > 0 && !item.id.includes('/'),
  );
  if (!everyHasId) throw new Error('Yedekte kimliği eksik kayıt var.');
  if (data.programs.some(p => typeof p.name !== 'string' || !Array.isArray(p.days) || p.days.some(d => !d || !Array.isArray(d.items)))
    || data.sessions.some(s => !Array.isArray(s.items) || s.items.some(i => !i || !Array.isArray(i.sets)))
    || data.exercises.some(e => typeof e.name !== 'string' || typeof e.muscle !== 'string')) {
    throw new Error('Yedekte program, antrenman veya hareket yapısı bozuk.');
  }
  if ((data.checkins !== undefined && (!Array.isArray(data.checkins) || data.checkins.some(c => !c || typeof c.id !== 'string' || !c.id.startsWith('c_') || c.id.includes('/') || !Number.isFinite(c.at) || !Number.isFinite(c.sleep))))
    || (data.settings !== undefined && (!Array.isArray(data.settings) || data.settings.some(s => !s || typeof s.key !== 'string' || !s.key || s.key.includes('/') || s.value === undefined)))) {
    throw new Error('Yedekte uyku veya ayar kaydı bozuk.');
  }
  return {
    format: 'performance-backup',
    version: 2,
    exportedAt: candidate.exportedAt || new Date().toISOString(),
    data: {
      programs: data.programs,
      sessions: data.sessions,
      exercises: data.exercises,
      checkins: Array.isArray(data.checkins) ? data.checkins : [],
      settings: Array.isArray(data.settings) ? data.settings : [],
    },
  };
}

export async function restoreBackup(backup: PerformanceBackup): Promise<void> {
  const parsed = parseBackup(backup);
  await db.transaction('rw', db.programs, db.sessions, db.exercises, db.checkins, db.settings, async () => {
    await Promise.all([db.programs.clear(), db.sessions.clear(), db.exercises.clear(), db.checkins.clear(), db.settings.clear()]);
    await db.programs.bulkPut(parsed.data.programs);
    await db.sessions.bulkPut(parsed.data.sessions);
    await db.exercises.bulkPut(parsed.data.exercises);
    await db.checkins.bulkPut(parsed.data.checkins);
    await db.settings.bulkPut(parsed.data.settings);
  });
}
