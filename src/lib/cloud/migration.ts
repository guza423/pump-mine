import { db, readBackup } from '../store/database';
import type { BackupData } from '../store/types';
import { collectionFor, keyFor, kinds, type Backend } from '../store/backend';
import { mergeGuestIntoCloud } from './merge';

export interface MigrationBackend extends Backend {
  writeBatch(data: BackupData): Promise<void>;
  settle(): Promise<void>;
}

export async function migrateGuest(uid: string, cloud: MigrationBackend, stillCurrent = () => true) {
  const tables = kinds.map(k => db[collectionFor(k)]);
  // A full server read is required: cached/limited queries cannot resolve conflicts safely.
  const local = (await readBackup()).data;
  if (!kinds.some(k => local[collectionFor(k)].length)) return;
  const remote = await cloud.readAll(true);
  if (!stillCurrent()) return;
  const writes = mergeGuestIntoCloud(local, remote);
  await cloud.writeBatch(writes);
  await cloud.settle();
  if (!stillCurrent()) return;
  await db.transaction('rw', [...tables, db.snapshots, db.meta], async () => {
    // Refuse to clear if another tab changed guest data while server acknowledgements arrived.
    for (const kind of kinds) {
      const col = collectionFor(kind);
      const current = await db[col].toArray();
      const stable = (rows: typeof current) => JSON.stringify([...rows].sort((a, b) => keyFor(a).localeCompare(keyFor(b))));
      if (stable(current) !== stable(local[col] as typeof current)) throw new Error('Yerel kayıtlar değişti; taşıma yeniden denenecek.');
    }
    await db.snapshots.add({ at: Date.now(), uid, data: local });
    await db.snapshots.where('at').below(Date.now() - 30 * 864e5).delete();
    for (const table of tables) await table.clear();
    await db.meta.put({ key: 'empty-guest', value: true });
  });
}
