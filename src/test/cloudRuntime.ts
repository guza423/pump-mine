import { vi } from 'vitest';
import { collectionFor, emptyData, keyFor, kinds, type BackendUpdate, type Kind, type StoredValue } from '../lib/store/backend';
import type { BackupData } from '../lib/store/types';
import type { AccountRuntime, AccountUser } from '../lib/store/controller';

export class MemoryCloud {
  data = emptyData();
  pending = 0;
  online = true;
  batchFailure = false;
  settleFailure = false;
  private next?: (value: BackendUpdate) => void;
  emit() { this.next?.({ data: structuredClone(this.data), pending: this.pending, online: this.online, ready: true, lastSync: this.pending ? null : Date.now() }); }
  listen(next: (value: BackendUpdate) => void) { this.next = next; this.emit(); return () => { this.next = undefined; }; }
  put(kind: Kind, value: StoredValue) {
    const rows = this.data[collectionFor(kind)] as StoredValue[];
    const idx = rows.findIndex(row => keyFor(row) === keyFor(value));
    if (idx < 0) rows.push(structuredClone(value)); else rows[idx] = structuredClone(value);
    this.pending++; this.emit();
  }
  del(kind: Kind, id: string) {
    const rows = this.data[collectionFor(kind)] as StoredValue[];
    const idx = rows.findIndex(row => keyFor(row) === id);
    if (idx >= 0) rows.splice(idx, 1);
    this.pending++; this.emit();
  }
  async readAll() { return structuredClone(this.data); }
  async writeBatch(data: BackupData) {
    if (this.batchFailure) throw new Error('sunucu yazmayı reddetti');
    kinds.forEach(kind => data[collectionFor(kind)].forEach(row => this.put(kind, row)));
  }
  async settle() {
    if (this.settleFailure) throw new Error('sunucu onayı gelmedi');
    this.pending = 0; this.emit();
  }
}

export function createTestRuntime() {
  const cloud = new MemoryCloud();
  let user: AccountUser | null = null;
  let next: ((user: AccountUser | null) => void) | undefined;
  let consent = false;
  const login = (provider: string, email = 'test@example.com') => { user = { uid: 'user-1', email, provider }; next?.(user); };
  const runtime: AccountRuntime = {
    watch(callback) { next = callback; callback(user); return () => { next = undefined; }; },
    async consent() { return consent; },
    async accept() { consent = true; },
    backend: () => cloud,
    google: vi.fn(async () => login('google.com')),
    email: vi.fn(async email => login('password', email)),
    reset: vi.fn(async () => {}),
    reject: vi.fn(async () => { user = null; next?.(null); }),
    logout: vi.fn(async () => {}),
    deleteAccount: vi.fn(async () => {}),
  };
  return { cloud, runtime, login, setConsent: (value: boolean) => { consent = value; } };
}

export let testEnvironment = createTestRuntime();
export const resetTestRuntime = () => { testEnvironment = createTestRuntime(); };
