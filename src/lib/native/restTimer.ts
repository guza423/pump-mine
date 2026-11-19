import { Capacitor, registerPlugin } from '@capacitor/core';
import type { PermissionState } from '@capacitor/core';
import type { SessionRest } from '../store/types';
import { t } from '../../i18n';

interface RestTimerPlugin {
  checkPermissions(): Promise<{ notifications: PermissionState }>;
  requestPermissions(): Promise<{ notifications: PermissionState }>;
  start(options: { endAt: number; title: string; body: string; doneTitle: string; doneBody: string; channelRunning?: string; channelDone?: string }): Promise<void>;
  stop(): Promise<void>;
  exactAlarm(): Promise<ExactAlarm>;
  openExactAlarmSettings(): Promise<void>;
}
/** Tam zamanlı alarm izni (V27). `needed`: Android 12+; `allowed`: kullanıcı izin vermiş. */
export interface ExactAlarm { needed: boolean; allowed: boolean }
const NO_NEED: ExactAlarm = { needed: false, allowed: true };
const RestTimer = registerPlugin<RestTimerPlugin>('RestTimer', {
  web: async () => ({
    checkPermissions: async () => ({ notifications: 'denied' as const }),
    requestPermissions: async () => ({ notifications: 'denied' as const }),
    start: async () => {}, stop: async () => {},
    exactAlarm: async () => NO_NEED, openExactAlarmSettings: async () => {},
  }),
});

// İzin penceresi açıkken gelen Atla/yeni set çağrıları da aynı sırayla işlenir.
let pending = Promise.resolve();
function enqueue(action: () => Promise<void>) {
  pending = pending.then(async () => {
    try { if (Capacitor.isNativePlatform()) await action(); } catch { /* Set kaydı bildirimden bağımsızdır. */ }
  });
  return pending;
}
export function startRest(rest: SessionRest, exName: string) {
  return enqueue(async () => {
    let permission = await RestTimer.checkPermissions();
    if ((permission.notifications === 'prompt' || permission.notifications === 'prompt-with-rationale') && !localStorage.getItem('restNotifyAsked')) {
      localStorage.setItem('restNotifyAsked', '1');
      permission = await RestTimer.requestPermissions();
    }
    if (permission.notifications !== 'granted') return;
    await RestTimer.start({
      endAt: rest.start + rest.total * 1000,
      title: t('Dinlenme · {x}', { x: exName }), body: t('{n}. set sırada', { n: rest.setNo + 1 }),
      doneTitle: t('Dinlenme bitti'), doneBody: t('{x} · {n}. set zamanı', { x: exName, n: rest.setNo + 1 }),
      // Android bildirim kanallarının adı (Ayarlar › Bildirimler'de görünür)
      channelRunning: t('Dinlenme sayacı'), channelDone: t('Dinlenme bitti'),
    });
  });
}
export const stopRest = () => enqueue(() => RestTimer.stop());

// V27: izin yoksa dinlenme bildirimi gecikebilir; Hesap ve ayarlar bunu gösterir ve ayar ekranını açar.
export async function exactAlarmStatus(): Promise<ExactAlarm> {
  if (!Capacitor.isNativePlatform()) return NO_NEED;
  try { return await RestTimer.exactAlarm(); } catch { return NO_NEED; }
}
export async function openExactAlarmSettings() {
  try { if (Capacitor.isNativePlatform()) await RestTimer.openExactAlarmSettings(); } catch { /* ayar ekranı açılamazsa sessiz geç */ }
}
