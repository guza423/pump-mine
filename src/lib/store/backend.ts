import { liveQuery } from 'dexie';
import { db, readBackup } from './database';
import type { BackupData, Checkin, Exercise, Program, Session, Setting } from './types';

export type Kind = 'programs' | 'sessions' | 'custom' | 'checkins' | 'settings';
export type StoredValue = Program | Session | Exercise | Checkin | Setting;
export const kinds: Kind[] = ['programs', 'sessions', 'custom', 'checkins', 'settings'];
export const collectionFor = (kind: Kind): keyof BackupData => kind === 'custom' ? 'exercises' : kind;
export const keyFor = (value: StoredValue) => 'key' in value ? value.key : value.id;
export const emptyData = (): BackupData => ({ programs: [], sessions: [], exercises: [], checkins: [], settings: [] });
export type BackendUpdate = { data: BackupData; pending: number; online: boolean; lastSync: number | null; ready: boolean };
export interface Backend {
  listen(next: (update: BackendUpdate) => void, error: (error: unknown) => void): () => void;
  put(kind: Kind, value: StoredValue): Promise<void> | void;
  del(kind: Kind, id: string): Promise<void> | void;
  readAll(server?: boolean): Promise<BackupData>;
}

export class LocalBackend implements Backend {
  listen(next: (update: BackendUpdate) => void, error: (error: unknown) => void) {
    const sub = liveQuery(async () => (await readBackup()).data).subscribe({
      next: data => next({ data, pending: 0, online: navigator.onLine, lastSync: null, ready: true }), error,
    });
    return () => sub.unsubscribe();
  }
  async put(kind: Kind, value: StoredValue) { await db[collectionFor(kind)].put(value as never); }
  async del(kind: Kind, id: string) { await db[collectionFor(kind)].delete(id as never); }
  async readAll() { return (await readBackup()).data; }
}
