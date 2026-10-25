export type FatigueLevel = 1 | 2 | 3;

export interface HardSetInput {
  at: number;
  rir: number;
  fatigue: FatigueLevel;
}

export interface SleepInput {
  date: string;
  hours: number;
}

export interface FatigueResult {
  training: number;
  sleep: number;
  total: number;
  recoveryHours: number;
  label: 'Yönetilebilir' | 'Birikiyor' | 'Yüksek';
}

const DAY = 86_400_000;
const HOUR = 3_600_000;
const TAU_HOURS = 36;

export const proximityWeight = (rir: number) => {
  if (rir <= 0) return 1.6;
  if (rir <= 1) return 1.3;
  if (rir <= 2) return 1.1;
  if (rir <= 3) return 1;
  if (rir <= 4) return 0.8;
  return 0;
};

export const movementCost = (fatigue: FatigueLevel) =>
  fatigue === 3 ? 1.5 : fatigue === 2 ? 1 : 0.6;

export function trainingLoad(sets: HardSetInput[], now = Date.now()): number {
  const from = now - 7 * DAY;
  return sets
    .filter((set) => set.at >= from && set.at <= now && set.rir <= 4)
    .reduce((sum, set) => {
      const ageHours = (now - set.at) / HOUR;
      return sum + proximityWeight(set.rir) * movementCost(set.fatigue) * Math.exp(-ageHours / TAU_HOURS);
    }, 0);
}

export const trainingScoreFromLoad = (load: number) =>
  100 * (1 - Math.exp(-Math.max(0, load) / 20));

export function sleepScore(nights: Array<number | null | undefined>): number {
  const known = nights.slice(0, 3).filter((value): value is number => Number.isFinite(value));
  if (!known.length) return 0;
  const last = known[0];
  const lastNight = 20 * Math.min(1, Math.max(0, (7.5 - last) / 2.5));
  const average = known.reduce((sum, value) => sum + value, 0) / known.length;
  // Bilinmeyen geceler iyi/kötü varsayılmaz; üç gecelik etkinin yalnızca bilinen payı kullanılır.
  const threeNight = 10 * Math.min(1, Math.max(0, (7 - average) / 2)) * (known.length / 3);
  return lastNight + threeNight;
}

export function recoveryHours(load: number): number {
  const targetLoad = -20 * Math.log(0.75); // training score < 25
  if (load <= targetLoad) return 0;
  return TAU_HOURS * Math.log(load / targetLoad);
}

export function fatigueResult(sets: HardSetInput[], nights: Array<number | null | undefined>, now = Date.now()): FatigueResult {
  const load = trainingLoad(sets, now);
  const training = trainingScoreFromLoad(load);
  const sleep = sleepScore(nights);
  const total = Math.min(100, training + sleep);
  return {
    training,
    sleep,
    total,
    recoveryHours: recoveryHours(load),
    label: total >= 70 ? 'Yüksek' : total >= 40 ? 'Birikiyor' : 'Yönetilebilir',
  };
}

export function isoLocalDate(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
