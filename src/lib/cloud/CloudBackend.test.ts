// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CloudBackend } from './CloudBackend';

const mock = vi.hoisted(() => ({ listeners: new Map<string, (snap: any) => void>(), resolves: [] as Array<() => void>, rejects: [] as Array<(e: Error) => void>, paths: [] as unknown[], batchSizes: [] as number[], constraints: [] as unknown[] }));
vi.mock('firebase/firestore', () => ({
  collection: (...path: unknown[]) => { const name = path.at(-1) as string; mock.paths.push(path.slice(1)); return { name }; },
  doc: (parent: unknown, id: string) => ({ parent, id }),
  query: (source: any, ...constraints: unknown[]) => { mock.constraints.push([source.name, constraints]); return source; },
  limit: (n: number) => ({ limit: n }), orderBy: (key: string, order: string) => ({ key, order }),
  onSnapshot: (source: any, options: unknown, next: (snap: any) => void) => { mock.listeners.set(source.name, next); return vi.fn(); },
  setDoc: () => new Promise<void>((resolve, reject) => { mock.resolves.push(resolve); mock.rejects.push(reject); }),
  deleteDoc: () => new Promise<void>(resolve => { mock.resolves.push(resolve); }),
  getDocs: async () => ({ docs: [] }), getDocsFromServer: async () => ({ docs: [] }),
  waitForPendingWrites: async () => {},
  writeBatch: () => { let size = 0; return { set: () => { size++; }, commit: async () => { mock.batchSizes.push(size); } }; },
}));

afterEach(() => { mock.listeners.clear(); mock.resolves.length = 0; mock.rejects.length = 0; mock.paths.length = 0; mock.constraints.length = 0; mock.batchSizes.length = 0; });
const snapshot = (name: string, pending = false, cached = false, docs: any[] = []) => mock.listeners.get(name)!({ docs, metadata: { hasPendingWrites: pending, fromCache: cached } });

describe('Firestore backend', () => {
  it('doğru kullanıcı yollarını ve 300/90 pencereyi kullanır; silmeyi de bekleyen sayar', async () => {
    const cloud = new CloudBackend({} as never, 'u');
    const next = vi.fn(), error = vi.fn();
    const stop = cloud.listen(next, error);
    for (const name of ['programs', 'sessions', 'exercises', 'checkins', 'settings']) snapshot(name);
    expect(mock.paths).toContainEqual(['users', 'u', 'exercises']);
    expect(mock.constraints).toContainEqual(['sessions', [{ key: 'startedAt', order: 'desc' }, { limit: 300 }]]);
    expect(mock.constraints).toContainEqual(['checkins', [{ key: 'at', order: 'desc' }, { limit: 90 }]]);
    cloud.del('programs', 'p');
    expect(next.mock.lastCall![0].pending).toBe(1);
    snapshot('programs', true, true);
    expect(next.mock.lastCall![0].pending).toBe(1);
    expect(next.mock.lastCall![0].online).toBe(false);
    mock.resolves[0](); await new Promise(resolve => setTimeout(resolve, 0));
    // A local pending deletion remains visible in snapshot metadata after an operation promise.
    expect(next.mock.lastCall![0].pending).toBe(1);
    snapshot('programs', false, false);
    expect(next.mock.lastCall![0]).toMatchObject({ pending: 0, online: true, ready: true });
    expect(next.mock.lastCall![0].lastSync).toBeTypeOf('number');
    stop();
  });

  it('çevrimdışı sunucu onayını beklemez, yazma hatasını bildirir', async () => {
    const cloud = new CloudBackend({} as never, 'u');
    const next = vi.fn(), error = vi.fn();
    const stop = cloud.listen(next, error);
    cloud.put('settings', { key: 'goal', value: 100 });
    expect(next.mock.lastCall![0].pending).toBe(1);
    mock.rejects[0](new Error('reddedildi'));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(error).toHaveBeenCalledWith(expect.objectContaining({ message: 'reddedildi' }));
    stop();
  });

  it('401 belgeyi en çok 400 lük parçalarda yazar', async () => {
    const cloud = new CloudBackend({} as never, 'u');
    await cloud.writeBatch({ programs: [], sessions: [], exercises: [], checkins: [], settings: Array.from({ length: 401 }, (_, n) => ({ key: String(n), value: n })) });
    expect(mock.batchSizes).toEqual([400, 1]);
  });
});
