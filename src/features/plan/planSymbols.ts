import type { Program, Session } from '../../lib/store/types';

// V38 · Takvimde her antrenman çeşidinin kendi sembolü: plan başına şekil + renk, plansız antrenman kare.
// Yapılan antrenman dolu, planlanan (gelecek) içi boş çizilir; kaçırılan yine kırmızı çizgi (anlamlı renk değişmez).
// Renkler anlamlı renklerden (kırmızı kaçırıldı, altın bugün/seçili) uzak tutulur.

export type SymShape = 'square' | 'circle' | 'triangle' | 'diamond' | 'star' | 'plus' | 'heart';

export interface PlanSymbol {
  shape: SymShape;
  color: string;
}

/** Planlara sırayla verilen şekiller (kare plansıza ayrıldı). */
export const PLAN_SHAPES: SymShape[] = ['circle', 'triangle', 'diamond', 'star', 'plus', 'heart'];
/** Planlara sırayla verilen renkler: yeşil, mavi, mor, turkuaz, pembe, turuncu. */
export const PLAN_COLORS = ['#46d27a', '#4aa8ff', '#b07cff', '#38d9d0', '#ff7ac8', '#ff9e3d'];
/** Plansız antrenman: açık kare; beceri ağırlıklıysa beceri mavisi. */
export const FREE_SYMBOL: PlanSymbol = { shape: 'square', color: '#e8e2cf' };
export const FREE_SKILL_SYMBOL: PlanSymbol = { shape: 'square', color: '#5ab0ff' };

/** i. plana sembol: 36 farklı şekil-renk çifti, sonra döner. */
export function symbolAt(i: number): PlanSymbol {
  const n = PLAN_SHAPES.length;
  const k = ((i % (n * n)) + n * n) % (n * n);
  return { shape: PLAN_SHAPES[k % n], color: PLAN_COLORS[(k + Math.floor(k / n)) % n] };
}

/** Plan günlerinin sırası: planın oluşturulma zamanı, sonra gün sırası (yeni plan eklenince eskilerin sembolü değişmez). */
export function planOrder(programs: Program[] = []): string[] {
  return [...programs]
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0) || String(a.id).localeCompare(String(b.id)))
    .flatMap((p) => (p.days || []).map((d) => d.id));
}

const hash = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

/** Plan gününün sembolü. Silinmiş plan (kayıtta kalan dayId) kimliğinden türetilir. */
export function daySymbol(dayId: string | null | undefined, order: string[]): PlanSymbol {
  if (!dayId) return FREE_SYMBOL;
  const i = order.indexOf(dayId);
  return symbolAt(i >= 0 ? i : hash(dayId));
}

/** Biten antrenmanın sembolü: plandan geldiyse planın, değilse plansız kare. */
export function sessionSymbol(s: Pick<Session, 'dayId'>, order: string[], skillHeavy = false): PlanSymbol {
  if (s.dayId) return daySymbol(s.dayId, order);
  return skillHeavy ? FREE_SKILL_SYMBOL : FREE_SYMBOL;
}

/** 8×8 pixel şekiller ('#' dolu). */
const GRID: Record<SymShape, string[]> = {
  square: ['########', '########', '########', '########', '########', '########', '########', '########'],
  circle: ['..####..', '.######.', '########', '########', '########', '########', '.######.', '..####..'],
  triangle: ['...##...', '...##...', '..####..', '..####..', '.######.', '.######.', '########', '########'],
  diamond: ['...##...', '..####..', '.######.', '########', '########', '.######.', '..####..', '...##...'],
  star: ['...##...', '...##...', '########', '.######.', '..####..', '.######.', '.##..##.', '##....##'],
  plus: ['..####..', '..####..', '########', '########', '########', '########', '..####..', '..####..'],
  heart: ['.##..##.', '########', '########', '########', '.######.', '..####..', '...##...', '........'],
};

/** Şeklin SVG yolu. İçi boşta yalnız kenar pikselleri (komşularından biri boş olan). */
export function symbolPath(shape: SymShape, hollow = false): string {
  const g = GRID[shape];
  const on = (x: number, y: number) => y >= 0 && y < 8 && x >= 0 && x < 8 && g[y][x] === '#';
  let d = '';
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      if (!on(x, y)) continue;
      if (hollow && on(x - 1, y) && on(x + 1, y) && on(x, y - 1) && on(x, y + 1)) continue;
      d += `M${x} ${y}h1v1h-1z`;
    }
  }
  return d;
}
