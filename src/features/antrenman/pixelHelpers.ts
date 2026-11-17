import { EQ } from '../../lib/data/exlib';

export type VisKind = 'bar' | 'mk' | 'db' | 'other';

export interface EqConfig {
  vis: VisKind;
  step: number;
  min: number;
  max: number;
  W: number;
}

export const EQT: Record<VisKind, EqConfig> = {
  bar: { vis: 'bar', step: 2.5, min: 0, max: 300, W: 50 },
  mk: { vis: 'mk', step: 5, min: 0, max: 200, W: 100 },
  db: { vis: 'db', step: 2.5, min: 0, max: 80, W: 50 },
  other: { vis: 'other', step: 2.5, min: 0, max: 300, W: 50 },
};

export function eqConfig(eq?: string): EqConfig {
  if (eq === 'bb') return EQT.bar;
  if (eq === 'mk' || eq === 'cb') return EQT.mk;
  if (eq === 'db') return EQT.db;
  return EQT.other;
}

export function eqLabel(eq?: string): string {
  if (!eq) return 'Özel';
  return (EQ as Record<string, string>)[eq] || 'Diğer';
}

export const PX_SPEED_COLORS = ['#52e07c', '#c6e04a', '#ffc53d', '#ff8a3a', '#ff3b4e'] as const;

export const PX_SPEED = [
  { k: 'Aynı', d: 'İlki kadar hızlı · 5+ kaldı', rir: 5, rpe: 6, vl: 0.05 },
  { k: 'Hafif', d: 'Biraz yavaşladı · ~3 kaldı', rir: 3, rpe: 7, vl: 0.18 },
  { k: 'Belirgin', d: 'Belirgin yavaş · ~2 kaldı', rir: 2, rpe: 8, vl: 0.32 },
  { k: 'Çok', d: 'Çok yavaş · ~1 kaldı', rir: 1, rpe: 9, vl: 0.47 },
  { k: 'Zar zor', d: 'Zar zor çıktı · tükeniş', rir: 0, rpe: 10, vl: 0.62 },
] as const;

export const PX_PLYO_Q = [
  { k: 'Korundu', d: 'Yükseklik ve hız korundu', c: '#52e07c' },
  { k: 'Biraz düştü', d: 'Son tekrarlar biraz alçaldı', c: '#ffc53d' },
  { k: 'Belirgin düştü', d: 'Kalite bozuldu; seti bitir', c: '#ff3b4e' },
] as const;

export const PX_SKILL_Q = [
  { k: 'Temiz', d: 'Temiz tekrar', c: '#52e07c' },
  { k: 'Kısmen', d: 'Kısmen çıktı', c: '#ffc53d' },
  { k: 'Olmadı', d: 'Henüz çıkmadı', c: '#ff3b4e' },
] as const;

export const PL_COLORS: Record<number, string> = {
  25: '#e8384f',
  20: '#3d7fe0',
  15: '#f5c542',
  10: '#3fbf6a',
  5: '#ece8f4',
  2.5: '#4a4466',
  1.25: '#b8b4c8',
};

export const PL_DIM: Record<number, [number, number]> = {
  25: [10, 66],
  20: [10, 60],
  15: [9, 52],
  10: [8, 44],
  5: [7, 34],
  2.5: [6, 26],
  1.25: [5, 18],
};

const fan = (n: number, from: number, to: number) =>
  Array.from({ length: n }, (_, i) => ({
    a: Math.round(from + ((to - from) * i) / (n - 1)),
    far: i % 2 === 1,
  }));

export const P_UP = fan(8, -168, -12);
export const P_ALL = fan(14, -180, 154);

export function upTr(t: string): string {
  return String(t)
    .split(' ')
    .map((w) => (/[ğüşöçıİĞÜŞÖÇ]/.test(w) ? w.toLocaleUpperCase('tr') : w.toUpperCase()))
    .join(' ');
}

export function fk(v: number): string {
  return String(Math.round(v * 100) / 100).replace('.', ',');
}

export function hms(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const x = s % 60;
  return (h ? h + ':' + String(m).padStart(2, '0') : String(m)) + ':' + String(x).padStart(2, '0');
}

export function par(n: number, a: string, b: string): string {
  return n === 0 ? '' : n % 2 ? a : b;
}

export function computeBarPlates(kg: number): number[] {
  let side = Math.max(0, (kg - 20) / 2);
  const plates: number[] = [];
  [25, 20, 15, 10, 5, 2.5, 1.25].forEach((p) => {
    while (side >= p - 1e-9) {
      plates.push(p);
      side -= p;
    }
  });
  return plates;
}
