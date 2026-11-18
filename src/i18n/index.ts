/* ================= OUTMOVE · dil katmanı (V21) =================
   Kaynak dil Türkçe: koddaki metinler Türkçe kalır ve anahtar olarak kullanılır (gettext gibi).
   İngilizce karşılıklar `src/i18n/en/*.ts` sözlüklerindedir. Varsayılan dil İngilizce.

   t('Kaydet')                          → 'Save'
   t('{n} antrenman', { n: 3 })         → '3 workouts'   (sözlük değeri [tekil, çoğul] olabilir; n'e göre seçilir)
   tc(bağlam, metin)                    → bağlamlı anahtar: önce "bağlam|metin", yoksa "metin"
   byLang({ tr: [...], en: [...] })     → yapısal sabitler (gün, ay, profil adları); okunduğu an etkin dilde döner

   Dil değişince App ağacı yeniden kurulur (bkz. App.tsx `key={lang}`); bu yüzden metinler
   render sırasında okunduğu sürece ayrıca abonelik gerekmez. */
import { useSyncExternalStore } from 'react';
import { EN } from './en';

export type Lang = 'en' | 'tr';
export const LANGS: ReadonlyArray<{ id: Lang; label: string }> = [
  { id: 'en', label: 'English' },
  { id: 'tr', label: 'Türkçe' },
];
export const DEFAULT_LANG: Lang = 'en';
export const LANG_KEY = 'outmove.lang';

const isLang = (v: unknown): v is Lang => v === 'en' || v === 'tr';

function readStored(): Lang {
  try {
    const v = globalThis.localStorage?.getItem(LANG_KEY);
    return isLang(v) ? v : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

let cur: Lang = readStored();
const subs = new Set<() => void>();

function applyDocLang() {
  try { if (typeof document !== 'undefined') document.documentElement.lang = cur; } catch { /* yok */ }
}
applyDocLang();

export const getLang = (): Lang => cur;

export function setLang(next: Lang, persist = true) {
  if (!isLang(next)) return;
  if (persist) { try { globalThis.localStorage?.setItem(LANG_KEY, next); } catch { /* özel mod */ } }
  if (next === cur) return;
  cur = next;
  applyDocLang();
  subs.forEach((f) => f());
}

export function subscribeLang(f: () => void) {
  subs.add(f);
  return () => { subs.delete(f); };
}

export const useLang = (): Lang => useSyncExternalStore(subscribeLang, getLang, getLang);

export type Vars = Record<string, string | number | null | undefined>;
export type Entry = string | readonly [string, string];

const fill = (s: string, vars?: Vars) => (vars ? s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m)) : s);
const pick = (e: Entry, vars?: Vars) => (typeof e === 'string' ? e : (Number(vars?.n) === 1 ? e[0] : e[1]));

/** Kaynak (Türkçe) metni etkin dile çevirir. Sözlükte yoksa Türkçe döner (test yakalar). */
export function t(src: string, vars?: Vars): string {
  if (cur === 'tr') return fill(src, vars);
  const e = EN[src];
  return fill(e == null ? src : pick(e, vars), vars);
}

/** Bağlamlı çeviri: aynı Türkçe sözcüğün farklı anlamı varsa ('Kas' ay mı, kas mı). */
export function tc(ctx: string, src: string, vars?: Vars): string {
  if (cur === 'tr') return fill(src, vars);
  const e = EN[ctx + '|' + src] ?? EN[src];
  return fill(e == null ? src : pick(e, vars), vars);
}

/** Dile göre yapısal sabit. Anahtarlar iki dilde de aynı olmalı; değer okunduğu an etkin dilden gelir. */
export function byLang<T extends object>(m: { tr: T; en: T }): T {
  return new Proxy(m.tr, {
    get: (_target, p) => Reflect.get(m[cur] as object, p),
  });
}

export const locale = () => (cur === 'tr' ? 'tr-TR' : 'en-US');
export const upper = (s: string) => (s || '').toLocaleUpperCase(cur === 'tr' ? 'tr' : 'en-US');
export const lower = (s: string) => (s || '').toLocaleLowerCase(cur === 'tr' ? 'tr' : 'en-US');

/** Sayı: Türkçede 82,5 · İngilizcede 82.5 */
export function num(n: number, digits?: number): string {
  if (!Number.isFinite(n)) return '–';
  const dd = digits == null ? (Math.abs(n % 1) > 1e-9 ? 1 : 0) : digits;
  try {
    return n.toLocaleString(locale(), { minimumFractionDigits: dd, maximumFractionDigits: dd });
  } catch {
    const s = n.toFixed(dd);
    return cur === 'tr' ? s.replace('.', ',') : s;
  }
}

/** Giriş kutusu için sayı: binlik ayırıcı yok (TR 1234,5 · EN 1234.5) */
export function numIn(n: number, digits?: number): string {
  if (!Number.isFinite(n)) return '';
  const dd = digits == null ? (Math.abs(n % 1) > 1e-9 ? 1 : 0) : digits;
  const s = n.toFixed(dd);
  return cur === 'tr' ? s.replace('.', ',') : s;
}

/** Saat: 14:05 (iki dilde de 24 saat; salon kaydı için kısa ve tek biçim) */
export const clock = (ts: number) => {
  const d = new Date(ts);
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
};

/** Yüzde: Türkçede %40 · İngilizcede 40% */
export const pct = (n: number | string) => (cur === 'tr' ? '%' + n : n + '%');

/* ---------- kayıtlı veriden gelen Türkçe değerler ----------
   Kas adları ve kütüphane hareket adları belgelerde Türkçe saklanır (veri değişmez); yalnızca gösterimde çevrilir. */
export const muscleName = (m: string | null | undefined) => (m ? tc('muscle', m) : '');
