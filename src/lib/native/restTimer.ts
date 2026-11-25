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
  idleArm(options: { askAt: number; endAt: number; askTitle: string; askBody: string; endTitle: string; endBody: string; channel?: string }): Promise<void>;
  idleStop(options?: { clearEnd?: boolean }): Promise<void>;
  workoutShow(options: { startedAt: number; title: string; body: string; channel?: string }): Promise<void>;
  workoutHide(): Promise<void>;
  remindSet(options: { items: Array<{ at: number; title: string; body: string }>; channel?: string }): Promise<void>;
  focusSet(options: FocusOptions & { backChannel?: string; endChannel?: string }): Promise<void>;
  focusStop(): Promise<void>;
  focusResume(): Promise<{ auto: boolean }>;
  overlay(): Promise<ExactAlarm>;
  openOverlaySettings(): Promise<void>;
}
/** V37 · İdmanda telefonu bırak: 2 dk'da geri açma (`back`) ve 40 dk sonrası hareketsizlik titreşimi (`end`). */
export interface FocusOptions {
  sid: string; startedAt: number; lastInput: number; back: boolean; end: boolean;
  backTitle: string; backBody: string; endTitle: string; endBody: string;
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
    idleArm: async () => {}, idleStop: async () => {},
    workoutShow: async () => {}, workoutHide: async () => {}, remindSet: async () => {},
    focusSet: async () => {}, focusStop: async () => {}, focusResume: async () => ({ auto: false }),
    overlay: async () => NO_NEED, openOverlaySettings: async () => {},
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
async function notifyAllowed() {
  let permission = await RestTimer.checkPermissions();
  if ((permission.notifications === 'prompt' || permission.notifications === 'prompt-with-rationale') && !localStorage.getItem('restNotifyAsked')) {
    localStorage.setItem('restNotifyAsked', '1');
    permission = await RestTimer.requestPermissions();
  }
  return permission.notifications === 'granted';
}
export function startRest(rest: SessionRest, exName: string) {
  return enqueue(async () => {
    if (!(await notifyAllowed())) return;
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

// V32 · Unutulan antrenman bildirimleri (Android). Metinler kurulurken etkin dilde verilir.
export function armIdle(o: { askAt: number; endAt: number; askTitle: string; askBody: string; endTitle: string; endBody: string }) {
  return enqueue(async () => {
    if (!(await notifyAllowed())) return;
    await RestTimer.idleArm({ ...o, channel: t('Antrenman kontrolü') });
  });
}
export const stopIdle = () => enqueue(() => RestTimer.idleStop({ clearEnd: true }));

// V27: izin yoksa dinlenme bildirimi gecikebilir; Hesap ve ayarlar bunu gösterir ve ayar ekranını açar.
export async function exactAlarmStatus(): Promise<ExactAlarm> {
  if (!Capacitor.isNativePlatform()) return NO_NEED;
  try { return await RestTimer.exactAlarm(); } catch { return NO_NEED; }
}
export async function openExactAlarmSettings() {
  try { if (Capacitor.isNativePlatform()) await RestTimer.openExactAlarmSettings(); } catch { /* ayar ekranı açılamazsa sessiz geç */ }
}

// V33 · süren antrenman bildirim panelinde ileri sayan süreyle durur (antrenman bitene dek).
export function showWorkout(o: { startedAt: number; title: string; body: string }) {
  return enqueue(async () => {
    if (!(await notifyAllowed())) return;
    await RestTimer.workoutShow({ ...o, channel: t('Süren antrenman') });
  });
}
export const hideWorkout = () => enqueue(() => RestTimer.workoutHide());

// V33 · plan hatırlatmaları (bir gün önce 20:00); boş liste hepsini siler.
export function setReminders(items: Array<{ at: number; title: string; body: string }>) {
  return enqueue(async () => {
    if (items.length && !(await notifyAllowed())) return;
    await RestTimer.remindSet({ items, channel: t('Antrenman hatırlatmaları') });
  });
}

// V37 · İdmanda telefonu bırak (Android). Yerel bekçi dokunuşları kendisi sayar; JS süren idmanı ve ayarı bildirir.
export function setFocus(o: FocusOptions) {
  return enqueue(async () => {
    await notifyAllowed();
    await RestTimer.focusSet({ ...o, backChannel: t('İdmana dön'), endChannel: t('İdman sonu titreşimi') });
  });
}
export const stopFocus = () => enqueue(() => RestTimer.focusStop());
/** Uygulama az önce 2 dk kuralıyla kendiliğinden mi açıldı? (giriş sayılmaz) */
export async function focusResumedByApp(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try { return (await RestTimer.focusResume()).auto; } catch { return false; }
}
/** "Diğer uygulamaların üzerinde göster" izni (Android 10+ arka plandan açmak için). */
export async function overlayStatus(): Promise<ExactAlarm> {
  if (!Capacitor.isNativePlatform()) return NO_NEED;
  try { return await RestTimer.overlay(); } catch { return NO_NEED; }
}
export async function openOverlaySettings() {
  try { if (Capacitor.isNativePlatform()) await RestTimer.openOverlaySettings(); } catch { /* sessiz geç */ }
}
