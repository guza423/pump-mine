import { db, parseBackup, restoreBackup } from './database';
import { collectionFor, emptyData, kinds, LocalBackend, type Backend, type Kind, type StoredValue } from './backend';
import { migrateGuest, type MigrationBackend } from '../cloud/migration';
import { accountError } from '../cloud/errors';
import type { PerformanceBackup } from './types';

export interface AccountUser { uid: string; email: string | null; provider: string }
export interface AccountRuntime {
  watch(next: (user: AccountUser | null) => void, error: (error: unknown) => void): () => void;
  consent(user: AccountUser): Promise<boolean>;
  accept(user: AccountUser): Promise<void>;
  backend(user: AccountUser): MigrationBackend;
  google(): Promise<void>;
  email(email: string, password: string, create: boolean): Promise<void>;
  reset(email: string): Promise<void>;
  reject(): Promise<void>;
  logout(): Promise<void>;
  deleteAccount(password?: string): Promise<void>;
}
const guest = () => ({ mode: 'guest' as 'guest' | 'user', uid: null as string | null, email: null as string | null, provider: '', pending: 0, lastSync: null as number | null, online: navigator.onLine, needsConsent: false, migrating: false, waiting: false, busy: false });
export class LogController {
  private listeners = new Set<() => void>();
  private backend: Backend = new LocalBackend();
  private unsubscribe?: () => void;
  private stopAuth?: () => void;
  private user: AccountUser | null = null;
  private runtime?: AccountRuntime;
  private generation = 0;
  private running = false;
  private closing = false;
  state = { status: 'loading', ...emptyData(), custom: [] as ReturnType<typeof emptyData>['exercises'], loaded: {} as Record<Kind, boolean>, error: null as string | null, account: guest() };
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  getSnapshot = () => this.state;
  private patch(value: Partial<typeof this.state>) { this.state = { ...this.state, ...value }; this.listeners.forEach(fn => fn()); }
  private account(value: Partial<typeof this.state.account>) { this.patch({ account: { ...this.state.account, ...value } }); }
  private failure = (error: unknown) => { this.patch({ error: accountError(error) }); };
  initializationFailed = (error: unknown) => { this.failure(error); };
  private attach(backend: Backend) {
    this.unsubscribe?.(); this.backend = backend;
    this.patch({ status: 'loading', ...emptyData(), custom: [], loaded: {} as Record<Kind, boolean> });
    this.unsubscribe = backend.listen(update => {
      const data = update.data;
      this.patch({ ...data, programs: [...data.programs].sort((a, b) => b.updatedAt - a.updatedAt), sessions: [...data.sessions].sort((a, b) => b.startedAt - a.startedAt), custom: [...data.exercises].sort((a, b) => a.name.localeCompare(b.name, 'tr')), status: update.ready ? 'db' : 'loading', loaded: Object.fromEntries(kinds.map(k => [k, update.ready])) as Record<Kind, boolean>, account: { ...this.state.account, pending: update.pending, online: update.online, lastSync: update.lastSync } });
    }, this.failure);
  }
  async start(runtime: AccountRuntime) {
    this.runtime = runtime; this.running = true; this.closing = false;
    await db.snapshots.where('at').below(Date.now() - 30 * 864e5).delete();
    if (!this.running) return;
    this.attach(new LocalBackend());
    this.stopAuth = runtime.watch(user => { if (!this.closing) void this.onUser(user).catch(this.failure); }, this.failure);
    window.addEventListener('online', this.retry);
    window.addEventListener('offline', this.offline);
  }
  stop = () => {
    this.running = false; this.generation++;
    this.unsubscribe?.(); this.stopAuth?.();
    window.removeEventListener('online', this.retry); window.removeEventListener('offline', this.offline);
  };
  private offline = () => this.account({ online: false });
  private retry = () => { if (this.user && this.state.account.waiting) void this.onUser(this.user).catch(this.failure); };
  retryMigration = () => this.user ? this.onUser(this.user) : Promise.resolve();
  private async onUser(user: AccountUser | null) {
    if (this.user?.uid !== user?.uid && this.state.account.mode === 'user') {
      this.account(guest()); this.attach(new LocalBackend());
    }
    this.user = user;
    const generation = ++this.generation;
    if (!user) {
      this.account(guest()); this.attach(new LocalBackend());
      return;
    }
    this.account({ uid: user.uid, email: user.email, provider: user.provider });
    try {
      const consent = await this.runtime!.consent(user);
      if (!this.running || generation !== this.generation) return;
      if (!consent) { this.account({ needsConsent: true }); return; }
      await this.connect(user, generation);
    } catch (e) {
      if (generation !== this.generation) return;
      this.account({ waiting: true, migrating: false }); this.failure(e);
    }
  }
  private async connect(user: AccountUser, generation: number) {
    const cloud = this.runtime!.backend(user);
    const local = await this.backend.readAll();
    const hasLocal = this.state.account.mode === 'guest' && kinds.some(k => local[collectionFor(k)].length);
    if (hasLocal && !navigator.onLine) { this.account({ waiting: true, needsConsent: false }); this.patch({ error: 'İnternete bağlanınca taşınacak.' }); return; }
    this.account({ migrating: true, waiting: false, needsConsent: false });
    try {
      await migrateGuest(user.uid, cloud, () => this.running && generation === this.generation);
      if (!this.running || generation !== this.generation) return;
      this.account({ mode: 'user', migrating: false, waiting: false }); this.patch({ error: null }); this.attach(cloud);
    } catch (e) {
      this.account({ migrating: false, waiting: true }); throw e;
    }
  }
  private writable() {
    if (this.state.account.migrating || this.closing) throw new Error('Veriler taşınıyor. Biraz bekle.');
  }
  put = async (kind: Kind, value: StoredValue) => { try { this.writable(); await this.backend.put(kind, value); } catch (e) { this.failure(e); } };
  del = async (kind: Kind, id: string) => { try { this.writable(); await this.backend.del(kind, id); } catch (e) { this.failure(e); } };
  google = () => this.runtime!.google();
  email = (email: string, password: string, create = false) => this.runtime!.email(email, password, create);
  reset = (email: string) => this.runtime!.reset(email);
  acceptConsent = async () => {
    if (!this.user) return;
    this.account({ busy: true });
    try { await this.runtime!.accept(this.user); await this.connect(this.user, this.generation); }
    finally { this.account({ busy: false }); }
  };
  rejectConsent = async () => { if (this.state.account.busy) return; try { await this.runtime!.reject(); } catch (e) { this.failure(e); } };
  private canLeave() {
    if (this.state.account.pending > 0 || this.state.account.migrating || this.state.account.waiting || this.state.status === 'loading') throw new Error('Kayıtlar henüz buluta gitmedi. İnternete bağlanıp bekle.');
  }
  logout = async () => {
    this.canLeave(); this.closing = true; this.account({ busy: true }); this.unsubscribe?.();
    try { await this.runtime!.logout(); } catch (e) { this.closing = false; this.account({ busy: false }); this.attach(this.backend); throw e; }
  };
  deleteAccount = async (password?: string) => {
    this.canLeave();
    if (!navigator.onLine) throw new Error('Hesabı silmek için internete bağlan.');
    this.closing = true; this.account({ busy: true }); this.unsubscribe?.();
    try { await this.runtime!.deleteAccount(password); } catch (e) { this.closing = false; this.account({ busy: false }); this.attach(this.backend); throw e; }
  };
  readBackup = async (): Promise<PerformanceBackup> => ({ format: 'performance-backup', version: 2, exportedAt: new Date().toISOString(), data: await this.backend.readAll() });
  restoreBackup = async (value: PerformanceBackup) => {
    this.writable();
    const parsed = parseBackup(value);
    if (this.state.account.mode === 'guest') { await restoreBackup(parsed); return; }
    const previous = await this.backend.readAll();
    for (const kind of kinds) {
      const col = collectionFor(kind);
      const restored = new Set(parsed.data[col].map(row => 'key' in row ? row.key : row.id));
      for (const row of previous[col]) {
        const id = 'key' in row ? row.key : row.id;
        if (!restored.has(id)) this.backend.del(kind, id);
      }
      for (const row of parsed.data[col]) this.backend.put(kind, row);
    }
  };
}
