// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { clamp, Icon, reducedMotion } from '../lab/Cns';
import { EX_LIB, MUS_CODE, EQ, PLYO_INT } from '../../lib/data/exlib';

/* ================= GÜNLÜK: program yazma + antrenman kaydı ================= */
const WD_LONG = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const WD_SHORT = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const MUSCLES = Object.values(MUS_CODE);
const REST_OPTS = [60, 75, 90, 120, 150, 180, 240, 300];
// EX_LIB, MUS_CODE, EQ, KIND, PLYO_INT: exlib.js
const PROF = {
  a: { k: 'Altta ağır', d: 'Kas uzunken en zor; gerilmiş pozisyonda yükler' },
  u: { k: 'Üstte ağır', d: 'Kas kısalırken en zor; alt aralık hafif kalır' },
  o: { k: 'Ortada ağır', d: 'En zor nokta hareketin ortası; iki uç daha hafif' },
  d: { k: 'Dengeli', d: 'Direnç hareket boyunca benzer' },
};
PROF.alt = PROF.a; PROF.ust = PROF.u; PROF.dengeli = PROF.d;
const FAT = ['', 'Düşük', 'Orta', 'Yüksek'];
const LIB_MAP = new Map(EX_LIB.map((e) => [e.id, e]));
const libById = (id) => (id ? LIB_MAP.get(id) : undefined);
const isPlyo = (exId) => { const e = libById(exId); return !!(e && e.kind === 'plyo'); };
// Pliometrik yorgunluk: temas başına yük, yoğunluğa göre (düşük, orta, yüksek, şok). 100 orta temas ≈ 5 orta maliyetli zor set.
const PLYO_W = [0, 0.03, 0.05, 0.08, 0.12];
const PLYO_Q = [
  { k: 'Korundu', d: 'Yükseklik ve hız korundu', c: 'var(--neuro)' },
  { k: 'Biraz düştü', d: 'Son tekrarlar biraz alçaldı', c: 'var(--amber)' },
  { k: 'Belirgin düştü', d: 'Kalite bozuldu; seti bitir', c: 'var(--burn)' },
];

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
// Kullanıcı son tekrarın hızını ilk tekrara göre hissiyle seçer. Her seviye doğrudan kalan tekrara (RIR) bağlıdır;
// yükten bağımsızdır. Aynı hız kaybı yüzdesi hafif yükte tükenişten uzak, ağır yükte yakın demektir
// (Rodríguez-Rosell ve ark. 2020), ama kişi "zar zor çıktı" dediğinde yük ne olursa olsun tükenişe yakındır.
// RIR tabanlı RPE ile bar hızı güçlü ilişkili (Zourdos ve ark. 2016, r = −0,88).
const SPEED = [
  { k: 'Aynı hız', d: 'İlki kadar hızlı · 5+ kaldı', rir: 5, vl: 0.05 },
  { k: 'Biraz yavaş', d: 'Biraz yavaşladı · ~3 kaldı', rir: 3, vl: 0.18 },
  { k: 'Belirgin yavaş', d: 'Belirgin yavaş · ~2 kaldı', rir: 2, vl: 0.32 },
  { k: 'Çok yavaş', d: 'Çok yavaş · ~1 kaldı', rir: 1, vl: 0.47 },
  { k: 'Takılma sınırı', d: 'Zar zor çıktı · tükeniş', rir: 0, vl: 0.62 },
];
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
// 1RM tahmini yalnızca tükenişe yakın setlerden (RIR ≤ 4): uzak setlerde Epley sapması büyür.
// 1RM tahmini yalnızca tükenişe yakın (RIR ≤ 4) ve tükenişe kadar ≤ 12 tekrarlık setlerden; tekrar arttıkça formüller şişirir
const e1Ok = (z) => !z.plyo && z.rir <= 4 && Number(z.kg) > 0 && z.reps + z.rir <= 12;
const bestE1 = (sets) => sets.filter(e1Ok).reduce((m, z) => Math.max(m, e1rm(z.kg, z.reps, z.rir)), 0);
const vlColor = (vl) => (vl < 0.2 ? 'var(--neuro)' : vl < 0.35 ? 'var(--amber)' : vl < 0.5 ? 'var(--fire)' : 'var(--burn)');

function blankProgram() {
  const now = Date.now();
  return { id: newId('p'), name: '', createdAt: now, updatedAt: now, days: [{ id: newId('d'), name: '1. gün', weekday: null, items: [] }] };
}
function sessionFromDay(program, day) {
  return {
    id: newId('s'), programId: program ? program.id : null, programName: program ? program.name : '', dayId: day ? day.id : null,
    dayName: day ? day.name : 'Serbest antrenman', startedAt: Date.now(), endedAt: null, status: 'active',
    items: (day ? day.items : []).map((it) => ({
      id: newId('e'), srcId: it.id || null, exId: it.exId || null, name: it.name, muscle: it.muscle, note: it.note || '', memo: '',
      target: { sets: it.sets, repMin: it.repMin, repMax: it.repMax, kg: hasNum(it.kg) ? Number(it.kg) : null, rpeMin: it.rpeMin, rpeMax: it.rpeMax, rest: it.rest || 120 },
      sets: [],
    })),
  };
}
function itemFromEx(ex) {
  const exId = ex.exId || ex.id || null;
  const lib = libById(exId);
  const base = { id: newId('i'), exId, name: ex.name, muscle: ex.muscle, kg: null, rest: ex.rest || (lib && lib.rest) || 120, note: '' };
  if (lib && lib.kind === 'plyo') return { ...base, sets: 3, repMin: 5, repMax: 5, rpeMin: null, rpeMax: null };
  if (lib && lib.kind === 'olimpik') return { ...base, sets: 4, repMin: 2, repMax: 3, rpeMin: 7, rpeMax: 8 };
  return { ...base, sets: 3, repMin: 8, repMax: 12, rpeMin: 7, rpeMax: 9 };
}
function repTxt(a, b) { return !hasNum(b) || Number(a) === Number(b) ? String(a) : a + '–' + b; }
function rpeTxt(a, b) { if (!hasNum(a)) return null; return 'RPE ' + (!hasNum(b) || Number(a) === Number(b) ? nf(Number(a)) : nf(Number(a)) + '–' + nf(Number(b))); }
function targetTxt(t, exId) {
  const plyo = isPlyo(exId);
  const parts = [t.sets + ' × ' + repTxt(t.repMin, t.repMax) + (plyo ? ' temas' : '')];
  if (hasNum(t.kg)) parts.push(kgTxt(t.kg));
  const r = rpeTxt(t.rpeMin, t.rpeMax);
  if (r) parts.push(r);
  return parts.join(' · ');
}
function sessionStats(s) {
  const sets = [];
  s.items.forEach((it) => it.sets.forEach((x) => sets.push({ ...x, muscle: it.muscle, rest: it.target.rest })));
  const hard = sets.filter((x) => !x.plyo && x.rir <= 4);
  const tonnage = sets.reduce((a, x) => a + (x.plyo ? 0 : (Number(x.kg) || 0) * x.reps), 0);
  const contacts = sets.reduce((a, x) => a + (x.plyo ? x.reps : 0), 0);
  return { sets, hard, tonnage, contacts, dur: (s.endedAt || Date.now()) - s.startedAt };
}
function weeklyHard(sessions, endTs) {
  const from = endTs - 7 * 864e5;
  const map = {};
  sessions.filter((s) => s.status === 'done' && s.startedAt >= from && s.startedAt <= endTs + 1000).forEach((s) => s.items.forEach((it) => {
    const h = it.sets.filter((x) => !x.plyo && x.rir <= 4).length;
    if (h) map[it.muscle] = (map[it.muscle] || 0) + h;
  }));
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}
function nextPlanned(programs, sessions) {
  // Tüm programlardaki, haftanın gününe atanmış ve içinde hareket olan türler arasından en yakını
  const today = new Date();
  const days = [];
  programs.forEach((p) => p.days.forEach((d) => { if (d.weekday != null && d.items.length) days.push({ p, d }); }));
  for (let off = 0; off < 7; off++) {
    const wd = (today.getDay() + off) % 7;
    const hit = days.find((x) => x.d.weekday === wd && !(off === 0 && sessions.some((s) => s.dayId === x.d.id && sameDay(s.startedAt, today))));
    if (hit) return { program: hit.p, day: hit.d, off };
  }
  return null;
}

/* ---------- küçük parçalar ---------- */
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

/* ---------- hafta şeridi ---------- */
/* ---------- ana ekran ---------- */
/* ---------- program editörü ---------- */
function ItemEditor({ it, idx, n, onChange, onMove, onRemove }) {
  const [confirm, setConfirm] = useState(false);
  const plyo = isPlyo(it.exId);
  const set = (k) => (v) => onChange({ ...it, [k]: v });
  const num = (k) => (e) => { const v = e.target.value.replace(',', '.'); onChange({ ...it, [k]: v === '' ? null : Number(v) }); };
  const pid = 'it-' + it.id;
  return (
    <div className="item-ed">
      <div className="ied-grid">
        <Stepper id={pid + '-sets'} label="Set" value={it.sets} step={1} min={1} max={12} onChange={set('sets')} decimals={0} />
        <div className="field-pair">
          <span className="st-k">{plyo ? 'Temas' : 'Tekrar'}</span>
          <div className="pair">
            <input id={pid + '-rmin'} className="mini-in mono" inputMode="numeric" value={hasNum(it.repMin) ? it.repMin : ''} onChange={num('repMin')} aria-label="En az tekrar" />
            <span>–</span>
            <input id={pid + '-rmax'} className="mini-in mono" inputMode="numeric" value={hasNum(it.repMax) ? it.repMax : ''} onChange={num('repMax')} aria-label="En çok tekrar" />
          </div>
        </div>
        <div className="field-pair">
          <span className="st-k">{plyo ? 'Ek yük (kg)' : 'Kg'}</span>
          <div className="pair">
            <input id={pid + '-kg'} className="mini-in mono wide" inputMode="decimal" placeholder="isteğe bağlı" value={hasNum(it.kg) ? String(it.kg).replace('.', ',') : ''} onChange={num('kg')} aria-label="Hedef kilo" />
          </div>
        </div>
        {plyo ? null : <div className="field-pair">
          <span className="st-k">RPE</span>
          <div className="pair">
            <input id={pid + '-pmin'} className="mini-in mono" inputMode="decimal" value={hasNum(it.rpeMin) ? String(it.rpeMin).replace('.', ',') : ''} onChange={num('rpeMin')} aria-label="En düşük RPE" />
            <span>–</span>
            <input id={pid + '-pmax'} className="mini-in mono" inputMode="decimal" value={hasNum(it.rpeMax) ? String(it.rpeMax).replace('.', ',') : ''} onChange={num('rpeMax')} aria-label="En yüksek RPE" />
          </div>
        </div>}
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
          <span className="mono rp-rep">Tekrar {Math.max(0, rep + 1)}/{vels.length}</span>
          <span className="mono rp-v" style={{ color: cur ? vlColor(1 - cur / vels[0]) : 'var(--muted)' }}>{cur ? (bench ? nf(cur, 2) + ' m/s' : '%' + Math.round((cur / vels[0]) * 100) + ' hız') : '–'}</span>
        </div>
        <RepBars set={set} h={46} live={rep} />
        <div className="rp-foot">
          <span className="rp-note">{bench ? 'Bench hız profiline göre tahmini' : 'Temsili: ilk tekrara göre hız'}</span>
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
  const plyo = item && isPlyo(item.exId);
  return {
    kg: last ? Number(last.kg) || 0 : hasNum(t.kg) ? Number(t.kg) : plyo ? 0 : 20,
    reps: last ? last.reps : hasNum(t.repMax) ? Number(t.repMax) : hasNum(t.repMin) ? Number(t.repMin) : plyo ? 5 : 8,
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
        <span className="rest-k">{over ? 'Dinlenme bitti' : 'Dinlenme'}</span>
        <span className="mono rest-v">{over ? '+' + mmss(-left * 1000) : mmss(left * 1000)}<small> / {mmss(rest.total * 1000)}</small></span>
      </div>
      <button type="button" className="btn ghost sm" onClick={onAdd}>+30 sn</button>
      <button type="button" className="x-btn" onClick={onClose} aria-label="Dinlenmeyi kapat">✕</button>
    </div>
  );
}

/* ---------- özet ---------- */
/* ---------- sekme ---------- */
export {
  WD_LONG, WD_SHORT, WEEK_ORDER, MONTHS, MUSCLES, REST_OPTS,
  EX_LIB, EQ, PLYO_INT, isPlyo, PLYO_W, PLYO_Q, PROF, FAT, libById, clone, rid, newId, nf, hasNum,
  kgTxt, restTxt, mmss, durTxt, dateTxt, sameDay, normTr,
  SPEED, rirTxt, rirFromSpeed, animVl, BENCH_IDS, rpeFromRir, repVelocities,
  e1rm, rpeLabel, e1Ok, bestE1, vlColor,
  blankProgram, sessionFromDay, itemFromEx,
  repTxt, rpeTxt, targetTxt, sessionStats, weeklyHard, nextPlanned,
  Stepper, ItemEditor, Lane, RepBars, SetReplay, firstOpen, entryFor, RestBar,
};
