import { collection, deleteDoc, doc, getDocs, getDocsFromServer, limit, onSnapshot, orderBy, query, setDoc, waitForPendingWrites, writeBatch, type Firestore } from 'firebase/firestore';
import { collectionFor, emptyData, keyFor, kinds, type BackendUpdate, type Kind, type StoredValue } from '../store/backend';
import type { BackupData } from '../store/types';
import type { MigrationBackend } from './migration';

export class CloudBackend implements MigrationBackend {
  private data = emptyData();
  private metadata = new Map<Kind, { pending: Set<string>; cached: boolean; pendingSnapshot: boolean }>();
  private operations = new Map<string, number>();
  private lastSync: number | null = null;
  private next?: (update: BackendUpdate) => void;
  private error?: (error: unknown) => void;
  constructor(private firestore: Firestore, readonly uid: string) {}
  private col(kind: Kind) { return collection(this.firestore, 'users', this.uid, collectionFor(kind)); }
  private emit = () => {
    const pendingIds = new Set(this.operations.keys());
    for (const [kind, meta] of this.metadata) {
      for (const id of meta.pending) pendingIds.add(kind + '/' + id);
      // A pending deletion has no document in the result, but must still block logout.
      if (meta.pendingSnapshot && !meta.pending.size && ![...pendingIds].some(x => x.startsWith(kind + '/'))) pendingIds.add(kind + '/deleted');
    }
    const ready = this.metadata.size === kinds.length;
    const online = navigator.onLine && ready && [...this.metadata.values()].every(x => !x.cached);
    if (ready && online && pendingIds.size === 0) this.lastSync = Date.now();
    this.next?.({ data: { ...this.data }, pending: pendingIds.size, online, lastSync: this.lastSync, ready });
  };
  listen(next: (update: BackendUpdate) => void, error: (error: unknown) => void) {
    this.next = next; this.error = error;
    const unsubs = kinds.map(kind => {
      const source = kind === 'sessions' ? query(this.col(kind), orderBy('startedAt', 'desc'), limit(300))
        : kind === 'checkins' ? query(this.col(kind), orderBy('at', 'desc'), limit(90)) : query(this.col(kind));
      return onSnapshot(source, { includeMetadataChanges: true }, snap => {
        const rows = snap.docs.map(d => ({ ...d.data(), [kind === 'settings' ? 'key' : 'id']: d.id }));
        (this.data[collectionFor(kind)] as unknown[]) = rows;
        this.metadata.set(kind, { cached: snap.metadata.fromCache, pendingSnapshot: snap.metadata.hasPendingWrites, pending: new Set(snap.docs.filter(d => d.metadata.hasPendingWrites).map(d => d.id)) });
        this.emit();
      }, error);
    });
    window.addEventListener('online', this.emit);
    window.addEventListener('offline', this.emit);
    return () => { unsubs.forEach(fn => fn()); window.removeEventListener('online', this.emit); window.removeEventListener('offline', this.emit); this.next = undefined; };
  }
  private track(key: string, action: () => Promise<void>) {
    this.operations.set(key, (this.operations.get(key) || 0) + 1);
    this.emit();
    // Do not return/await server acknowledgements: offline writes stay queued in IndexedDB.
    let promise: Promise<void>;
    try { promise = action(); } catch (e) { promise = Promise.reject(e); }
    void promise.catch(e => this.error?.(e)).finally(() => {
      const remaining = (this.operations.get(key) || 1) - 1;
      if (remaining) this.operations.set(key, remaining); else this.operations.delete(key);
      this.emit();
    });
  }
  put(kind: Kind, value: StoredValue) {
    const id = keyFor(value);
    this.track(kind + '/' + id, () => setDoc(doc(this.col(kind), id), JSON.parse(JSON.stringify(value))));
  }
  del(kind: Kind, id: string) { this.track(kind + '/' + id, () => deleteDoc(doc(this.col(kind), id))); }
  async readAll(server = false): Promise<BackupData> {
    const result = emptyData();
    await Promise.all(kinds.map(async kind => {
      const snap = await (server ? getDocsFromServer(this.col(kind)) : getDocs(this.col(kind)));
      (result[collectionFor(kind)] as unknown[]) = snap.docs.map(d => ({ ...d.data(), [kind === 'settings' ? 'key' : 'id']: d.id }));
    }));
    return result;
  }
  async writeBatch(data: BackupData) {
    const entries = kinds.flatMap(kind => data[collectionFor(kind)].map(row => ({ kind, row })));
    for (let offset = 0; offset < entries.length; offset += 400) {
      const batch = writeBatch(this.firestore);
      for (const { kind, row } of entries.slice(offset, offset + 400)) batch.set(doc(this.col(kind), keyFor(row)), JSON.parse(JSON.stringify(row)));
      await batch.commit();
    }
  }
  settle() { return waitForPendingWrites(this.firestore); }
}
