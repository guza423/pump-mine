export const SPEED = [
  { key: 'same', velocityLoss: 0.05 },
  { key: 'slightly-slow', velocityLoss: 0.18 },
  { key: 'clearly-slow', velocityLoss: 0.32 },
  { key: 'very-slow', velocityLoss: 0.47 },
  { key: 'grinding', velocityLoss: 0.62 },
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
  if (reps <= 1) return [4, 3, 2, 1, 0][level];
  const target = SPEED[level].velocityLoss;
  let best = 0;
  let error = Number.POSITIVE_INFINITY;
  for (let rir = 0; rir <= 10.001; rir += 0.25) {
    const candidateError = Math.abs(velocityLossFor(reps, rir) - target);
    if (candidateError < error) {
      error = candidateError;
      best = rir;
    }
  }
  return best;
}

export const e1rm = (kg: number, reps: number, rir: number) =>
  Number(kg) * (1 + (reps + rir) / 30);

export function repVelocities(reps: number, rir: number, velocityLoss: number): number[] {
  const count = Math.max(1, reps);
  const first = velocityFromPct(pctFromRepsRir(count, rir));
  const last = first * (1 - (count <= 1 ? 0 : velocityLoss));
  return Array.from({ length: count }, (_, index) =>
    count <= 1 ? first : first - (first - last) * Math.pow(index / (count - 1), 1.4),
  );
}
