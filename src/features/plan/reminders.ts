// V33 · Plan hatırlatması: planlı günden bir gün önce saat 20:00'de telefon bildirimi (kullanıcı kararı:
// planlarda saat yok, sabit akşam saati). Önümüzdeki 14 günün planları kurulur; uygulama her açıldığında ve plan
// değiştiğinde yeniden hesaplanır. Ayar: settings 'reminders' = { plan, back, end: boolean } (varsayılan açık; back/end V37).
import type { Program, Setting } from '../../lib/store/types';
import { dateKey, plansOn } from './plans';
import { dayLabel } from '../../i18n/names';
import { t } from '../../i18n';

export const REMIND_HOUR = 20;
export const REMIND_DAYS = 14;

type RemindPrefs = { plan?: boolean; back?: boolean; end?: boolean };
const remindValue = (settings: Setting[] = []) => (settings.find((x) => x.key === 'reminders')?.value || {}) as RemindPrefs;
export const remindersOn = (settings: Setting[] = []) => remindValue(settings).plan ?? true;
/** V37 · İdmanda telefonu bırak: `back` 2 dk'da geri aç, `end` 40 dk sonra hareketsizlikte titret (ikisi de varsayılan açık). */
export const focusPrefs = (settings: Setting[] = []) => {
  const v = remindValue(settings);
  return { back: v.back ?? true, end: v.end ?? true };
};
/** Ayar değerinin tamamı (tek anahtar değişirken diğerleri korunur). */
export const remindPrefs = (settings: Setting[] = []) => {
  const f = focusPrefs(settings);
  return { plan: remindersOn(settings), back: f.back, end: f.end };
};

const isWarm = (exId?: string | null) => exId === 'isinma';

export function planReminders(programs: Program[] = [], now = Date.now(), days = REMIND_DAYS) {
  const base = new Date(now);
  const out: Array<{ at: number; title: string; body: string; key: string }> = [];
  for (let i = 1; i <= days; i++) {
    const day = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
    const key = dateKey(day);
    const list = plansOn(key, programs);
    if (!list.length) continue;
    const at = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i - 1, REMIND_HOUR, 0, 0, 0).getTime();
    if (at <= now) continue;
    const names = list.map(({ day: d }) => dayLabel(d.name) || t('Plan')).join(' + ');
    const items = list.reduce((a, { day: d }) => a + d.items.length, 0);
    const sets = list.reduce((a, { day: d }) => a + d.items.reduce((b, it) => b + (isWarm(it.exId) ? 0 : Number(it.sets) || 0), 0), 0);
    out.push({
      at,
      key,
      title: t('Yarın: {x}', { x: names }),
      body: t('{n} hareket · {s} set. İyi dinlen, yarın görüşürüz.', { n: items, s: sets }),
    });
  }
  return out;
}
