// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { clamp, Icon, reducedMotion } from '../lab/Cns';
import { EX_LIB, MUS_CODE, EQ, PLYO_INT, addShares, canBodyweight, warmFirst, WARMUP_ID } from '../../lib/data/exlib';
import { e1Ok, bestE1, setE1 } from '../../lib/models/training';
import { dbMultiplier } from '../../lib/models/session';
import { nextPlanned } from '../plan/plans';
import { PxKgTape, PxStair } from './PxDrag';
import { HoldButton } from '../../app/HoldButton';
import { byLang, lower, num, numIn, pct, t } from '../../i18n';

/* ================= GÜNLÜK: program yazma + antrenman kaydı ================= */
const WD_LONG = byLang('wdlong', { tr: ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'], en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] });
const WD_SHORT = byLang('wdshort', { tr: ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'], en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] });
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const MONTHS = byLang('months', { tr: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] });
const MUSCLES = Object.values(MUS_CODE);
const REST_OPTS = [60, 75, 90, 120, 150, 180, 240, 300];
// EX_LIB, MUS_CODE, EQ, KIND, PLYO_INT: exlib.js
const PROF_TR = {
  a: { k: 'Altta ağır', d: 'Kas uzunken en zor; gerilmiş pozisyonda yükler' },
  u: { k: 'Üstte ağır', d: 'Kas kısalırken en zor; alt aralık hafif kalır' },
  o: { k: 'Ortada ağır', d: 'En zor nokta hareketin ortası; iki uç daha hafif' },
  d: { k: 'Dengeli', d: 'Direnç hareket boyunca benzer' },
};
const PROF_EN = {
  a: { k: 'Hardest at the bottom', d: 'Hardest with the muscle long; loads the stretched position' },
  u: { k: 'Hardest at the top', d: 'Hardest as the muscle shortens; the bottom range stays light' },
  o: { k: 'Hardest mid-range', d: 'The sticking point is mid-rep; both ends are easier' },
  d: { k: 'Even', d: 'Resistance stays similar through the whole rep' },
};
for (const P of [PROF_TR, PROF_EN]) { P.alt = P.a; P.ust = P.u; P.dengeli = P.d; }
const PROF = byLang('prof', { tr: PROF_TR, en: PROF_EN });
const FAT = byLang('fat', { tr: ['', 'Düşük', 'Orta', 'Yüksek'], en: ['', 'Low', 'Moderate', 'High'] });
const LIB_MAP = new Map(EX_LIB.map((e) => [e.id, e]));
const libById = (id) => (id ? LIB_MAP.get(id) : undefined);
const isPlyo = (exId) => { const e = libById(exId); return !!(e && e.kind === 'plyo'); };
const isSkill = (exId) => { const e = libById(exId); return !!(e && e.kind === 'beceri'); };
// V33 · antrenman öncesi ısınma (kardiyo): yalnızca süre ve yoğunluk skalası; yorgunluk, zor set, tonaj ve gelişime girmez.
const isWarmEx = (exId) => { const e = libById(exId); return !!(e && e.kind === 'isinma'); };
// Nabız skalası: sayı değil, konuşma testiyle tarif edilen 5 kademe (renkler pixel paletten, mavi → kırmızı).
const WARM_Z = byLang('warmz', {
  tr: [
    { k: 'Çok hafif', d: 'Rahat konuşursun' },
    { k: 'Hafif', d: 'Konuşursun, hafif terlersin' },
    { k: 'Orta', d: 'Kısa cümlelerle konuşursun' },
    { k: 'Yüksek', d: 'Birkaç kelime söyleyebilirsin' },
    { k: 'Çok yüksek', d: 'Konuşamazsın' },
  ],
  en: [
    { k: 'Very light', d: 'You can chat easily' },
    { k: 'Light', d: 'You can talk, light sweat' },
    { k: 'Medium', d: 'You can speak in short sentences' },
    { k: 'Hard', d: 'Only a few words at a time' },
    { k: 'Very hard', d: 'You can\'t talk' },
  ],
});
const WARM_Z_COLORS = ['#4aa8ff', '#52e07c', '#ffc53d', '#ff8a3a', '#ff3b4e'];
const warmSetTxt = (x) => t('{n} dk', { n: Number(x.dur) || 0 }) + ' · ' + (WARM_Z[(Number(x.z) || 1) - 1] || WARM_Z[0]).k;
/* V39 · dövüş (boks, güreş, kondisyon raundları): set = raund; süre (dk, yarımlık) ve yoğunluk 1–5 girilir.
   Yük seans-RPE yöntemiyle: süre × yoğunluğun CR-10 karşılığı (Foster ve ark. 2001; dövüş sporlarında yaygın).
   Zor sete, tonaja, 1RM'ye girmez; yorgunluğa girer (fatigue.ts › FIGHT_K). */
const isFight = (exId) => { const e = libById(exId); return !!(e && e.kind === 'dovus'); };
const FIGHT_Z = byLang('fightz', {
  tr: [
    { k: 'Teknik', d: 'Yavaş, tekniğe odaklı' },
    { k: 'Hafif', d: 'Rahat tempo, konuşabilirsin' },
    { k: 'Orta', d: 'Düzenli tempo, nefes hızlı' },
    { k: 'Sert', d: 'Yüksek tempo, kısa nefes' },
    { k: 'Maç', d: 'Maç temposu, son güç' },
  ],
  en: [
    { k: 'Technical', d: 'Slow, focus on technique' },
    { k: 'Light', d: 'Easy pace, you can talk' },
    { k: 'Medium', d: 'Steady pace, breathing hard' },
    { k: 'Hard', d: 'High pace, short of breath' },
    { k: 'Fight', d: 'Fight pace, all out' },
  ],
});
const FIGHT_RPE = [2, 4, 6, 8, 10]; // yoğunluk 1–5 → CR-10
const minTxt = (m) => t('{n} dk', { n: num(Number(m) || 0) });
const fightZ = (z) => FIGHT_Z[(Number(z) || 3) - 1] || FIGHT_Z[2];
const fightSetTxt = (x) => minTxt(x.dur) + ' · ' + fightZ(x.z).k;
/** Raund süresi: 0,5 dk adımla 0,5–10 dk. */
const fightDur = (v, d = 3) => clamp(Math.round((Number(v) || d) * 2) / 2, 0.5, 10);
// V33 · set özellikleri (set kaydında sağ üstten): hazır plan notlarıyla aynı Türkçe anahtarlar, ikisi yeni.
const SET_ATTRS = ['Drop set', 'Tükenişe kadar', 'Rest-pause', 'Kısmi tekrar', 'Yardımlı tekrar', 'Yavaş eksantrik', 'Altta beklet', 'Patlayıcı kaldır', 'Pump seti', 'Süperset'];
// V34 · set özelliği sete aittir ve set kaydedildikten sonra (dinlenmede ya da set ayrıntısından) eklenir.
// Durum: o setteki halin (hasta, yorgun…); nasıl geçti: setin gidişatı. Hepsi `set.tags` içinde, hesapları değiştirmez
// ("Tükenişe kadar" hariç: hızı Zar zor / RIR 0 yapar).
const SET_CONDS = ['Hasta', 'Yorgun', 'Uykusuz', 'Stresli', 'Ağrı'];
const SET_FEEL = ['Kolay geldi', 'Form bozuldu', 'Takıldı', 'Pump', 'Yardım aldım'];
// Pliometrik yorgunluk: temas başına yük, yoğunluğa göre (düşük, orta, yüksek, şok). 100 orta temas ≈ 5 orta maliyetli zor set.
const PLYO_W = [0, 0.03, 0.05, 0.08, 0.12];
const PLYO_Q = byLang('plyoq', {
  tr: [
    { k: 'Korundu', d: 'Yükseklik ve hız korundu', c: 'var(--neuro)' },
    { k: 'Biraz düştü', d: 'Son tekrarlar biraz alçaldı', c: 'var(--amber)' },
    { k: 'Belirgin düştü', d: 'Kalite bozuldu; seti bitir', c: 'var(--burn)' },
  ],
  en: [
    { k: 'Held', d: 'Height and speed held', c: 'var(--neuro)' },
    { k: 'Dropped a bit', d: 'The last reps got a little lower', c: 'var(--amber)' },
    { k: 'Clearly dropped', d: 'Quality broke down; end the set', c: 'var(--burn)' },
  ],
});
const SKILL_W = [0, 0.02, 0.04, 0.06];
const SKILL_Q = byLang('skillq', {
  tr: [
    { k: 'Temiz', d: 'Temiz tekrar', c: 'var(--ok)' },
    { k: 'Kısmen', d: 'Kısmen çıktı', c: 'var(--warn)' },
    { k: 'Olmadı', d: 'Henüz çıkmadı', c: 'var(--bad)' },
  ],
  en: [
    { k: 'Clean', d: 'Clean rep', c: 'var(--ok)' },
    { k: 'Partly', d: 'Partly there', c: 'var(--warn)' },
    { k: 'Missed', d: 'Not there yet', c: 'var(--bad)' },
  ],
});

const clone = (o) => JSON.parse(JSON.stringify(o));
const rid = () => Math.random().toString(36).slice(2, 8);
const newId = (p) => p + '_' + Date.now().toString(36) + rid();
const nf = (n, d) => num(n, d);
const hasNum = (v) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
const kgTxt = (kg) => (hasNum(kg) ? nf(Number(kg)) + ' kg' : '—');
const restTxt = (sec) => t('{n} dk', { n: sec % 60 ? nf(sec / 60, 1) : String(sec / 60) });
const mmss = (ms) => {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  return (h ? h + ':' + String(m).padStart(2, '0') : String(m)) + ':' + String(s).padStart(2, '0');
};
const durTxt = (ms) => { const m = Math.max(1, Math.round(ms / 60000)); return m < 60 ? t('{n} dk', { n: m }) : t('{h} sa {m} dk', { h: Math.floor(m / 60), m: m % 60 }); };
const dateTxt = (ts) => { const d = new Date(ts); return t('{d} {m} · {wd}', { d: d.getDate(), m: MONTHS[d.getMonth()], wd: WD_SHORT[d.getDay()] }); };
const sameDay = (a, b) => { const x = new Date(a), y = new Date(b); return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate(); };
const normTr = (s) => (s || '').toLocaleLowerCase('tr').replace(/ı/g, 'i').normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

/* ---------- hız ve yük modeli ---------- */
// Kullanıcı son tekrarın hızını ilk tekrara göre hissiyle seçer. Her seviye doğrudan kalan tekrara (RIR) bağlıdır;
// yükten bağımsızdır. Aynı hız kaybı yüzdesi hafif yükte tükenişten uzak, ağır yükte yakın demektir
// (Rodríguez-Rosell ve ark. 2020), ama kişi "zar zor çıktı" dediğinde yük ne olursa olsun tükenişe yakındır.
// RIR tabanlı RPE ile bar hızı güçlü ilişkili (Zourdos ve ark. 2016, r = −0,88).
const SPEED_TR = [
  { k: 'Aynı hız', d: 'İlki kadar hızlı · 5+ kaldı', rir: 5, vl: 0.05 },
  { k: 'Biraz yavaş', d: 'Biraz yavaşladı · ~3 kaldı', rir: 3, vl: 0.18 },
  { k: 'Belirgin yavaş', d: 'Belirgin yavaş · ~2 kaldı', rir: 2, vl: 0.32 },
  { k: 'Çok yavaş', d: 'Çok yavaş · ~1 kaldı', rir: 1, vl: 0.47 },
  { k: 'Takılma sınırı', d: 'Zar zor çıktı · tükeniş', rir: 0, vl: 0.62 },
];
const SPEED_EN_TXT = [
  ['Same speed', 'As fast as the first · 5+ left'],
  ['A bit slower', 'Slowed a little · ~3 left'],
  ['Clearly slower', 'Clearly slower · ~2 left'],
  ['Very slow', 'Very slow · ~1 left'],
  ['Grinding', 'Barely got it · failure'],
];
const SPEED = byLang('speed', { tr: SPEED_TR, en: SPEED_TR.map((x, i) => ({ ...x, k: SPEED_EN_TXT[i][0], d: SPEED_EN_TXT[i][1] })) });
const rirTxt = (rir) => (rir >= 5 ? '5+' : nf(Math.round(rir)));
const V_MIN = 0.17;      // bench press'te 1RM / tükeniş tekrarı ortalama itiş hızı (m/s)
const ROM_M = 0.4;       // animasyon için nominal hareket açıklığı (m)
const pctFromRepsRir = (reps, rir) => 1 / (1 + (reps + rir) / 30);
function vFromPct(p) {
  // González-Badillo & Sánchez-Medina 2010, bench press: %1RM = 8.4326·v² − 73.501·v + 112.33
  const P = clamp(p, 0.3, 1) * 100;
  const a = 8.4326, b = -73.501, c = 112.33 - P;
  return (-b - Math.sqrt(Math.max(0, b * b - 4 * a * c))) / (2 * a);
}
const vLastFromRir = (rir) => V_MIN + 0.05 * rir;
function vlFor(reps, rir) {
  if (reps <= 1) return 0;
  const v1 = vFromPct(pctFromRepsRir(reps, rir));
  return clamp(1 - Math.min(v1, vLastFromRir(rir)) / v1, 0, 0.9);
}
function rirFromSpeed(reps, lvl) { return SPEED[lvl].rir; }
// Animasyon için: bu tekrar ve RIR'de beklenen hız kaybı (bench press hız profiliyle, temsili)
const animVl = (reps, rir) => vlFor(Math.max(1, reps), rir);
const BENCH_IDS = ['egimli-bench', 'duz-bench'];
const rpeFromRir = (rir) => clamp(Math.round(10 - rir), 6, 10);
function repVelocities(reps, rir, vl) {
  const n = Math.max(1, reps);
  const v1 = vFromPct(pctFromRepsRir(n, rir));
  const vLast = v1 * (1 - (n <= 1 ? 0 : vl));
  return Array.from({ length: n }, (_, i) => (n <= 1 ? v1 : v1 - (v1 - vLast) * Math.pow(i / (n - 1), 1.4)));
}
const e1rm = (kg, reps, rir) => Number(kg) * (1 + (reps + rir) / 30);
const rpeLabel = (rpe, rir) => (rpe <= 6 && rir > 4 ? '≤6' : nf(Number(rpe)));
const vlColor = (vl) => (vl < 0.2 ? 'var(--neuro)' : vl < 0.35 ? 'var(--amber)' : vl < 0.5 ? 'var(--fire)' : 'var(--burn)');
const skillSetTxt = (z) => t('{n} deneme', { n: z.reps }) + ' · ' + (SKILL_Q[z.q || 0] ? SKILL_Q[z.q || 0].k : SKILL_Q[0].k) + (Number(z.hold) > 0 ? ' · ' + t('{n} sn', { n: nf(Number(z.hold)) }) : '');

function blankProgram() {
  const now = Date.now();
  return { id: newId('p'), name: '', createdAt: now, updatedAt: now, days: [{ id: newId('d'), name: '1. gün', weekday: null, items: [] }] };
}
function sessionFromDay(program, day) {
  return {
    id: newId('s'), programId: program ? program.id : null, programName: program ? program.name : '', dayId: day ? day.id : null,
    dayName: day ? day.name : 'Plansız antrenman', startedAt: Date.now(), endedAt: null, status: 'active',
    // V33 · planlı antrenman da "hazır" açılır: süre ancak İDMANI BAŞLAT'a basınca (ya da ilk sette) başlar.
    ready: true,
    items: (day ? day.items : []).map((it) => ({
      id: newId('e'), srcId: it.id || null, exId: it.exId || null, name: it.name, muscle: it.muscle, note: it.note || '', memo: '',
      target: { sets: it.sets, repMin: it.repMin, repMax: it.repMax, kg: hasNum(it.kg) ? Number(it.kg) : null, rpeMin: it.rpeMin, rpeMax: it.rpeMax, rest: it.rest || 120, ...(hasNum(it.dur) ? { dur: Number(it.dur), z: Number(it.z) || 2 } : {}) },
      sets: [],
    })),
  };
}
function itemFromEx(ex) {
  const exId = ex.exId || ex.id || null;
  const lib = libById(exId);
  const base = { id: newId('i'), exId, name: ex.name, muscle: ex.muscle, kg: null, rest: ex.rest || (lib && lib.rest) || 120, note: '' };
  if (lib && lib.kind === 'isinma') return { ...base, rest: 60, sets: 1, repMin: 1, repMax: 1, rpeMin: null, rpeMax: null, dur: 10, z: 2 };
  if (lib && lib.kind === 'dovus') return { ...base, rest: ex.rest || 60, sets: 3, repMin: 1, repMax: 1, rpeMin: null, rpeMax: null, dur: 3, z: 3 };
  if (lib && lib.kind === 'beceri') return { ...base, rest: ex.rest || 90, sets: 5, repMin: 3, repMax: 3, rpeMin: null, rpeMax: null };
  if (lib && lib.kind === 'plyo') return { ...base, sets: 3, repMin: 5, repMax: 5, rpeMin: null, rpeMax: null };
  if (lib && lib.kind === 'olimpik') return { ...base, sets: 4, repMin: 2, repMax: 3, rpeMin: 7, rpeMax: 8 };
  return { ...base, sets: 3, repMin: 8, repMax: 12, rpeMin: 7, rpeMax: 9 };
}
function repTxt(a, b) { return !hasNum(b) || Number(a) === Number(b) ? String(a) : a + '–' + b; }
function rpeTxt(a, b) { if (!hasNum(a)) return null; return 'RPE ' + (!hasNum(b) || Number(a) === Number(b) ? nf(Number(a)) : nf(Number(a)) + '–' + nf(Number(b))); }
function targetTxt(tg, exId) {
  if (isWarmEx(exId)) return t('{n} dk', { n: Number(tg.dur) || 10 }) + ' · ' + (WARM_Z[(Number(tg.z) || 2) - 1] || WARM_Z[1]).k;
  if (isFight(exId)) return t('{n} raund', { n: Number(tg.sets) || 1 }) + ' × ' + minTxt(fightDur(tg.dur)) + ' · ' + fightZ(tg.z).k;
  const plyo = isPlyo(exId);
  const skill = isSkill(exId);
  const parts = [tg.sets + ' × ' + repTxt(tg.repMin, tg.repMax) + (plyo ? ' ' + t('temas') : skill ? ' ' + t('deneme') : '')];
  // V33 · ek yüksüz yapılabilen harekette 0 kg = vücut ağırlığı
  if (!skill && hasNum(tg.kg)) parts.push(Number(tg.kg) === 0 && canBodyweight(libById(exId)) ? t('vücut ağırlığı') : kgTxt(tg.kg));
  const r = skill ? null : rpeTxt(tg.rpeMin, tg.rpeMax);
  if (r) parts.push(r);
  return parts.join(' · ');
}
function sessionStats(s) {
  const sets = [];
  let tonnage = 0;
  s.items.forEach((it) => {
    const mult = dbMultiplier(it.exId, it.name);
    it.sets.forEach((x) => {
      sets.push({ ...x, muscle: it.muscle, rest: it.target?.rest });
      // V33 · ısınma setleri tonaja girmez
      if (!x.plyo && !x.skill && !x.warm) tonnage += (Number(x.kg) || 0) * x.reps * mult;
    });
  });
  const hard = sets.filter((x) => !x.plyo && !x.skill && !x.warm && x.rir <= 4);
  const contacts = sets.reduce((a, x) => a + (x.plyo ? x.reps : 0), 0);
  const attempts = sets.reduce((a, x) => a + (x.skill ? x.reps : 0), 0);
  // V39 · dövüş raundları: sayı ve toplam dakika
  const rounds = sets.filter((x) => x.fight).length;
  const fightMin = sets.reduce((a, x) => a + (x.fight ? Number(x.dur) || 0 : 0), 0);
  return { sets, hard, tonnage, contacts, attempts, rounds, fightMin, warm: sets.filter((x) => x.warm).length, dur: s.ready ? 0 : (s.endedAt || Date.now()) - s.startedAt };
}
function weeklyHard(sessions, endTs) {
  const from = endTs - 7 * 864e5;
  const map = {};
  sessions.filter((s) => s.status === 'done' && s.startedAt >= from && s.startedAt <= endTs + 1000).forEach((s) => s.items.forEach((it) => {
    const h = it.sets.filter((x) => !x.plyo && !x.skill && !x.warm && x.rir <= 4).length;
    addShares(map, it, h);
  }));
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

/* ---------- küçük parçalar ---------- */
function Stepper({ id, value, onChange, step, min, max, unit, label, decimals }) {
  const [txt, setTxt] = useState(String(value));
  useEffect(() => { setTxt(hasNum(value) ? numIn(Number(value), decimals) : ''); }, [value]);
  const commit = (raw) => {
    const n = parseFloat(String(raw).replace(',', '.'));
    if (Number.isFinite(n)) onChange(clamp(n, min, max));
    else setTxt(hasNum(value) ? numIn(Number(value), decimals) : '');
  };
  const bump = (d) => onChange(clamp(Math.round(((Number(value) || 0) + d) * 100) / 100, min, max));
  return (
    <div className="stepper">
      <label htmlFor={id} className="st-k">{label}</label>
      <div className="st-row">
        <button type="button" className="st-btn" aria-label={t('{x} azalt', { x: label })} onClick={() => bump(-step)}>−</button>
        <input id={id} className="st-in mono" inputMode="decimal" value={txt} onChange={(e) => setTxt(e.target.value)} onBlur={(e) => commit(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }} />
        <button type="button" className="st-btn" aria-label={t('{x} artır', { x: label })} onClick={() => bump(step)}>+</button>
      </div>
      {unit ? <span className="st-u">{unit}</span> : null}
    </div>
  );
}

/* ---------- hafta şeridi ---------- */
/* ---------- ana ekran ---------- */
/* ---------- program editörü ---------- */
// Hareketin o seanstaki uygulama biçimi: dokunarak seçilir, notta " · " ile birleşir.
const NOTE_PRESETS = ['Hissederek yap', 'Ağırlığa odaklan', 'Altta beklet', 'Ortada beklet', 'Üstte beklet', 'İzometrik', 'Yavaş eksantrik', 'Patlayıcı kaldır', 'Overload yük', 'Pump seti', 'Drop set', 'Rest-pause', 'Kısmi tekrar', 'Tükenişe kadar', 'Tam ROM'];
function splitNote(note) {
  const toks = String(note || '').split(' · ').map((x) => x.trim()).filter(Boolean);
  return { on: NOTE_PRESETS.filter((p) => toks.includes(p)), free: toks.filter((t) => !NOTE_PRESETS.includes(t)).join(' · ') };
}
const joinNote = (on, free) => [...NOTE_PRESETS.filter((p) => on.includes(p)), String(free || '').trim()].filter(Boolean).join(' · ');
// Notta saklanan hazır seçenekler Türkçe kalır; gösterimde çevrilir, kullanıcının serbest metni aynen (V22).
const noteLabel = (note) => String(note || '').split(' · ').map((x) => (NOTE_PRESETS.includes(x.trim()) ? t(x.trim()) : x)).join(' · ');

function ItemEditor({ it, idx, n, onChange, onMove, onRemove, fx = { sound: true, haptic: true } }) {
  const plyo = isPlyo(it.exId);
  const skill = isSkill(it.exId);
  const lib = libById(it.exId);
  // V33 · barbell en az 20 kg; ek yük olmadan da yapılan harekette sürgünün başı "vücut ağırlığı"
  const kgMin = lib && lib.eq === 'bb' && !plyo ? 20 : 0;
  const bw = !plyo && canBodyweight(lib);
  const set = (k) => (v) => onChange({ ...it, [k]: v });
  const pid = 'it-' + it.id;
  const parsed = splitNote(it.note);
  const [free, setFree] = useState(parsed.free);
  const togglePreset = (p) => {
    const on = parsed.on.includes(p) ? parsed.on.filter((x) => x !== p) : [...parsed.on, p];
    onChange({ ...it, note: joinNote(on, free) });
  };
  if (isWarmEx(it.exId)) {
    const z = Number(it.z) || 2;
    return (
      <div className="item-ed">
        <div className="ied-drag">
          <PxStair id={'it-' + it.id + '-dur'} label={t('Süre')} unit={t('dk')} min={1} max={30} lo={Number(it.dur) || 10} onChange={(a) => onChange({ ...it, dur: a, sets: 1 })} fx={fx} marks={[1, 5, 10, 15, 20, 25, 30]} />
        </div>
        <div className="field-pair">
          <span className="st-k">{t('Nabız')}</span>
          <div className="chips-wrap" role="radiogroup" aria-label={t('Nabız skalası')}>
            {WARM_Z.map((zo, i) => <button key={i} type="button" id={'it-' + it.id + '-z' + (i + 1)} role="radio" aria-checked={z === i + 1} className={'fchip sm' + (z === i + 1 ? ' on' : '')} style={{ borderColor: WARM_Z_COLORS[i] }} onClick={() => onChange({ ...it, z: i + 1, sets: 1 })}>{zo.k}</button>)}
          </div>
          <p className="muted-p" style={{ margin: 0 }}>{WARM_Z[z - 1].d} · {t('Hesaplara girmez.')}</p>
        </div>
        <div className="ied-actions">
          <button type="button" className="btn ghost sm" disabled={idx === 0} onClick={() => onMove(-1)} aria-label={t('Yukarı taşı')}>↑ {t('Yukarı')}</button>
          <button type="button" className="btn ghost sm" disabled={idx === n - 1} onClick={() => onMove(1)} aria-label={t('Aşağı taşı')}>↓ {t('Aşağı')}</button>
          <HoldButton className="btn ghost sm danger-t" onHold={onRemove}>{t('Hareketi sil')}</HoldButton>
        </div>
      </div>
    );
  }
  if (isFight(it.exId)) {
    const z = Number(it.z) || 3;
    return (
      <div className="item-ed">
        <div className="ied-drag">
          <PxStair id={pid + '-sets'} label={t('Raund')} min={1} max={15} lo={Number(it.sets) || 3} onChange={(a) => onChange({ ...it, sets: a })} fx={fx} marks={[1, 3, 6, 9, 12, 15]} />
          <PxStair id={pid + '-dur'} label={t('Raund süresi')} unit={t('dk')} min={0.5} max={5} step={0.5} lo={fightDur(it.dur)} onChange={(a) => onChange({ ...it, dur: a })} fx={fx} marks={[0.5, 1, 2, 3, 4, 5]} />
        </div>
        <div className="field-pair">
          <span className="st-k">{t('Yoğunluk')}</span>
          <div className="chips-wrap" role="radiogroup" aria-label={t('Dövüş yoğunluğu')}>
            {FIGHT_Z.map((zo, i) => <button key={i} type="button" id={pid + '-z' + (i + 1)} role="radio" aria-checked={z === i + 1} className={'fchip sm' + (z === i + 1 ? ' on' : '')} style={{ borderColor: WARM_Z_COLORS[i] }} onClick={() => onChange({ ...it, z: i + 1 })}>{zo.k}</button>)}
          </div>
          <p className="muted-p" style={{ margin: 0 }}>{fightZ(z).d}</p>
        </div>
        <div className="field-pair">
          <span className="st-k">{t('Raund arası dinlenme')}</span>
          <div className="chips-wrap">
            {[30, 45, ...REST_OPTS].map((r) => <button key={r} type="button" className={'fchip sm' + (it.rest === r ? ' on' : '')} onClick={() => set('rest')(r)}>{restTxt(r)}</button>)}
          </div>
        </div>
        <div className="ied-actions">
          <button type="button" className="btn ghost sm" disabled={idx === 0} onClick={() => onMove(-1)} aria-label={t('Yukarı taşı')}>↑ {t('Yukarı')}</button>
          <button type="button" className="btn ghost sm" disabled={idx === n - 1} onClick={() => onMove(1)} aria-label={t('Aşağı taşı')}>↓ {t('Aşağı')}</button>
          <HoldButton className="btn ghost sm danger-t" onHold={onRemove}>{t('Hareketi sil')}</HoldButton>
        </div>
      </div>
    );
  }
  const repWord = plyo ? t('Temas') : skill ? t('Deneme') : t('Tekrar');
  const rMin = hasNum(it.repMin) ? Number(it.repMin) : 8;
  const rMax = hasNum(it.repMax) ? Number(it.repMax) : rMin;
  return (
    <div className="item-ed">
      <div className="ied-drag">
        <PxStair id={pid + '-sets'} label={t('Set')} min={1} max={12} lo={Number(it.sets) || 3} onChange={(a) => onChange({ ...it, sets: a })} fx={fx} marks={[1, 4, 8, 12]} />
        <PxStair id={pid + '-reps'} label={repWord} min={1} max={30} range lo={rMin} hi={rMax} onChange={(a, b) => onChange({ ...it, repMin: a, repMax: b })} fx={fx} marks={[1, 5, 10, 15, 20, 25, 30]} loLabel={t('En az {x}', { x: lower(repWord) })} hiLabel={t('En çok {x}', { x: lower(repWord) })} />
        {skill ? null : <PxKgTape id={pid + '-kg'} label={plyo ? t('Ek yük') : t('Kilo')} value={hasNum(it.kg) ? Number(it.kg) : null} onChange={(x) => onChange({ ...it, kg: x })} fx={fx} min={kgMin} start={kgMin || 20} bw={bw} plus={!!lib && (lib.eq === 'bw' || lib.eq === 'pl')} />}
        {plyo || skill ? null : <PxStair id={pid + '-rpe'} label="RPE" min={5} max={10} step={0.5} range lo={hasNum(it.rpeMin) ? Number(it.rpeMin) : 7} hi={hasNum(it.rpeMax) ? Number(it.rpeMax) : hasNum(it.rpeMin) ? Number(it.rpeMin) : 9} onChange={(a, b) => onChange({ ...it, rpeMin: a, rpeMax: b })} fx={fx} marks={[5, 6, 7, 8, 9, 10]} loLabel={t('En düşük RPE')} hiLabel={t('En yüksek RPE')} />}
      </div>
      <div className="field-pair">
        <span className="st-k">{t('Set arası dinlenme')}</span>
        <div className="chips-wrap">
          {REST_OPTS.map((r) => <button key={r} type="button" className={'fchip sm' + (it.rest === r ? ' on' : '')} onClick={() => set('rest')(r)}>{restTxt(r)}</button>)}
        </div>
      </div>
      <div className="field-pair">
        <span className="st-k">{t('Nasıl yapılacak')}</span>
        <div className="chips-wrap ied-presets">
          {NOTE_PRESETS.map((p) => <button key={p} type="button" className={'fchip sm' + (parsed.on.includes(p) ? ' on' : '')} aria-pressed={parsed.on.includes(p)} onClick={() => togglePreset(p)}>{t(p)}</button>)}
        </div>
        <label className="st-k" htmlFor={pid + '-note'}>{t('Ek not')}</label>
        <input id={pid + '-note'} className="text-in" placeholder={t('örn. 3 sn iniş, dirsek içeride')} value={free} onChange={(e) => { setFree(e.target.value); onChange({ ...it, note: joinNote(parsed.on, e.target.value) }); }} />
      </div>
      <div className="ied-actions">
        <button type="button" className="btn ghost sm" disabled={idx === 0} onClick={() => onMove(-1)} aria-label={t('Yukarı taşı')}>↑ {t('Yukarı')}</button>
        <button type="button" className="btn ghost sm" disabled={idx === n - 1} onClick={() => onMove(1)} aria-label={t('Aşağı taşı')}>↓ {t('Aşağı')}</button>
        <HoldButton className="btn ghost sm danger-t" onHold={onRemove}>{t('Hareketi sil')}</HoldButton>
      </div>
    </div>
  );
}

/* ---------- hız animasyonları ---------- */
function Lane({ v, label, color, playing, txt }) {
  const barRef = useRef(null);
  useEffect(() => {
    if (!barRef.current) return;
    const travel = () => { const p = barRef.current && barRef.current.parentElement; return p ? Math.max(28, Math.min(62, p.clientHeight - 50)) : 62; };
    if (!playing || reducedMotion()) { barRef.current.style.transform = 'translateY(-' + travel() + 'px)'; return; }
    let raf = 0, t0 = performance.now();
    const up = ROM_M / Math.max(0.08, v), hold = 0.3, down = 0.65, rest = 0.45;
    const T = up + hold + down + rest;
    const tick = (now) => {
      const t = ((now - t0) / 1000) % T;
      let k;
      if (t < up) { const u = t / up; k = u; }
      else if (t < up + hold) k = 1;
      else if (t < up + hold + down) { const u = (t - up - hold) / down; k = 1 - u * u * (3 - 2 * u); }
      else k = 0;
      if (barRef.current) barRef.current.style.transform = 'translateY(-' + (k * travel()).toFixed(1) + 'px)';
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [v, playing]);
  return (
    <div className="lane2">
      <div className="lane2-track">
        <div className="lane2-rail" />
        <div className="mini-bb" ref={barRef}><i className="pl" /><i className="br" /><i className="pl" /></div>
      </div>
      <span className="lane2-k">{label}</span>
      <span className="lane2-v mono" style={{ color }}>{txt || <React.Fragment>{nf(v, 2)} <small>m/s</small></React.Fragment>}</span>
    </div>
  );
}

function RepBars({ set, h = 26, live = -1 }) {
  const vels = repVelocities(set.reps, set.rir, animVl(set.reps, set.rir));
  const max = vels[0] || 1;
  return (
    <div className="repbars" style={{ height: h }} aria-hidden="true">
      {vels.map((v, i) => (
        <i key={i} style={{ height: Math.max(8, (v / max) * 100) + '%', background: vlColor(1 - v / max), opacity: live >= 0 && i > live ? 0.18 : 1 }} />
      ))}
    </div>
  );
}

function SetReplay({ set, bench }) {
  const vels = useMemo(() => repVelocities(set.reps, set.rir, animVl(set.reps, set.rir)), [set.reps, set.rir]);
  const barRef = useRef(null);
  const [rep, setRep] = useState(-1);
  const [run, setRun] = useState(0);
  useEffect(() => {
    if (reducedMotion()) { setRep(vels.length - 1); return; }
    let raf = 0, t0 = performance.now(), last = -1;
    const down = 0.7, pause = 0.25;
    const seg = vels.map((v) => ROM_M / v + down + pause);
    const total = seg.reduce((a, b) => a + b, 0);
    setRep(-1);
    const tick = (now) => {
      let t = (now - t0) / 1000;
      if (t >= total) { setRep(vels.length - 1); if (barRef.current) barRef.current.style.transform = 'translateY(0)'; return; }
      let i = 0;
      while (i < seg.length && t > seg[i]) { t -= seg[i]; i++; }
      const up = ROM_M / vels[i];
      let k;
      if (t < up) k = t / up;
      else if (t < up + down) { const u = (t - up) / down; k = 1 - u * u * (3 - 2 * u); }
      else k = 0;
      const doneIdx = t >= up ? i : i - 1;
      if (doneIdx !== last) { last = doneIdx; setRep(doneIdx); }
      const pe = barRef.current && barRef.current.parentElement;
      const tr = pe ? Math.max(30, Math.min(74, pe.clientHeight - 44)) : 74;
      if (barRef.current) barRef.current.style.transform = 'translateY(-' + (k * tr).toFixed(1) + 'px)';
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [vels, run]);
  const cur = rep >= 0 ? vels[rep] : null;
  return (
    <div className="replay">
      <div className="rp-lane">
        <div className="lane2-rail" />
        <div className="mini-bb big" ref={barRef}><i className="pl" /><i className="br" /><i className="pl" /></div>
      </div>
      <div className="rp-info">
        <div className="rp-top">
          <span className="mono rp-rep">{t('Tekrar')} {Math.max(0, rep + 1)}/{vels.length}</span>
          <span className="mono rp-v" style={{ color: cur ? vlColor(1 - cur / vels[0]) : 'var(--muted)' }}>{cur ? (bench ? nf(cur, 2) + ' m/s' : t('{p} hız', { p: pct(Math.round((cur / vels[0]) * 100)) })) : '–'}</span>
        </div>
        <RepBars set={set} h={46} live={rep} />
        <div className="rp-foot">
          <span className="rp-note">{bench ? t('Bench hız profiline göre tahmini') : t('Temsili: ilk tekrara göre hız')}</span>
          <button type="button" className="btn ghost sm" onClick={() => setRun((r) => r + 1)}><Icon name="reset" size={13} /> {t('Oynat')}</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- antrenman modu ---------- */
function firstOpen(s) {
  const i = s.items.findIndex((it) => it.sets.length < it.target.sets);
  return i >= 0 ? i : Math.max(0, s.items.length - 1);
}
function entryFor(item) {
  const last = item && item.sets[item.sets.length - 1];
  const t = item ? item.target : {};
  const plyo = item && isPlyo(item.exId);
  const skill = item && isSkill(item.exId);
  const lib = item && libById(item.exId);
  return {
    kg: skill ? 0 : last ? Number(last.kg) || 0 : hasNum(t.kg) ? Number(t.kg) : plyo ? 0 : 20,
    reps: last ? last.reps : hasNum(t.repMax) ? Number(t.repMax) : hasNum(t.repMin) ? Number(t.repMin) : skill ? 3 : plyo ? 5 : 8,
    hold: last && hasNum(last.hold) ? Number(last.hold) : lib && lib.h ? 5 : 0,
    lvl: last && last.lvl != null ? last.lvl : 1,
    q: 0,
    rpe: null,
  };
}

function RestBar({ rest, now, onAdd, onClose }) {
  const el = (now - rest.start) / 1000;
  const left = rest.total - el;
  const over = left <= 0;
  const k = clamp(el / rest.total);
  const R = 19, L = 2 * Math.PI * R;
  return (
    <div className={'restbar' + (over ? ' over' : '')} role="timer" aria-live="off">
      <svg viewBox="0 0 48 48" className="rest-ring" aria-hidden="true">
        <circle cx="24" cy="24" r={R} className="rr-bg" />
        <circle cx="24" cy="24" r={R} className="rr-fg" style={{ strokeDasharray: `${(1 - k) * L} ${L}` }} transform="rotate(-90 24 24)" />
      </svg>
      <div className="rest-t">
        <span className="rest-k">{over ? t('Dinlenme bitti') : t('Dinlenme')}</span>
        <span className="mono rest-v">{over ? '+' + mmss(-left * 1000) : mmss(left * 1000)}<small> / {mmss(rest.total * 1000)}</small></span>
      </div>
      <button type="button" className="btn ghost sm" onClick={onAdd}>+{t('{n} sn', { n: 30 })}</button>
      <button type="button" className="x-btn" onClick={onClose} aria-label={t('Dinlenmeyi kapat')}>✕</button>
    </div>
  );
}

/* ---------- özet ---------- */
/* ---------- sekme ---------- */
export {
  WD_LONG, WD_SHORT, WEEK_ORDER, MONTHS, MUSCLES, REST_OPTS,
  EX_LIB, EQ, PLYO_INT, isPlyo, isSkill, PLYO_W, PLYO_Q, SKILL_W, SKILL_Q, skillSetTxt, PROF, FAT, libById, clone, rid, newId, nf, hasNum,
  kgTxt, restTxt, mmss, durTxt, dateTxt, sameDay, normTr,
  SPEED, rirTxt, rirFromSpeed, animVl, BENCH_IDS, rpeFromRir, repVelocities,
  e1rm, rpeLabel, e1Ok, bestE1, setE1, vlColor,
  blankProgram, sessionFromDay, itemFromEx,
  repTxt, rpeTxt, targetTxt, sessionStats, weeklyHard, nextPlanned,
  Stepper, ItemEditor, Lane, RepBars, SetReplay, firstOpen, entryFor, RestBar, NOTE_PRESETS, noteLabel,
  isWarmEx, WARM_Z, WARM_Z_COLORS, warmSetTxt, isFight, FIGHT_Z, FIGHT_RPE, fightZ, fightSetTxt, fightDur, minTxt, SET_ATTRS, SET_CONDS, SET_FEEL, canBodyweight, warmFirst, WARMUP_ID,
};
