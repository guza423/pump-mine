import { EX_LIB } from '../data/exlib';
import type { Session, SessionItem, SessionRest } from '../store/types';
import { isFree } from './session';

export type RestPrefs = Record<string, number>;
export const clampRest = (seconds: number) => Math.max(15, Math.min(600, seconds));
export function restDuration(session: Session, item: SessionItem, prefs: RestPrefs = {}) {
  return isFree(session) ? prefs[item.exId || ''] || EX_LIB.find(ex => ex.id === item.exId)?.rest || 120 : item.target.rest || 120;
}
export function changeRest(session: Session, rest: SessionRest, delta: number, prefs: RestPrefs) {
  const next = { ...rest, total: clampRest(rest.total + delta) };
  return { rest: next, prefs: isFree(session) && rest.exId ? { ...prefs, [rest.exId]: next.total } : null };
}
