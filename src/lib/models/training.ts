export const SPEED = [
  { key: 'same', label: 'Aynı hız', rir: 5, rpe: 6, velocityLoss: 0.05 },
  { key: 'slightly-slow', label: 'Biraz yavaş', rir: 3, rpe: 7, velocityLoss: 0.18 },
  { key: 'clearly-slow', label: 'Belirgin yavaş', rir: 2, rpe: 8, velocityLoss: 0.32 },
  { key: 'very-slow', label: 'Çok yavaş', rir: 1, rpe: 9, velocityLoss: 0.47 },
  { key: 'grinding', label: 'Zar zor', rir: 0, rpe: 10, velocityLoss: 0.62 },
] as const;

const V_MIN = 0.17;

export const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

export const pctFromRepsRir = (reps: number, rir: number) =>
  1 / (1 + (reps + rir) / 30);

export function velocityFromPct(pct: number): number {
  const percentage = clamp(pct, 0.3, 1) * 100;
  const a = 8.4326;
  const b = -73.501;
  const c = 112.33 - percentage;
  return (-b - Math.sqrt(Math.max(0, b * b - 4 * a * c))) / (2 * a);
}

export const lastRepVelocityFromRir = (rir: number) => V_MIN + 0.05 * rir;

export function velocityLossFor(reps: number, rir: number): number {
  if (reps <= 1) return 0;
  const first = velocityFromPct(pctFromRepsRir(reps, rir));
  return clamp(1 - Math.min(first, lastRepVelocityFromRir(rir)) / first, 0, 0.9);
}

export function rirFromSpeed(reps: number, level: number): number {
  if (level < 0 || level >= SPEED.length) throw new RangeError('Hız seviyesi 0–4 olmalı.');
  void reps;
  return SPEED[level].rir;
}

export const e1rm = (kg: number, reps: number, rir: number) =>
  Number(kg) * (1 + (reps + rir) / 30);

export const isE1rmEligible = (reps: number, rir: number) =>
  rir <= 4 && reps + rir <= 12;

export function repVelocities(reps: number, rir: number, velocityLoss: number): number[] {
  const count = Math.max(1, reps);
  const first = velocityFromPct(pctFromRepsRir(count, rir));
  const last = first * (1 - (count <= 1 ? 0 : velocityLoss));
  return Array.from({ length: count }, (_, index) =>
    count <= 1 ? first : first - (first - last) * Math.pow(index / (count - 1), 1.4),
  );
}
