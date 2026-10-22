import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db, parseBackup, readBackup, restoreBackup, seedInitialProgram } from './database';
import type { PerformanceBackup, Program } from './types';

const program: Program = {
  id: 'p_test',
  name: 'Hipertrofi bloğu',
  createdAt: 1,
  updatedAt: 1,
  days: [],
};

beforeEach(async () => {
  await db.delete();
  await db.open();
});

afterEach(async () => {
  await db.delete();
});

describe('IndexedDB veri katmanı', () => {
  it('ilk programı yalnızca bir kez yükler', async () => {
    await seedInitialProgram(program);
    await seedInitialProgram({ ...program, id: 'p_second' });
    expect(await db.programs.toArray()).toEqual([program]);
  });

  it('tüm tabloları dışa aktarır ve atomik olarak geri yükler', async () => {
    await db.programs.put(program);
    const backup = await readBackup();
    await db.programs.clear();
    await restoreBackup(backup);
    expect((await db.programs.get(program.id))?.name).toBe('Hipertrofi bloğu');
    expect(backup.format).toBe('performance-backup');
  });

  it('bozuk yedekleri reddeder', () => {
    expect(() => parseBackup({ version: 1 })).toThrow(/desteklenen/);
  });

  it('geri yüklerken mevcut kayıtları değiştirir', async () => {
    await db.programs.put({ ...program, id: 'old' });
    const backup: PerformanceBackup = {
      format: 'performance-backup',
      version: 1,
      exportedAt: new Date(0).toISOString(),
      data: { programs: [program], sessions: [], exercises: [] },
    };
    await restoreBackup(backup);
    expect(await db.programs.toArray()).toEqual([program]);
  });
});
