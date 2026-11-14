// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LogController } from './controller';
import { db, readBackup } from './database';
import { createTestRuntime, MemoryCloud } from '../../test/cloudRuntime';
import { migrateGuest } from '../cloud/migration';
import type { Program } from './types';

const program: Program = { id: 'p1', name: 'Misafir programı', createdAt: 1, updatedAt: 2, days: [] };
let controller: LogController;
beforeEach(async () => { await db.delete(); await db.open(); controller = new LogController(); Object.defineProperty(navigator, 'onLine', { configurable: true, value: true }); });
afterEach(async () => { controller.stop(); await db.delete(); });

async function userController() {
  const env = createTestRuntime();
  await db.programs.put(program);
  await controller.start(env.runtime);
  await expect.poll(() => db.programs.count()).toBe(1);
  await controller.google();
  await expect.poll(() => controller.state.account.needsConsent).toBe(true);
  await controller.acceptConsent();
  await expect.poll(() => controller.state.account.mode).toBe('user');
  return env;
}

describe('yerel/bulut store geçişi', () => {
  it('yeni misafir start sonrasında boş başlar', async () => {
    await controller.start(createTestRuntime().runtime);
    await expect.poll(() => controller.state.status).toBe('db');
    expect(controller.state.programs).toEqual([]);
    expect(await db.programs.count()).toBe(0);
    expect(await db.settings.count()).toBe(0);
  });

  it('çıkıştan sonra ve yeniden açılınca boş misafir açılır, program tohumlanmaz', async () => {
    const env = await userController();
    await controller.logout();
    // Auth çıkış olayı gerçek runtime'da önbellek temizliğinden sonra gelir.
    controller.stop();
    controller = new LogController();
    await controller.start(env.runtime);
    await expect.poll(() => controller.state.status).toBe('db');
    expect(controller.state.account.mode).toBe('guest');
    expect(controller.state.programs).toEqual([]);
    expect(await db.programs.count()).toBe(0);
    expect(await db.snapshots.count()).toBe(1);
  });

  it('onaydan sonra taşır, sunucu onayından sonra yereli boşaltıp snapshot saklar', async () => {
    const env = await userController();
    expect(await db.programs.count()).toBe(0);
    expect(await db.settings.count()).toBe(0);
    const snapshot = (await db.snapshots.toArray())[0];
    expect(snapshot.uid).toBe('user-1');
    expect(snapshot.data.programs).toEqual([program]);
    expect(env.cloud.data.programs).toEqual([program]);
    expect(controller.state.programs).toEqual([program]);
  });

  it('bekleyen ekleme ve silme varken çıkışı engeller', async () => {
    const env = await userController();
    await controller.put('programs', { ...program, name: 'Çevrimdışı güncelleme' });
    expect(controller.state.account.pending).toBe(1);
    await expect(controller.logout()).rejects.toThrow(/henüz buluta gitmedi/);
    expect(env.runtime.logout).not.toHaveBeenCalled();
    await env.cloud.settle();
    await controller.del('programs', program.id);
    await expect(controller.logout()).rejects.toThrow(/henüz buluta gitmedi/);
    await env.cloud.settle();
    await controller.logout();
    expect(env.runtime.logout).toHaveBeenCalledOnce();
  });

  it('hesaptayken yedeği buluta geri yükler', async () => {
    const env = await userController();
    const backup = await controller.readBackup();
    backup.data.programs = [{ ...program, id: 'restored' }];
    await controller.restoreBackup(backup);
    expect(env.cloud.data.programs.map(x => x.id)).toEqual(['restored']);
    expect(await db.programs.count()).toBe(0);
    expect(controller.state.account.pending).toBeGreaterThan(0);
  });

  it('başarısız batch veya sunucu onayında yerel kayda dokunmaz; tekrar deneyebilir', async () => {
    await db.programs.put(program);
    const before = await readBackup();
    const cloud = new MemoryCloud(); cloud.batchFailure = true;
    await expect(migrateGuest('u', cloud)).rejects.toThrow();
    expect((await readBackup()).data).toEqual(before.data);
    expect(await db.snapshots.count()).toBe(0);
    cloud.batchFailure = false; cloud.settleFailure = true;
    await expect(migrateGuest('u', cloud)).rejects.toThrow();
    expect((await readBackup()).data).toEqual(before.data);
    cloud.settleFailure = false;
    await migrateGuest('u', cloud);
    expect(await db.programs.count()).toBe(0);
    expect(await db.snapshots.count()).toBe(1);
  });

  it('çevrimdışı taşımayı bekletir ve bağlantı gelince tamamlar', async () => {
    const env = createTestRuntime(); env.setConsent(true);
    await db.programs.put(program);
    await controller.start(env.runtime);
    await expect.poll(() => db.programs.count()).toBe(1);
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    await controller.google();
    await expect.poll(() => controller.state.account.waiting).toBe(true);
    expect(await db.programs.count()).toBe(1);
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    window.dispatchEvent(new Event('online'));
    await expect.poll(() => controller.state.account.mode).toBe('user');
    expect(await db.programs.count()).toBe(0);
  });

  it('taşıma sırasında başka sekmenin kaydını silmez ve 30 günden eski snapshotları temizler', async () => {
    await db.programs.put(program);
    const cloud = new MemoryCloud();
    const settle = cloud.settle.bind(cloud);
    cloud.settle = async () => { await settle(); await db.programs.put({ ...program, updatedAt: 10 }); };
    await expect(migrateGuest('u', cloud)).rejects.toThrow(/Yerel kayıtlar değişti/);
    expect((await db.programs.get('p1'))?.updatedAt).toBe(10);
    await db.snapshots.add({ uid: 'u', at: Date.now() - 31 * 864e5, data: (await readBackup()).data });
    cloud.settle = settle;
    await migrateGuest('u', cloud);
    expect(await db.snapshots.count()).toBe(1);
  });
});
