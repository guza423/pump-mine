import Dexie, { type EntityTable } from 'dexie';
import type { Exercise, PerformanceBackup, Program, Session } from './types';

interface Setting {
  key: string;
  value: unknown;
}

export class PerformanceDatabase extends Dexie {
  programs!: EntityTable<Program, 'id'>;
  sessions!: EntityTable<Session, 'id'>;
  exercises!: EntityTable<Exercise, 'id'>;
  settings!: EntityTable<Setting, 'key'>;

  constructor(name = 'performance-training') {
    super(name);
    this.version(1).stores({
      programs: 'id, updatedAt, createdAt',
      sessions: 'id, programId, dayId, startedAt, status',
      exercises: 'id, name, muscle, createdAt',
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
  const [programs, sessions, exercises] = await Promise.all([
    db.programs.toArray(),
    db.sessions.toArray(),
    db.exercises.toArray(),
  ]);
  return {
    format: 'performance-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    data: { programs, sessions, exercises },
  };
}

export function parseBackup(value: unknown): PerformanceBackup {
  if (!value || typeof value !== 'object') throw new Error('Yedek bir JSON nesnesi olmalı.');
  const candidate = value as Partial<PerformanceBackup>;
  if (candidate.format !== 'performance-backup' || candidate.version !== 1) {
    throw new Error('Bu dosya desteklenen bir PERFORMANCE yedeği değil.');
  }
  const data = candidate.data;
  if (!data || !Array.isArray(data.programs) || !Array.isArray(data.sessions) || !Array.isArray(data.exercises)) {
    throw new Error('Yedekte programs, sessions veya exercises listesi eksik.');
  }
  const everyHasId = [...data.programs, ...data.sessions, ...data.exercises].every(
    (item) => item && typeof item === 'object' && typeof item.id === 'string' && item.id.length > 0,
  );
  if (!everyHasId) throw new Error('Yedekte kimliği eksik kayıt var.');
  return candidate as PerformanceBackup;
}

export async function restoreBackup(backup: PerformanceBackup): Promise<void> {
  const parsed = parseBackup(backup);
  await db.transaction('rw', db.programs, db.sessions, db.exercises, async () => {
    await Promise.all([db.programs.clear(), db.sessions.clear(), db.exercises.clear()]);
    await db.programs.bulkPut(parsed.data.programs);
    await db.sessions.bulkPut(parsed.data.sessions);
    await db.exercises.bulkPut(parsed.data.exercises);
  });
}
