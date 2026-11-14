import { EX_LIB } from '../data/exlib';
import type { Session, SessionItem } from '../store/types';

export const isFree = (session: Pick<Session, 'dayId'>) => session.dayId == null;
export const sessionName = (session: Pick<Session, 'dayName'>) => session.dayName === 'Boş antrenman' ? 'Plansız antrenman' : session.dayName;

export function freeEntry(item: SessionItem | undefined, sessions: Session[]) {
  const lib = item ? EX_LIB.find(ex => ex.id === item.exId) : null;
  const current = item?.sets.at(-1);
  const previous = item?.exId ? sessions.filter(s => s.status === 'done')
    .flatMap(s => s.items.filter(it => it.exId === item.exId).flatMap(it => it.sets))
    .reduce<SessionItem['sets'][number] | undefined>((last, set) => !last || set.at > last.at ? set : last, undefined) : undefined;
  const last = current || previous;
  return {
    kg: last ? Number(last.kg) || 0 : lib?.kind !== 'plyo' && lib?.eq === 'bb' ? 20 : 0,
    reps: last ? last.reps : lib?.kind === 'plyo' ? 5 : lib?.kind === 'olimpik' ? 3 : 10,
    lvl: last?.lvl ?? 1, q: 0, rpe: null,
  };
}
