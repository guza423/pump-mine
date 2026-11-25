// V36 · Ekran modları: anlamı olan renkler (yeşil yapıldı, kırmızı kaçırıldı/kötü, altın vurgu/seçili, mavi beceri)
// her modda aynı kalır; yalnızca zemin paleti, ortam efekti ve geçişler moda göre değişir.

export type ScreenMode = 'sakin' | 'isinma' | 'idman' | 'lab';
export type ModeTr = 'start' | 'end' | 'into' | 'out' | 'warm';

/** Geçişin ekranda kalma süresi (ms); bindirme bu süre sonunda kalkar. */
export const TR_MS: Record<ModeTr, number> = { start: 1500, end: 1300, into: 640, out: 640, warm: 640 };

type ActiveLike = { ready?: boolean } | null | undefined;

/**
 * Hangi modda olduğumuzu ekran durumundan çıkarır.
 * - Antrenman sekmesi: süren idman → idman; hazır bekleyen oturum ya da başlangıç ekranı → ısınma; bitiş özeti → sakin.
 * - Lab → lab. Dashboard, Gözlem ve plan düzenleyici → sakin.
 */
export function screenMode(o: { tab: string; editing?: boolean; active?: ActiveLike; summary?: boolean }): ScreenMode {
  if (o.editing) return 'sakin';
  if (o.tab === 'lab') return 'lab';
  if (o.tab === 'antrenman') {
    if (o.active) return o.active.ready ? 'isinma' : 'idman';
    return o.summary ? 'sakin' : 'isinma';
  }
  return 'sakin';
}

/** Sekme değişince oynayacak geçiş: süren idmana girip çıkarken şerit, idman yokken Antrenman'a girerken ısı dalgası. */
export function tabTransition(from: string, to: string, live: boolean): ModeTr | null {
  if (from === to) return null;
  if (to === 'antrenman') return live ? 'into' : 'warm';
  if (from === 'antrenman' && live) return 'out';
  return null;
}

/** Hesap'taki "Animasyonlar" açıksa her zaman; kapalıysa cihaz "animasyonları azalt" demiyorsa oynar (pixel.css ile aynı kural). */
export function motionAllowed(motion: boolean): boolean {
  if (motion) return true;
  try {
    return !(typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch {
    return true;
  }
}
