/* Kayıtlı veriden gelen adların gösterimi (V21).
   Belgelerde hareket ve gün adları Türkçe saklanır; veri değişmez, yalnızca ekranda çevrilir.
   Kullanıcının kendi yazdığı adlar (plan adı, özel hareket) olduğu gibi kalır. */
import { EX_LIB } from '../lib/data/exlib';
import { exerciseNameIn, getLang, t } from './index';

const BY_ID = new Map(EX_LIB.map((e) => [e.id, e]));
const BY_NAME = new Map(EX_LIB.map((e) => [e.name, e]));

type Named = { exId?: string | null; id?: string | null; name?: string | null } | null | undefined;

/** Hareket adı: kütüphane hareketi Türkçede Türkçe adıyla, diğer dillerde dil paketindeki adıyla (yoksa İngilizce adıyla);
    özel hareket yazıldığı gibi. */
export function exName(x: Named, fallback = ''): string {
  if (!x) return fallback;
  const lib = (x.exId && BY_ID.get(x.exId)) || (x.id && BY_ID.get(x.id)) || (x.name ? BY_NAME.get(x.name) : undefined);
  if (lib) return getLang() === 'tr' ? (x.name || lib.name) : (exerciseNameIn(lib.id) || lib.en);
  return x.name || fallback;
}

/** Plan günü adı: varsayılan "1. gün" biçimi çevrilir, kullanıcının verdiği ad aynen kalır. */
export function dayLabel(name: string | null | undefined): string {
  const s = String(name || '').trim();
  if (!s) return t('Adsız');
  const m = /^(\d+)\. gün$/.exec(s);
  if (m) return t('{n}. gün', { n: m[1] });
  if (s === 'Plansız antrenman' || s === 'Boş antrenman') return t('Plansız antrenman');
  return s;
}
