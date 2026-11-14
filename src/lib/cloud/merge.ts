import type { BackupData, Session } from '../store/types';
import { emptyData } from '../store/backend';

/** Returns only guest documents that must be written; never mutates either input. */
export function mergeGuestIntoCloud(local: BackupData, cloud: BackupData): BackupData {
  const writes = emptyData();
  const programs = new Map(cloud.programs.map(x => [x.id, x]));
  writes.programs = local.programs.filter(x => !programs.has(x.id) || x.updatedAt > programs.get(x.id)!.updatedAt);
  const count = (s: Session) => s.items.reduce((n, item) => n + item.sets.length, 0);
  const sessions = new Map(cloud.sessions.map(x => [x.id, x]));
  writes.sessions = local.sessions.filter(x => !sessions.has(x.id) || count(x) > count(sessions.get(x.id)!));
  const checkins = new Map(cloud.checkins.map(x => [x.id, x]));
  writes.checkins = local.checkins.filter(x => !checkins.has(x.id) || x.at > checkins.get(x.id)!.at);
  const exercises = new Set(cloud.exercises.map(x => x.id));
  writes.exercises = local.exercises.filter(x => !exercises.has(x.id));
  const settings = new Set(cloud.settings.map(x => x.key));
  writes.settings = local.settings.filter(x => !settings.has(x.key));
  return writes;
}
