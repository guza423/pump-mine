/* ================= OUTMOVE · dil katmanı (V21, çok dilli V26) =================
   Kaynak dil Türkçe: koddaki metinler Türkçe kalır ve anahtar olarak kullanılır (gettext gibi).
   Diğer dillerin karşılıkları dil paketlerindedir (`src/i18n/<dil>/`, kayıt `dicts.ts`, dil listesi `langs.ts`).
   Varsayılan dil İngilizce. Bir dilin sözlüğünde eksik metin İngilizce gösterilir (testler eksiği yakalar).

   t('Kaydet')                            → 'Save'
   t('{n} antrenman', { n: 3 })           → '3 workouts'   (çoğul biçimi Intl.PluralRules seçer)
   tc(bağlam, metin)                      → bağlamlı anahtar: önce "bağlam|metin", yoksa "metin"
   byLang('bağlam', { tr: [...], en: [...] }) → yapısal sabitler (gün, ay, profil adları); okunduğu an etkin dilde döner.
                                            Diğer diller Türkçe yapının her metnini sözlükten "bağlam|metin" anahtarıyla alır.

   Dil değişince App ağacı yeniden kurulur (bkz. App.tsx `key={lang}`); bu yüzden metinler
   render sırasında okunduğu sürece ayrıca abonelik gerekmez. */
import { useSyncExternalStore } from 'react';
import { PACKS } from './dicts';
import { FALLBACK_LANG, LANG_META, SOURCE_LANG, type Lang, type LangMeta } from './langs';
import type { Dict, Entry, LangPack } from './types';

export type { Lang, LangMeta } from './langs';
export type { Dict, Entry, LangPack, PluralForms } from './types';
export { LANG_META, SOURCE_LANG, FALLBACK_LANG } from './langs';

/* ---------- dil kaydı ---------- */
const META = new Map<string, LangMeta>(LANG_META.map((m) => [m.id, m]));

/** Seçilebilir diller (Hesap ve ayarlar › Language). */
export const LANGS: ReadonlyArray<LangMeta> = LANG_META;
export const DEFAULT_LANG: Lang = FALLBACK_LANG;
export const LANG_KEY = 'outmove.lang';

/** Yalnızca testler için: geçici bir dil kaydeder (ör. sözde dil). Uygulama dilleri `langs.ts` + `dicts.ts`'den gelir. */
export function registerLang(meta: LangMeta, pack: LangPack) {
  META.set(meta.id, meta);
  PACKS[meta.id] = pack;
  derived.clear();
}

export const isLang = (v: unknown): v is Lang => typeof v === 'string' && META.has(v);

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

/* ---------- çeviri ---------- */
export type Vars = Record<string, string | number | null | undefined>;

const EMPTY: Dict = {};
const dictOf = (lang: string): Dict => PACKS[lang]?.dict || EMPTY;
const FALLBACK = (): Dict => dictOf(FALLBACK_LANG);

export const locale = () => META.get(cur)?.locale || 'en-US';

const rules = new Map<string, Intl.PluralRules>();
function plural(n: number): Intl.LDMLPluralRule {
  const loc = locale();
  let r = rules.get(loc);
  if (!r) { r = new Intl.PluralRules(loc); rules.set(loc, r); }
  return r.select(n);
}

const fill = (s: string, vars?: Vars) => (vars ? s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m)) : s);
function pick(e: Entry, vars?: Vars): string {
  if (typeof e === 'string') return e;
  const cat = plural(Number(vars?.n));
  if (Array.isArray(e)) return cat === 'one' ? e[0] : e[1];
  const forms = e as Exclude<Entry, string | readonly [string, string]>;
  return forms[cat] ?? forms.other;
}

/** Kaynak (Türkçe) metni etkin dile çevirir. Etkin dilde yoksa İngilizce, o da yoksa Türkçe döner (testler yakalar). */
export function t(src: string, vars?: Vars): string {
  if (cur === SOURCE_LANG) return fill(src, vars);
  const e = dictOf(cur)[src] ?? FALLBACK()[src];
  return fill(e == null ? src : pick(e, vars), vars);
}

/** Bağlamlı çeviri: aynı Türkçe sözcüğün farklı anlamı varsa ('Kas' ay mı, kas mı). */
export function tc(ctx: string, src: string, vars?: Vars): string {
  if (cur === SOURCE_LANG) return fill(src, vars);
  const d = dictOf(cur);
  const f = FALLBACK();
  const k = ctx + '|' + src;
  const e = d[k] ?? d[src] ?? f[k] ?? f[src];
  return fill(e == null ? src : pick(e, vars), vars);
}

/* ---------- yapısal sabitler ---------- */
type ByLang<T> = { tr: T; en: T } & Partial<Record<Lang, T>>;
const BYLANG = new Map<string, { tr: unknown; en: unknown }>();
const derived = new Map<string, unknown>();

// Türkçe yapıyı gezer; her metni etkin dilin sözlüğünden "bağlam|metin" ile alır, yoksa aynı yerdeki İngilizceyi kullanır.
function derive(ctx: string, tr: unknown, en: unknown, d: Dict): unknown {
  if (typeof tr === 'string') {
    if (!tr) return tr;
    const e = d[ctx + '|' + tr];
    return typeof e === 'string' ? e : typeof en === 'string' ? en : tr;
  }
  if (Array.isArray(tr)) return tr.map((x, i) => derive(ctx, x, Array.isArray(en) ? en[i] : undefined, d));
  if (tr && typeof tr === 'object') {
    const eo = (en && typeof en === 'object' ? en : {}) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(tr).map(([k, x]) => [k, derive(ctx, x, eo[k], d)]));
  }
  return tr;
}

/** Dile göre yapısal sabit. Türkçe ve İngilizce yazılıdır; diğer diller sözlükten türetilir (bkz. byLangKeys). */
export function byLang<T extends object>(ctx: string, m: ByLang<T>): T {
  // Bağlam adı tektir (i18n.test.ts denetler); modül yeniden yüklenirse (HMR) son tanım geçerli olur.
  if (BYLANG.get(ctx) !== m) { BYLANG.set(ctx, m); for (const k of [...derived.keys()]) if (k.startsWith(ctx + '\u0000')) derived.delete(k); }
  const resolve = (): T => {
    const own = (m as Partial<Record<string, T>>)[cur];
    if (own) return own;
    const id = ctx + '\u0000' + cur;
    let v = derived.get(id) as T | undefined;
    if (!v) { v = derive(ctx, m.tr, m.en, dictOf(cur)) as T; derived.set(id, v); }
    return v;
  };
  return new Proxy(m.tr, {
    get: (_target, p) => Reflect.get(resolve() as object, p),
  });
}

/** byLang sabitlerinin çevrilecek metinleri: "bağlam|Türkçe" → İngilizce karşılık (yeni dil iş listesi ve testler için). */
export function byLangKeys(): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (ctx: string, tr: unknown, en: unknown) => {
    if (typeof tr === 'string') { if (tr) out.set(ctx + '|' + tr, typeof en === 'string' ? en : tr); return; }
    if (Array.isArray(tr)) { tr.forEach((x, i) => walk(ctx, x, Array.isArray(en) ? en[i] : undefined)); return; }
    if (tr && typeof tr === 'object') {
      const eo = (en && typeof en === 'object' ? en : {}) as Record<string, unknown>;
      for (const [k, x] of Object.entries(tr)) walk(ctx, x, eo[k]);
    }
  };
  for (const [ctx, m] of BYLANG) walk(ctx, m.tr, m.en);
  return out;
}

/* ---------- biçimler ---------- */
export const upper = (s: string) => (s || '').toLocaleUpperCase(locale());
export const lower = (s: string) => (s || '').toLocaleLowerCase(locale());

const decimals = new Map<string, string>();
/** Etkin dilin ondalık ayırıcısı: Türkçe, Almanca, Fransızca ',' · İngilizce '.' */
export function decimalSep(): string {
  const loc = locale();
  let s = decimals.get(loc);
  if (!s) {
    try { s = new Intl.NumberFormat(loc).formatToParts(1.5).find((p) => p.type === 'decimal')?.value || '.'; } catch { s = '.'; }
    decimals.set(loc, s);
  }
  return s;
}

/** Sayı: Türkçede 82,5 · İngilizcede 82.5 */
export function num(n: number, digits?: number): string {
  if (!Number.isFinite(n)) return '–';
  const dd = digits == null ? (Math.abs(n % 1) > 1e-9 ? 1 : 0) : digits;
  try {
    return n.toLocaleString(locale(), { minimumFractionDigits: dd, maximumFractionDigits: dd });
  } catch {
    return n.toFixed(dd).replace('.', decimalSep());
  }
}

/** Giriş kutusu için sayı: binlik ayırıcı yok (TR 1234,5 · EN 1234.5) */
export function numIn(n: number, digits?: number): string {
  if (!Number.isFinite(n)) return '';
  const dd = digits == null ? (Math.abs(n % 1) > 1e-9 ? 1 : 0) : digits;
  return n.toFixed(dd).replace('.', decimalSep());
}

/** Saat: 14:05 (her dilde 24 saat; salon kaydı için kısa ve tek biçim) */
export const clock = (ts: number) => {
  const d = new Date(ts);
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
};

const percents = new Map<string, string>();
/** Yüzde, dilin yazımıyla: Türkçede %40 · İngilizcede 40% · Almanca ve Fransızcada 40 % */
export function pct(n: number | string): string {
  const loc = locale();
  let p = percents.get(loc);
  if (!p) {
    try { p = new Intl.NumberFormat(loc, { style: 'percent' }).format(0.4).replace('40', '{n}'); } catch { p = '{n}%'; }
    if (!p.includes('{n}')) p = '{n}%';
    percents.set(loc, p);
  }
  return p.replace('{n}', String(n));
}

/* ---------- kayıtlı veriden gelen Türkçe değerler ----------
   Kas adları ve kütüphane hareket adları belgelerde Türkçe saklanır (veri değişmez); yalnızca gösterimde çevrilir. */
export const muscleName = (m: string | null | undefined) => (m ? tc('muscle', m) : '');

/** Kütüphane hareketinin etkin dildeki adı; dil paketinde yoksa undefined (çağıran İngilizce adı kullanır). */
export const exerciseNameIn = (id: string): string | undefined => PACKS[cur]?.exercises?.[id];
