import Dexie, { type EntityTable } from 'dexie';
import type { Checkin, Exercise, PerformanceBackup, Program, Session, Setting } from './types';

export class PerformanceDatabase extends Dexie {
  programs!: EntityTable<Program, 'id'>;
  sessions!: EntityTable<Session, 'id'>;
  exercises!: EntityTable<Exercise, 'id'>;
  checkins!: EntityTable<Checkin, 'id'>;
  settings!: EntityTable<Setting, 'key'>;

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
  }
}

export const db = new PerformanceDatabase();

export async function seedInitialProgram(program: Program): Promise<void> {
  await db.transaction('rw', db.programs, db.settings, async () => {
    const seeded = await db.settings.get('initial-program-seeded');
    if (seeded) return;
    if ((await db.programs.count()) === 0) await db.programs.put(program);
    await db.settings.put({ key: 'initial-program-seeded', value: true });
  });
}

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
    (item) => item && typeof item === 'object' && typeof item.id === 'string' && item.id.length > 0,
  );
  if (!everyHasId) throw new Error('Yedekte kimliği eksik kayıt var.');
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
