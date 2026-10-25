// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as ReactDOM from 'react-dom';
import { Notes, Tile } from '../../app/ui';
import { clamp, Icon, reducedMotion } from '../yorgunluk/Yorgunluk';
import { BackupPanel } from '../merkez/BackupPanel';
/* ================= GÜNLÜK: program yazma + antrenman kaydı ================= */
const WD_LONG = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const WD_SHORT = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const MUSCLES = ['Göğüs', 'Omuz (ön)', 'Omuz (yan)', 'Sırt', 'Trapez', 'Triceps', 'Biceps', 'Hamstring', 'Quadriceps', 'Kalça', 'Boyun', 'Karın'];
const REST_OPTS = [60, 90, 120, 150, 180, 240, 300];

const EX_LIB = [
  { id: 'egimli-bench', name: 'Eğimli bench press', muscle: 'Göğüs', bio: 'bench', rest: 180 },
  { id: 'duz-bench', name: 'Düz bench press', muscle: 'Göğüs', rest: 180 },
  { id: 'egimli-db-press', name: 'Eğimli dumbbell press', muscle: 'Göğüs', rest: 120 },
  { id: 'kablo-fly', name: 'Aşağıdan yukarı kablo fly', muscle: 'Göğüs', rest: 90 },
  { id: 'db-omuz-press', name: 'Oturarak dumbbell omuz press', muscle: 'Omuz (ön)', rest: 120 },
  { id: 'on-omuz-kaldiris', name: 'Ön omuz kaldırış', muscle: 'Omuz (ön)', rest: 75 },
  { id: 'yana-acis', name: 'Yana açış', muscle: 'Omuz (yan)', bio: 'yanaacis', rest: 75 },
  { id: 'band-yana-acis', name: 'Band yana açış', muscle: 'Omuz (yan)', bio: 'yanaacis', rest: 60 },
  { id: 'barfiks', name: 'Barfiks', muscle: 'Sırt', rest: 150 },
  { id: 'shrug', name: 'Shrug', muscle: 'Trapez', rest: 90 },
  { id: 'triceps-pushdown', name: 'Triceps pushdown', muscle: 'Triceps', rest: 75 },
  { id: 'rdl', name: 'Romanian deadlift', muscle: 'Hamstring', bio: 'rdl', rest: 150 },
  { id: 'leg-curl', name: 'Leg curl', muscle: 'Hamstring', rest: 90 },
  { id: 'band-leg-curl', name: 'Band leg curl', muscle: 'Hamstring', rest: 60 },
  { id: 'squat', name: 'Squat', muscle: 'Quadriceps', rest: 180 },
  { id: 'boyun', name: 'Boyun çalışması', muscle: 'Boyun', rest: 60 },
];
const libById = (id) => EX_LIB.find((e) => e.id === id);

const clone = (o) => JSON.parse(JSON.stringify(o));
const rid = () => Math.random().toString(36).slice(2, 8);
const newId = (p) => p + '_' + Date.now().toString(36) + rid();
const nf = (n, d) => {
  if (!Number.isFinite(n)) return '–';
  const dd = d == null ? (Math.abs(n % 1) > 1e-9 ? 1 : 0) : d;
  try { return n.toLocaleString('tr-TR', { minimumFractionDigits: dd, maximumFractionDigits: dd }); } catch (e) { return n.toFixed(dd).replace('.', ','); }
};
const hasNum = (v) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
const kgTxt = (kg) => (hasNum(kg) ? nf(Number(kg)) + ' kg' : '—');
const restTxt = (sec) => (sec % 60 ? nf(sec / 60, 1) : String(sec / 60)) + ' dk';
const mmss = (ms) => {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  return (h ? h + ':' + String(m).padStart(2, '0') : String(m)) + ':' + String(s).padStart(2, '0');
};
const durTxt = (ms) => { const m = Math.max(1, Math.round(ms / 60000)); return m < 60 ? m + ' dk' : Math.floor(m / 60) + ' sa ' + (m % 60) + ' dk'; };
const dateTxt = (ts) => { const d = new Date(ts); return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' · ' + WD_SHORT[d.getDay()]; };
const sameDay = (a, b) => { const x = new Date(a), y = new Date(b); return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate(); };
const normTr = (s) => (s || '').toLocaleLowerCase('tr').replace(/ı/g, 'i').normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

/* ---------- hız ve yük modeli ---------- */
// Kullanıcı son tekrarın hızını ilk tekrara göre seçer; model hız kaybından RIR tahmin eder.
const SPEED = [
  { k: 'Aynı hız', d: '5+ tekrar kaldı', rir: 5, rpe: 6, vl: 0.05, band: 'RPE ≤6' },
  { k: 'Biraz yavaş', d: '3 tekrar kaldı', rir: 3, rpe: 7, vl: 0.18, band: 'RPE 7' },
  { k: 'Belirgin yavaş', d: '2 tekrar kaldı', rir: 2, rpe: 8, vl: 0.32, band: 'RPE 8' },
  { k: 'Çok yavaş', d: '1 tekrar kaldı', rir: 1, rpe: 9, vl: 0.47, band: 'RPE 9' },
  { k: 'Zar zor', d: 'Tekrar kalmadı', rir: 0, rpe: 10, vl: 0.62, band: 'RPE 10' },
];
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
function rirFromSpeed(reps, lvl) {
  void reps;
  return SPEED[lvl].rir;
}
const rpeFromRir = (rir) => clamp(Math.round(10 - rir), 6, 10);
function repVelocities(reps, rir, vl) {
  const n = Math.max(1, reps);
  const v1 = vFromPct(pctFromRepsRir(n, rir));
  const vLast = v1 * (1 - (n <= 1 ? 0 : vl));
  return Array.from({ length: n }, (_, i) => (n <= 1 ? v1 : v1 - (v1 - vLast) * Math.pow(i / (n - 1), 1.4)));
}
const e1rm = (kg, reps, rir) => Number(kg) * (1 + (reps + rir) / 30);
const rpeLabel = (rpe, rir) => (rpe <= 6 && rir > 4 ? '≤6' : nf(Number(rpe)));
// 1RM tahmini yalnızca tükenişe yakın setlerden (RIR ≤ 4): uzak setlerde Epley sapması büyür.
const bestE1 = (sets) => sets.filter((z) => z.rir <= 4 && z.reps + z.rir <= 12 && Number(z.kg) > 0).reduce((m, z) => Math.max(m, e1rm(z.kg, z.reps, z.rir)), 0);
const vlColor = (vl) => (vl < 0.2 ? 'var(--neuro)' : vl < 0.35 ? 'var(--amber)' : vl < 0.5 ? 'var(--fire)' : 'var(--burn)');

/* ---------- şablon ---------- */
function tItem(exId, sets, repMin, repMax, kg, rpeMin, rpeMax, rest, note) {
  const ex = libById(exId);
  return { exId, name: ex.name, muscle: ex.muscle, sets, repMin, repMax, kg, rpeMin, rpeMax, rest: rest || ex.rest, note: note || '' };
}
const TEMPLATES = [
  {
    key: 'hipertrofi', name: 'Hipertrofi bloğu', desc: 'Salı pump, Perşembe ağır gün, Cumartesi evde band',
    days: [
      { name: 'Pump günü', weekday: 2, items: [tItem('egimli-bench', 5, 8, 12, 60, 6, 7, 120), tItem('rdl', 3, 8, 10, null, 7, 8), tItem('db-omuz-press', 3, 10, 12, null, 6, 7), tItem('shrug', 2, 12, 15, null, null, null), tItem('leg-curl', 2, 10, 12, null, null, null), tItem('boyun', 2, 15, 20, null, null, null)] },
      { name: 'Ağır gün', weekday: 4, items: [tItem('egimli-bench', 2, 5, 8, 75, 9, 10, 240, 'Ağır setler'), tItem('db-omuz-press', 3, 8, 12, null, 7, 8), tItem('egimli-bench', 5, 8, 12, 65, 8, 8, 150, 'Hacim setleri'), tItem('shrug', 2, 10, 15, null, 9, 10), tItem('rdl', 1, 8, 10, null, 6, 7), tItem('leg-curl', 3, 8, 12, null, 9, 10), tItem('boyun', 2, 15, 20, null, 5, 6)] },
      { name: 'Ev · band', weekday: 6, items: [tItem('band-leg-curl', 3, 12, 20, null, 8, 9), tItem('band-yana-acis', 3, 15, 25, null, 8, 9)] },
    ],
  },
  {
    key: 'tamvucut', name: 'Tam vücut · 2 gün', desc: 'Başlangıç için sade iki gün',
    days: [
      { name: 'A günü', weekday: 1, items: [tItem('duz-bench', 3, 6, 10, null, 7, 8), tItem('squat', 3, 6, 10, null, 7, 8), tItem('barfiks', 3, 5, 10, null, 7, 8), tItem('yana-acis', 3, 12, 20, null, 8, 9)] },
      { name: 'B günü', weekday: 4, items: [tItem('egimli-db-press', 3, 8, 12, null, 7, 8), tItem('rdl', 3, 8, 10, null, 7, 8), tItem('leg-curl', 3, 10, 15, null, 8, 9), tItem('triceps-pushdown', 3, 10, 15, null, 8, 9)] },
    ],
  },
];
function programFromTemplate(t) {
  const now = Date.now();
  return { id: newId('p'), name: t.name, createdAt: now, updatedAt: now, days: t.days.map((d) => ({ id: newId('d'), name: d.name, weekday: d.weekday, items: d.items.map((i) => ({ ...clone(i), id: newId('i') })) })) };
}
function blankProgram() {
  const now = Date.now();
  return { id: newId('p'), name: '', createdAt: now, updatedAt: now, days: [{ id: newId('d'), name: '1. gün', weekday: null, items: [] }] };
}
function sessionFromDay(program, day) {
  return {
    id: newId('s'), programId: program ? program.id : null, programName: program ? program.name : '', dayId: day ? day.id : null,
    dayName: day ? day.name : 'Serbest antrenman', startedAt: Date.now(), endedAt: null, status: 'active',
    items: (day ? day.items : []).map((it) => ({
      id: newId('e'), exId: it.exId || null, name: it.name, muscle: it.muscle, note: it.note || '',
      target: { sets: it.sets, repMin: it.repMin, repMax: it.repMax, kg: hasNum(it.kg) ? Number(it.kg) : null, rpeMin: it.rpeMin, rpeMax: it.rpeMax, rest: it.rest || 120 },
      sets: [],
    })),
  };
}
function itemFromEx(ex) {
  return { id: newId('i'), exId: ex.exId || ex.id || null, name: ex.name, muscle: ex.muscle, sets: 3, repMin: 8, repMax: 12, kg: null, rpeMin: 7, rpeMax: 9, rest: ex.rest || 120, note: '' };
}
function repTxt(a, b) { return !hasNum(b) || Number(a) === Number(b) ? String(a) : a + '–' + b; }
function rpeTxt(a, b) { if (!hasNum(a)) return null; return 'RPE ' + (!hasNum(b) || Number(a) === Number(b) ? nf(Number(a)) : nf(Number(a)) + '–' + nf(Number(b))); }
function targetTxt(t) {
  const parts = [t.sets + ' × ' + repTxt(t.repMin, t.repMax)];
  if (hasNum(t.kg)) parts.push(kgTxt(t.kg));
  const r = rpeTxt(t.rpeMin, t.rpeMax);
  if (r) parts.push(r);
  return parts.join(' · ');
}
function sessionStats(s) {
  const sets = [];
  s.items.forEach((it) => it.sets.forEach((x) => sets.push({ ...x, muscle: it.muscle, rest: it.target.rest })));
  const hard = sets.filter((x) => x.rir <= 4);
  const tonnage = sets.reduce((a, x) => a + (Number(x.kg) || 0) * x.reps, 0);
  return { sets, hard, tonnage, dur: (s.endedAt || Date.now()) - s.startedAt };
}
function weeklyHard(sessions, endTs) {
  const from = endTs - 7 * 864e5;
  const map = {};
  sessions.filter((s) => s.status === 'done' && s.startedAt >= from && s.startedAt <= endTs + 1000).forEach((s) => s.items.forEach((it) => {
    const h = it.sets.filter((x) => x.rir <= 4).length;
    if (h) map[it.muscle] = (map[it.muscle] || 0) + h;
  }));
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}
function nextPlanned(programs, sessions) {
  const p = programs[0];
  if (!p) return null;
  const today = new Date();
  for (let off = 0; off < 7; off++) {
    const wd = (today.getDay() + off) % 7;
    const day = p.days.find((d) => d.weekday === wd);
    if (!day) continue;
    if (off === 0 && sessions.some((s) => s.dayId === day.id && sameDay(s.startedAt, today))) continue;
    return { program: p, day, off };
  }
  return null;
}

/* ---------- IndexedDB kayıt katmanı src/lib/store/useLogStore.ts içinde ---------- */

/* ---------- küçük parçalar ---------- */
function SyncChip({ st }) {
  let cls = 'ok', txt = 'Bu cihazda saklanıyor';
  if (st.status === 'loading') { cls = 'wait'; txt = 'Kayıtlar yükleniyor'; }
  if (st.status === 'local') { cls = 'warn'; txt = 'Önizleme: kayıtlar bu sayfa kapanınca silinir'; }
  if (st.error === 'readonly') { cls = 'bad'; txt = 'Bu görünümde kayıt yapamazsın'; }
  if (st.error === 'quota') { cls = 'bad'; txt = 'Depolama dolu. Eski antrenmanları sil.'; }
  if (st.error === 'write' || st.error === 'sync') { cls = 'bad'; txt = 'Kayıt hatası. Bağlantını kontrol et.'; }
  if (st.error === 'revoked') { cls = 'bad'; txt = 'Kayıt erişimi kapandı'; }
  return <div className={'sync ' + cls} role="status"><i />{txt}</div>;
}

function Stepper({ id, value, onChange, step, min, max, unit, label, decimals }) {
  const [txt, setTxt] = useState(String(value));
  useEffect(() => { setTxt(hasNum(value) ? nf(Number(value), decimals).replace(/\./g, '') : ''); }, [value]);
  const commit = (raw) => {
    const n = parseFloat(String(raw).replace(',', '.'));
    if (Number.isFinite(n)) onChange(clamp(n, min, max));
    else setTxt(hasNum(value) ? nf(Number(value), decimals) : '');
  };
  const bump = (d) => onChange(clamp(Math.round(((Number(value) || 0) + d) * 100) / 100, min, max));
  return (
    <div className="stepper">
      <label htmlFor={id} className="st-k">{label}</label>
      <div className="st-row">
        <button type="button" className="st-btn" aria-label={label + ' azalt'} onClick={() => bump(-step)}>−</button>
        <input id={id} className="st-in mono" inputMode="decimal" value={txt} onChange={(e) => setTxt(e.target.value)} onBlur={(e) => commit(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }} />
        <button type="button" className="st-btn" aria-label={label + ' artır'} onClick={() => bump(step)}>+</button>
      </div>
      {unit ? <span className="st-u">{unit}</span> : null}
    </div>
  );
}

function Sheet({ open, onClose, title, children }) {
  const host = typeof document !== 'undefined' ? document.getElementById('sheet-root') : null;
  if (!open) return null;
  const el = (
    <div className="sheet-wrap" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="sheet-bg" aria-label="Kapat" onClick={onClose} />
      <div className="sheet">
        <div className="sheet-h">
          <h3>{title}</h3>
          <button type="button" className="x-btn" onClick={onClose} aria-label="Kapat">✕</button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
  return host && ReactDOM.createPortal ? ReactDOM.createPortal(el, host) : el;
}

function ExercisePicker({ open, onClose, onPick, custom, addCustom }) {
  const [q, setQ] = useState('');
  const [grp, setGrp] = useState(null);
  const [newMuscle, setNewMuscle] = useState(null);
  const inRef = useRef(null);
  useEffect(() => { if (open) { setQ(''); setGrp(null); setNewMuscle(null); setTimeout(() => { try { inRef.current && inRef.current.focus(); } catch (e) {} }, 60); } }, [open]);
  const all = useMemo(() => [
    ...EX_LIB.map((e) => ({ ...e, exId: e.id, src: 'lib' })),
    ...custom.map((c) => ({ id: c.id, exId: c.id, name: c.name, muscle: c.muscle, rest: 90, src: 'custom', pending: c.pending })),
  ], [custom]);
  const nq = normTr(q);
  const list = all.filter((e) => (!grp || e.muscle === grp) && (!nq || normTr(e.name).includes(nq)));
  const exact = all.some((e) => normTr(e.name) === nq);
  const groups = MUSCLES.filter((m) => all.some((e) => e.muscle === m));
  const pick = (e) => { onPick(e); onClose(); };
  return (
    <Sheet open={open} onClose={onClose} title="Hareket ekle">
      <input ref={inRef} id="ex-search" className="search mono-ph" type="search" placeholder="Ara ya da yeni hareket yaz" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
      <div className="chips-scroll" role="group" aria-label="Kas grubu">
        <button type="button" className={'fchip' + (!grp ? ' on' : '')} onClick={() => setGrp(null)}>Tümü</button>
        {groups.map((m) => <button key={m} type="button" className={'fchip' + (grp === m ? ' on' : '')} onClick={() => setGrp(grp === m ? null : m)}>{m}</button>)}
      </div>
      {q.trim() && !exact ? (
        <div className="new-ex">
          <div className="new-ex-top"><span className="badge new">Yeni</span><strong>{q.trim()}</strong></div>
          <span className="new-ex-k">Hangi kası çalıştırıyor?</span>
          <div className="chips-wrap">
            {MUSCLES.map((m) => <button key={m} type="button" className={'fchip sm' + (newMuscle === m ? ' on' : '')} onClick={() => setNewMuscle(m)}>{m}</button>)}
          </div>
          <button type="button" id="ex-add-new" className="btn fire full" onClick={() => { const d = addCustom(q.trim(), newMuscle); pick({ exId: d.id, name: d.name, muscle: d.muscle, rest: 90 }); }}>
            Programa ekle
          </button>
          <p className="new-ex-note">Kendi listene kaydedilir. Hareket veritabanına sonra eklenecek.</p>
        </div>
      ) : null}
      <ul className="ex-list">
        {list.map((e) => (
          <li key={e.src + e.id}>
            <button type="button" className="ex-row" onClick={() => pick(e)}>
              <span className="ex-n">{e.name}</span>
              <span className="ex-m">{e.muscle}</span>
              {e.bio ? <span className="badge bio">biyomekanik</span> : null}
              {e.src === 'custom' ? <span className="badge own">özel</span> : null}
            </button>
          </li>
        ))}
        {!list.length && !q.trim() ? <li className="ex-empty">Bu grupta hareket yok.</li> : null}
      </ul>
    </Sheet>
  );
}

/* ---------- hafta şeridi ---------- */
function WeekStrip({ programs, sessions }) {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7));
  const p = programs[0];
  const planned = new Set(p ? p.days.filter((d) => d.weekday != null).map((d) => d.weekday) : []);
  const done = sessions.filter((s) => s.status === 'done');
  const cells = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const n = done.filter((s) => sameDay(s.startedAt, d)).length;
    return { d, wd: d.getDay(), n, plan: planned.has(d.getDay()), today: sameDay(d, today), past: d < new Date(today.getFullYear(), today.getMonth(), today.getDate()) };
  });
  const doneCount = cells.filter((c) => c.n > 0).length;
  return (
    <section className="week">
      <div className="week-h">
        <span className="eyebrow">Bu hafta</span>
        <span className="mono week-k">{doneCount} / {planned.size || '–'} antrenman</span>
      </div>
      <div className="week-row">
        {cells.map((c) => (
          <div key={c.wd} className={'wd' + (c.today ? ' today' : '') + (c.n ? ' done' : c.plan ? (c.past ? ' missed' : ' plan') : '')}>
            <span className="wd-k">{WD_SHORT[c.wd]}</span>
            <span className="wd-d mono">{c.d.getDate()}</span>
            <i className="wd-dot" />
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- ana ekran ---------- */
function LogHome({ st, put, del, go, start }) {
  const [tmplOpen, setTmplOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const active = st.sessions.find((s) => s.status === 'active');
  const done = st.sessions.filter((s) => s.status === 'done');
  const next = nextPlanned(st.programs, st.sessions);
  const ready = st.status !== 'loading' && st.loaded.programs && st.loaded.sessions;
  const newBlank = () => { const p = blankProgram(); put('programs', p); go({ name: 'editor', id: p.id, draft: p }); };
  const newFrom = (t) => { const p = programFromTemplate(t); put('programs', p); setTmplOpen(false); go({ name: 'editor', id: p.id, draft: p }); };

  return (
    <div className="log">
      <SyncChip st={st} />
      <WeekStrip programs={st.programs} sessions={st.sessions} />

      {active ? (
        <section className="hero-card live">
          <div className="hc-top"><span className="live-dot" /> <span className="eyebrow fire">Antrenman sürüyor</span></div>
          <h3>{active.dayName}</h3>
          <p className="hc-sub mono">{active.items.reduce((a, it) => a + it.sets.length, 0)} set kaydedildi · başlangıç {new Date(active.startedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</p>
          <button type="button" id="resume-btn" className="btn fire full" onClick={() => go({ name: 'session', id: active.id })}>Devam et <Icon name="right" /></button>
        </section>
      ) : next ? (
        <section className="hero-card">
          <div className="hc-top"><span className="eyebrow">Sıradaki</span><span className="hc-when mono">{next.off === 0 ? 'bugün' : next.off === 1 ? 'yarın' : WD_LONG[next.day.weekday]}</span></div>
          <h3>{WD_LONG[next.day.weekday]} · {next.day.name}</h3>
          <p className="hc-sub">{next.day.items.length} hareket · {next.day.items.reduce((a, i) => a + Number(i.sets || 0), 0)} set</p>
          <button type="button" id="start-next" className="btn primary full" onClick={() => start(next.program, next.day)}>Antrenmanı başlat <Icon name="play" size={14} /></button>
        </section>
      ) : null}

      <section className="log-sec">
        <div className="sec-h"><h3>Programlarım</h3>{st.programs.length ? <span className="sec-k">{st.programs.length} program</span> : null}</div>
        {!ready ? (
          <div className="skeleton"><span /><span /><span /></div>
        ) : !st.programs.length ? (
          <div className="empty">
            <strong>Henüz programın yok</strong>
            <p>Boş bir sayfaya hareketlerini tek tek yaz ya da şablonla başla. Günleri haftaya yerleştir, antrenmanda set set kaydet.</p>
          </div>
        ) : (
          st.programs.map((p) => (
            <article key={p.id} className="prog">
              <header className="prog-h">
                <div className="prog-t">
                  <strong>{p.name || 'Adsız program'}</strong>
                  <span className="mono">{p.days.length} gün · {p.days.reduce((a, d) => a + d.items.length, 0)} hareket</span>
                </div>
                <button type="button" id={'edit-' + p.id} className="btn ghost sm" onClick={() => go({ name: 'editor', id: p.id })}>Düzenle</button>
              </header>
              <ul className="prog-days">
                {p.days.map((d) => (
                  <li key={d.id} className="pday">
                    <span className={'pday-wd mono' + (d.weekday == null ? ' none' : '')}>{d.weekday == null ? '—' : WD_SHORT[d.weekday]}</span>
                    <div className="pday-t">
                      <span>{d.name || 'Adsız gün'}</span>
                      <small>{d.items.length ? d.items.slice(0, 3).map((i) => i.name).join(', ') + (d.items.length > 3 ? ' +' + (d.items.length - 3) : '') : 'Hareket yok'}</small>
                    </div>
                    <button type="button" id={'start-' + d.id} className="icon-btn sm" aria-label={d.name + ' antrenmanını başlat'} disabled={!d.items.length || !!active} onClick={() => start(p, d)}>
                      <Icon name="play" size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            </article>
          ))
        )}
        <div className="new-prog">
          <button type="button" id="new-blank" className="btn primary" disabled={!ready} onClick={newBlank}>+ Boş sayfa</button>
          <button type="button" id="new-tmpl" className="btn ghost" disabled={!ready} onClick={() => setTmplOpen(!tmplOpen)} aria-expanded={tmplOpen}>Şablondan</button>
          <button type="button" id="free-session" className="btn ghost" disabled={!ready || !!active} onClick={() => start(null, null)}>Serbest antrenman</button>
        </div>
        {tmplOpen ? (
          <div className="tmpls">
            {TEMPLATES.map((t) => (
              <button key={t.key} type="button" id={'tmpl-' + t.key} className="tmpl" onClick={() => newFrom(t)}>
                <strong>{t.name}</strong>
                <span>{t.desc}</span>
                <small className="mono">{t.days.map((d) => WD_SHORT[d.weekday]).join(' · ')}</small>
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <section className="log-sec">
        <div className="sec-h"><h3>Son antrenmanlar</h3>{done.length ? <span className="sec-k">{done.length} kayıt</span> : null}</div>
        {!done.length ? (
          <p className="muted-p">Bitirdiğin antrenmanlar burada listelenir.</p>
        ) : (
          <ul className="hist">
            {done.slice(0, 12).map((s) => {
              const ss = sessionStats(s);
              return (
                <li key={s.id}>
                  <button type="button" className="hist-row" onClick={() => go({ name: 'summary', id: s.id })}>
                    <span className="hist-d mono">{dateTxt(s.startedAt)}</span>
                    <span className="hist-n">{s.dayName}</span>
                    <span className="hist-k mono">{durTxt(ss.dur)} · {ss.sets.length} set · {nf(Math.round(ss.tonnage))} kg</span>
                    <Icon name="right" size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ---------- program editörü ---------- */
function ItemEditor({ it, idx, n, onChange, onMove, onRemove }) {
  const [confirm, setConfirm] = useState(false);
  const set = (k) => (v) => onChange({ ...it, [k]: v });
  const num = (k) => (e) => { const v = e.target.value.replace(',', '.'); onChange({ ...it, [k]: v === '' ? null : Number(v) }); };
  const pid = 'it-' + it.id;
  return (
    <div className="item-ed">
      <div className="ied-grid">
        <Stepper id={pid + '-sets'} label="Set" value={it.sets} step={1} min={1} max={12} onChange={set('sets')} decimals={0} />
        <div className="field-pair">
          <span className="st-k">Tekrar</span>
          <div className="pair">
            <input id={pid + '-rmin'} className="mini-in mono" inputMode="numeric" value={hasNum(it.repMin) ? it.repMin : ''} onChange={num('repMin')} aria-label="En az tekrar" />
            <span>–</span>
            <input id={pid + '-rmax'} className="mini-in mono" inputMode="numeric" value={hasNum(it.repMax) ? it.repMax : ''} onChange={num('repMax')} aria-label="En çok tekrar" />
          </div>
        </div>
        <div className="field-pair">
          <span className="st-k">Kg</span>
          <div className="pair">
            <input id={pid + '-kg'} className="mini-in mono wide" inputMode="decimal" placeholder="isteğe bağlı" value={hasNum(it.kg) ? String(it.kg).replace('.', ',') : ''} onChange={num('kg')} aria-label="Hedef kilo" />
          </div>
        </div>
        <div className="field-pair">
          <span className="st-k">RPE</span>
          <div className="pair">
            <input id={pid + '-pmin'} className="mini-in mono" inputMode="decimal" value={hasNum(it.rpeMin) ? String(it.rpeMin).replace('.', ',') : ''} onChange={num('rpeMin')} aria-label="En düşük RPE" />
            <span>–</span>
            <input id={pid + '-pmax'} className="mini-in mono" inputMode="decimal" value={hasNum(it.rpeMax) ? String(it.rpeMax).replace('.', ',') : ''} onChange={num('rpeMax')} aria-label="En yüksek RPE" />
          </div>
        </div>
      </div>
      <div className="field-pair">
        <span className="st-k">Set arası dinlenme</span>
        <div className="chips-wrap">
          {REST_OPTS.map((r) => <button key={r} type="button" className={'fchip sm' + (it.rest === r ? ' on' : '')} onClick={() => set('rest')(r)}>{restTxt(r)}</button>)}
        </div>
      </div>
      <div className="field-pair">
        <label className="st-k" htmlFor={pid + '-note'}>Not</label>
        <input id={pid + '-note'} className="text-in" placeholder="örn. ağır setler, 3 sn eksantrik" value={it.note || ''} onChange={(e) => set('note')(e.target.value)} />
      </div>
      <div className="ied-actions">
        <button type="button" className="btn ghost sm" disabled={idx === 0} onClick={() => onMove(-1)} aria-label="Yukarı taşı">↑ Yukarı</button>
        <button type="button" className="btn ghost sm" disabled={idx === n - 1} onClick={() => onMove(1)} aria-label="Aşağı taşı">↓ Aşağı</button>
        {confirm ? (
          <span className="confirm-inline">
            <button type="button" className="btn danger sm" onClick={onRemove}>Sil</button>
            <button type="button" className="btn ghost sm" onClick={() => setConfirm(false)}>Vazgeç</button>
          </span>
        ) : <button type="button" className="btn ghost sm danger-t" onClick={() => setConfirm(true)}>Hareketi sil</button>}
      </div>
    </div>
  );
}

function ProgramEditor({ program, onSave, onDelete, onBack, custom, addCustom, start, activeId }) {
  const [p, setP] = useState(() => clone(program));
  const [dayIdx, setDayIdx] = useState(0);
  const [openItem, setOpenItem] = useState(null);
  const [picker, setPicker] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [saved, setSaved] = useState(true);
  const timer = useRef(0);
  const latest = useRef(p);
  const pending = useRef(false);
  const flush = () => { if (pending.current) { pending.current = false; onSave(latest.current); setSaved(true); } };
  useEffect(() => () => { clearTimeout(timer.current); if (pending.current) { pending.current = false; onSave(latest.current); } }, []);
  const commit = (fn) => {
    const np = clone(latest.current);
    fn(np);
    np.updatedAt = Date.now();
    latest.current = np;
    setP(np);
    setSaved(false);
    pending.current = true;
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 600);
  };
  const day = p.days[Math.min(dayIdx, p.days.length - 1)];
  const di = p.days.indexOf(day);
  const totalSets = day ? day.items.reduce((a, i) => a + Number(i.sets || 0), 0) : 0;

  return (
    <div className="editor">
      <div className="ed-top">
        <button type="button" id="ed-back" className="back-btn" onClick={() => { flush(); onBack(); }}><Icon name="left" size={16} /> Programlar</button>
        <span className={'save-st mono' + (saved ? ' ok' : '')}>{saved ? 'Kaydedildi' : 'Kaydediliyor'}</span>
      </div>
      <input id="prog-name" className="prog-name" placeholder="Program adı" value={p.name} onChange={(e) => commit((np) => { np.name = e.target.value; })} autoFocus={!program.name} />

      <div className="day-tabs" role="tablist" aria-label="Günler">
        {p.days.map((d, i) => (
          <button key={d.id} type="button" role="tab" aria-selected={i === di} className={'day-tab' + (i === di ? ' on' : '')} onClick={() => { setDayIdx(i); setOpenItem(null); }}>
            <span className="mono">{d.weekday == null ? '—' : WD_SHORT[d.weekday]}</span>{d.name || 'Adsız'}
          </button>
        ))}
        <button type="button" id="add-day" className="day-tab add" onClick={() => { commit((np) => { np.days.push({ id: newId('d'), name: (np.days.length + 1) + '. gün', weekday: null, items: [] }); }); setDayIdx(p.days.length); setOpenItem(null); }}>+ Gün</button>
      </div>

      {day ? (
        <section className="day-card">
          <div className="day-head">
            <input id={'day-name-' + day.id} className="day-name" value={day.name} placeholder="Gün adı" onChange={(e) => commit((np) => { np.days[di].name = e.target.value; })} />
            <span className="mono day-k">{day.items.length} hareket · {totalSets} set</span>
          </div>
          <div className="wd-pick" role="radiogroup" aria-label="Haftanın günü">
            {WEEK_ORDER.map((w) => (
              <button key={w} type="button" role="radio" aria-checked={day.weekday === w} className={'wd-btn' + (day.weekday === w ? ' on' : '')} onClick={() => commit((np) => { np.days[di].weekday = np.days[di].weekday === w ? null : w; })}>{WD_SHORT[w]}</button>
            ))}
          </div>

          {!day.items.length ? (
            <div className="empty sm">
              <strong>Boş sayfa</strong>
              <p>Bu güne yapacağın hareketleri tek tek ekle. Listede olmayan bir hareketi adını yazarak ekleyebilirsin.</p>
            </div>
          ) : (
            <ol className="items">
              {day.items.map((it, i) => (
                <li key={it.id} className={'item' + (openItem === it.id ? ' open' : '')}>
                  <button type="button" className="item-row" aria-expanded={openItem === it.id} onClick={() => setOpenItem(openItem === it.id ? null : it.id)}>
                    <span className="item-i mono">{i + 1}</span>
                    <span className="item-t">
                      <strong>{it.name}</strong>
                      <small className="mono">{targetTxt(it)} · {restTxt(it.rest)}</small>
                      {it.note ? <em>{it.note}</em> : null}
                    </span>
                    <Icon name={openItem === it.id ? 'up' : 'right'} size={14} />
                  </button>
                  {openItem === it.id ? (
                    <ItemEditor
                      it={it} idx={i} n={day.items.length}
                      onChange={(nit) => commit((np) => { np.days[di].items[i] = nit; })}
                      onMove={(d) => commit((np) => { const a = np.days[di].items; const j = i + d; if (j < 0 || j >= a.length) return; const t = a[i]; a[i] = a[j]; a[j] = t; })}
                      onRemove={() => { setOpenItem(null); commit((np) => { np.days[di].items.splice(i, 1); }); }}
                    />
                  ) : null}
                </li>
              ))}
            </ol>
          )}
          <button type="button" id="add-item" className="add-item" onClick={() => setPicker(true)}>+ Hareket ekle</button>

          <div className="day-foot">
            {day.items.length ? <button type="button" id="ed-start" className="btn primary" disabled={!!activeId} onClick={() => { flush(); start(latest.current, latest.current.days[di]); }}>Bu günü başlat <Icon name="play" size={13} /></button> : null}
            {p.days.length > 1 ? (
              confirm === 'day' ? (
                <span className="confirm-inline">
                  <button type="button" className="btn danger sm" onClick={() => { setConfirm(null); setDayIdx(Math.max(0, di - 1)); commit((np) => { np.days.splice(di, 1); }); }}>Günü sil</button>
                  <button type="button" className="btn ghost sm" onClick={() => setConfirm(null)}>Vazgeç</button>
                </span>
              ) : <button type="button" className="btn ghost sm danger-t" onClick={() => setConfirm('day')}>Günü sil</button>
            ) : null}
          </div>
        </section>
      ) : null}

      <div className="ed-danger">
        {confirm === 'program' ? (
          <div className="confirm-box">
            <p>“{p.name || 'Adsız program'}” silinsin mi? Kayıtlı antrenmanların silinmez.</p>
            <div className="confirm-inline">
              <button type="button" id="prog-del-yes" className="btn danger sm" onClick={() => { pending.current = false; clearTimeout(timer.current); onDelete(p.id); }}>Programı sil</button>
              <button type="button" className="btn ghost sm" onClick={() => setConfirm(null)}>Vazgeç</button>
            </div>
          </div>
        ) : <button type="button" id="prog-del" className="btn ghost sm danger-t" onClick={() => setConfirm('program')}>Programı sil</button>}
      </div>

      <ExercisePicker
        open={picker}
        onClose={() => setPicker(false)}
        custom={custom}
        addCustom={addCustom}
        onPick={(ex) => { const nit = itemFromEx(ex); commit((np) => { np.days[di].items.push(nit); }); setOpenItem(nit.id); }}
      />
    </div>
  );
}

/* ---------- hız animasyonları ---------- */
function Lane({ v, label, color, playing }) {
  const barRef = useRef(null);
  useEffect(() => {
    if (!barRef.current) return;
    if (!playing || reducedMotion()) { barRef.current.style.transform = 'translateY(-' + 62 + 'px)'; return; }
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
      if (barRef.current) barRef.current.style.transform = 'translateY(-' + (k * 62).toFixed(1) + 'px)';
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
      <span className="lane2-v mono" style={{ color }}>{nf(v, 2)} <small>m/s</small></span>
    </div>
  );
}

function SpeedPicker({ lvl, setLvl, reps }) {
  const rir = rirFromSpeed(reps, lvl);
  const vels = repVelocities(reps, rir, SPEED[lvl].vl);
  const v1 = vels[0], vL = vels[vels.length - 1];
  return (
    <div className="speed">
      <div className="speed-h">
        <span className="st-k">Son tekrar nasıl kalktı?</span>
        <span className="mono speed-band" style={{ color: vlColor(SPEED[lvl].vl) }}>{rir >= 5 ? '5+ kaldı' : `${rir} kaldı`} · {SPEED[lvl].band}</span>
      </div>
      <div className="speed-body">
        <div className="lanes">
          <Lane v={v1} label="1. tekrar" color="var(--neuro)" playing />
          <Lane v={vL} label="Son tekrar" color={vlColor(SPEED[lvl].vl)} playing />
        </div>
        <div className="speed-opts" role="radiogroup" aria-label="Son tekrarın hızı">
          {SPEED.map((s, i) => (
            <button key={i} type="button" id={'speed-' + i} role="radio" aria-checked={lvl === i} className={'sopt' + (lvl === i ? ' on' : '')} style={{ '--c': vlColor(s.vl) }} onClick={() => setLvl(i)}>
              <i className="sopt-bar"><b style={{ height: Math.round((1 - s.vl) * 100) + '%' }} /></i>
              <span className="sopt-t"><strong>{s.k}</strong><small>{s.d}</small></span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function RepBars({ set, h = 26, live = -1 }) {
  const vels = repVelocities(set.reps, set.rir, set.vl);
  const max = vels[0] || 1;
  return (
    <div className="repbars" style={{ height: h }} aria-hidden="true">
      {vels.map((v, i) => (
        <i key={i} style={{ height: Math.max(8, (v / max) * 100) + '%', background: vlColor(1 - v / max), opacity: live >= 0 && i > live ? 0.18 : 1 }} />
      ))}
    </div>
  );
}

function SetReplay({ set, bench = false }) {
  const vels = useMemo(() => repVelocities(set.reps, set.rir, set.vl), [set.reps, set.rir, set.vl]);
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
      if (barRef.current) barRef.current.style.transform = 'translateY(-' + (k * 74).toFixed(1) + 'px)';
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
          <span className="mono rp-rep">Tekrar {Math.max(0, rep + 1)}/{vels.length}</span>
          <span className="mono rp-v" style={{ color: cur ? vlColor(1 - cur / vels[0]) : 'var(--muted)' }}>{cur ? (bench ? nf(cur, 2) + ' m/s' : '%' + Math.round((1 - cur / vels[0]) * 100)) : '–'}</span>
        </div>
        <RepBars set={set} h={46} live={rep} />
        <div className="rp-foot">
          <span className="rp-note">Tahmini hızlar · gerçek zamanlı</span>
          <button type="button" className="btn ghost sm" onClick={() => setRun((r) => r + 1)}><Icon name="reset" size={13} /> Oynat</button>
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
  return {
    kg: last ? Number(last.kg) || 0 : hasNum(t.kg) ? Number(t.kg) : 20,
    reps: last ? last.reps : hasNum(t.repMax) ? Number(t.repMax) : hasNum(t.repMin) ? Number(t.repMin) : 8,
    lvl: last ? last.lvl : 1,
    rpe: null,
    note: '',
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
        <span className="rest-k">{over ? 'Dinlenme bitti' : 'Dinlenme'}</span>
        <span className="mono rest-v">{over ? '+' + mmss(-left * 1000) : mmss(left * 1000)}<small> / {mmss(rest.total * 1000)}</small></span>
      </div>
      <button type="button" className="btn ghost sm" onClick={onAdd}>+30 sn</button>
      <button type="button" className="x-btn" onClick={onClose} aria-label="Dinlenmeyi kapat">✕</button>
    </div>
  );
}

function SessionView({ session, onUpdate, onFinished, onDiscard, onBack, custom, addCustom, openBio }) {
  const [s, setS] = useState(() => clone(session));
  const [cur, setCur] = useState(() => firstOpen(session));
  const [entry, setEntry] = useState(() => entryFor(session.items[firstOpen(session)]));
  const [rest, setRest] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [picker, setPicker] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [openSet, setOpenSet] = useState(null);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(t); }, []);
  const save = (ns) => { setS(ns); onUpdate(ns); };
  const item = s.items[cur];
  const totalSets = s.items.reduce((a, it) => a + it.sets.length, 0);
  const goItem = (i) => { setCur(i); setEntry(entryFor(s.items[i])); setOpenSet(null); };

  const rirEst = item ? rirFromSpeed(entry.reps, entry.lvl) : 0;
  const rirInt = Math.round(rirEst);
  const rpeEst = clamp(10 - rirInt, 6, 10);
  const rpe = entry.rpe != null ? entry.rpe : rpeEst;
  const rirFinal = entry.rpe != null ? (entry.rpe === 6 ? Math.max(4, rirInt) : 10 - entry.rpe) : rirInt;

  const logSet = () => {
    if (!item) return;
    const ns = clone(s);
    const set = { kg: Number(entry.kg) || 0, reps: Math.max(1, Math.round(entry.reps)), lvl: entry.lvl, vl: SPEED[entry.lvl].vl, rpe, rir: rirFinal, rirEst: Math.round(rirEst * 10) / 10, note: entry.note || '', tags: [], at: Date.now() };
    ns.items[cur].sets.push(set);
    save(ns);
    setRest({ start: Date.now(), total: item.target.rest || 120 });
    setEntry({ ...entry, rpe: null, note: '' });
    setOpenSet(null);
  };
  const removeSet = (j) => { const ns = clone(s); ns.items[cur].sets.splice(j, 1); save(ns); setOpenSet(null); };
  const addItem = (ex) => {
    const ns = clone(s);
    ns.items.push({ id: newId('e'), exId: ex.exId || null, name: ex.name, muscle: ex.muscle, note: '', target: { sets: 3, repMin: 8, repMax: 12, kg: null, rpeMin: null, rpeMax: null, rest: ex.rest || 120 }, sets: [] });
    save(ns);
    setCur(ns.items.length - 1);
    setEntry(entryFor(ns.items[ns.items.length - 1]));
  };
  const finish = () => { const ns = clone(s); ns.status = 'done'; ns.endedAt = Date.now(); save(ns); onFinished(ns); };
  const lib = item && item.exId ? libById(item.exId) : null;
  const doneHere = item ? item.sets.length >= item.target.sets : false;
  const vlSeries = item ? item.sets.map((x) => x.vl) : [];

  return (
    <div className="session">
      <div className="ses-top">
        <button type="button" className="back-btn" onClick={onBack}><Icon name="left" size={16} /> Günlük</button>
        <span className="mono ses-clock"><span className="live-dot" />{mmss(now - s.startedAt)}</span>
        <button type="button" id="finish-btn" className="btn fire sm" onClick={() => setConfirm(confirm === 'finish' ? null : 'finish')}>Bitir</button>
      </div>
      <div className="ses-title">
        <h3>{s.dayName}</h3>
        <span className="mono">{totalSets} set · {s.items.length} hareket</span>
      </div>

      {confirm === 'finish' || confirm === 'discard' ? (
        <div className="confirm-box">
          {confirm === 'finish' ? (
            <React.Fragment>
              <p>{totalSets ? `Antrenmanı bitir? ${totalSets} set kaydedildi.` : 'Hiç set kaydetmedin. Antrenmanı kaydetmeden çıkabilirsin.'}</p>
              <div className="confirm-inline">
                {totalSets ? <button type="button" id="finish-yes" className="btn fire sm" onClick={finish}>Bitir ve özetle</button> : <button type="button" className="btn danger sm" onClick={() => onDiscard(s.id)}>Kaydetmeden çık</button>}
                <button type="button" className="btn ghost sm" onClick={() => setConfirm(null)}>Devam et</button>
                {totalSets ? <button type="button" className="btn ghost sm danger-t" onClick={() => setConfirm('discard')}>Antrenmanı sil</button> : null}
              </div>
            </React.Fragment>
          ) : (
            <React.Fragment>
              <p>Bu antrenman ve {totalSets} set kalıcı olarak silinsin mi?</p>
              <div className="confirm-inline">
                <button type="button" className="btn danger sm" onClick={() => onDiscard(s.id)}>Sil</button>
                <button type="button" className="btn ghost sm" onClick={() => setConfirm(null)}>Vazgeç</button>
              </div>
            </React.Fragment>
          )}
        </div>
      ) : null}

      <div className="ex-strip" role="tablist" aria-label="Hareketler">
        {s.items.map((it, i) => {
          const full = it.sets.length >= it.target.sets;
          return (
            <button key={it.id} type="button" role="tab" aria-selected={i === cur} className={'exs' + (i === cur ? ' on' : '') + (full ? ' full' : '')} onClick={() => goItem(i)}>
              <span className="exs-n">{i + 1}. {it.name}</span>
              <span className="exs-k mono">{it.sets.length}/{it.target.sets}</span>
            </button>
          );
        })}
        <button type="button" id="ses-add-ex" className="exs add" onClick={() => setPicker(true)}>+ Hareket</button>
      </div>

      {rest ? <RestBar rest={rest} now={now} onAdd={() => setRest({ ...rest, total: rest.total + 30 })} onClose={() => setRest(null)} /> : null}

      {!item ? (
        <div className="empty">
          <strong>Serbest antrenman</strong>
          <p>Yaptığın hareketi ekle ve setlerini kaydet.</p>
          <button type="button" className="btn primary" onClick={() => setPicker(true)}>+ Hareket ekle</button>
        </div>
      ) : (
        <section className="ex-card">
          <header className="exc-h">
            <div>
              <h3 className="exc-name">{item.name}</h3>
              <span className="exc-m">{item.muscle}{item.note ? ' · ' + item.note : ''}</span>
            </div>
            {lib && lib.bio ? <button type="button" className="mod-link" onClick={() => openBio(lib.bio)}>Biyomekanik <Icon name="right" size={12} /></button> : null}
          </header>
          <div className="exc-target mono">Hedef <b>{targetTxt(item.target)}</b> · {restTxt(item.target.rest)}</div>

          {item.sets.length ? (
            <React.Fragment><div className="set-table-head mono"><span>Set</span><span>Kilo</span><span>Tekrar</span><span>RPE</span><span>Son tekrar</span><span>Saat</span></div><ul className="setlist v7-setlist">
              {item.sets.map((x, j) => (
                <li key={x.at + '-' + j} className={'setrow' + (openSet === j ? ' open' : '')}>
                  <button type="button" className="setrow-b" aria-expanded={openSet === j} onClick={() => setOpenSet(openSet === j ? null : j)}>
                    <span className="sr-i mono">{j + 1}</span>
                    <span className="sr-main mono">{nf(Number(x.kg))}</span>
                    <span className="sr-reps mono">{x.reps}</span>
                    <span className="sr-rpe mono">{rpeLabel(x.rpe, x.rir)}</span>
                    <span className="sr-last">{SPEED[x.lvl]?.k || '—'}</span>
                    <span className="sr-time mono">{new Date(x.at).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}</span>
                  </button>
                  {openSet === j ? (
                    <div className="setrow-x">
                      <SetReplay set={x} bench={lib?.bio === 'bench'} />
                      <div className="sr-meta mono">
                        <span>{x.rir <= 4 && x.reps + x.rir <= 12 ? 'Tahmini 1RM ' + nf(Math.round(e1rm(x.kg, x.reps, x.rir) * 2) / 2) + ' kg' : '1RM tahmini bu sette geçerli değil'}</span>
                        <span>RIR ~{x.rir}</span>
                        {x.note ? <span>Not: {x.note}</span> : null}
                        <button type="button" className="btn ghost sm danger-t" onClick={() => removeSet(j)}>Seti sil</button>
                      </div>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul></React.Fragment>
          ) : null}

          {vlSeries.length > 1 ? (
            <div className="vl-trend">
              <span className="st-k">Setler boyunca hız kaybı</span>
              <div className="vlt-bars">
                {vlSeries.map((v, j) => <i key={j} style={{ height: Math.max(10, v * 140) + '%', background: vlColor(v) }}><b className="mono">%{Math.round(v * 100)}</b></i>)}
              </div>
            </div>
          ) : null}

          <div className="entry">
            <div className="entry-h">
              <strong>Set {item.sets.length + 1}{item.sets.length >= item.target.sets ? ' · ek set' : ''}</strong>
              <span className="mono">hedef {repTxt(item.target.repMin, item.target.repMax)} tekrar{hasNum(item.target.kg) ? ' · ' + kgTxt(item.target.kg) : ''}</span>
            </div>
            <div className="entry-steps">
              <Stepper id={'kg-' + item.id} label="Kilo" unit="kg" value={entry.kg} step={2.5} min={0} max={500} onChange={(v) => setEntry({ ...entry, kg: v, rpe: null })} />
              <Stepper id={'reps-' + item.id} label="Tekrar" value={entry.reps} step={1} min={1} max={60} decimals={0} onChange={(v) => setEntry({ ...entry, reps: Math.round(v), rpe: null })} />
            </div>
            <SpeedPicker lvl={entry.lvl} setLvl={(l) => setEntry({ ...entry, lvl: l, rpe: null })} reps={entry.reps} />
            <div className="rpe-pick">
              <div className="speed-h">
                <span className="st-k">Efor</span>
                <span className="mono rpe-est">tahmin: RIR ~{rirInt} · RPE {rpeLabel(rpeEst, rirInt)}</span>
              </div>
              <div className="rpe-chips" role="radiogroup" aria-label="RPE">
                {[6, 7, 8, 9, 10].map((n) => (
                  <button key={n} type="button" role="radio" aria-checked={rpe === n} className={'rchip' + (rpe === n ? ' on' : '') + (rpeEst === n ? ' est' : '')} onClick={() => setEntry({ ...entry, rpe: n })}>
                    <span className="mono">{n === 6 ? '≤6' : n}</span>
                    <small>{n === 10 ? 'tükeniş' : 'RIR ' + (10 - n) + (n === 6 ? '+' : '')}</small>
                  </button>
                ))}
              </div>
            </div>
            <label className="entry-note"><span>Set notu</span><input value={entry.note} maxLength={120} placeholder="Opsiyonel: teknik, ağrı, tempo…" onChange={(e)=>setEntry({...entry,note:e.target.value})}/></label>
            <button type="button" id="log-set" className="btn fire full big" onClick={logSet}>Seti kaydet</button>
            {doneHere && cur < s.items.length - 1 ? (
              <button type="button" id="next-ex" className="btn primary full" onClick={() => goItem(cur + 1)}>Sonraki hareket: {s.items[cur + 1].name} <Icon name="right" /></button>
            ) : null}
          </div>
        </section>
      )}

      <ExercisePicker open={picker} onClose={() => setPicker(false)} custom={custom} addCustom={addCustom} onPick={addItem} />
    </div>
  );
}

/* ---------- özet ---------- */
function SessionSummary({ session, sessions, onBack, onDelete, openSim, fresh }) {
  const [confirm, setConfirm] = useState(false);
  const st = sessionStats(session);
  const all = sessions.some((x) => x.id === session.id) ? sessions.map((x) => (x.id === session.id ? session : x)) : [session, ...sessions];
  const weekly = weeklyHard(all, session.endedAt || Date.now());
  const wmax = Math.max(22, ...weekly.map((w) => w[1]));
  const prevBest = (exId, name) => {
    let best = 0;
    all.filter((x) => x.status === 'done' && x.startedAt < session.startedAt).forEach((x) => x.items.forEach((it) => {
      if ((exId && it.exId === exId) || (!exId && it.name === name)) best = Math.max(best, bestE1(it.sets));
    }));
    return best;
  };
  const hard = st.hard;
  const prefill = hard.length ? {
    values: {
      load: clamp(Math.round(hard.reduce((a, x) => a + pctFromRepsRir(x.reps, x.rir), 0) / hard.length * 100), 60, 95),
      rpe: clamp(Math.round(hard.reduce((a, x) => a + x.rpe, 0) / hard.length * 2) / 2, 6, 10),
      sets: clamp(weekly.length ? weekly[0][1] : hard.length, 4, 30),
      rest: clamp(Math.round(hard.reduce((a, x) => a + (x.rest || 120), 0) / hard.length / 60 * 2) / 2, 1, 5),
      sleep: 7, deload: false,
    },
    label: session.dayName + ', ' + dateTxt(session.startedAt),
  } : null;

  return (
    <div className="summary">
      <div className="ed-top">
        <button type="button" className="back-btn" onClick={onBack}><Icon name="left" size={16} /> Günlük</button>
        <span className="mono save-st ok">{dateTxt(session.startedAt)}</span>
      </div>
      <div className="sum-hero">
        <span className="eyebrow fire">{fresh ? 'Antrenman tamamlandı' : 'Antrenman özeti'}</span>
        <h3>{session.dayName}</h3>
        {session.programName ? <span className="sum-prog">{session.programName}</span> : null}
      </div>
      <div className="tiles">
        <Tile k="Süre" v={durTxt(st.dur)} unit="" />
        <Tile k="Set" v={st.sets.length} unit="" sub={hard.length + ' zor set (RIR ≤ 4)'} />
        <Tile k="Tonaj" v={nf(Math.round(st.tonnage))} unit=" kg" sub="kilo × tekrar" />
        <Tile k="Ort. hız kaybı" v={st.sets.length ? '%' + Math.round(st.sets.reduce((a, x) => a + x.vl, 0) / st.sets.length * 100) : '–'} unit="" sub="set içi, tahmini" />
      </div>

      <section className="card">
        <div className="card-h"><h3>Hareketler</h3></div>
        <ul className="sum-ex">
          {session.items.filter((it) => it.sets.length).map((it) => {
            const best = bestE1(it.sets);
            const pb = best ? prevBest(it.exId, it.name) : 0;
            const d = pb ? best - pb : 0;
            return (
              <li key={it.id}>
                <div className="se-top">
                  <strong>{it.name}</strong>
                  <span className="mono se-e1">{best ? <React.Fragment>e1RM {nf(Math.round(best * 2) / 2)} kg{pb ? <em className={d >= 0 ? 'up' : 'down'}> {d >= 0 ? '+' : '−'}{nf(Math.abs(Math.round(d * 2) / 2))}</em> : null}</React.Fragment> : 'hafif setler'}</span>
                </div>
                <div className="se-sets">
                  {it.sets.map((z, j) => (
                    <span key={j} className="se-set">
                      <span className="mono">{nf(Number(z.kg))}×{z.reps}</span>
                      <i style={{ background: vlColor(z.vl), width: Math.max(10, z.vl * 100) + '%' }} />
                    </span>
                  ))}
                </div>
              </li>
            );
          })}
          {!st.sets.length ? <li className="muted-p">Bu antrenmanda set yok.</li> : null}
        </ul>
      </section>

      <section className="card">
        <div className="card-h"><h3>Haftalık zor set</h3><span className="card-hint">son 7 gün</span></div>
        {weekly.length ? (
          <div className="wk">
            {weekly.map(([m, n]) => (
              <div key={m} className="wk-row">
                <span className="wk-m">{m}</span>
                <div className="wk-bar">
                  <span className="wk-zone" style={{ left: (10 / wmax) * 100 + '%', width: (10 / wmax) * 100 + '%' }} />
                  <span className="wk-fill" style={{ width: (n / wmax) * 100 + '%' }} />
                </div>
                <span className="mono wk-n">{n}</span>
              </div>
            ))}
            <p className="chart-note">Taralı alan kas başına haftada 10–20 zor set: hipertrofi için sık önerilen aralık.</p>
          </div>
        ) : <p className="muted-p">Zor set yok.</p>}
      </section>

      {prefill ? (
        <button type="button" id="to-sim" className="btn primary full" onClick={() => openSim(prefill)}>
          Yorgunluk simülatöründe aç <Icon name="right" />
        </button>
      ) : null}

      <Notes
        what="Her setin hız kaybını kendin seçtin; uygulama bundan kalan tekrarı (RIR) ve tahmini 1RM'yi hesapladı. Zor setler (RIR ≤ 4) kas başına toplanıp haftalık hacmi verir; Yorgunluk simülatörü bu hacmi ve ortalama eforu kullanır."
        tip="Aynı yük ve tekrarda hız kaybın haftadan haftaya azalıyorsa güçleniyorsun; artıyorsa yorgunluk birikiyor olabilir. Hedef tekrar aralığının üstüne çıktığın sette çift progresyonla yükü 2,5 kg artır."
        caveat="Hızlar ölçülmedi, tahmin edildi. Model bench press'in yük–hız ilişkisine (González-Badillo 2010) ve tükenişte ~0,17 m/s'lik son tekrar hızına dayanır; diğer hareketlerde ve kişiden kişiye sapma büyüktür. Hız kaybı ile kalan tekrar arasındaki ilişki güçlü ama yüke ve kişiye bağlı (Rodríguez-Rosell 2020)."
      />

      <div className="ed-danger">
        {confirm ? (
          <div className="confirm-box">
            <p>Bu antrenman kaydı kalıcı olarak silinsin mi?</p>
            <div className="confirm-inline">
              <button type="button" className="btn danger sm" onClick={() => onDelete(session.id)}>Kaydı sil</button>
              <button type="button" className="btn ghost sm" onClick={() => setConfirm(false)}>Vazgeç</button>
            </div>
          </div>
        ) : <button type="button" className="btn ghost sm danger-t" onClick={() => setConfirm(true)}>Kaydı sil</button>}
      </div>
    </div>
  );
}

/* ---------- sekme ---------- */
function LogTab({ store, nav, setNav, openBio, openSim }) {
  const [st, apiRef] = store;
  const put = (kind, obj) => (apiRef.current ? apiRef.current.put(kind, obj) : null);
  const del = (kind, id) => (apiRef.current ? apiRef.current.del(kind, id) : null);
  const addCustom = (name, muscle) => {
    const doc = { id: newId('x'), name, muscle: muscle || 'Diğer', createdAt: Date.now(), pending: true };
    put('custom', doc);
    return doc;
  };
  const active = st.sessions.find((s) => s.status === 'active');
  const start = (program, day) => {
    if (active) { setNav({ name: 'session', id: active.id }); return; }
    const s = sessionFromDay(program, day);
    put('sessions', s);
    setNav({ name: 'session', id: s.id, draft: s });
  };
  const home = () => setNav({ name: 'home' });

  if (nav.name === 'editor') {
    const p = st.programs.find((x) => x.id === nav.id) || nav.draft;
    if (p) return <ProgramEditor key={p.id} program={p} onSave={(np) => put('programs', np)} onDelete={(id) => { del('programs', id); home(); }} onBack={home} custom={st.custom} addCustom={addCustom} start={start} activeId={active ? active.id : null} />;
  }
  if (nav.name === 'session') {
    const s = st.sessions.find((x) => x.id === nav.id) || nav.draft;
    if (s && s.status === 'active') {
      return (
        <SessionView
          key={s.id} session={s}
          onUpdate={(ns) => put('sessions', ns)}
          onFinished={(ns) => setNav({ name: 'summary', id: ns.id, draft: ns, fresh: true })}
          onDiscard={(id) => { del('sessions', id); home(); }}
          onBack={home} custom={st.custom} addCustom={addCustom} openBio={openBio}
        />
      );
    }
  }
  if (nav.name === 'summary') {
    const s = (nav.draft && nav.fresh ? nav.draft : null) || st.sessions.find((x) => x.id === nav.id) || nav.draft;
    if (s) return <SessionSummary session={s} sessions={st.sessions} fresh={!!nav.fresh} onBack={home} onDelete={(id) => { del('sessions', id); home(); }} openSim={openSim} />;
  }
  return <LogHome st={st} put={put} del={del} go={setNav} start={start} />;
}

function useActions(store, nav, setNav, fatigueNow = 0) {
  const [st, apiRef] = store;
  const put = (kind, obj) => (apiRef.current ? apiRef.current.put(kind, obj) : null);
  const del = (kind, id) => (apiRef.current ? apiRef.current.del(kind, id) : null);
  const active = st.sessions.find((s) => s.status === 'active');
  const addCustom = (name, muscle) => {
    const doc = { id: newId('x'), name, muscle: muscle || 'Diğer', createdAt: Date.now(), pending: true, fat: 2, prof: 'dengeli', sec: [] };
    put('custom', doc);
    return doc;
  };
  const start = (program, day) => {
    if (active) { setNav({ name: 'session', id: active.id }); return; }
    if (day && !day.items.length) return;
    const s = { ...sessionFromDay(program, day), fatigue: { v: 2, pre: fatigueNow, post: null } };
    put('sessions', s);
    setNav({ name: 'session', id: s.id, draft: s });
  };
  return { st, put, del, active, addCustom, start };
}

function HistoryView({ sessions, checkins, currentFatigue, go, back }) {
  const [period, setPeriod] = useState(30);
  const now = Date.now();
  const done = sessions.filter((s) => s.status === 'done' && (period === 0 || s.startedAt >= now - period * 864e5));
  const stats = done.reduce((a, s) => {
    const x = sessionStats(s); a.sets += x.sets.length; a.hard += x.hard.length; a.tonnage += x.tonnage; a.duration += x.dur;
    x.sets.forEach((z) => { a.rpe += Number(z.rpe) || 0; a.rpeN += 1; if (z.rir <= 0) a.failure += 1; });
    if (s.fatigue) { a.pre += s.fatigue.pre || 0; a.post += s.fatigue.post ?? s.fatigue.pre; a.fatN += 1; }
    return a;
  }, { sets: 0, hard: 0, tonnage: 0, duration: 0, rpe: 0, rpeN: 0, failure: 0, pre: 0, post: 0, fatN: 0 });
  const days = done.length > 1 ? Math.max(1, (done[0].startedAt - done[done.length - 1].startedAt) / 864e5) : period || 7;
  const warnings = [];
  if (stats.rpeN && stats.rpe / stats.rpeN >= 9) warnings.push('Ortalama RPE 9 veya üzeri');
  if (stats.sets && stats.failure / stats.sets >= .3) warnings.push('Setlerin %30+ kadarı tükenişte');
  const muscle = weeklyHard(done, now); muscle.filter(([, n]) => n >= 20).forEach(([m, n]) => warnings.push(`${m}: 7 günde ${n} zor set`));
  if(currentFatigue>=70)warnings.push(`Şu an yorgunluk yüksek: ${Math.round(currentFatigue)}`);else if(currentFatigue>=40)warnings.push(`Şu an yorgunluk birikiyor: ${Math.round(currentFatigue)}`);
  const sleepValues=(checkins||[]).filter(x=>period===0||x.at>=now-period*864e5).map(x=>x.sleep);
  if(sleepValues.length&&sleepValues.reduce((a,b)=>a+b,0)/sleepValues.length<7)warnings.push('Uyku ortalaması 7 saatin altında');
  if(done.length>=2){const main=['Göğüs','Sırt','Quadriceps','Hamstring'];const map=new Map(muscle);main.filter(m=>(map.get(m)||0)<4).forEach(m=>warnings.push(`${m}: son 7 günde az zor set`));}
  if (done.length && now - done[0].startedAt >= 6 * 864e5) warnings.push('Son antrenmandan beri 6+ gün geçti');
  const progressMap=new Map();
  [...done].reverse().forEach(s=>s.items.forEach(it=>{const best=bestE1(it.sets);if(!best)return;const row=progressMap.get(it.exId||it.name)||{name:it.name,first:best,last:best};row.last=best;progressMap.set(it.exId||it.name,row);}));
  const progress=[...progressMap.values()].map(row=>({...row,change:row.first?(row.last/row.first-1)*100:0})).sort((a,b)=>Math.abs(b.change)-Math.abs(a.change));
  progress.filter(x=>x.change<=-5).forEach(x=>warnings.push(`${x.name}: e1RM ${Math.abs(Math.round(x.change))}% düştü`));
  return <div className="v7-stack history-v7">
    <div className="v7-topline"><button className="back-btn" onClick={back}><Icon name="left" /> Antrenman</button><strong>Geçmiş</strong></div>
    <div className="segmented">{[[7, '7 gün'], [30, '30 gün'], [0, 'Tümü']].map(([n, label]) => <button key={n} className={period === n ? 'on' : ''} onClick={() => setPeriod(n)}>{label}</button>)}</div>
    <div className="history-grid">
      <Tile k="Antrenman" v={done.length} unit="" sub={`${(done.length / (days / 7)).toFixed(1)} / hafta`} />
      <Tile k="Toplam süre" v={done.length ? durTxt(stats.duration) : '—'} unit="" sub={done.length ? `ort. ${durTxt(stats.duration / done.length)}` : ''} />
      <Tile k="Set" v={stats.sets} unit="" sub={`${stats.hard} zor set`} />
      <Tile k="Tonaj" v={nf(Math.round(stats.tonnage))} unit=" kg" sub={stats.rpeN ? `ort. RPE ${nf(stats.rpe / stats.rpeN, 1)}` : 'kayıt yok'} />
    </div>
    {stats.fatN ? <section className="card compact"><div className="card-h"><h3>Yorgunluk</h3><span className="card-hint">şu an ayrıca Bugün'de</span></div><div className="fat-pair"><span style={{width:`${stats.pre / stats.fatN}%`}}>başta {Math.round(stats.pre / stats.fatN)}</span><span style={{width:`${stats.post / stats.fatN}%`}}>sonda {Math.round(stats.post / stats.fatN)}</span></div></section> : null}
    {warnings.length ? <div className="warning-list">{warnings.map((w) => <span key={w}>! {w}</span>)}</div> : null}
    {progress.length?<section className="card compact"><div className="card-h"><h3>Hareket gelişimi</h3><span className="card-hint">e1RM · uygun setler</span></div><div className="progress-list">{progress.slice(0,6).map(x=><div key={x.name}><span>{x.name}</span><b className={`mono ${x.change>=0?'up':'down'}`}>{nf(x.last,1)} kg · {x.change>=0?'+':''}{nf(x.change,1)}%</b></div>)}</div></section>:null}
    <ul className="hist">{done.map((s) => { const x = sessionStats(s); const note=s.items.map(i=>i.memo||i.note).find(Boolean); return <li key={s.id}><button className="hist-row" onClick={() => go({name:'summary', id:s.id})}><span className="hist-d mono">{dateTxt(s.startedAt)} · {new Date(s.startedAt).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}–{new Date(s.endedAt||s.startedAt).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}</span><span className="hist-n">{s.dayName}</span><span className="hist-k mono">{durTxt(x.dur)} · {x.sets.length} set · {nf(Math.round(x.tonnage))} kg{s.fatigue?` · yorg. ${Math.round(s.fatigue.pre)}→${Math.round(s.fatigue.post??s.fatigue.pre)}`:''}{note?` · ${note}`:''}</span><Icon name="right" /></button></li>})}</ul>
  </div>;
}

function WorkoutHome({ st, active, start, go, del, put, editProgram }) {
  const [menu, setMenu] = useState(null);
  const types = st.programs.flatMap((program) => program.days.map((day) => ({program, day})));
  return <div className="v7-stack workout-home">
    <div className="v7-action-head"><span className="eyebrow">Antrenman türleri</span><button className="btn ghost sm" onClick={() => go({name:'history'})}>Geçmiş</button></div>
    {active ? <section className="hero-card live compact"><div className="hc-top"><span className="live-dot"/><span className="eyebrow fire">Antrenman sürüyor</span></div><h3>{active.dayName}</h3><button className="btn fire full" onClick={() => go({name:'session',id:active.id})}>Devam et <Icon name="right"/></button></section> : null}
    <div className="type-list">{types.map(({program,day}) => <article key={day.id} className={`type-card${day.items.length ? '' : ' empty-type'}`}>
      <button className="type-main" disabled={!day.items.length || !!active} onClick={() => start(program,day)}><span className="type-day mono">{day.weekday == null ? '—' : WD_SHORT[day.weekday]}</span><span><strong>{day.name}</strong><small>{day.items.length ? `${day.items.length} hareket · ${day.items.reduce((a,i)=>a+Number(i.sets||0),0)} set` : 'Boş tür · sıradaki olmaz'}</small></span><Icon name="play"/></button>
      <button className="type-menu" aria-label="Tür menüsü" onClick={() => setMenu(menu === day.id ? null : day.id)}>⋮</button>
      {menu === day.id ? <div className="type-pop"><button disabled={!day.items.length || !!active} onClick={()=>start(program,day)}>Başlat</button><button onClick={()=>editProgram(program.id)}>Düzenle</button><button className="danger-t" onClick={()=>{ const np={...program,updatedAt:Date.now(),days:program.days.filter(d=>d.id!==day.id)}; if(np.days.length) put('programs',np); else del('programs',program.id); setMenu(null);}}>Sil</button></div> : null}
    </article>)}</div>
    {!types.length ? <div className="empty"><strong>Antrenman türü yok</strong><p>Programlar sekmesinden bir program veya şablon ekle.</p></div> : null}
    <button className="btn ghost full" disabled={!!active} onClick={()=>start(null,null)}>+ Serbest antrenman</button>
  </div>;
}

function WorkoutTab({ store, nav, setNav, openBio, fatigueNow, calculateFatigue, editProgram }) {
  const { st, put, del, active, addCustom, start } = useActions(store, nav, setNav, fatigueNow);
  const home = () => setNav({name:'home'});
  if (nav.name === 'history') return <HistoryView sessions={st.sessions} checkins={st.checkins} currentFatigue={fatigueNow} go={setNav} back={home}/>;
  if (nav.name === 'session') { const s=st.sessions.find(x=>x.id===nav.id)||nav.draft; if(s&&s.status==='active') return <SessionView key={s.id} session={s} onUpdate={ns=>put('sessions',ns)} onFinished={ns=>{const post=calculateFatigue?calculateFatigue(ns):fatigueNow;const done={...ns,fatigue:{v:2,pre:ns.fatigue?.pre??fatigueNow,post}};put('sessions',done);setNav({name:'summary',id:done.id,draft:done,fresh:true});}} onDiscard={id=>{del('sessions',id);home();}} onBack={home} custom={st.custom} addCustom={addCustom} openBio={openBio}/>; }
  if(nav.name==='summary'){const s=(nav.draft&&nav.fresh?nav.draft:null)||st.sessions.find(x=>x.id===nav.id)||nav.draft;if(s)return <SessionSummary session={s} sessions={st.sessions} fresh={!!nav.fresh} onBack={()=>setNav({name:'history'})} onDelete={id=>{del('sessions',id);setNav({name:'history'});}} openSim={()=>{}}/>;}
  return <WorkoutHome st={st} active={active} start={start} go={setNav} del={del} put={put} editProgram={editProgram}/>;
}

function programFatiguePreview(program) {
  const fat3 = new Set(['rdl','squat','barfiks']);
  const fat1 = new Set(['yana-acis','band-yana-acis','leg-curl','band-leg-curl','boyun','triceps-pushdown']);
  const cost = (id) => fat3.has(id) ? 1.5 : fat1.has(id) ? .6 : 1;
  const proximity = (rir) => rir <= 0 ? 1.6 : rir <= 1 ? 1.3 : rir <= 2 ? 1.1 : rir <= 3 ? 1 : .8;
  const score = (load) => 100 * (1 - Math.exp(-load / 20));
  const events = [];
  for (let week=0;week<3;week++) program.days.forEach((day) => {
    if(day.weekday==null)return;
    const mondayIndex=(day.weekday+6)%7;
    events.push({week,day,hour:(week*7+mondayIndex)*24+18});
  });
  events.sort((a,b)=>a.hour-b.hour);
  let load=0,last=0; const rows=[];
  events.forEach((event)=>{
    load*=Math.exp(-(event.hour-last)/36); last=event.hour;
    const pre=score(load);
    load+=event.day.items.reduce((sum,it)=>{
      const rir=Math.max(0,10-Number(it.rpeMax??it.rpeMin??6));
      return rir<=4 ? sum+Number(it.sets||0)*proximity(rir)*cost(it.exId) : sum;
    },0);
    if(event.week===2)rows.push({day:event.day,pre:Math.round(pre),post:Math.round(score(load))});
  });
  return rows;
}

function ProgramsTab({ store, nav, setNav, fatigueNow = 0 }) {
  const { st, put, del, active, addCustom, start }=useActions(store,nav,setNav,fatigueNow);
  const home=()=>setNav({name:'home'});
  if(nav.name==='editor'){const p=st.programs.find(x=>x.id===nav.id)||nav.draft;if(p)return <ProgramEditor key={p.id} program={p} onSave={np=>put('programs',np)} onDelete={id=>{del('programs',id);home();}} onBack={home} custom={st.custom} addCustom={addCustom} start={start} activeId={active?.id}/>;}
  if(nav.name==='analysis'){const p=st.programs.find(x=>x.id===nav.id);if(p){const rows=programFatiguePreview(p);return <div className="v7-stack"><div className="v7-topline"><button className="back-btn" onClick={home}><Icon name="left"/> Programlar</button><strong>Program analizi</strong></div><section className="card"><h3>{p.name}</h3><p className="muted-p">Türler kendi gününde 18:00'de yapılmış gibi üç hafta işletilen tahmini denge.</p><div className="analysis-days">{rows.map(({day,pre,post})=><div key={day.id}><span><b>{day.name}</b><small>{day.weekday==null?'Gün yok':WD_LONG[day.weekday]} · 18:00</small></span><span className="mono">{pre} → <b>{post}</b></span></div>)}</div><p className="chart-note">Tahmindir: hedef RPE, set sayısı, dinlenme ve hareketin sistemik maliyetine dayanır.</p></section></div>;}}
  if(nav.name==='data')return <div className="v7-stack"><div className="v7-topline"><button className="back-btn" onClick={home}><Icon name="left"/> Programlar</button><strong>Yerel veri</strong></div><BackupPanel/></div>;
  const addTemplate=t=>{const p=programFromTemplate(t);put('programs',p);setNav({name:'editor',id:p.id,draft:p});};
  const blank=()=>{const p=blankProgram();put('programs',p);setNav({name:'editor',id:p.id,draft:p});};
  return <div className="v7-stack"><div className="v7-action-head"><span className="eyebrow">Programlarım</span><span className="head-actions"><button className="btn ghost sm" onClick={()=>setNav({name:'data'})}>Veri</button><button className="btn primary sm" onClick={blank}>+ Yeni</button></span></div><div className="program-v7-list">{st.programs.map(p=><article className="prog compact" key={p.id}><div className="prog-h"><div className="prog-t"><strong>{p.name||'Adsız program'}</strong><span className="mono">Güncelleme {new Date(p.updatedAt).toLocaleDateString('tr-TR')} · {p.days.length} gün</span></div><button className="btn ghost sm" onClick={()=>setNav({name:'editor',id:p.id})}>Düzenle</button></div><button className="analysis-link" onClick={()=>setNav({name:'analysis',id:p.id})}>Gün gün yorgunluk analizi <Icon name="right"/></button></article>)}</div><section className="log-sec"><div className="sec-h"><h3>Şablonlar</h3><span className="sec-k">düzenlenebilir</span></div><div className="tmpls">{TEMPLATES.map(t=><button className="tmpl" key={t.key} onClick={()=>addTemplate(t)}><strong>{t.name}</strong><span>{t.desc}</span><small className="mono">{t.days.map(d=>WD_SHORT[d.weekday]).join(' · ')}</small></button>)}</div></section></div>;
}

export { TEMPLATES, programFromTemplate, sessionFromDay, LogTab, WorkoutTab, ProgramsTab, nextPlanned, WeekStrip };
