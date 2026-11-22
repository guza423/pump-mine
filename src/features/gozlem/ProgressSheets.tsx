// @ts-nocheck
// V32 · Hareket gelişimi: yapılmış hareketlerin listesi (son 20 gün belirgin, eskiler soluk + son tarih)
// ve hareket başına türüne göre gelişim penceresi.
import React, { useMemo, useState } from 'react';
import { exerciseIndex, METRICS, seriesOf, bestOf, lastOf, bestE1Set, PLYO_REF_KG, RECENT_DAYS } from '../../lib/models/progress';
import { readGoals } from '../bugun/goals';
import { dateTxt, nf, PLYO_Q } from '../antrenman/core';
import { PxIcon } from '../../app/PxIcon';
import { pct, t } from '../../i18n';
import { exName } from '../../i18n/names';

const DAY = 864e5;
const round1 = (v) => Math.round(v * 10) / 10;
const halfKg = (v) => Math.round(v * 2) / 2;
const tonTxt = (kg) => (kg >= 10000 ? nf(Math.round(kg / 100) / 10) + ' t' : nf(Math.round(kg)) + ' kg');

const kindTag = (k) => ({ e1: t('1RM'), reps: t('Tekrar'), plyo: t('Pliometrik'), skill: t('Beceri') })[k];
// Ölçü adları ve biçimleri; ad okunduğu an etkin dilde.
const metricLabel = (k) => ({
  e1: t('Tahmini 1RM'), ton: t('Seans tonajı'), cap: t('Tekrar kapasitesi'), totReps: t('Seansta toplam tekrar'),
  score: t('Pliometrik puan'), contacts: t('Seansta temas'), hold: t('En uzun tutuş'), clean: t('Temiz deneme'),
})[k];
const METRIC_FMT = {
  e1: (v) => nf(halfKg(v)) + ' kg',
  ton: (v) => tonTxt(v),
  cap: (v) => nf(Math.round(v)),
  totReps: (v) => nf(Math.round(v)),
  score: (v) => nf(round1(v)),
  contacts: (v) => nf(Math.round(v)),
  hold: (v) => t('{n} sn', { n: nf(Math.round(v)) }),
  clean: (v) => pct(Math.round(v)),
};

function agoTxt(ts, now) {
  const d0 = new Date(now), d1 = new Date(ts);
  const days = Math.round((new Date(d0.getFullYear(), d0.getMonth(), d0.getDate()) - new Date(d1.getFullYear(), d1.getMonth(), d1.getDate())) / DAY);
  if (days <= 0) return t('bugün');
  if (days === 1) return t('dün');
  return t('{n} gün önce', { n: days });
}
const headline = (e) => {
  const m = METRICS[e.kind].find((k) => lastOf(e, k) > 0);
  return m ? METRIC_FMT[m](lastOf(e, m)) : '–';
};

/* ---------- liste ---------- */
export function ProgressListBody({ st, openSheet }) {
  const now = Date.now();
  const list = useMemo(() => exerciseIndex(st.sessions, now), [st.sessions]);
  const recent = list.filter((e) => e.recent);
  const old = list.filter((e) => !e.recent);
  if (!list.length) return <p className="muted-p">{t('Bitirdiğin antrenmanlardaki hareketler burada listelenir.')}</p>;
  const row = (e) => (
    <li key={e.key}>
      <button type="button" className={'prog-row' + (e.recent ? '' : ' old')} data-ex={e.key} onClick={() => openSheet('exprog', { key: e.key, name: e.name, exId: e.exId })}>
        <span className="prog-row-t">
          <strong>{exName(e)}</strong>
          <small>
            <span className={'prog-tag ' + e.kind}>{kindTag(e.kind)}</span>
            {' '}{e.recent ? agoTxt(e.last, now) : t('Son: {x}', { x: dateTxt(e.last) })} · {t('{n} seans', { n: e.n })}
          </small>
        </span>
        <span className="prog-row-v mono">{headline(e)}</span>
        <PxIcon name="right" size={12} />
      </button>
    </li>
  );
  return (
    <div className="prog-list">
      <div className="sec2-h"><span className="eyebrow">{t('Son {n} gün', { n: RECENT_DAYS })}</span><span className="mono">{recent.length}</span></div>
      {recent.length ? <ul className="prog-ul">{recent.map(row)}</ul> : <p className="muted-p">{t('Son {n} günde hareket yok.', { n: RECENT_DAYS })}</p>}
      {old.length ? (
        <React.Fragment>
          <div className="sec2-h"><span className="eyebrow dim">{t('Daha eski')}</span><span className="mono">{old.length}</span></div>
          <ul className="prog-ul">{old.map(row)}</ul>
        </React.Fragment>
      ) : null}
    </div>
  );
}

/* ---------- grafik ---------- */
const niceStep = (span) => {
  const raw = Math.max(span, 1e-9) / 4;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const m = raw / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
};
export function PxLineChart({ pts, goal, fmtTick, label }) {
  const W = 340, H = 190, m = { l: 44, r: 12, t: 14, b: 26 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const vs = pts.map((p) => p.v).concat(goal ? [goal] : []);
  const min = Math.min(...vs), max = Math.max(...vs);
  const step = niceStep((max - min) || Math.max(1, max * 0.2));
  const lo = Math.max(0, Math.floor((min - step / 2) / step) * step), hi = Math.ceil((max + step / 2) / step) * step;
  const t0 = pts[0].t, t1 = pts.length > 1 ? pts[pts.length - 1].t : t0 + DAY;
  const X = (x) => m.l + (pts.length > 1 ? ((x - t0) / (t1 - t0 || 1)) * iw : iw / 2);
  const Y = (v) => m.t + ih - ((v - lo) / (hi - lo || 1)) * ih;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 1000) / 1000);
  const line = pts.map((p) => X(p.t) + ',' + Y(p.v)).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img" aria-label={label}>
      {ticks.map((v) => <g key={v}><line x1={m.l} x2={W - m.r} y1={Y(v)} y2={Y(v)} className="grid" /><text x={m.l - 6} y={Y(v) + 3.5} textAnchor="end" className="tick">{fmtTick(v)}</text></g>)}
      {goal ? <g><line x1={m.l} x2={W - m.r} y1={Y(goal)} y2={Y(goal)} className="goal-line" /><text x={W - m.r} y={Y(goal) - 5} textAnchor="end" className="goal-t">{t('hedef {n}', { n: nf(goal) })}</text></g> : null}
      {pts.length > 1 ? <path d={'M' + pts.map((p) => X(p.t) + ',' + Y(p.v)).join(' L') + ` L${X(pts[pts.length - 1].t)},${m.t + ih} L${X(pts[0].t)},${m.t + ih} Z`} className="area" style={{ fill: 'var(--fire)' }} /> : null}
      {pts.length > 1 ? <polyline points={line} className="line" style={{ stroke: 'var(--fire)' }} /> : null}
      {pts.map((p, i) => { const h = i === pts.length - 1 ? 5 : 3.5; return <rect key={i} x={X(p.t) - h} y={Y(p.v) - h} width={h * 2} height={h * 2} className="cursor-dot" style={{ stroke: 'var(--fire)' }} />; })}
      <text x={m.l} y={H - 6} className="tick">{dateTxt(t0)}</text>
      {pts.length > 1 ? <text x={W - m.r} y={H - 6} textAnchor="end" className="tick">{dateTxt(t1)}</text> : null}
    </svg>
  );
}

function Stat({ k, v, sub }) {
  return (
    <div className="metric">
      <span className="metric-k">{k}</span>
      <span className="metric-v mono">{v}</span>
      {sub ? <span className="metric-s mono">{sub}</span> : null}
    </div>
  );
}

/* ---------- hareket gelişimi ---------- */
export function ProgressDetailBody({ exKey, st }) {
  const entry = useMemo(() => exerciseIndex(st.sessions).find((e) => e.key === exKey), [st.sessions, exKey]);
  const metrics = entry ? METRICS[entry.kind].filter((k) => bestOf(entry, k) > 0) : [];
  const [sel, setSel] = useState(null);
  if (!entry) return <p className="muted-p">{t('Bu hareketle henüz kayıt yok.')}</p>;
  const metric = metrics.includes(sel) ? sel : metrics[0];
  const pts = metric ? seriesOf(entry, metric) : [];
  const goals = readGoals(st.settings);
  const goal = entry.kind === 'e1' && metric === 'e1' ? goals.find((g) => g.type === 'perf' && (g.exId === entry.exId || g.name === entry.name)) : null;
  const P = entry.points;
  const lastP = P[P.length - 1];
  const at = (key) => { let b = null; P.forEach((p) => { if (!b || (Number(p[key]) || 0) > (Number(b[key]) || 0)) b = p; }); return b; };

  let stats = null, note = null;
  if (entry.kind === 'e1') {
    const best = bestE1Set(st.sessions, entry.key);
    const tonP = at('ton');
    stats = (
      <React.Fragment>
        <Stat k={t('En iyi 1RM')} v={best ? nf(halfKg(best.v)) + ' kg' : '–'} sub={best ? nf(best.kg) + '×' + best.reps + ' · ' + dateTxt(best.t) : t('tükenişe yakın set yok')} />
        <Stat k={t('Son 1RM')} v={lastOf(entry, 'e1') ? nf(halfKg(lastOf(entry, 'e1'))) + ' kg' : '–'} sub={dateTxt(lastP.t)} />
        <Stat k={t('Tek seansta en çok tonaj')} v={tonP ? tonTxt(tonP.ton) : '–'} sub={tonP ? dateTxt(tonP.t) : null} />
        <Stat k={t('En ağır set')} v={at('topKg') ? nf(at('topKg').topKg) + '×' + at('topKg').topReps : '–'} sub={t('kg × tekrar') + ' · ' + t('{n} seans', { n: entry.n })} />
      </React.Fragment>
    );
    note = t('Tahmini 1RM (Epley) yalnızca tükenişe yakın (RIR ≤ 4), tekrar + RIR ≤ 12 ve hareket açıklığı en az %90 olan setlerden. Tonaj = kilo × tekrar (dambılda iki el).');
  } else if (entry.kind === 'reps') {
    stats = (
      <React.Fragment>
        <Stat k={t('Tekrar kapasitesi')} v={bestOf(entry, 'cap') ? nf(bestOf(entry, 'cap')) : '–'} sub={t('en iyi · son {n}', { n: nf(lastOf(entry, 'cap')) })} />
        <Stat k={t('Tek sette en çok tekrar')} v={nf(bestOf(entry, 'maxReps'))} sub={null} />
        <Stat k={t('Seansta toplam tekrar')} v={nf(bestOf(entry, 'totReps'))} sub={t('en iyi seans')} />
        <Stat k={t('Seans')} v={entry.n} sub={dateTxt(lastP.t)} />
      </React.Fragment>
    );
    note = t('Ek yük olmadan yapılan harekette 1RM hesaplanmaz. Tekrar kapasitesi = setteki tekrar + kalan tekrar (RIR), yalnızca tükenişe yakın (RIR ≤ 4) tam açıklıklı setlerden: o gün tükenişe kadar kaç tekrar yapabileceğin.');
  } else if (entry.kind === 'plyo') {
    const b = at('score');
    stats = (
      <React.Fragment>
        <Stat k={t('Pliometrik puan')} v={nf(round1(bestOf(entry, 'score')))} sub={t('en iyi · son {n}', { n: nf(round1(lastOf(entry, 'score'))) })} />
        <Stat k={t('En iyi set')} v={b ? nf(b.bestReps) : '–'} sub={b ? [t('temas'), b.bestKg ? '+' + nf(b.bestKg) + ' kg' : t('ek yük yok'), PLYO_Q[b.bestQ || 0].k].join(' · ') : null} />
        <Stat k={t('Seansta temas')} v={nf(lastP.contacts || 0)} sub={t('son seans · en çok {n}', { n: nf(bestOf(entry, 'contacts')) })} />
        <Stat k={t('Kalitesi korunan temas')} v={pct(lastP.held || 0)} sub={bestOf(entry, 'maxKg') ? t('en çok ek yük {n} kg', { n: nf(bestOf(entry, 'maxKg')) }) : t('ek yük yok')} />
      </React.Fragment>
    );
    note = t('Puan, seanstaki en iyi set: temas × kalite (korundu 1 · biraz düştü 0,75 · belirgin düştü 0,5) × yük (1 + ek kg / {kg}). Vücut ağırlığı tutulmadığı için {kg} kg referans alınır; puan yalnızca kendi seanslarını karşılaştırmak içindir. Seansta 80–140 temas önerilir (NSCA).', { kg: PLYO_REF_KG });
  } else {
    stats = (
      <React.Fragment>
        <Stat k={t('En uzun tutuş')} v={bestOf(entry, 'hold') ? t('{n} sn', { n: nf(bestOf(entry, 'hold')) }) : '–'} sub={lastOf(entry, 'hold') ? t('son {n} sn', { n: nf(lastOf(entry, 'hold')) }) : null} />
        <Stat k={t('Temiz deneme')} v={pct(lastP.clean || 0)} sub={t('son seans · en iyi {n}', { n: pct(bestOf(entry, 'clean')) })} />
        <Stat k={t('Toplam deneme')} v={nf(P.reduce((a, p) => a + (p.attempts || 0), 0))} sub={t('{n} seans', { n: entry.n })} />
        <Stat k={t('Son seans')} v={nf(lastP.attempts || 0)} sub={t('deneme') + ' · ' + dateTxt(lastP.t)} />
      </React.Fragment>
    );
    note = t('Temiz deneme yüzdesi: temiz deneme 1, kısmen 0,5, olmadı 0 sayılır. Tutuş süresi yalnızca en az kısmen çıkan denemelerden.');
  }

  return (
    <div className="prog-detail">
      <div className="mgrid">{stats}</div>
      {metrics.length > 1 ? (
        <div className="segmented seg2" role="tablist" aria-label={t('Grafik')}>
          {metrics.map((k) => <button key={k} type="button" role="tab" id={'prog-m-' + k} aria-selected={metric === k} className={metric === k ? 'on' : ''} onClick={() => setSel(k)}>{metricLabel(k)}</button>)}
        </div>
      ) : null}
      {pts.length ? (
        <div className="prog-chart">
          <PxLineChart pts={pts} goal={goal ? goal.target : null} label={metricLabel(metric)} fmtTick={(v) => (metric === 'ton' && v >= 10000 ? nf(v / 1000) + 't' : metric === 'clean' ? pct(v) : nf(v))} />
        </div>
      ) : <p className="muted-p">{t('Grafik için yeterli kayıt yok.')}</p>}
      <p className="chart-note">{note}</p>
    </div>
  );
}
