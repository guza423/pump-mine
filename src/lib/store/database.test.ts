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

  it('hatalı belge kimliği ve tablo yapısını hiçbir kaydı silmeden reddeder', async () => {
    await db.programs.put(program);
    const backup = await readBackup();
    for (const data of [
      { ...backup.data, programs: [{ ...program, days: null }] },
      { ...backup.data, settings: [{ value: 1 }] },
      { ...backup.data, checkins: [{ id: 'c_a/b', at: 1, sleep: 8 }] },
    ]) {
      await expect(restoreBackup({ ...backup, data } as never)).rejects.toThrow();
      expect(await db.programs.toArray()).toEqual([program]);
    }
  });

  it('v1 yedeğini veri kaybetmeden v2 biçimine yükseltir', () => {
    const migrated = parseBackup({
      format: 'performance-backup', version: 1, exportedAt: new Date(0).toISOString(),
      data: { programs: [program], sessions: [], exercises: [] },
    });
    expect(migrated.version).toBe(2);
    expect(migrated.data.checkins).toEqual([]);
    expect(migrated.data.programs[0].id).toBe(program.id);
  });

  it('geri yüklerken mevcut kayıtları değiştirir', async () => {
    await db.programs.put({ ...program, id: 'old' });
    const backup: PerformanceBackup = {
      format: 'performance-backup',
      version: 2,
      exportedAt: new Date(0).toISOString(),
      data: { programs: [program], sessions: [], exercises: [], checkins: [], settings: [] },
    };
    await restoreBackup(backup);
    expect(await db.programs.toArray()).toEqual([program]);
  });
});
