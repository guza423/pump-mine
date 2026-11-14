// @ts-nocheck
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BackupContext } from '../lib/store/BackupContext';
import { AccountChip, AccountBody, ConsentBody, PrivacyBody } from '../features/hesap/Account';
import { BackupPanel } from '../features/programlar/BackupPanel';
import { BiomechTab, Tile } from '../features/lab/Biomekanik';
import { CompactCtx, Icon, NeedleGauge, Range, STAGES, StageFatigue, StageRate, StageRecruit, StageSignal, Switch, clamp } from '../features/lab/Cns';
import {
  BENCH_IDS, EX_LIB, FAT, EQ, PLYO_INT, isPlyo, PLYO_W, PLYO_Q, libById, MONTHS, MUSCLES, PROF, SPEED,
  WD_LONG, WD_SHORT, WEEK_ORDER, ItemEditor, Lane, SetReplay, Stepper, animVl,
  bestE1, blankProgram, clone, dateTxt, durTxt, e1Ok, e1rm, entryFor,
  firstOpen, hasNum, itemFromEx, mmss, newId, nextPlanned, nf, normTr,
  repTxt, repVelocities, restTxt, rirFromSpeed, rirTxt, rpeLabel,
  rpeTxt, sameDay, sessionFromDay, sessionStats, targetTxt, vlColor,
} from '../features/antrenman/core';
import { useLogStore } from '../lib/store/useLogStore';
import { planStats, logStats, TAU_H, FRESH, proxW, costW, loadScore, hoursToFresh, decayK, setLoads, sleepInfo, sleepPts, fatigueAt, steadyWeek, simFromLogs, simFromPlan, simulatePlan, fatigueRecs, e1Series, prevPerf, sessionFatigue, periodMetrics, historyWarnings } from '../lib/models/fatigue';
import '../styles/cns.css';
import '../styles/app.css';
import '../styles/log.css';
import '../styles/mobile.css';
import '../styles/v7.css';

/* ================= PERFORMANCE v0.5 · son kullanıcı uygulaması ================= */
const TABS2 = [
  { id: 'bugun', label: 'Bugün', icon: 'home' },
  { id: 'antrenman', label: 'Antrenman', icon: 'bolt' },
  { id: 'programlar', label: 'Programlar', icon: 'list' },
  { id: 'lab', label: 'Lab', icon: 'flask' },
];
const MAIN_MUSCLES = ['Göğüs', 'Omuz (ön)', 'Omuz (yan)', 'Sırt', 'Trapez', 'Triceps', 'Hamstring', 'Quadriceps'];
const SPEED_SHORT = ['Aynı', 'Hafif', 'Belirgin', 'Çok', 'Grind'];
const NOTE_TAGS = ['Kolay geldi', 'Form bozuldu', 'Takıldı', 'Ağrı', 'Pump', 'Yardım aldım'];
const DAY_MS = 864e5;

function useNow(ms) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return now;
}
const dayKey = (ts) => { const d = new Date(ts); return 'c_' + d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const fullDate = (ts) => { const d = new Date(ts); return WD_LONG[d.getDay()] + ', ' + d.getDate() + ' ' + ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'][d.getMonth()]; };
const exMeta = (exId, name) => EX_LIB.find((e) => e.id === exId) || EX_LIB.find((e) => e.name === name) || null;
const rpeMid = (a, b) => (hasNum(a) ? (hasNum(b) ? (Number(a) + Number(b)) / 2 : Number(a)) : 8);
const repMid = (a, b) => (hasNum(a) ? (hasNum(b) ? (Number(a) + Number(b)) / 2 : Number(a)) : 8);
const dayMinutes = (day) => Math.round(day.items.reduce((a, i) => a + Number(i.sets || 0) * ((i.rest || 120) + 45), 0) / 60);
const hm = (ts) => { const d = new Date(ts); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
const zoneOf = (score) => (score < 40 ? { k: 'Yönetilebilir', c: 'var(--ok)', cls: 'ok' } : score < 70 ? { k: 'Birikiyor', c: 'var(--warn)', cls: 'warn' } : { k: 'Yüksek', c: 'var(--bad)', cls: 'bad' });
const tonTxt = (kg) => (kg >= 10000 ? nf(Math.round(kg / 100) / 10) + ' t' : nf(Math.round(kg)) + ' kg');
const sessionNotes = (s) => s.items.reduce((a, it) => a + (it.memo ? 1 : 0) + it.sets.filter((x) => x.note || (x.tags && x.tags.length)).length, 0);

/* ---------- analizler ---------- */
// Haftalık hacim: kas başına zor set sayısı (azalmasız, 7 gün). Hipertrofi için 10–20 aralığı izlenir.
/* ---------- ortak parçalar ---------- */
function ScreenHead({ title, sub, right, left }) {
  return (
    <header className="shead">
      <div className="shead-row">
        {left || null}
        <div className="shead-t">
          <h1>{title}</h1>
          {sub ? <span className="shead-sub">{sub}</span> : null}
        </div>
        {right || null}
      </div>
    </header>
  );
}
function SheetFrame({ title, onClose, children, size, z, head }) {
  return (
    <div className="sheet-wrap" style={{ zIndex: z }} role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="sheet-bg" aria-label="Kapat" onClick={onClose} />
      <div className={'sheet ' + (size || '')}>
        <div className="sheet-grab" aria-hidden="true" />
        <div className="sheet-h">
          <h3>{title}</h3>
          {head || null}
          <button type="button" className="x-btn" onClick={onClose} aria-label="Kapat">✕</button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}
function Ring({ score, zone, size = 76, label }) {
  const r = 30, L = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 76 76" width={size} height={size} className="ring" role="img" aria-label={label}>
      <circle cx="38" cy="38" r={r} className="ring-bg" />
      <circle cx="38" cy="38" r={r} className="ring-fg" style={{ stroke: zone.c, strokeDasharray: `${(score / 100) * L} ${L}` }} transform="rotate(-90 38 38)" />
      <text x="38" y="44" textAnchor="middle" className="ring-n" style={{ fill: zone.c }}>{Math.round(score)}</text>
    </svg>
  );
}
function MuscleBars({ muscles, list, max = 24, compact }) {
  const names = list || Object.keys(muscles).sort((a, b) => (muscles[b] || 0) - (muscles[a] || 0));
  return (
    <div className={'mbars' + (compact ? ' compact' : '')}>
      {names.map((m) => {
        const n = muscles[m] || 0;
        const st = n === 0 ? 'none' : n < 10 ? 'low' : n > 20 ? 'high' : 'ok';
        return (
          <div key={m} className={'mbar ' + st}>
            <span className="mbar-m">{m}</span>
            <div className="mbar-t">
              <span className="mbar-z" style={{ left: (10 / max) * 100 + '%', width: (10 / max) * 100 + '%' }} />
              <span className="mbar-f" style={{ width: Math.min(100, (n / max) * 100) + '%' }} />
            </div>
            <span className="mbar-n mono">{nf(n)}</span>
          </div>
        );
      })}
    </div>
  );
}
function exDot(e) {
  if (!e) return null;
  return e.kind === 'plyo' ? <span className={'pdot i' + (e.int || 2)} title={'Yoğunluk: ' + PLYO_INT[e.int || 2]} /> : e.fat ? <span className={'fatdot f' + e.fat} title={'Yorgunluk: ' + FAT[e.fat]} /> : null;
}
function exLine(e) {
  if (!e.eq) return e.muscle;
  return e.muscle + ' · ' + EQ[e.eq] + ' · ' + (e.kind === 'plyo' ? 'yoğunluk ' + PLYO_INT[e.int || 2].split(' ')[0].toLocaleLowerCase('tr') : PROF[e.prof].k);
}
function FactChips({ ex }) {
  if (!ex) return null;
  return (
    <div className="facts">
      <span className="fact"><b>{ex.muscle}</b>{ex.sec && ex.sec.length ? ' + ' + ex.sec.join(', ') : ''}</span>
      {ex.eq ? <span className="fact">{EQ[ex.eq]}</span> : null}
      {ex.kind && ex.kind !== 'kuvvet' ? <span className="fact kind">{ex.kind === 'plyo' ? 'Pliometrik' : 'Olimpik'}</span> : null}
      {ex.kind === 'plyo'
        ? <span className={'fact fat' + Math.min(3, ex.int || 2)}>Yoğunluk: {PLYO_INT[ex.int || 2]}</span>
        : <span className={'fact fat' + ex.fat}>Yorgunluk: {FAT[ex.fat]}</span>}
      {ex.kind !== 'plyo' && ex.prof ? <span className="fact prof" title={PROF[ex.prof].d}>{PROF[ex.prof].k}</span> : null}
    </div>
  );
}
const EX_KINDS = [['all', 'Tümü'], ['kuvvet', 'Kuvvet'], ['olimpik', 'Olimpik'], ['plyo', 'Pliometrik']];
function useExFilter(all, initGrp) {
  const [q, setQ0] = useState('');
  const [kind, setKind0] = useState('all');
  const [grp, setGrp0] = useState(initGrp || null);
  const [eq, setEq0] = useState(null);
  const [lim, setLim] = useState(40);
  const wrap = (f) => (v) => { f(v); setLim(40); };
  const toks = normTr(q).split(/\s+/).filter(Boolean);
  const hay = useMemo(() => new Map(all.map((e) => [e, normTr(e.name + ' ' + (e.en || '') + ' ' + e.muscle + ' ' + (EQ[e.eq] || ''))])), [all]);
  const base = toks.length ? all.filter((e) => toks.every((t) => hay.get(e).includes(t))) : all;
  const byKind = base.filter((e) => kind === 'all' || (e.kind || 'kuvvet') === kind);
  const list = byKind.filter((e) => (!grp || e.muscle === grp) && (!eq || e.eq === eq));
  const groups = MUSCLES.map((m) => [m, byKind.filter((e) => e.muscle === m && (!eq || e.eq === eq)).length]).filter((x) => x[1]);
  const eqs = Object.keys(EQ).map((k) => [k, byKind.filter((e) => e.eq === k && (!grp || e.muscle === grp)).length]).filter((x) => x[1]);
  const kinds = EX_KINDS.map(([k, t]) => [k, t, k === 'all' ? base.length : base.filter((e) => (e.kind || 'kuvvet') === k).length]);
  return { q, setQ: wrap(setQ0), kind, setKind: wrap(setKind0), grp, setGrp: wrap(setGrp0), eq, setEq: wrap(setEq0), lim, more: () => setLim(lim + 60), list, groups, eqs, kinds };
}
function ExFilterBar({ f, idp, placeholder }) {
  return (
    <div className="exf">
      <input id={idp + '-search'} className="search" type="search" placeholder={placeholder || 'Hareket ara (Türkçe ya da İngilizce)'} value={f.q} onChange={(e) => f.setQ(e.target.value)} autoComplete="off" />
      <div className="segmented seg4" role="tablist" aria-label="Hareket türü">
        {f.kinds.map(([k, t]) => <button key={k} type="button" role="tab" id={idp + '-kind-' + k} aria-selected={f.kind === k} className={f.kind === k ? 'on' : ''} onClick={() => f.setKind(k)}>{t}</button>)}
      </div>
      <div className="chips-scroll" role="group" aria-label="Kas grubu">
        <button type="button" className={'fchip' + (!f.grp ? ' on' : '')} onClick={() => f.setGrp(null)}>Tüm kaslar</button>
        {f.groups.map(([m, n]) => <button key={m} type="button" id={idp + '-g-' + normTr(m).replace(/[^a-z]/g, '')} className={'fchip' + (f.grp === m ? ' on' : '')} onClick={() => f.setGrp(f.grp === m ? null : m)}>{m} <span className="mono fchip-n">{n}</span></button>)}
      </div>
      <div className="chips-scroll" role="group" aria-label="Ekipman">
        <button type="button" className={'fchip sm' + (!f.eq ? ' on' : '')} onClick={() => f.setEq(null)}>Tüm ekipman</button>
        {f.eqs.map(([k, n]) => <button key={k} type="button" id={idp + '-eq-' + k} className={'fchip sm' + (f.eq === k ? ' on' : '')} onClick={() => f.setEq(f.eq === k ? null : k)}>{EQ[k]} <span className="mono fchip-n">{n}</span></button>)}
      </div>
    </div>
  );
}

/* ================= BUGÜN ================= */
function WeekRow({ programs, sessions }) {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7));
  const planned = new Set();
  programs.forEach((p) => p.days.forEach((d) => { if (d.weekday != null && d.items.length) planned.add(d.weekday); }));
  const done = sessions.filter((s) => s.status === 'done');
  const cells = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const n = done.filter((s) => sameDay(s.startedAt, d)).length;
    return { d, wd: d.getDay(), n, plan: planned.has(d.getDay()), today: sameDay(d, today), past: d < new Date(today.getFullYear(), today.getMonth(), today.getDate()) };
  });
  return (
    <div className="week-row">
      {cells.map((c) => (
        <div key={c.wd} className={'wd' + (c.today ? ' today' : '') + (c.n ? ' done' : c.plan ? (c.past ? ' missed' : ' plan') : '')}>
          <span className="wd-k">{WD_SHORT[c.wd]}</span>
          <span className="wd-d mono">{c.d.getDate()}</span>
          <i className="wd-dot" />
        </div>
      ))}
    </div>
  );
}
function Spark({ pts, goal, w = 120, h = 34 }) {
  if (pts.length < 2) return null;
  const vs = pts.map((p) => p.v).concat(goal ? [goal] : []);
  const lo = Math.min(...vs) - 1, hi = Math.max(...vs) + 1;
  const X = (i) => (i / (pts.length - 1)) * (w - 6) + 3, Y = (v) => h - 3 - ((v - lo) / (hi - lo)) * (h - 6);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="spark" aria-hidden="true">
      {goal ? <line x1="0" x2={w} y1={Y(goal)} y2={Y(goal)} className="spark-goal" /> : null}
      <polyline points={pts.map((p, i) => X(i) + ',' + Y(p.v)).join(' ')} className="spark-l" />
      <circle cx={X(pts.length - 1)} cy={Y(pts[pts.length - 1].v)} r="3" className="spark-d" />
    </svg>
  );
}
function TodayScreen({ st, put, openSheet, startSession, createProgram, goTab, acct }) {
  const fz = fatigueAt(st, Date.now());
  const sl = fz.sleep;
  const active = st.sessions.find((s) => s.status === 'active');
  const next = nextPlanned(st.programs, st.sessions);
  const goal = st.settings.find((x) => x.key === 'goal')?.value ?? null;
  const gEx = goal ? exMeta(goal.exId) : null;
  const series = goal ? e1Series(st.sessions, goal.exId, gEx ? gEx.name : '') : [];
  const cur = series.length ? series[series.length - 1].v : goal?.base;
  const setSleep = (h) => put('checkins', { id: dayKey(Date.now()), sleep: h, at: Date.now() });
  const loading = st.status === 'loading' || !st.loaded.programs || !st.loaded.sessions;
  const short = sl.known && sl.last < 6.5;

  return (
    <div className="screen">
      <ScreenHead title="Bugün" sub={fullDate(Date.now())} right={<AccountChip acct={acct} onClick={() => openSheet('account', {})} />} />
      <div className="scr fit">
        {acct.mode === 'guest' && st.sessions.length ? (
          <button type="button" id="guest-banner" className="guest-banner" onClick={() => openSheet('account', {})}>
            <Icon name="cloud" size={16} />
            <span>Kayıtlar yalnızca bu telefonda · <b>Yedekle</b></span>
            <Icon name="right" size={14} />
          </button>
        ) : null}
        <section className="ready">
          <button type="button" id="ready-ring" className="ready-ring" onClick={() => openSheet('fatigue', {})} aria-label="Yorgunluk ayrıntısı">
            <Ring score={fz.score} zone={fz.zone} label={'Yorgunluk ' + Math.round(fz.score)} />
          </button>
          <div className="ready-r">
            <div className="ready-top">
              <span className="ready-k">Yorgunluk</span>
              <span className="zone-pill" style={{ color: fz.zone.c, borderColor: fz.zone.c }}>{fz.zone.k}</span>
            </div>
            <div className="ready-parts mono">
              <span>Antrenman <b>{Math.round(fz.train)}</b></span>
              <span className={sl.known ? (fz.sleepPts >= 8 ? 'bad' : '') : 'ask'}>Uyku {sl.known ? <b>+{Math.round(fz.sleepPts)}</b> : <b>?</b>}</span>
              <span>{fz.hrs ? '~' + fz.hrs + ' sa toparlanma' : 'toparlanmış'}</span>
            </div>
            <div className="sleep-row" role="radiogroup" aria-label="Dün geceki uyku">
              <span className="sleep-k">Uyku</span>
              {[5, 6, 7, 8, 9].map((h) => (
                <button key={h} type="button" role="radio" aria-checked={sl.known && sl.last === h} className={'sl' + (sl.known && sl.last === h ? ' on' : '')} onClick={() => setSleep(h)}>{h}</button>
              ))}
              <span className="sleep-u">sa</span>
            </div>
          </div>
          {short ? <p className="ready-warn">Kısa uyku: kuvvet ~%3, çok tekrarlı setler ~%10 düşebilir.</p> : null}
        </section>

        {loading ? <div className="skeleton"><span /><span /></div> : active ? (
          <section className="hero-card live">
            <div className="hc-top"><span className="live-dot" /><span className="eyebrow fire">Antrenman sürüyor</span><span className="hc-when mono">{active.items.reduce((a, it) => a + it.sets.length, 0)} set</span></div>
            <h3>{active.dayName}</h3>
            <button type="button" id="resume-btn" className="btn fire full" onClick={() => goTab('antrenman')}>Devam et <Icon name="right" /></button>
          </section>
        ) : next ? (
          <section className="hero-card">
            <div className="hc-top"><span className="eyebrow">{next.off === 0 ? 'Bugün' : next.off === 1 ? 'Yarın' : WD_LONG[next.day.weekday]}</span><span className="hc-when mono">~{dayMinutes(next.day)} dk</span></div>
            <h3>{next.day.name}</h3>
            <p className="hc-sub">{next.day.items.slice(0, 3).map((i) => i.name).join(' · ')}{next.day.items.length > 3 ? ' +' + (next.day.items.length - 3) : ''}</p>
            <button type="button" id="start-next" className="btn primary full" onClick={() => startSession(next.program, next.day)}><Icon name="play" size={14} /> Başlat</button>
          </section>
        ) : (
          <section className="hero-card">
            <h3>Programın yok</h3>
            <p className="hc-sub">İlk antrenman türünü oluştur ya da boş bir antrenmanla başla.</p>
            <button type="button" className="btn primary full" onClick={() => createProgram(null, 'bugun')}>Program oluştur</button>
          </section>
        )}

        <section className="tcard">
          <div className="tcard-h"><span className="eyebrow">Bu hafta</span><span className="mono tcard-k">{st.sessions.filter((s) => s.status === 'done' && Date.now() - s.startedAt < 7 * DAY_MS).length} antrenman</span></div>
          <WeekRow programs={st.programs} sessions={st.sessions} />
        </section>

        {goal ? <button type="button" id="goal-card" className="tcard goal2" onClick={() => openSheet('goal', {})}>
          <div className="goal2-l">
            <span className="eyebrow fire">Hedef</span>
            <span className="goal2-n">{gEx?.name || goal.name || goal.exId}</span>
            <span className="goal2-v mono"><b>{nf(Math.round(cur * 2) / 2)}</b> → {nf(goal.target)} kg</span>
          </div>
          <div className="goal2-r">
            {series.length > 1 ? <Spark pts={series.slice(-10)} goal={goal.target} /> : <span className="goal2-hint">Kayıtlar arttıkça eğri oluşur</span>}
            <div className="goal-bar"><span style={{ width: clamp((cur - goal.base * 0.9) / (goal.target - goal.base * 0.9)) * 100 + '%' }} /></div>
          </div>
        </button> : <button type="button" id="goal-add" className="tcard goal-add" onClick={() => openSheet('goal', {})}>
          <span className="goal2-l">
            <span className="eyebrow fire">Hedef</span>
            <span className="goal2-n">Hedef ekle</span>
            <span className="goal-add-hint">Bir hareket seç, ulaşmak istediğin 1RM'i yaz.</span>
          </span>
          <span className="goal-add-plus"><Icon name="plus" size={18} /></span>
        </button>}
      </div>
    </div>
  );
}

/* ================= ANTRENMAN ================= */
function StartView({ st, startSession, newWorkoutType, openSheet, onHistory, editDay }) {
  const groups = st.programs.filter((p) => p.days.length);
  const multi = groups.length > 1;
  const next = nextPlanned(st.programs, st.sessions);
  const done = st.sessions.filter((s) => s.status === 'done');
  const lastOf = (d) => done.find((s) => s.dayId === d.id);
  const last = done[0];
  return (
    <div className="screen">
      <ScreenHead
        title="Antrenman"
        sub={last ? 'Son: ' + dateTxt(last.startedAt) + ' · ' + last.dayName : 'Bir antrenman türü seç ve başla'}
        right={(
          <button type="button" id="history-btn" className="hist-btn" onClick={onHistory} aria-label="Antrenman geçmişi">
            <Icon name="history" size={16} /><span>Geçmiş</span>{done.length ? <b className="mono">{done.length}</b> : null}
          </button>
        )}
      />
      <div className="scr">
        {groups.length ? groups.map((p) => (
          <section key={p.id} className="wgroup">
            {multi ? <div className="wgroup-h"><span>{p.name || 'Adsız program'}</span><span className="mono">{p.days.length} tür</span></div> : null}
            <ul className="wtypes">
              {p.days.map((d) => {
                const empty = !d.items.length;
                const isNext = !empty && next && next.day.id === d.id;
                const l = lastOf(d);
                return (
                  <li key={d.id} className={'wtype' + (isNext ? ' next' : '') + (empty ? ' empty' : '')}>
                    <button type="button" id={'start-' + d.id} className="wtype-main" onClick={() => (empty ? editDay(p, d) : startSession(p, d))}>
                      <span className={'pday-wd mono' + (d.weekday == null ? ' none' : '')}>{d.weekday == null ? '—' : WD_SHORT[d.weekday]}</span>
                      <span className="wtype-t">
                        <span className="wtype-n"><strong>{d.name || 'Adsız'}</strong>{isNext ? <span className="badge new">sıradaki</span> : null}</span>
                        <small>{empty ? 'Boş · hareket ekle' : d.items.length + ' hareket · ~' + dayMinutes(d) + ' dk' + (l ? ' · son ' + dateTxt(l.startedAt).split(' · ')[0] : '')}</small>
                      </span>
                      <span className={'wtype-go' + (empty ? ' add' : '')}><Icon name={empty ? 'plus' : 'play'} size={15} /></span>
                    </button>
                    <button type="button" className="wtype-more" aria-label={(d.name || 'Tür') + ' seçenekleri'} onClick={() => openSheet('wtype', { pid: p.id, did: d.id })}><Icon name="more" size={18} /></button>
                  </li>
                );
              })}
            </ul>
          </section>
        )) : <div className="empty"><strong>Henüz antrenman türün yok</strong><p>Yeni bir tür oluştur ya da boş antrenmanla başlayıp sonunda antrenman türü olarak kaydet.</p></div>}
        <div className="start-actions">
          <button type="button" id="free-session" className="btn ghost" onClick={() => startSession(null, null)}><Icon name="plus" size={14} /> Boş antrenman</button>
          <button type="button" id="new-type" className="btn ghost" onClick={newWorkoutType}><Icon name="edit" size={14} /> Yeni antrenman türü</button>
        </div>
      </div>
    </div>
  );
}

function WtypeMenuBody({ st, pid, did, put, del, onStart, onEdit, onClose }) {
  const p = st.programs.find((x) => x.id === pid);
  const d = p && p.days.find((x) => x.id === did);
  const [name, setName] = useState(d ? d.name : '');
  const [confirm, setConfirm] = useState(false);
  if (!d) return <p className="muted-p">Bu tür artık yok.</p>;
  const save = (fn) => { const np = clone(p); fn(np.days.find((z) => z.id === did), np); np.updatedAt = Date.now(); put('programs', np); };
  const rename = () => { const v = name.trim(); if (v && v !== d.name) save((x) => { x.name = v; }); };
  const runs = st.sessions.filter((s) => s.status === 'done' && s.dayId === d.id);
  const total = d.items.reduce((a, i) => a + Number(i.sets || 0), 0);
  const remove = () => {
    if (p.days.length === 1) del('programs', p.id);
    else save((x, np) => { np.days = np.days.filter((z) => z.id !== did); });
    onClose();
  };
  return (
    <div className="wmenu">
      <input id="wtype-name" className="text-in" aria-label="Tür adı" value={name} onChange={(e) => setName(e.target.value)} onBlur={rename} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
      <p className="wmenu-k mono">{d.items.length} hareket · {total} set · ~{dayMinutes(d)} dk{runs.length ? ' · ' + runs.length + ' kez yapıldı, son ' + dateTxt(runs[0].startedAt) : ''}</p>
      {d.items.length ? (
        <ol className="wmenu-items">
          {d.items.map((it) => <li key={it.id}><span>{it.name}</span><b className="mono">{it.sets} × {repTxt(it.repMin, it.repMax)}</b></li>)}
        </ol>
      ) : <p className="muted-p">Bu türde henüz hareket yok.</p>}
      <span className="st-k">Haftanın günü</span>
      <div className="wd-pick">
        {WEEK_ORDER.map((w) => <button key={w} type="button" className={'wd-btn' + (d.weekday === w ? ' on' : '')} onClick={() => save((x) => { x.weekday = x.weekday === w ? null : w; })}>{WD_SHORT[w]}</button>)}
      </div>
      <div className="wmenu-act">
        {d.items.length ? <button type="button" id="wtype-start" className="btn primary" onClick={() => onStart(p, d)}><Icon name="play" size={13} /> Başlat</button> : null}
        <button type="button" id="wtype-edit" className="btn ghost" onClick={() => onEdit(p, d)}><Icon name="edit" size={14} /> {d.items.length ? 'Hareketleri düzenle' : 'Hareket ekle'}</button>
      </div>
      {confirm ? (
        <div className="pop flat">
          <p>“{d.name || 'Adsız'}” silinsin mi?{p.days.length === 1 ? ' Programda başka tür olmadığı için program da silinir.' : ''} Geçmiş kayıtların kalır.</p>
          <div className="confirm-inline">
            <button type="button" id="wtype-del-yes" className="btn danger sm" onClick={remove}>Sil</button>
            <button type="button" className="btn ghost sm" onClick={() => setConfirm(false)}>Vazgeç</button>
          </div>
        </div>
      ) : <button type="button" id="wtype-del" className="btn ghost danger-t wmenu-del" onClick={() => setConfirm(true)}><Icon name="trash" size={14} /> Türü sil</button>}
    </div>
  );
}

function SpeedStage({ reps, lvl, exId }) {
  const rir = SPEED[lvl].rir;
  const vels = repVelocities(reps, rir, animVl(reps, rir));
  const v0 = vels[0], vN = vels[vels.length - 1];
  const c = vlColor(SPEED[lvl].vl);
  const bench = BENCH_IDS.includes(exId);
  const rel = Math.round((vN / v0) * 100);
  const left = rir >= 5 ? '5+ tekrar kaldı' : rir === 0 ? 'tükeniş' : rir + ' tekrar kaldı';
  return (
    <div className="spwrap">
      <div className="spstage">
        <Lane v={v0} label="1. tekrar" color="var(--neuro)" playing txt={bench ? null : '%100'} />
        <div className="spstage-mid">
          <span className="mono spstage-band" style={{ color: c }}>{left}</span>
          <span className="spstage-k">RPE {rpeLabel(clamp(10 - rir, 6, 10), rir)}{bench ? '' : ' · temsili hız'}</span>
        </div>
        <Lane v={vN} label="Son tekrar" color={c} playing txt={bench ? null : '%' + rel} />
      </div>
      <div className="spmini" aria-hidden="true">
        <div className="spm-bars">
          <span className="spm-r"><small>1. tekrar</small><i><b style={{ width: '100%', background: 'var(--neuro)' }} /></i><em className="mono">{bench ? nf(v0, 2) : '%100'}</em></span>
          <span className="spm-r"><small>Son tekrar</small><i><b style={{ width: rel + '%', background: c }} /></i><em className="mono" style={{ color: c }}>{bench ? nf(vN, 2) : '%' + rel}</em></span>
        </div>
        <div className="spm-out"><b className="mono" style={{ color: c }}>{left}</b><small className="mono">RPE {rpeLabel(clamp(10 - rir, 6, 10), rir)}{bench ? ' · m/s' : ''}</small></div>
      </div>
    </div>
  );
}

function SetTable({ item, entry, rpe, onOpen, bodyRef }) {
  if (isPlyo(item.exId)) return <PlyoTable item={item} entry={entry} onOpen={onOpen} bodyRef={bodyRef} />;
  const t = item.target;
  const done = item.sets;
  const extra = done.length >= t.sets;
  const inRange = (r) => (!hasNum(t.repMin) || r >= Number(t.repMin)) && (!hasNum(t.repMax) || r <= Number(t.repMax));
  const plan = [];
  for (let j = done.length + 1; j < t.sets; j++) plan.push(j);
  const tRpe = hasNum(t.rpeMin) ? rpeTxt(t.rpeMin, t.rpeMax).replace('RPE ', '') : '–';
  return (
    <div className="stable">
      <div className="srow sh" aria-hidden="true"><span>Set</span><span>Kilo</span><span>Tekrar</span><span>RPE</span><span>Son tekrar</span><span>Saat</span></div>
      <div className="sbody" ref={bodyRef}>
        {done.map((x, j) => (
          <button key={x.at + '-' + j} type="button" className="srow done" onClick={() => onOpen(j)} aria-label={'Set ' + (j + 1) + ': ' + nf(Number(x.kg)) + ' kilo, ' + x.reps + ' tekrar. Ayrıntı'}>
            <span className="s-i mono"><Icon name="check" size={12} />{j + 1}</span>
            <span className="s-v mono">{nf(Number(x.kg))}</span>
            <span className={'s-v mono' + (inRange(x.reps) ? '' : ' off')}>{x.reps}</span>
            <span className="s-v mono">{rpeLabel(x.rpe, x.rir)}</span>
            <span className="s-sp" style={{ '--c': vlColor(x.vl) }}><i />{SPEED_SHORT[x.lvl]}</span>
            <span className="s-t mono">{hm(x.at)}{x.note || (x.tags && x.tags.length) ? <em>✎</em> : null}</span>
          </button>
        ))}
        {!extra ? (
          <div className="srow now" aria-label={'Set ' + (done.length + 1) + ' sırada'}>
            <span className="s-i mono">{done.length + 1}</span>
            <span className="s-v mono">{nf(Number(entry.kg))}</span>
            <span className={'s-v mono' + (inRange(entry.reps) ? '' : ' off')}>{entry.reps}</span>
            <span className="s-v mono">{rpe <= 6 ? '≤6' : rpe}</span>
            <span className="s-sp" style={{ '--c': vlColor(SPEED[entry.lvl].vl) }}><i />{SPEED_SHORT[entry.lvl]}</span>
            <span className="s-t now-t">sırada</span>
          </div>
        ) : null}
        {plan.map((j) => (
          <div key={'p' + j} className="srow plan">
            <span className="s-i mono">{j + 1}</span>
            <span className="s-v mono">{hasNum(t.kg) ? nf(Number(t.kg)) : '–'}</span>
            <span className="s-v mono">{repTxt(t.repMin, t.repMax)}</span>
            <span className="s-v mono">{tRpe}</span>
            <span className="s-sp none">–</span>
            <span className="s-t" />
          </div>
        ))}
        {extra ? <div className="srow fin"><Icon name="check" size={13} /> Hedef tamam · istersen ek set kaydet</div> : null}
      </div>
    </div>
  );
}

function PlyoTable({ item, entry, onOpen, bodyRef }) {
  const t = item.target;
  const done = item.sets;
  const extra = done.length >= t.sets;
  const plan = [];
  for (let j = done.length + 1; j < t.sets; j++) plan.push(j);
  const q = (i) => PLYO_Q[i || 0];
  return (
    <div className="stable plyo">
      <div className="srow sh" aria-hidden="true"><span>Set</span><span>Ek yük</span><span>Temas</span><span /><span>Kalite</span><span>Saat</span></div>
      <div className="sbody" ref={bodyRef}>
        {done.map((x, j) => (
          <button key={x.at + '-' + j} type="button" className="srow done" onClick={() => onOpen(j)} aria-label={'Set ' + (j + 1) + ': ' + x.reps + ' temas. Ayrıntı'}>
            <span className="s-i mono"><Icon name="check" size={12} />{j + 1}</span>
            <span className="s-v mono">{Number(x.kg) ? nf(Number(x.kg)) : '–'}</span>
            <span className="s-v mono">{x.reps}</span>
            <span />
            <span className="s-sp" style={{ '--c': q(x.q).c }}><i />{q(x.q).k}</span>
            <span className="s-t mono">{hm(x.at)}{x.note || (x.tags && x.tags.length) ? <em>✎</em> : null}</span>
          </button>
        ))}
        {!extra ? (
          <div className="srow now">
            <span className="s-i mono">{done.length + 1}</span>
            <span className="s-v mono">{Number(entry.kg) ? nf(Number(entry.kg)) : '–'}</span>
            <span className="s-v mono">{entry.reps}</span>
            <span />
            <span className="s-sp" style={{ '--c': q(entry.q).c }}><i />{q(entry.q).k}</span>
            <span className="s-t now-t">sırada</span>
          </div>
        ) : null}
        {plan.map((j) => (
          <div key={'p' + j} className="srow plan">
            <span className="s-i mono">{j + 1}</span>
            <span className="s-v mono">{hasNum(t.kg) && Number(t.kg) ? nf(Number(t.kg)) : '–'}</span>
            <span className="s-v mono">{repTxt(t.repMin, t.repMax)}</span>
            <span />
            <span className="s-sp none">–</span>
            <span className="s-t" />
          </div>
        ))}
        {extra ? <div className="srow fin"><Icon name="check" size={13} /> Hedef tamam · kalite düşmeden bitir</div> : null}
      </div>
    </div>
  );
}

function PlyoStage({ lib, item, session }) {
  const total = sessionStats(session).contacts;
  const lastQ = item.sets.length ? item.sets[item.sets.length - 1].q || 0 : 0;
  return (
    <div className={'plyostage' + (lastQ === 2 ? ' warn' : '')}>
      <div className="ps-l">
        <span className="ps-k">Yoğunluk</span>
        <b>{PLYO_INT[(lib && lib.int) || 2]}</b>
      </div>
      <div className="ps-m">
        {lastQ === 2 ? <span>Kalite düştü: bu hareketi bitir ya da dinlenmeyi uzat.</span> : <span>Her tekrarda en yükseğe, en hızlıya. Kalite düşünce dur; tükenişe gitme.</span>}
      </div>
      <div className="ps-r">
        <span className="ps-k">Seans teması</span>
        <b className={'mono' + (total > 140 ? ' over' : '')}>{total}</b>
      </div>
    </div>
  );
}

function SessionView2({ session, st, put, del, openSheet, onFinished, onDiscarded }) {
  const sRef = useRef(clone(session));
  const [s, setS] = useState(sRef.current);
  const [cur, setCur] = useState(() => firstOpen(session));
  const [entry, setEntry] = useState(() => ({ ...entryFor(session.items[firstOpen(session)]), note: '', tags: [] }));
  const [rest, setRest] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const bodyRef = useRef(null);
  const sessionBodyRef = useRef(null);
  const now = useNow(500);
  const mutate = (fn) => { const ns = clone(sRef.current); fn(ns); sRef.current = ns; setS(ns); put('sessions', ns); return ns; };
  const item = s.items[cur];
  const n = s.items.length;
  const go = (i) => { const j = clamp(i, 0, Math.max(0, sRef.current.items.length - 1)); setCur(j); setEntry({ ...entryFor(sRef.current.items[j]), note: '', tags: [] }); };
  const totalSets = s.items.reduce((a, it) => a + it.sets.length, 0);
  const rirEst = item ? rirFromSpeed(entry.reps, entry.lvl) : 0;
  const rirInt = Math.round(rirEst);
  const rpeEst = clamp(10 - rirInt, 6, 10);
  const rpe = entry.rpe != null ? entry.rpe : rpeEst;
  const rirFinal = entry.rpe != null ? (entry.rpe === 6 ? Math.max(4, rirInt) : 10 - entry.rpe) : rirInt;
  const prev = item ? prevPerf(st.sessions, item, s.startedAt) : null;
  const t = item ? item.target : null;
  const lib = item ? exMeta(item.exId, item.name) : null;
  const plyo = !!(lib && lib.kind === 'plyo');

  useLayoutEffect(() => {
    const body = sessionBodyRef.current;
    if (!body) return;
    const fixed = [...body.children].filter(el => !el.matches('.stable, .ses2-mid'));
    const table = body.querySelector('.stable');
    const tableHead = table.querySelector('.sh');
    const tableBody = table.querySelector('.sbody');
    const fit = () => {
      const css = getComputedStyle(body);
      const available = body.clientHeight - parseFloat(css.paddingTop) - parseFloat(css.paddingBottom);
      const minimum = fixed.reduce((sum, el) => sum + el.getBoundingClientRect().height, 0)
        + tableHead.getBoundingClientRect().height + parseFloat(getComputedStyle(tableBody).minHeight) + 2
        + parseFloat(css.rowGap) * (body.children.length - 1);
      // Yazı, çentik ve gerçek içerik boyutunu ölç; viewport eşiğine güvenme.
      body.classList.toggle('compact-overflow', minimum > available);
    };
    const observer = new ResizeObserver(fit);
    [body, ...fixed, tableHead].forEach(el => observer.observe(el));
    fit();
    return () => observer.disconnect();
  }, [item?.id]);

  useEffect(() => {
    // sıradaki satır görünür kalsın (yalnızca tablonun kendi kaydırması)
    const b = bodyRef.current;
    if (!b) return;
    const row = b.querySelector('.srow.now, .srow.fin');
    if (row && (row.offsetTop + row.offsetHeight > b.scrollTop + b.clientHeight || row.offsetTop < b.scrollTop)) b.scrollTop = row.offsetTop - b.clientHeight + row.offsetHeight;
  }, [cur, item ? item.sets.length : 0]);

  const logSet = () => {
    if (!item) return;
    const set = plyo
      ? { kg: Number(entry.kg) || 0, reps: Math.max(1, Math.round(entry.reps)), plyo: true, q: entry.q || 0, lvl: null, vl: 0, rpe: null, rir: 9, at: Date.now() }
      : { kg: Number(entry.kg) || 0, reps: Math.max(1, Math.round(entry.reps)), lvl: entry.lvl, vl: SPEED[entry.lvl].vl, rpe, rir: rirFinal, rirEst: Math.round(rirEst * 10) / 10, at: Date.now() };
    if (entry.note) set.note = entry.note;
    if (entry.tags.length) set.tags = entry.tags;
    mutate((ns) => { ns.items[cur].sets.push(set); });
    setRest({ start: Date.now(), total: item.target.rest || 120 });
    setEntry({ ...entry, rpe: null, q: 0, note: '', tags: [] });
  };
  const addItem = (ex) => {
    const d = itemFromEx(ex);
    const ns = mutate((x) => { x.items.push({ id: newId('e'), srcId: null, exId: d.exId, name: d.name, muscle: d.muscle, note: '', memo: '', target: { sets: d.sets, repMin: d.repMin, repMax: d.repMax, kg: d.kg, rpeMin: d.rpeMin, rpeMax: d.rpeMax, rest: d.rest }, sets: [] }); });
    go(ns.items.length - 1);
  };
  const openNote = () => openSheet('note', {
    title: item.name,
    init: { note: entry.note, tags: entry.tags, memo: item.memo || '', canProgram: !!(sRef.current.programId && item.srcId) },
    onSave: (r) => {
      setEntry((e) => ({ ...e, note: r.note, tags: r.tags }));
      mutate((ns) => { ns.items[cur].memo = r.memo; });
      if (r.toProgram) {
        const p = st.programs.find((x) => x.id === sRef.current.programId);
        if (p) {
          const np = clone(p);
          np.days.forEach((d) => d.items.forEach((it) => { if (it.id === item.srcId) it.note = r.memo; }));
          np.updatedAt = Date.now();
          put('programs', np);
        }
      }
    },
  });
  const openSet = (j) => {
    const ci = cur;
    openSheet('setdetail', { title: item.name, exId: item.exId, set: item.sets[j], idx: j, onDelete: () => mutate((ns) => { ns.items[ci].sets.splice(j, 1); }) });
  };
  const openList = () => openSheet('exlist', { getSession: () => sRef.current, onGo: (i) => go(i), onAdd: addItem });
  const finish = () => {
    const end = Date.now();
    const draft = { ...clone(sRef.current), status: 'done', endedAt: end };
    const all = [draft, ...st.sessions.filter((x) => x.id !== draft.id)];
    const pre = Math.round(fatigueAt(st, draft.startedAt - 1, all).score);
    const post = Math.round(fatigueAt(st, end, all).score);
    const ns = mutate((x) => { x.status = 'done'; x.endedAt = end; x.fatigue = { v: 2, pre, post }; });
    onFinished(ns);
  };

  return (
    <div className="screen ses2">
      <header className="shead ses2-head">
        <div className="shead-row">
          <span className="live-dot" />
          <div className="shead-t"><h1 className="ses2-name">{s.dayName}</h1><span className="shead-sub mono">{hm(s.startedAt)} başladı · {mmss(now - s.startedAt)} · {totalSets} set</span></div>
          <button type="button" id="finish-btn" className="btn fire sm" onClick={() => setConfirm(confirm ? null : 'finish')}>Bitir</button>
        </div>
      </header>

      {confirm ? (
        <div className="pop">
          {confirm === 'finish' ? (
            <React.Fragment>
              <p>{totalSets ? `Antrenmanı bitir? ${totalSets} set kaydedildi.` : 'Hiç set yok. Kaydetmeden çıkabilirsin.'}</p>
              <div className="confirm-inline">
                {totalSets ? <button type="button" id="finish-yes" className="btn fire sm" onClick={finish}>Bitir ve özetle</button> : <button type="button" id="discard-yes" className="btn danger sm" onClick={() => { del('sessions', s.id); onDiscarded(); }}>Kaydetmeden çık</button>}
                <button type="button" className="btn ghost sm" onClick={() => setConfirm(null)}>Devam</button>
                {totalSets ? <button type="button" className="btn ghost sm danger-t" onClick={() => setConfirm('discard')}>Sil</button> : null}
              </div>
            </React.Fragment>
          ) : (
            <React.Fragment>
              <p>Bu antrenman ve {totalSets} set silinsin mi?</p>
              <div className="confirm-inline">
                <button type="button" className="btn danger sm" onClick={() => { del('sessions', s.id); onDiscarded(); }}>Sil</button>
                <button type="button" className="btn ghost sm" onClick={() => setConfirm(null)}>Vazgeç</button>
              </div>
            </React.Fragment>
          )}
        </div>
      ) : null}

      {!item ? (
        <div className="scr">
          <div className="empty"><strong>Boş antrenman</strong><p>Yaptığın hareketi ekle, setlerini kaydet. Bitirince antrenman türü olarak saklayabilirsin.</p>
            <button type="button" id="ses-add-first" className="btn primary" onClick={() => openSheet('picker', { onPick: addItem })}><Icon name="plus" size={14} /> Hareket ekle</button>
          </div>
        </div>
      ) : (
        <div className="ses2-body" ref={sessionBodyRef}>
          <div className="exprog" aria-label="Hareket ilerlemesi">
            {s.items.map((it, i) => (
              <button key={it.id} type="button" className={'exp' + (i === cur ? ' on' : '') + (it.sets.length >= it.target.sets ? ' done' : '')} onClick={() => go(i)} aria-label={(i + 1) + '. hareket: ' + it.name + ', ' + it.sets.length + '/' + it.target.sets + ' set'}>
                <i style={{ width: Math.min(100, (it.sets.length / Math.max(1, it.target.sets)) * 100) + '%' }} />
              </button>
            ))}
          </div>
          <div className="exnav">
            <button type="button" className="nav-arrow" aria-label="Önceki hareket" disabled={cur === 0} onClick={() => go(cur - 1)}><Icon name="left" size={18} /></button>
            <button type="button" id="exnav-list" className="exnav-mid" onClick={openList}>
              <span className="exnav-k mono">Hareket {cur + 1}/{n} · {item.muscle}</span>
              <span className="exnav-n">{item.name}</span>
            </button>
            <button type="button" id="ex-info" className="nav-arrow info" aria-label="Hareket bilgisi" onClick={() => openSheet('exercise', { exId: item.exId, name: item.name })}><Icon name="info" size={17} /></button>
            <button type="button" className="nav-arrow" aria-label="Sonraki hareket" disabled={cur >= n - 1} onClick={() => go(cur + 1)}><Icon name="right" size={18} /></button>
          </div>

          <div className="tgt2">
            <div className="tg-main">
              <span className="tg-k">Hedef</span>
              <span className="tg-big mono">{t.sets}<i>×</i>{repTxt(t.repMin, t.repMax)}</span>
              <span className="tg-u">{plyo ? 'set × temas' : 'set × tekrar'}</span>
            </div>
            <div className="tg-cell"><b className="mono">{hasNum(t.kg) && (Number(t.kg) || !plyo) ? nf(Number(t.kg)) : '–'}</b><small>{plyo ? 'ek kg' : 'kg'}</small></div>
            {plyo
              ? <div className="tg-cell"><b className="tg-int">{PLYO_INT[lib.int || 2].split(' ')[0]}</b><small>yoğunluk</small></div>
              : <div className="tg-cell"><b className="mono">{hasNum(t.rpeMin) ? rpeTxt(t.rpeMin, t.rpeMax).replace('RPE ', '') : '–'}</b><small>RPE</small></div>}
            <div className="tg-cell"><b className="mono">{restTxt(t.rest || 120).replace(' dk', '')}</b><small>dk ara</small></div>
            {prev || item.memo || item.note ? (
              <div className="tg-foot">
                {item.memo || item.note ? <span className="tg-memo"><Icon name="edit" size={11} /> {item.memo || item.note}</span> : null}
                {prev ? <span className="tg-prev mono">Son sefer {prev}</span> : null}
              </div>
            ) : null}
          </div>

          <SetTable item={item} entry={entry} rpe={rpe} onOpen={openSet} bodyRef={bodyRef} />

          <div className="ses2-mid">
            {plyo ? <PlyoStage lib={lib} item={item} session={s} /> : <SpeedStage reps={entry.reps} lvl={entry.lvl} exId={item.exId} />}
          </div>

          <div className="dock">
            <div className="dock-steps">
              <Stepper id={'kg-' + item.id} label={plyo ? 'Ek yük (kg)' : 'Kilo'} value={entry.kg} step={2.5} min={0} max={500} onChange={(v) => setEntry({ ...entry, kg: v, rpe: null })} />
              <Stepper id={'reps-' + item.id} label={plyo ? 'Temas' : 'Tekrar'} value={entry.reps} step={1} min={1} max={60} decimals={0} onChange={(v) => setEntry({ ...entry, reps: Math.round(v), rpe: null })} />
            </div>
            {plyo ? (
              <div className="spd">
                <div className="spd-h"><span className="st-k">Son tekrarların kalitesi</span><span className="spd-v" style={{ color: PLYO_Q[entry.q || 0].c }}>{PLYO_Q[entry.q || 0].d}</span></div>
                <div className="pq-row" role="radiogroup" aria-label="Sıçrama kalitesi">
                  {PLYO_Q.map((pq, i) => (
                    <button key={i} type="button" id={'pq-' + i} role="radio" aria-checked={(entry.q || 0) === i} className={'pq' + ((entry.q || 0) === i ? ' on' : '')} style={{ '--c': pq.c }} onClick={() => setEntry({ ...entry, q: i })}>{pq.k}</button>
                  ))}
                  <button type="button" id="note-btn" className={'note-btn' + (entry.note || entry.tags.length || item.memo ? ' has' : '')} onClick={openNote} aria-label="Not ekle"><Icon name="edit" size={17} /></button>
                </div>
              </div>
            ) : <React.Fragment>
            <div className="spd">
              <div className="spd-h"><span className="st-k">Son tekrarın hızı</span><span className="spd-v" style={{ color: vlColor(SPEED[entry.lvl].vl) }}>{SPEED[entry.lvl].d}</span></div>
              <div className="seg5s" role="radiogroup" aria-label="Son tekrarın hızı">
                {SPEED.map((sp, i) => (
                  <button key={i} type="button" id={'speed-' + i} role="radio" aria-checked={entry.lvl === i} className={'seg5' + (entry.lvl === i ? ' on' : '')} style={{ '--c': vlColor(sp.vl) }} onClick={() => setEntry({ ...entry, lvl: i, rpe: null })}>
                    <i><b style={{ height: Math.round((1 - sp.vl) * 100) + '%' }} /></i>
                    <span>{SPEED_SHORT[i]}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="dock-rpe">
              <div className="rpe-chips" role="radiogroup" aria-label="RPE">
                {[6, 7, 8, 9, 10].map((v) => (
                  <button key={v} type="button" role="radio" aria-checked={rpe === v} className={'rchip' + (rpe === v ? ' on' : '') + (rpeEst === v ? ' est' : '')} onClick={() => setEntry({ ...entry, rpe: v })}>
                    <span className="mono">{v === 6 ? '≤6' : v}</span>
                  </button>
                ))}
              </div>
              <button type="button" id="note-btn" className={'note-btn' + (entry.note || entry.tags.length || item.memo ? ' has' : '')} onClick={openNote} aria-label="Not ekle"><Icon name="edit" size={17} /></button>
            </div>
            </React.Fragment>}
            {(() => {
              const two = item.sets.length >= item.target.sets && cur < n - 1;
              return (
                <div className={'dock-go' + (two ? ' two' : '') + (rest ? ' r' : '')}>
                  {rest ? <RestChip rest={rest} now={now} onAdd={() => setRest({ ...rest, total: rest.total + 30 })} onClose={() => setRest(null)} /> : null}
                  {two ? (
                    <React.Fragment>
                      <button type="button" id="log-set" className="btn ghost big" onClick={logSet}>Ek set</button>
                      <button type="button" id="next-ex" className="btn primary big" onClick={() => go(cur + 1)}>{rest ? 'Sonraki' : 'Sonraki hareket'} <Icon name="right" /></button>
                    </React.Fragment>
                  ) : (
                    <button type="button" id="log-set" className="btn fire big" onClick={logSet}>Set {item.sets.length + 1}{item.sets.length < item.target.sets ? '/' + item.target.sets : ''} kaydet{item.sets.length >= item.target.sets ? ' · ek' : ''}</button>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

function SetDetailBody({ set, idx, exId, onDelete, onClose }) {
  const [confirm, setConfirm] = useState(false);
  if (set.plyo) {
    const lib = libById(exId);
    const q = PLYO_Q[set.q || 0];
    return (
      <div className="setd">
        <div className="setd-top">
          <span className="setd-n mono">Set {idx + 1}</span>
          <span className="setd-v mono">{set.reps} temas{Number(set.kg) ? ' · +' + nf(Number(set.kg)) + ' kg' : ''}</span>
          <span className="setd-t mono">{hm(set.at)}</span>
        </div>
        <div className="setd-grid two">
          <div><small>Kalite</small><b style={{ color: q.c }}>{q.k}</b></div>
          <div><small>Yoğunluk</small><b>{PLYO_INT[(lib && lib.int) || 2].split(' ')[0]}</b></div>
          <div><small>Yorgunluk payı</small><b className="mono">{nf(Math.round(set.reps * PLYO_W[(lib && lib.int) || 2] * 100) / 100)}</b></div>
          <div><small>Zor set</small><b className="mono" style={{ color: 'var(--faint)' }}>hayır</b></div>
        </div>
        {set.tags && set.tags.length ? <div className="chips-wrap">{set.tags.map((x) => <span key={x} className="fchip on">{x}</span>)}</div> : null}
        {set.note ? <p className="sd-note">{set.note}</p> : null}
        {confirm ? (
          <span className="confirm-inline"><button type="button" id="set-del-yes" className="btn danger sm" onClick={() => { onDelete(); onClose(); }}>Seti sil</button><button type="button" className="btn ghost sm" onClick={() => setConfirm(false)}>Vazgeç</button></span>
        ) : <button type="button" id="set-del" className="btn ghost sm danger-t setd-del" onClick={() => setConfirm(true)}><Icon name="trash" size={13} /> Seti sil</button>}
      </div>
    );
  }
  const e1 = e1Ok(set) ? Math.round(e1rm(set.kg, set.reps, set.rir) * 2) / 2 : null;
  return (
    <div className="setd">
      <div className="setd-top">
        <span className="setd-n mono">Set {idx + 1}</span>
        <span className="setd-v mono">{nf(Number(set.kg))} kg × {set.reps}</span>
        <span className="setd-t mono">{hm(set.at)}</span>
      </div>
      <SetReplay set={set} bench={BENCH_IDS.includes(exId)} />
      <div className="setd-grid">
        <div><small>RPE</small><b className="mono">{rpeLabel(set.rpe, set.rir)}</b></div>
        <div><small>Kalan tekrar</small><b className="mono">{rirTxt(set.rir)}</b></div>
        <div><small>Zor set</small><b className="mono" style={{ color: set.rir <= 4 ? 'var(--ok)' : 'var(--faint)' }}>{set.rir <= 4 ? 'evet' : 'hayır'}</b></div>
        <div><small>e1RM</small><b className="mono">{e1 ? nf(e1) : '–'}</b></div>
      </div>
      {set.tags && set.tags.length ? <div className="chips-wrap">{set.tags.map((x) => <span key={x} className="fchip on">{x}</span>)}</div> : null}
      {set.note ? <p className="sd-note">{set.note}</p> : null}
      {confirm ? (
        <span className="confirm-inline"><button type="button" id="set-del-yes" className="btn danger sm" onClick={() => { onDelete(); onClose(); }}>Seti sil</button><button type="button" className="btn ghost sm" onClick={() => setConfirm(false)}>Vazgeç</button></span>
      ) : <button type="button" id="set-del" className="btn ghost sm danger-t setd-del" onClick={() => setConfirm(true)}><Icon name="trash" size={13} /> Seti sil</button>}
    </div>
  );
}

function RestChip({ rest, now, onAdd, onClose }) {
  const el = (now - rest.start) / 1000;
  const left = rest.total - el;
  const over = left <= 0;
  const k = clamp(el / rest.total);
  const R = 14, L = 2 * Math.PI * R;
  return (
    <div className={'restchip' + (over ? ' over' : '')} role="timer" aria-label={over ? 'Dinlenme bitti' : 'Dinlenme ' + mmss(left * 1000)}>
      <button type="button" className="rc-main" onClick={onClose} title="Dinlenmeyi kapat">
        <svg viewBox="0 0 34 34" className="rc-ring" aria-hidden="true">
          <circle cx="17" cy="17" r={R} className="rr-bg" />
          <circle cx="17" cy="17" r={R} className="rr-fg" style={{ strokeDasharray: `${(1 - k) * L} ${L}` }} transform="rotate(-90 17 17)" />
        </svg>
        <span className="rc-t"><small>{over ? 'Hazırsın' : 'Dinlen'}</small><b className="mono">{over ? '+' + mmss(-left * 1000) : mmss(left * 1000)}</b></span>
      </button>
      <button type="button" className="rc-add mono" onClick={onAdd} aria-label="30 saniye ekle">+30</button>
    </div>
  );
}

function RestBig({ rest, now, onAdd, onClose }) {
  const el = (now - rest.start) / 1000;
  const left = rest.total - el;
  const over = left <= 0;
  const k = clamp(el / rest.total);
  const R = 44, L = 2 * Math.PI * R;
  return (
    <div className={'restbig' + (over ? ' over' : '')} role="timer">
      <svg viewBox="0 0 100 100" className="rb-ring" aria-hidden="true">
        <circle cx="50" cy="50" r={R} className="rr-bg" />
        <circle cx="50" cy="50" r={R} className="rr-fg" style={{ strokeDasharray: `${(1 - k) * L} ${L}` }} transform="rotate(-90 50 50)" />
      </svg>
      <div className="rb-t">
        <span className="rest-k">{over ? 'Hazırsın' : 'Dinlenme'}</span>
        <span className="mono rb-v">{over ? '+' + mmss(-left * 1000) : mmss(left * 1000)}</span>
        <div className="rb-a">
          <button type="button" className="btn ghost sm" onClick={onAdd}>+30 sn</button>
          <button type="button" className="btn ghost sm" onClick={onClose}>Geç</button>
        </div>
      </div>
    </div>
  );
}

function NoteSheetBody({ init, onSave, onClose }) {
  const [note, setNote] = useState(init.note || '');
  const [tags, setTags] = useState(init.tags || []);
  const [memo, setMemo] = useState(init.memo || '');
  const [toProgram, setToProgram] = useState(false);
  const tog = (t) => setTags(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t]);
  return (
    <div className="note-sheet">
      <span className="st-k">Sonraki set</span>
      <div className="chips-wrap">
        {NOTE_TAGS.map((t) => <button key={t} type="button" className={'fchip' + (tags.includes(t) ? ' on' : '')} onClick={() => tog(t)}>{t}</button>)}
      </div>
      <input id="set-note" className="text-in" placeholder="Set notu (isteğe bağlı)" value={note} onChange={(e) => setNote(e.target.value)} />
      <label className="st-k" htmlFor="ex-memo">Hareket notu</label>
      <textarea id="ex-memo" className="text-area" rows={2} placeholder="örn. koltuk 4. kademe, gelecek hafta 77,5 kg" value={memo} onChange={(e) => setMemo(e.target.value)} />
      {init.canProgram ? (
        <label className="check-row"><input id="memo-to-program" type="checkbox" checked={toProgram} onChange={(e) => setToProgram(e.target.checked)} /> Programdaki nota da kaydet, sonraki antrenmanda görünsün</label>
      ) : null}
      <button type="button" id="note-save" className="btn primary full" onClick={() => { onSave({ note, tags, memo, toProgram }); onClose(); }}>Kaydet</button>
    </div>
  );
}

function ExListBody({ getSession, onGo, onAdd, onClose, openSheet }) {
  const s = getSession();
  return (
    <div className="exlist">
      <ol className="items">
        {s.items.map((it, i) => (
          <li key={it.id} className="item">
            <button type="button" className="item-row" onClick={() => { onGo(i); onClose(); }}>
              <span className="item-i mono">{i + 1}</span>
              <span className="item-t"><strong>{it.name}</strong><small className="mono">{it.sets.length}/{it.target.sets} set · {targetTxt(it.target, it.exId)}</small></span>
              {it.sets.length >= it.target.sets ? <Icon name="check" size={15} /> : <Icon name="right" size={14} />}
            </button>
          </li>
        ))}
      </ol>
      <button type="button" id="exlist-add" className="add-item" onClick={() => openSheet('picker', { onPick: (ex) => { onAdd(ex); onClose(); } })}>+ Hareket ekle</button>
    </div>
  );
}

/* ---------- özet + antrenman türü ---------- */
function SummaryBody({ session, st, openSheet, onDelete, onClose }) {
  const [confirm, setConfirm] = useState(false);
  const ss = sessionStats(session);
  const all = st.sessions.some((x) => x.id === session.id) ? st.sessions.map((x) => (x.id === session.id ? session : x)) : [session, ...st.sessions];
  const ls = logStats(all, session.endedAt || Date.now());
  const notes = [];
  session.items.forEach((it) => {
    if (it.memo) notes.push(it.name + ': ' + it.memo);
    it.sets.forEach((x, j) => { if (x.note || (x.tags && x.tags.length)) notes.push(it.name + ' · set ' + (j + 1) + ': ' + [x.tags ? x.tags.join(', ') : '', x.note || ''].filter(Boolean).join(' · ')); });
  });
  const prevBest = (it) => {
    let b = 0;
    all.filter((x) => x.status === 'done' && x.startedAt < session.startedAt).forEach((x) => x.items.forEach((z) => { if ((it.exId && z.exId === it.exId) || z.name === it.name) b = Math.max(b, bestE1(z.sets)); }));
    return b;
  };
  const sf = sessionFatigue(session, { ...st, sessions: all });
  return (
    <div className="summary2">
      <p className="sum-when mono"><Icon name="clock" size={13} /> {fullDate(session.startedAt)} · {hm(session.startedAt)}–{hm(session.endedAt || Date.now())}</p>
      <div className="tiles">
        <Tile k="Süre" v={durTxt(ss.dur)} unit="" />
        <Tile k="Set" v={ss.sets.length} unit="" sub={ss.hard.length + ' zor set'} />
        <Tile k="Tonaj" v={nf(Math.round(ss.tonnage))} unit=" kg" />
        <button type="button" className="tile tile-btn" onClick={() => openSheet('fatigue', {})}>
          <span className="tile-k">Yorgunluk</span>
          <span className="tile-v mono" style={{ color: zoneOf(sf.post).c }}>{Math.round(sf.pre)} → {Math.round(sf.post)}</span>
          <span className="tile-sub">başta → sonda · {zoneOf(sf.post).k}</span>
        </button>
      </div>
      <ul className="sum-ex">
        {session.items.filter((it) => it.sets.length).map((it) => {
          const best = bestE1(it.sets), pb = best ? prevBest(it) : 0, d = pb ? best - pb : 0;
          return (
            <li key={it.id}>
              <div className="se-top">
                <strong>{it.name}</strong>
                <span className="mono se-e1">{best ? <React.Fragment>e1RM {nf(Math.round(best * 2) / 2)}{pb ? <em className={d >= 0 ? 'up' : 'down'}> {d >= 0 ? '+' : '−'}{nf(Math.abs(Math.round(d * 2) / 2))}</em> : null}</React.Fragment> : isPlyo(it.exId) ? it.sets.reduce((a, z) => a + z.reps, 0) + ' temas' : 'e1RM –'}</span>
              </div>
              <div className="se-sets">
                {it.sets.map((z, j) => <span key={j} className="se-set"><span className="mono">{z.plyo ? (Number(z.kg) ? '+' + nf(Number(z.kg)) + '×' : '') + z.reps + (Number(z.kg) ? '' : ' temas') : nf(Number(z.kg)) + '×' + z.reps}</span><i style={z.plyo ? { background: PLYO_Q[z.q || 0].c, width: '100%' } : { background: vlColor(z.vl), width: Math.max(10, z.vl * 100) + '%' }} /><small className="mono">{hm(z.at)}</small></span>)}
              </div>
            </li>
          );
        })}
      </ul>
      {notes.length ? <div className="sum-notes"><span className="st-k">Notlar</span>{notes.map((t, i) => <p key={i}>{t}</p>)}</div> : null}
      {Object.keys(ls.muscles).length ? (
        <div className="sum-week">
          <span className="st-k">Son 7 gün zor set</span>
          <MuscleBars muscles={ls.muscles} compact />
        </div>
      ) : null}
      <div className="sum-actions">
        <button type="button" id="save-tmpl" className="btn ghost" onClick={() => openSheet('saveTemplate', { session })}><Icon name="plus" size={14} /> Antrenman türü olarak kaydet</button>
        {confirm ? (
          <span className="confirm-inline"><button type="button" className="btn danger sm" onClick={() => { onDelete(session.id); onClose(); }}>Kaydı sil</button><button type="button" className="btn ghost sm" onClick={() => setConfirm(false)}>Vazgeç</button></span>
        ) : <button type="button" className="btn ghost sm danger-t" onClick={() => setConfirm(true)}>Kaydı sil</button>}
      </div>
    </div>
  );
}

function SaveTemplateBody({ session, st, put, onClose, onSaved }) {
  const [name, setName] = useState(session.dayName === 'Boş antrenman' ? '' : session.dayName + ' (yeni)');
  const [target, setTarget] = useState(st.programs[0] ? st.programs[0].id : 'new');
  const [wd, setWd] = useState(null);
  const items = session.items.filter((it) => it.sets.length).map((it) => {
    const reps = it.sets.map((z) => z.reps), rpes = it.sets.map((z) => z.rpe);
    return { id: newId('i'), exId: it.exId, name: it.name, muscle: it.muscle, sets: it.sets.length, repMin: Math.min(...reps), repMax: Math.max(...reps), kg: Number(it.sets[it.sets.length - 1].kg) || null, rpeMin: Math.min(...rpes), rpeMax: Math.max(...rpes), rest: it.target.rest || 120, note: it.memo || '' };
  });
  const save = () => {
    const day = { id: newId('d'), name: name.trim() || 'Yeni antrenman', weekday: wd, items };
    let p;
    if (target === 'new') p = { id: newId('p'), name: 'Antrenmanlarım', createdAt: Date.now(), updatedAt: Date.now(), days: [day] };
    else { p = clone(st.programs.find((x) => x.id === target)); p.days.push(day); p.updatedAt = Date.now(); }
    put('programs', p);
    onSaved(p, day);
    onClose();
  };
  return (
    <div className="note-sheet">
      <label className="st-k" htmlFor="tmpl-name">Adı</label>
      <input id="tmpl-name" className="text-in" placeholder="örn. Omuz + kol" value={name} onChange={(e) => setName(e.target.value)} />
      <span className="st-k">Program</span>
      <div className="chips-wrap">
        {st.programs.map((p) => <button key={p.id} type="button" className={'fchip' + (target === p.id ? ' on' : '')} onClick={() => setTarget(p.id)}>{p.name || 'Adsız'}</button>)}
        <button type="button" className={'fchip' + (target === 'new' ? ' on' : '')} onClick={() => setTarget('new')}>+ Yeni program</button>
      </div>
      <span className="st-k">Haftanın günü</span>
      <div className="wd-pick">
        {WEEK_ORDER.map((w) => <button key={w} type="button" className={'wd-btn' + (wd === w ? ' on' : '')} onClick={() => setWd(wd === w ? null : w)}>{WD_SHORT[w]}</button>)}
      </div>
      <p className="muted-p">{items.length} hareket, yaptığın set, tekrar, kilo ve RPE değerleriyle kaydedilir.</p>
      <button type="button" id="tmpl-save" className="btn primary full" onClick={save}>Kaydet</button>
    </div>
  );
}

/* ================= PROGRAMLAR ================= */
function ProgramsList({ st, open, createProgram }) {
  return (
    <div className="screen">
      <ScreenHead title="Programlar" sub="Antrenman türlerini ve haftanı kur" right={<button type="button" id="prog-new" className="icon-btn sm" aria-label="Yeni program" onClick={createProgram}><Icon name="plus" size={18} /></button>} />
      <div className="scr">
        {!st.programs.length ? (
          <div className="empty"><strong>Henüz programın yok</strong><p>İlk programını oluştur; günlerini ve hareketlerini sen belirle.</p><button type="button" id="prog-empty-new" className="btn primary full" onClick={createProgram}>Program oluştur</button></div>
        ) : st.programs.map((p) => {
          const ps = planStats(p);
          const sim = simulatePlan(p);
          const r = sim ? { zone: zoneOf(sim.pre) } : null;
          return (
            <button key={p.id} type="button" id={'open-' + p.id} className="prog2" onClick={() => open(p)}>
              <div className="prog2-h">
                <strong>{p.name || 'Adsız program'}</strong>
                {r ? <span className="zone-pill sm" style={{ color: r.zone.c, borderColor: r.zone.c }}>{r.zone.k}</span> : null}
              </div>
              <div className="prog2-days">
                {p.days.map((d) => <span key={d.id} className="pchip"><b className="mono">{d.weekday == null ? '—' : WD_SHORT[d.weekday]}</b>{d.name}</span>)}
              </div>
              <span className="prog2-k mono">{p.days.reduce((a, d) => a + d.items.length, 0)} hareket · {Object.values(ps.muscles).reduce((a, b) => a + b, 0)} set/hafta · güncellendi {dateTxt(p.updatedAt || p.createdAt).split(' · ')[0]} {hm(p.updatedAt || p.createdAt)}</span>
            </button>
          );
        })}
        <BackupPanel />
      </div>
    </div>
  );
}

function ProgramEditor2({ program, startDay, st, put, del, onBack, openSheet, startSession }) {
  const [p, setP] = useState(() => clone(program));
  const [di, setDi] = useState(() => Math.max(0, program.days.findIndex((d) => d.id === startDay)));
  const [saved, setSaved] = useState(true);
  const [confirm, setConfirm] = useState(null);
  const latest = useRef(p);
  const timer = useRef(0);
  const pending = useRef(false);
  const flush = () => { if (pending.current) { pending.current = false; put('programs', latest.current); setSaved(true); } };
  useEffect(() => () => { clearTimeout(timer.current); if (pending.current) { pending.current = false; put('programs', latest.current); } }, []);
  const commit = (fn) => {
    const np = clone(latest.current); fn(np); np.updatedAt = Date.now();
    latest.current = np; setP(np); setSaved(false); pending.current = true;
    clearTimeout(timer.current); timer.current = setTimeout(flush, 600);
  };
  const dIdx = Math.min(di, p.days.length - 1);
  const day = p.days[dIdx];
  const ps = planStats(p);
  const sim = simulatePlan(p);
  const r = sim ? { score: sim.pre, zone: zoneOf(sim.pre) } : null;
  const topM = Object.entries(ps.muscles).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const low = MAIN_MUSCLES.filter((m) => (ps.muscles[m] || 0) < 10);

  const editItem = (i) => openSheet('item', {
    it: day.items[i], idx: i, n: day.items.length,
    onChange: (nit) => commit((np) => { np.days[dIdx].items[i] = nit; }),
    onMove: (d) => commit((np) => { const a = np.days[dIdx].items; const j = i + d; if (j < 0 || j >= a.length) return; const t = a[i]; a[i] = a[j]; a[j] = t; }),
    onRemove: () => commit((np) => { np.days[dIdx].items.splice(i, 1); }),
  });
  const addItem = () => openSheet('picker', {
    low,
    onPick: (ex) => { const nit = itemFromEx(ex); commit((np) => { np.days[dIdx].items.push(nit); }); },
  });

  return (
    <div className="screen editor2">
      <header className="shead">
        <div className="shead-row">
          <button type="button" id="ed-back" className="nav-arrow" aria-label="Programlar" onClick={() => { flush(); onBack(); }}><Icon name="left" size={18} /></button>
          <input id="prog-name" className="prog-name2" placeholder="Program adı" value={p.name} onChange={(e) => commit((np) => { np.name = e.target.value; })} />
          <span className={'save-st mono' + (saved ? ' ok' : '')}>{saved ? 'Kaydedildi' : '…'}</span>
        </div>
      </header>
      <div className="day-tabs ed2-tabs" role="tablist">
        {p.days.map((d, i) => (
          <button key={d.id} type="button" role="tab" aria-selected={i === dIdx} className={'day-tab' + (i === dIdx ? ' on' : '')} onClick={() => setDi(i)}><span className="mono">{d.weekday == null ? '—' : WD_SHORT[d.weekday]}</span>{d.name || 'Adsız'}</button>
        ))}
        <button type="button" id="add-day" className="day-tab add" onClick={() => { commit((np) => { np.days.push({ id: newId('d'), name: 'Yeni tür', weekday: null, items: [] }); }); setDi(p.days.length); }}>+ Tür</button>
      </div>
      {day ? (
        <div className="ed2-body">
          <div className="ed2-dayhead">
            <input id={'day-name-' + day.id} className="day-name" value={day.name} placeholder="Antrenman türü adı" onChange={(e) => commit((np) => { np.days[dIdx].name = e.target.value; })} />
            <div className="wd-pick">
              {WEEK_ORDER.map((w) => <button key={w} type="button" className={'wd-btn' + (day.weekday === w ? ' on' : '')} onClick={() => commit((np) => { np.days[dIdx].weekday = np.days[dIdx].weekday === w ? null : w; })}>{WD_SHORT[w]}</button>)}
            </div>
          </div>
          <div className="ed2-list">
            {day.items.length ? (
              <ol className="items">
                {day.items.map((it, i) => {
                  const m = exMeta(it.exId, it.name);
                  return (
                    <li key={it.id} className="item">
                      <button type="button" className="item-row" onClick={() => editItem(i)}>
                        <span className="item-i mono">{i + 1}</span>
                        <span className="item-t">
                          <strong>{it.name}</strong>
                          <small className="mono">{targetTxt(it, it.exId)} · {restTxt(it.rest)}</small>
                          {it.note ? <em>{it.note}</em> : null}
                        </span>
                        {exDot(m)}
                      </button>
                    </li>
                  );
                })}
              </ol>
            ) : <div className="empty sm"><strong>Boş sayfa</strong><p>Hareketleri tek tek ekle. Listede olmayanı adını yazarak ekleyebilirsin.</p></div>}
            <button type="button" id="add-item" className="add-item" onClick={addItem}>+ Hareket ekle</button>
            <div className="ed2-foot">
              {day.items.length ? <button type="button" id="ed-start" className="btn primary sm" onClick={() => { flush(); startSession(latest.current, latest.current.days[dIdx]); }}><Icon name="play" size={12} /> Bu türü başlat</button> : null}
              {confirm === 'day' ? (
                <span className="confirm-inline"><button type="button" className="btn danger sm" onClick={() => { setConfirm(null); setDi(Math.max(0, dIdx - 1)); commit((np) => { np.days.splice(dIdx, 1); }); }}>Türü sil</button><button type="button" className="btn ghost sm" onClick={() => setConfirm(null)}>Vazgeç</button></span>
              ) : p.days.length > 1 ? <button type="button" className="btn ghost sm danger-t" onClick={() => setConfirm('day')}>Türü sil</button> : null}
              {confirm === 'prog' ? (
                <span className="confirm-inline"><button type="button" className="btn danger sm" onClick={() => { pending.current = false; del('programs', p.id); onBack(); }}>Programı sil</button><button type="button" className="btn ghost sm" onClick={() => setConfirm(null)}>Vazgeç</button></span>
              ) : <button type="button" className="btn ghost sm danger-t" onClick={() => setConfirm('prog')}>Programı sil</button>}
            </div>
          </div>
        </div>
      ) : null}
      <button type="button" id="plan-dock" className="plan-dock" onClick={() => openSheet('plan', { getProgram: () => latest.current })}>
        <div className="pd-l">
          <span className="st-k">Haftalık yük</span>
          <span className="pd-m">{topM.length ? topM.map(([m, n]) => <span key={m}><b className="mono">{n}</b> {m}</span>) : 'Hareket ekledikçe hesaplanır'}</span>
        </div>
        {r ? <div className="pd-r"><Ring score={r.score} zone={r.zone} size={44} label={'Yorgunluk ' + Math.round(r.score)} /><Icon name="right" size={14} /></div> : null}
      </button>
    </div>
  );
}

function ItemSheetBody({ it: it0, idx, n, onChange, onMove, onRemove, onClose, openSheet }) {
  const [it, setIt] = useState(it0);
  const m = exMeta(it.exId, it.name);
  return (
    <div className="itemsheet">
      <FactChips ex={m} />
      {m ? <button type="button" className="mod-link" onClick={() => openSheet('exercise', { exId: m.id })}><Icon name="info" size={13} /> {m.bio ? 'Biyomekanik ve geçmiş' : 'Hareket bilgisi ve geçmiş'}</button> : null}
      <ItemEditor it={it} idx={idx} n={n} onChange={(nit) => { setIt(nit); onChange(nit); }} onMove={(d) => { onMove(d); onClose(); }} onRemove={() => { onRemove(); onClose(); }} />
    </div>
  );
}

function PickerBody({ custom, addCustom, onPick, onClose, low, openSheet }) {
  const [newMuscle, setNewMuscle] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const all = useMemo(() => [
    ...EX_LIB.map((e) => ({ ...e, exId: e.id, src: 'lib' })),
    ...custom.map((c) => ({ id: c.id, exId: c.id, name: c.name, muscle: c.muscle, rest: 90, kind: 'kuvvet', src: 'custom' })),
  ], [custom]);
  const f = useExFilter(all);
  const exact = all.some((e) => normTr(e.name) === normTr(f.q));
  const pick = (e) => { onPick(e); onClose(); };
  return (
    <div className="picker2">
      <ExFilterBar f={f} idp="ex" placeholder="Ara ya da yeni hareket yaz" />
      {low && low.length && !f.q ? (
        <div className="lowrow"><span className="st-k">Haftada 10 setin altında</span>
          <div className="chips-scroll">{low.map((m) => <button key={m} type="button" className={'fchip warn' + (f.grp === m ? ' on' : '')} onClick={() => f.setGrp(f.grp === m ? null : m)}>{m}</button>)}</div>
        </div>
      ) : null}
      {f.q.trim() && !exact && (showNew || !f.list.length) ? (
        <div className="new-ex">
          <div className="new-ex-top"><span className="badge new">Yeni</span><strong>{f.q.trim()}</strong></div>
          <div className="chips-wrap">{MUSCLES.map((m) => <button key={m} type="button" className={'fchip sm' + (newMuscle === m ? ' on' : '')} onClick={() => setNewMuscle(m)}>{m}</button>)}</div>
          <button type="button" id="ex-add-new" className="btn fire full" onClick={() => { const d = addCustom(f.q.trim(), newMuscle); pick({ exId: d.id, name: d.name, muscle: d.muscle, rest: 90 }); }}>Ekle</button>
        </div>
      ) : null}
      <span className="exf-count mono">{f.list.length} hareket</span>
      <ul className="ex-list2">
        {f.list.slice(0, f.lim).map((e) => (
          <li key={e.src + e.id} className="exr">
            <button type="button" className="exr-main" onClick={() => pick(e)}>
              <span className="exr-n">{e.name}</span>
              <span className="exr-k">
                {exDot(e)}
                <span>{exLine(e)}</span>
                {e.src === 'custom' ? <span className="badge own">özel</span> : null}
              </span>
            </button>
            {e.src === 'lib' ? <button type="button" className="nav-arrow info" aria-label={e.name + ' bilgisi'} onClick={() => openSheet('exercise', { exId: e.id })}><Icon name="info" size={16} /></button> : null}
          </li>
        ))}
      </ul>
      {f.list.length > f.lim ? <button type="button" id="ex-more" className="btn ghost full" onClick={f.more}>Daha fazla göster ({f.list.length - f.lim})</button> : null}
      {f.q.trim() && !exact && f.list.length && !showNew ? <button type="button" id="ex-new-open" className="add-item" onClick={() => setShowNew(true)}>+ “{f.q.trim()}” adıyla özel hareket ekle</button> : null}
    </div>
  );
}

function PlanBody({ getProgram, st, openSheet }) {
  const p = getProgram();
  const ps = planStats(p);
  const sim = simulatePlan(p);
  const names = Array.from(new Set([...MAIN_MUSCLES, ...Object.keys(ps.muscles)]));
  const over = Object.entries(ps.muscles).filter(([, n]) => n > 20).map(([m]) => m);
  const recs = [];
  if (sim && sim.post >= 85) recs.push('En ağır günün sonunda yorgunluk çok yüksek. O günün setlerini iki güne böl ya da birkaç seti 2–3 tekrar kala bitir.');
  if (sim && sim.pre >= 40) recs.push('Seanslara yorgun başlıyorsun. Türler arasında en az 48 sa bırak ya da toplam seti %20 azalt.');
  if (over.length) recs.push(over.join(', ') + ': haftada 20 zor setin üstü. Fazlası toparlanmayı uzatır, ek kazanımı belirsiz.');
  if (sim && sim.unplaced) recs.push(sim.unplaced + ' türün haftanın günü yok, hesaba katılmadı.');
  if (sim && !recs.length) recs.push('Dağılım dengeli: seanslara toparlanmış başlıyorsun.');
  return (
    <div className="plan2">
      {sim ? (
        <button type="button" className="plan2-meter" onClick={() => openSheet('fatigue', { sim: simFromPlan(p), source: 'Programına göre' })}>
          <Ring score={sim.pre} zone={zoneOf(sim.pre)} size={64} label="Seans başında yorgunluk" />
          <div className="pm-t">
            <span className="zone-pill" style={{ color: zoneOf(sim.pre).c, borderColor: zoneOf(sim.pre).c }}>{zoneOf(sim.pre).k}</span>
            <span className="pm-sub mono">Seans başı ort. {Math.round(sim.pre)} · en yüksek tepe {Math.round(sim.post)}</span>
            <span className="pm-link">Simüle et ›</span>
          </div>
        </button>
      ) : <p className="muted-p">Hesap için türlere haftanın günü ve hareket ekle.</p>}
      {sim ? (
        <div className="pdays2">
          <div className="pd2 sh"><span>Gün</span><span>Tür</span><span>Başta</span><span>Sonda</span></div>
          {sim.per.map((x, i) => (
            <div key={i} className="pd2">
              <span className="mono">{x.d.weekday == null ? '—' : WD_SHORT[x.d.weekday]}</span>
              <span className="pd2-n">{x.d.name || 'Adsız'}</span>
              <b className="mono" style={{ color: zoneOf(x.pre).c }}>{Math.round(x.pre)}</b>
              <b className="mono" style={{ color: zoneOf(x.post).c }}>{Math.round(x.post)}</b>
            </div>
          ))}
        </div>
      ) : null}
      <span className="st-k">Kas başına haftalık zor set</span>
      <MuscleBars muscles={ps.muscles} list={names} />
      <p className="chart-note">Taralı alan haftada 10–20 set: hipertrofi için sık önerilen aralık. RPE hedefi 6’nın altındaki setler sayılmaz.</p>
      <div className="recs2">{recs.slice(0, 3).map((x, i) => <p key={i}>{x}</p>)}</div>
    </div>
  );
}

function FatigueBody({ st, init, source, showNow, openSheet }) {
  const [v, setV] = useState(init);
  const set = (k) => (x) => setV((p) => ({ ...p, [k]: x }));
  const r = steadyWeek(v);
  const now = showNow ? fatigueAt(st, Date.now()) : null;
  const head = now
    ? { score: now.score, zone: now.zone, l1: 'antrenman ' + Math.round(now.train) + ' + uyku ' + (now.sleep.known ? Math.round(now.sleepPts) : '?'), l2: now.hrs ? '~' + now.hrs + ' sa sonra toparlanmış' : 'antrenmandan toparlanmış', l3: 'Şu an · kayıtların ve uykun' }
    : { score: r.pre, zone: r.zone, l1: 'seans başında · sonda ' + Math.round(r.post), l2: 'seans sonrası ~' + r.hrs + ' sa toparlanma', l3: source + ' · haftan böyle sürerse' };
  const recs = now
    ? fatigueRecs({ score: now.score, sleepLast: now.sleep.last, sleepAvg: now.sleep.avg3, sleepN: now.sleep.n }).concat(fatigueRecs({ pre: 0, rir: v.rir, perSession: r.perSession, post: r.post }).filter((x) => !/Toparlanmış/.test(x))).slice(0, 3)
    : fatigueRecs({ pre: r.pre, post: r.post, sleepLast: v.sleepLast, sleepAvg: v.sleepAvg, rir: v.rir, perSession: r.perSession });
  return (
    <div className="fat2">
      <div className="fat2-top">
        <NeedleGauge score={head.score} zone={head.zone} />
        <div className="fat2-r">
          <span className="score mono" style={{ color: head.zone.c }}>{Math.round(head.score)}</span>
          <span className="zone-pill" style={{ color: head.zone.c, borderColor: head.zone.c }}>{head.zone.k}</span>
          <span className="mono fat2-h">{head.l1}</span>
          <span className="mono fat2-h">{head.l2}</span>
          <span className="fat2-src">{head.l3}</span>
        </div>
      </div>
      <div className="recs2">{recs.map((x, i) => <p key={i}>{x}</p>)}</div>
      <div className="fat2-simh">
        <span className="st-k">{now ? 'Simülasyon · haftan böyle geçerse' : 'Değerleri değiştir'}</span>
        {now ? <span className="mono fat2-simv">başta <b style={{ color: r.zone.c }}>{Math.round(r.pre)}</b> · sonda <b style={{ color: zoneOf(r.post).c }}>{Math.round(r.post)}</b></span> : null}
      </div>
      <div className="fat2-in">
        <Range id="f-sets" label="Haftalık zor set (tüm kaslar)" value={v.sets} min={4} max={80} step={2} onChange={set('sets')} display={v.sets + ' set'} tone="fire" />
        <Range id="f-rir" label="Setleri nerede bitiriyorsun" value={v.rir} min={0} max={4} step={0.5} onChange={set('rir')} display={v.rir === 0 ? 'tükenişte' : nf(v.rir) + ' tekrar kala'} tone="fire" />
        <Range id="f-n" label="Haftada seans" value={v.n} min={1} max={6} onChange={set('n')} display={v.n + ' seans'} />
        <Range id="f-heavy" label="Ağır bileşik hareket payı" value={v.heavy} min={0} max={100} step={10} onChange={set('heavy')} display={'%' + v.heavy} />
        <Range id="f-sleep" label="Dün gece uyku" value={v.sleepLast} min={4} max={9} step={0.5} onChange={set('sleepLast')} display={nf(v.sleepLast) + ' sa'} />
        <Range id="f-sleep3" label="Son 3 gece ortalaması" value={v.sleepAvg} min={4} max={9} step={0.5} onChange={set('sleepAvg')} display={nf(v.sleepAvg) + ' sa'} />
        <Switch id="f-deload" label="Deload haftası" on={v.deload} onChange={set('deload')} />
      </div>
      <div className="fat2-learn">
        <span className="st-k">Nasıl hesaplanır?</span>
        <div className="chips-wrap">
          <button type="button" className="fchip" onClick={() => openSheet('measure', {})}>Yorgunluk nasıl ölçülür?</button>
          {STAGES.slice(0, 4).map((s2, i) => <button key={s2.id} type="button" className="fchip" onClick={() => openSheet('lesson', { stage: i })}>{s2.short}</button>)}
        </div>
      </div>
    </div>
  );
}

function LessonBody({ stage: s0 }) {
  const [stage, setStage] = useState(s0 || 0);
  const Comp = [StageSignal, StageRecruit, StageRate, StageFatigue][stage];
  return (
    <CompactCtx.Provider value={true}>
      <div className="lesson">
        <div className="lesson-tabs" role="tablist">
          {STAGES.slice(0, 4).map((s2, i) => <button key={s2.id} type="button" role="tab" aria-selected={stage === i} className={'ltab' + (stage === i ? ' on' : '')} onClick={() => setStage(i)}><b className="mono">{i + 1}</b>{s2.short}</button>)}
        </div>
        <div className="lesson-body" key={stage}><Comp /></div>
      </div>
    </CompactCtx.Provider>
  );
}

function ExerciseBody({ exId, name, st }) {
  const m = exMeta(exId, name);
  const series = e1Series(st.sessions, m ? m.id : exId, m ? m.name : name);
  const last = st.sessions.filter((s) => s.status === 'done').map((s) => ({ s, it: s.items.find((i) => (m && i.exId === m.id) || i.name === (m ? m.name : name)) })).filter((x) => x.it && x.it.sets.length).slice(0, 4);
  const latKind = m && m.id === 'band-yana-acis' ? 'band' : m && m.id === 'kablo-yana-acis' ? 'cable' : 'db';
  const plyo = m && m.kind === 'plyo';
  const setTxt = (z) => (z.plyo ? (Number(z.kg) ? '+' + nf(Number(z.kg)) + '×' : '') + z.reps : nf(Number(z.kg)) + '×' + z.reps);
  return (
    <div className="exsheet">
      <FactChips ex={m} />
      {m && m.en ? <p className="ex-en">İngilizce: {m.en}</p> : null}
      {m && !plyo && m.prof ? <p className="ex-prof">{PROF[m.prof].d}.</p> : null}
      {m && m.not ? <p className="ex-tip"><Icon name="info" size={13} /> {m.not}</p> : null}
      {plyo ? (
        <div className="ex-plyo">
          <span className="st-k">Pliometrik doz</span>
          <p>Seans başına toplam temas: başlangıç 80–100, orta 100–120, ileri 120–140. Aynı bölgeye pliometrik çalışmalar arasında 48–72 sa bırak. Her tekrar en yüksek niyetle; kalite düşünce dur.</p>
          <p className="ex-src">Kaynak: NSCA önerileri</p>
        </div>
      ) : null}
      {m && m.bio ? (
        <CompactCtx.Provider value={true}>
          <BiomechTab move={m.bio} setMove={() => {}} latKind={latKind} />
        </CompactCtx.Provider>
      ) : null}
      <div className="ex-hist">
        <span className="st-k">Geçmiş</span>
        {last.length ? last.map(({ s, it }) => (
          <div key={s.id} className="exh-row mono"><span>{dateTxt(s.startedAt)}</span><span>{it.sets.map(setTxt).join(', ')}</span></div>
        )) : <p className="muted-p">Bu hareketle henüz kayıt yok.</p>}
        {series.length ? <p className="mono exh-best">En iyi e1RM {nf(Math.round(Math.max(...series.map((p) => p.v)) * 2) / 2)} kg</p> : null}
      </div>
    </div>
  );
}

function GoalBody({ st, put, del, onClose }) {
  const g0 = st.settings.find((x) => x.key === 'goal')?.value ?? null;
  const [g, setG] = useState(g0 || { exId: null, base: 0, target: 0 });
  const [q, setQ] = useState('');
  const toks = normTr(q).split(/\s+/).filter(Boolean);
  const cur = libById(g.exId);
  const recorded = st.sessions.filter(s => s.status === 'done').sort((a, b) => b.startedAt - a.startedAt)
    .flatMap(s => s.items.filter(it => bestE1(it.sets)).map(it => exMeta(it.exId, it.name)))
    .filter(e => e && e.kind !== 'plyo');
  const suggested = [...new Map([...recorded, ...EX_LIB.filter(e => e.kind !== 'plyo' && e.fat >= 2)].map(e => [e.id, e])).values()];
  const opts = (toks.length ? EX_LIB.filter(e => e.kind !== 'plyo' && toks.every(t => normTr(e.name + ' ' + e.en).includes(t))) : suggested).slice(0, 8);
  const valid = !!g.exId && Number(g.base) > 0 && Number(g.target) > Number(g.base);
  const select = (e) => {
    const pts = e1Series(st.sessions, e.id, e.name);
    setG({ ...g, exId: e.id, base: pts.length ? Math.round(pts[pts.length - 1].v / 2.5) * 2.5 : 0 });
  };
  return (
    <div className="note-sheet">
      <span className="st-k">Hareket{cur ? ': ' + cur.name : ''}</span>
      <input id="goal-search" className="search" type="search" placeholder="Hareket ara (ör. bench, squat)" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
      <div className="chips-wrap">{opts.map((e) => <button key={e.id} type="button" className={'fchip' + (g.exId === e.id ? ' on' : '')} onClick={() => select(e)}>{e.name}</button>)}</div>
      <div className="entry-steps">
        <Stepper id="goal-base" label="Başlangıç 1RM" value={g.base} step={2.5} min={0} max={400} onChange={(v) => setG({ ...g, base: v })} />
        <Stepper id="goal-target" label="Hedef 1RM" value={g.target} step={2.5} min={0} max={400} onChange={(v) => setG({ ...g, target: v })} />
      </div>
      <button type="button" id="goal-save" className="btn primary full" disabled={!valid} onClick={() => { put('settings', { key: 'goal', value: { ...g, id: 'goal' } }); onClose(); }}>Kaydet</button>
      {!valid ? <p className="goal-form-hint">{!g.exId ? 'Önce bir hareket seç' : Number(g.base) <= 0 ? 'Başlangıç 1RM değerini gir' : 'Hedef, başlangıçtan büyük olmalı'}</p> : null}
      {g0 ? <button type="button" id="goal-remove" className="btn danger-t full" onClick={() => { del('settings', 'goal'); onClose(); }}>Hedefi kaldır</button> : null}
    </div>
  );
}

/* ================= İLERLEME ================= */
function E1Chart({ pts, goal }) {
  const W = 340, H = 190, m = { l: 36, r: 12, t: 14, b: 26 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const vs = pts.map((p) => p.v).concat(goal ? [goal] : []);
  const lo = Math.floor((Math.min(...vs) - 2) / 5) * 5, hi = Math.ceil((Math.max(...vs) + 2) / 5) * 5;
  const t0 = pts[0].t, t1 = pts.length > 1 ? pts[pts.length - 1].t : t0 + DAY_MS;
  const X = (t) => m.l + ((t - t0) / (t1 - t0 || 1)) * iw, Y = (v) => m.t + ih - ((v - lo) / (hi - lo || 1)) * ih;
  const ticks = []; for (let v = lo; v <= hi; v += (hi - lo) > 20 ? 10 : 5) ticks.push(v);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img" aria-label="Tahmini 1RM eğrisi">
      {ticks.map((v) => <g key={v}><line x1={m.l} x2={W - m.r} y1={Y(v)} y2={Y(v)} className="grid" /><text x={m.l - 6} y={Y(v) + 3.5} textAnchor="end" className="tick">{v}</text></g>)}
      {goal ? <g><line x1={m.l} x2={W - m.r} y1={Y(goal)} y2={Y(goal)} className="goal-line" /><text x={W - m.r} y={Y(goal) - 5} textAnchor="end" className="goal-t">hedef {goal}</text></g> : null}
      <path d={'M' + pts.map((p) => X(p.t) + ',' + Y(p.v)).join(' L') + ` L${X(pts[pts.length - 1].t)},${m.t + ih} L${X(pts[0].t)},${m.t + ih} Z`} className="area" style={{ fill: 'var(--fire)' }} />
      <polyline points={pts.map((p) => X(p.t) + ',' + Y(p.v)).join(' ')} className="line" style={{ stroke: 'var(--fire)' }} />
      {pts.map((p, i) => <circle key={i} cx={X(p.t)} cy={Y(p.v)} r={i === pts.length - 1 ? 4.5 : 3} className="cursor-dot" style={{ stroke: 'var(--fire)' }} />)}
      <text x={m.l} y={H - 6} className="tick">{dateTxt(t0)}</text>
      {pts.length > 1 ? <text x={W - m.r} y={H - 6} textAnchor="end" className="tick">{dateTxt(t1)}</text> : null}
    </svg>
  );
}
/* ================= GEÇMİŞ ================= */
function FatigueBars({ pts }) {
  const W = 132, H = 44, n = pts.length;
  if (!n) return null;
  const bw = Math.min(10, (W - (n - 1) * 3) / n);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="fbars" aria-hidden="true">
      <line x1="0" x2={W} y1={H - H * 0.4} y2={H - H * 0.4} className="fb-l" />
      <line x1="0" x2={W} y1={H - H * 0.7} y2={H - H * 0.7} className="fb-l" />
      {pts.map((p, i) => {
        const h = Math.max(3, (p.v / 100) * H), h0 = Math.max(2, ((p.pre || 0) / 100) * H), x = W - (n - i) * (bw + 3) + 3;
        return (
          <g key={i}>
            <rect x={x} y={H - h} width={bw} height={h} rx="2" style={{ fill: zoneOf(p.v).c, opacity: 0.35 }} />
            <rect x={x} y={H - h0} width={bw} height={h0} rx="2" style={{ fill: zoneOf(p.pre || 0).c }} />
          </g>
        );
      })}
    </svg>
  );
}
function Metric({ k, v, sub }) {
  return (
    <div className="metric">
      <span className="metric-k">{k}</span>
      <span className="metric-v mono">{v}</span>
      {sub ? <span className="metric-s mono">{sub}</span> : null}
    </div>
  );
}
function HistoryView({ st, openSheet, onBack }) {
  const [per, setPer] = useState('30');
  const goal = st.settings.find((x) => x.key === 'goal')?.value ?? null;
  const [sel, setSel] = useState(goal?.exId ?? null);
  const now = Date.now();
  const done = st.sessions.filter((s) => s.status === 'done');
  const days = per === 'all' ? 0 : Number(per);
  const list = days ? done.filter((s) => s.startedAt >= now - days * DAY_MS) : done;
  const m = periodMetrics(list, days);
  const scored = list.map((s) => { const f = sessionFatigue(s, st); return { s, v: f.post, pre: f.pre }; });
  const avgF = scored.length ? scored.reduce((a, x) => a + x.pre, 0) / scored.length : null;
  const avgPost = scored.length ? scored.reduce((a, x) => a + x.v, 0) / scored.length : null;
  const fz = fatigueAt(st, now);
  const head = avgF != null ? avgF : fz.score;
  const warns = historyWarnings(st, list);
  const alerts = warns.filter((w) => w.lv !== 'info').length;
  const fOf = (s) => { const x = scored.find((y) => y.s.id === s.id); return x ? x.v : null; };

  const exs = [];
  done.forEach((s) => s.items.forEach((it) => { if (bestE1(it.sets) && !exs.some((e) => e.key === (it.exId || it.name))) exs.push({ key: it.exId || it.name, exId: it.exId, name: it.name }); }));
  const cur = exs.find((e) => e.key === sel) || exs[0];
  const pts = cur ? e1Series(st.sessions, cur.exId, cur.name) : [];
  const gLine = cur && goal && cur.exId === goal.exId ? goal.target : null;

  return (
    <div className="screen">
      <ScreenHead
        title="Geçmiş"
        sub={done.length ? done.length + ' antrenman · ilk kayıt ' + dateTxt(done[done.length - 1].startedAt).split(' · ')[0] : 'Henüz kayıt yok'}
        left={<button type="button" id="hist-back" className="nav-arrow" aria-label="Antrenmana dön" onClick={onBack}><Icon name="left" size={18} /></button>}
      />
      <div className="segmented seg3" role="tablist" aria-label="Dönem">
        {[['7', 'Son 7 gün'], ['30', 'Son 30 gün'], ['all', 'Tümü']].map(([k, t]) => <button key={k} type="button" role="tab" id={'per-' + k} aria-selected={per === k} className={per === k ? 'on' : ''} onClick={() => setPer(k)}>{t}</button>)}
      </div>
      <div className="scr">
        <div className="mgrid">
          <Metric k="Antrenman" v={m.n} sub={nf(Math.round(m.perWeek * 10) / 10) + ' / hafta'} />
          <Metric k="Toplam süre" v={m.n ? durTxt(m.dur) : '–'} sub={m.n ? 'ort. ' + durTxt(m.avgDur) : null} />
          <Metric k="Set" v={m.sets} sub={m.hard + ' zor set'} />
          <Metric k="Tonaj" v={m.sets ? tonTxt(m.ton) : '–'} sub={m.sets ? 'ort. RPE ' + nf(Math.round(m.avgRpe * 10) / 10) : null} />
        </div>

        <button type="button" id="hist-fatigue" className="fcard" onClick={() => openSheet('fatigue', {})}>
          <Ring score={head} zone={zoneOf(head)} size={60} label="Seans başında ortalama yorgunluk" />
          <span className="fcard-t">
            <span className="st-k">{avgF != null ? 'Seans başında ort.' : 'Şu an'}</span>
            <span className="zone-pill sm" style={{ color: zoneOf(head).c, borderColor: zoneOf(head).c }}>{zoneOf(head).k}</span>
            <span className="fcard-s mono">{avgPost != null ? 'sonda ort. ' + Math.round(avgPost) + ' · ' : ''}şu an {Math.round(fz.score)}</span>
          </span>
          <FatigueBars pts={scored.slice().reverse().slice(-12)} />
        </button>

        <section className="warns" aria-label="Uyarılar">
          <div className="sec2-h"><span className="eyebrow">Uyarılar</span><span className={'mono warn-n' + (alerts ? ' on' : '')}>{alerts ? alerts + ' uyarı' : 'temiz'}</span></div>
          {warns.length ? warns.map((w, i) => (
            <div key={i} className={'warn-row ' + w.lv}>
              <i />
              <span><strong>{w.t}</strong><small>{w.d}</small></span>
            </div>
          )) : (
            <div className="warn-row ok"><i /><span><strong>Uyarı yok</strong><small>Hacim, yorgunluk ve uyku dengede görünüyor.</small></span></div>
          )}
        </section>

        <section className="hsec">
          <div className="sec2-h"><span className="eyebrow">Hareket gelişimi</span>{pts.length ? <span className="mono big-e1">{nf(Math.round(pts[pts.length - 1].v * 2) / 2)} kg</span> : null}</div>
          {exs.length ? (
            <React.Fragment>
              <div className="chips-scroll">{exs.map((e) => <button key={e.key} type="button" className={'fchip' + (cur && cur.key === e.key ? ' on' : '')} onClick={() => setSel(e.key)}>{e.name}</button>)}</div>
              {pts.length ? <E1Chart pts={pts} goal={gLine} /> : null}
              <p className="chart-note">Tahmini 1RM · yalnızca tükenişe yakın (RIR ≤ 4) setlerden.</p>
            </React.Fragment>
          ) : <p className="muted-p">Tükenişe yakın setler kaydettikçe her hareketin 1RM eğrisi burada oluşur.</p>}
        </section>

        <section className="hsec">
          <div className="sec2-h"><span className="eyebrow">Kayıtlar</span><span className="mono">{list.length}</span></div>
          {list.length ? (
            <ul className="hlist">
              {list.map((s) => {
                const ss = sessionStats(s);
                const d = new Date(s.startedAt);
                const f = fOf(s);
                const nn = sessionNotes(s);
                return (
                  <li key={s.id}>
                    <button type="button" className="hrow" onClick={() => openSheet('summary', { id: s.id })}>
                      <span className="hrow-d"><b className="mono">{d.getDate()}</b><small>{MONTHS[d.getMonth()]}</small></span>
                      <span className="hrow-t">
                        <strong>{s.dayName}</strong>
                        <small className="mono">{WD_SHORT[d.getDay()]} {hm(s.startedAt)}–{hm(s.endedAt || s.startedAt)} · {durTxt(ss.dur)}</small>
                        <small className="mono">{ss.sets.length} set · {tonTxt(ss.tonnage)}{nn ? ' · ✎ ' + nn : ''}</small>
                      </span>
                      {f != null ? <span className="hrow-f mono" style={{ color: zoneOf(f).c, borderColor: zoneOf(f).c }}>{Math.round(f)}</span> : <span />}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : <p className="muted-p">Bu dönemde bitirilmiş antrenman yok.</p>}
        </section>
      </div>
    </div>
  );
}

/* ================= LAB ================= */
const LAB_BASICS = [
  { id: 'measure', t: 'Yorgunluk nasıl ölçülür?', d: 'Bar hızı → kalan tekrar → yorgunluk skoru', sheet: ['measure', {}] },
  { id: 'signal', t: 'Beyinden kasa sinyal', d: 'Hareket komutu kasa nasıl ulaşır', sheet: ['lesson', { stage: 0 }] },
  { id: 'recruit', t: 'Motor ünite kazanımı', d: 'Yük arttıkça hangi lifler devreye girer', sheet: ['lesson', { stage: 1 }] },
  { id: 'rate', t: 'Ateşleme hızı', d: 'Sinyal sıklığı kuvveti nasıl artırır', sheet: ['lesson', { stage: 2 }] },
  { id: 'fatigue', t: 'Merkezi ve periferik yorgunluk', d: 'Set içinde ve sonrasında ne yorulur', sheet: ['lesson', { stage: 3 }] },
  { id: 'meter', t: 'Toparlanma ve yorgunluk ölçer', d: 'Yük, RPE, hacim ve uykuyu kendin dene', sheet: ['fatigue', {}] },
];
function LabScreen({ openSheet }) {
  const f = useExFilter(EX_LIB);
  const [part, setPart] = useState('temel');
  return (
    <div className="screen">
      <ScreenHead title="Lab" sub="Antrenmanın arkasındaki bilim" />
      <div className="segmented seg3 labseg" role="tablist" aria-label="Lab bölümleri">
        <button type="button" role="tab" id="lab-part-temel" aria-selected={part === 'temel'} className={part === 'temel' ? 'on' : ''} onClick={() => setPart('temel')}><b className="mono">01</b> Temeller</button>
        <button type="button" role="tab" id="lab-part-hareket" aria-selected={part === 'hareket'} className={part === 'hareket' ? 'on' : ''} onClick={() => setPart('hareket')}><b className="mono">02</b> Hareketler <small className="mono">{EX_LIB.length}</small></button>
      </div>
      <div className="scr">
        {part === 'temel' ? <section className="labsec">
          <ol className="lablist">
            {LAB_BASICS.map((x, i) => (
              <li key={x.id}>
                <button type="button" id={'lab-' + x.id} className="labrow" onClick={() => openSheet(x.sheet[0], x.sheet[1])}>
                  <span className="labrow-i mono">{i + 1}</span>
                  <span className="labrow-t"><strong>{x.t}</strong><small>{x.d}</small></span>
                  <Icon name="right" size={14} />
                </button>
              </li>
            ))}
          </ol>
        </section> : <section className="labsec">
          <ExFilterBar f={f} idp="lab" />
          <span className="exf-count mono">{f.list.length} hareket</span>
          <ul className="lablist ex">
            {f.list.slice(0, f.lim).map((e) => (
              <li key={e.id}>
                <button type="button" id={'labex-' + e.id} className="labrow" onClick={() => openSheet('exercise', { exId: e.id })}>
                  {exDot(e)}
                  <span className="labrow-t"><strong>{e.name}</strong><small>{exLine(e)}</small></span>
                  {e.bio ? <span className="badge bio">tork</span> : e.kind === 'olimpik' ? <span className="badge kind">olimpik</span> : null}
                  <Icon name="right" size={14} />
                </button>
              </li>
            ))}
          </ul>
          {f.list.length > f.lim ? <button type="button" id="lab-more" className="btn ghost full" onClick={f.more}>Daha fazla göster ({f.list.length - f.lim})</button> : null}
        </section>}
      </div>
    </div>
  );
}
function MeasureBody({ openSheet }) {
  return (
    <div className="measure">
      <p className="ms-lede">Yorgunluk iki parçadan oluşur: <b>antrenmanların</b> bıraktığı ve zamanla azalan yük, bir de <b>uyku açığın</b>. İkisi ayrı hesaplanır, sonra toplanır.</p>
      <section className="ms-step">
        <span className="ms-n mono">1</span>
        <div className="ms-b">
          <h4>Son tekrarın hızı → kalan tekrar</h4>
          <p>Her setten sonra son tekrarın ilkine göre ne kadar yavaşladığını seçersin. Bu seçim doğrudan kaç tekrar daha çıkarabileceğine çevrilir; yükten bağımsızdır.</p>
          <div className="ms-table">
            <div className="ms-row sh"><span>Seçim</span><span>Anlamı</span><span>Kalan</span><span>RPE</span></div>
            {SPEED.map((sp, i) => (
              <div key={i} className="ms-row">
                <span className="s-sp" style={{ '--c': vlColor(sp.vl) }}><i />{SPEED_SHORT[i]}</span>
                <span className="ms-d">{sp.d.split(' · ')[0]}</span>
                <span className="mono">{rirTxt(sp.rir)}</span>
                <span className="mono">{rpeLabel(clamp(10 - sp.rir, 6, 10), sp.rir)}</span>
              </div>
            ))}
          </div>
          <p className="ms-note">Aynı yüzde hız kaybı hafif yükte tükenişten uzak, ağır yükte yakın demektir. Bu yüzden yüzde değil, “kaç tekrar daha çıkardı” hissi kullanılır.</p>
        </div>
      </section>
      <section className="ms-step">
        <span className="ms-n mono">2</span>
        <div className="ms-b">
          <h4>Zor setler ağırlıklandırılır</h4>
          <p>4 veya daha az tekrar kala biten set <b>zor set</b> sayılır. Tükenişe yaklaştıkça ve hareket ağırlaştıkça yükü artar.</p>
          <div className="ms-grid mono">
            <span>Tükeniş <b>1,6×</b></span><span>1 kala <b>1,3×</b></span><span>2 kala <b>1,1×</b></span><span>3 kala <b>1×</b></span><span>4 kala <b>0,8×</b></span>
            <span>Bench, squat, RDL <b>1,5×</b></span><span>Dumbbell press, barfiks <b>1×</b></span><span>İzolasyon <b>0,6×</b></span>
          </div>
        </div>
      </section>
      <section className="ms-step">
        <span className="ms-n mono">3</span>
        <div className="ms-b">
          <h4>Zamanla azalır</h4>
          <p>Her setin etkisi saat saat düşer: 24 sa sonra %51’i, 48 sa sonra %26’sı, 72 sa sonra %14’ü kalır. Tükenişe giden antrenmanlar 24–48 sa daha geç toparlanır.</p>
        </div>
      </section>
      <section className="ms-step">
        <span className="ms-n mono">4</span>
        <div className="ms-b">
          <h4>Uyku ayrı eklenir</h4>
          <p>Dün gece 7,5 saatin altı en çok +20, son 3 gecenin ortalaması 7 saatin altı en çok +10. Tek gece kısa uyku maksimal kuvveti ortalama ~%3, çok tekrarlı setleri ~%10 düşürür; birkaç gece üst üste daha fazla.</p>
          <div className="ms-zones"><span className="ok">0–39 yönetilebilir</span><span className="warn">40–69 birikiyor</span><span className="bad">70+ yüksek</span></div>
        </div>
      </section>
      <p className="ms-cav">Bu bir tahmindir; ağırlıklar aşağıdaki çalışmalardan türetildi, doğrulanmış bir ölçek değil. Hız ölçer kullanmadığın için hız senin hissin; hep aynı ölçütle seçersen eğilim güvenilir olur. Kaynaklar: Zourdos ve ark. 2016 (RIR ile bar hızı), Rodríguez-Rosell ve ark. 2020 (hız kaybı ve kalan tekrar), Morán-Navarro ve ark. 2017 (tükeniş ve toparlanma), Craven ve ark. 2022 (uyku ve performans).</p>
      <button type="button" id="ms-meter" className="btn primary full" onClick={() => openSheet('fatigue', {})}>Yorgunluk ölçeri aç</button>
    </div>
  );
}

/* ================= HESAP ================= */
/* ================= KABUK ================= */
const SHEET_TITLES = { account: 'Hesap ve yedek', consent: 'Verilerin nasıl kullanılır', privacy: 'Gizlilik', fatigue: 'Yorgunluk ölçer', lesson: 'Sinir sistemi', exercise: 'Hareket', picker: 'Hareket ekle', item: 'Hareketi düzenle', note: 'Not', exlist: 'Hareketler', summary: 'Antrenman özeti', saveTemplate: 'Antrenman türü olarak kaydet', plan: 'Program analizi', goal: 'Hedef', measure: 'Yorgunluk nasıl ölçülür?', wtype: 'Antrenman türü', setdetail: 'Set' };

function App() {
  const store = useLogStore();
  const [st, apiRef] = store;
  const acct = st.account;
  const actions = apiRef.current;
  const [tab, setTab] = useState(() => { try { const h = (location.hash || '').slice(1); return TABS2.some((t) => t.id === h) ? h : 'bugun'; } catch (e) { return 'bugun'; } });
  const [sheets, setSheets] = useState([]);
  const [prog, setProg] = useState({ name: 'list' });
  const [antView, setAntView] = useState('start');
  const previousAccount = useRef(acct.mode + ':' + acct.uid);
  const put = (kind, obj) => (apiRef.current ? apiRef.current.put(kind, obj) : null);
  const del = (kind, id) => (apiRef.current ? apiRef.current.del(kind, id) : null);
  const addCustom = (name, muscle) => { const doc = { id: newId('x'), name, muscle: muscle || 'Diğer', createdAt: Date.now(), pending: true }; put('custom', doc); return doc; };
  const openSheet = (type, props) => setSheets((a) => [...a, { key: newId('sh'), type, props: props || {} }]);
  const closeTop = () => setSheets((a) => a.slice(0, -1));
  const closeAll = () => setSheets([]);
  const active = st.sessions.find((s) => s.status === 'active');

  useEffect(() => { try { history.replaceState(null, '', '#' + tab); } catch (e) {} }, [tab]);
  useEffect(() => {
    const identity = acct.mode + ':' + acct.uid;
    if (previousAccount.current === identity) return;
    previousAccount.current = identity;
    setSheets([]); setProg({ name: 'list' }); setAntView('start'); setTab('bugun');
  }, [acct.mode, acct.uid]);
  useEffect(() => { if (acct.needsConsent) setSheets(a => a.some(s => s.type === 'consent') ? a : [...a, { key: newId('sh'), type: 'consent', props: {} }]); else setSheets(a => a.filter(s => s.type !== 'consent')); }, [acct.needsConsent]);

  const startSession = (program, day) => {
    closeAll();
    setAntView('start');
    if (active) { setTab('antrenman'); return; }
    const s = sessionFromDay(program, day);
    if (!day) s.dayName = 'Boş antrenman';
    put('sessions', s);
    setTab('antrenman');
  };
  // Boş program ve yeni tür yalnızca ilk düzenlemede kaydedilir; dokunmadan çıkılırsa iz bırakmaz.
  const createProgram = (_t, back) => {
    const p = blankProgram();
    p.days[0].name = 'Yeni tür';
    setProg({ name: 'edit', id: p.id, draft: p, back });
    setTab('programlar');
  };
  const newWorkoutType = () => {
    const p0 = st.programs[0];
    if (!p0) { createProgram(null, 'antrenman'); return; }
    const np = clone(p0);
    const d = { id: newId('d'), name: 'Yeni tür', weekday: null, items: [] };
    np.days.push(d);
    setProg({ name: 'edit', id: np.id, draft: np, day: d.id, back: 'antrenman' });
    setTab('programlar');
  };
  const editDay = (p, d) => { closeAll(); setProg({ name: 'edit', id: p.id, day: d.id, back: tab }); setTab('programlar'); };
  const pick = (id) => {
    if (id === 'programlar' && tab === 'programlar') setProg({ name: 'list' });
    if (id === 'antrenman' && tab === 'antrenman') setAntView('start');
    if (id === 'programlar' && prog.back) setProg({ name: 'list' });
    setTab(id);
  };

  const renderSheet = (sh) => {
    const p = sh.props;
    const close = closeTop;
    switch (sh.type) {
      case 'account': return <AccountBody st={st} acct={acct} actions={actions} openSheet={openSheet} onClose={close} />;
      case 'consent': return <ConsentBody onAccept={actions.acceptConsent} onClose={actions.rejectConsent} busy={acct.busy} />;
      case 'privacy': return <PrivacyBody />;
      case 'fatigue': { const init = p.sim || simFromLogs(st); return <FatigueBody st={st} init={init} source={p.source || init.src} showNow={!p.sim} openSheet={openSheet} />; }
      case 'lesson': return <LessonBody stage={p.stage} />;
      case 'measure': return <MeasureBody openSheet={openSheet} />;
      case 'exercise': return <ExerciseBody exId={p.exId} name={p.name} st={st} />;
      case 'picker': return <PickerBody custom={st.custom} addCustom={addCustom} onPick={p.onPick} onClose={close} low={p.low} openSheet={openSheet} />;
      case 'item': return <ItemSheetBody {...p} onClose={close} openSheet={openSheet} />;
      case 'note': return <NoteSheetBody init={p.init} onSave={p.onSave} onClose={close} />;
      case 'exlist': return <ExListBody {...p} onClose={close} openSheet={openSheet} />;
      case 'setdetail': return <SetDetailBody set={p.set} idx={p.idx} exId={p.exId} onDelete={p.onDelete} onClose={close} />;
      case 'wtype': return <WtypeMenuBody st={st} pid={p.pid} did={p.did} put={put} del={del} onStart={startSession} onEdit={editDay} onClose={close} />;
      case 'summary': { const s = p.draft || st.sessions.find((x) => x.id === p.id); return s ? <SummaryBody session={s} st={st} openSheet={openSheet} onDelete={(id) => del('sessions', id)} onClose={close} /> : <p className="muted-p">Kayıt bulunamadı.</p>; }
      case 'saveTemplate': return <SaveTemplateBody session={p.session} st={st} put={put} onClose={close} onSaved={(pr, d) => { closeAll(); setProg({ name: 'edit', id: pr.id, draft: pr, day: d.id, back: 'antrenman' }); setTab('programlar'); }} />;
      case 'plan': return <PlanBody getProgram={p.getProgram} st={st} openSheet={openSheet} />;
      case 'goal': return <GoalBody st={st} put={put} del={del} onClose={close} />;
      default: return null;
    }
  };
  const sheetTitle = (sh) => {
    const p = sh.props;
    if (sh.type === 'exercise') return (exMeta(p.exId, p.name) || { name: p.name || 'Hareket' }).name;
    if (sh.type === 'note' || sh.type === 'item' || sh.type === 'setdetail') return p.title || (p.it && p.it.name) || SHEET_TITLES[sh.type];
    if (sh.type === 'wtype') { const pr = st.programs.find((x) => x.id === p.pid); const d = pr && pr.days.find((x) => x.id === p.did); return d ? d.name || 'Adsız' : SHEET_TITLES.wtype; }
    return SHEET_TITLES[sh.type];
  };
  const sheetSize = (sh) => (['lesson', 'exercise', 'fatigue', 'summary', 'picker', 'measure'].includes(sh.type) ? 'full' : '');

  let screen = null;
  if (tab === 'bugun') screen = <TodayScreen st={st} put={put} openSheet={openSheet} startSession={startSession} createProgram={createProgram} goTab={setTab} acct={acct} />;
  if (tab === 'antrenman') {
    screen = active
      ? <SessionView2 key={active.id} session={active} st={st} put={put} del={del} openSheet={openSheet} onFinished={(ns) => openSheet('summary', { id: ns.id, draft: ns })} onDiscarded={() => setAntView('start')} />
      : antView === 'history'
        ? <HistoryView st={st} openSheet={openSheet} onBack={() => setAntView('start')} />
        : <StartView st={st} startSession={startSession} newWorkoutType={newWorkoutType} openSheet={openSheet} onHistory={() => setAntView('history')} editDay={editDay} />;
  }
  if (tab === 'programlar') {
    // Taslak yalnızca kayıtlı sürümden yeniyse kullanılır; sekme değişip dönünce eski taslak kaydı ezmesin.
    const stored = prog.name === 'edit' ? st.programs.find((x) => x.id === prog.id) : null;
    const p = prog.name !== 'edit' ? null : stored && (!prog.draft || (stored.updatedAt || 0) > (prog.draft.updatedAt || 0)) ? stored : (prog.draft || stored);
    const back = () => { const b2 = prog.back; setProg({ name: 'list' }); if (b2 && b2 !== 'programlar') setTab(b2); };
    screen = p
      ? <ProgramEditor2 key={p.id} program={p} startDay={prog.day} st={st} put={put} del={del} onBack={back} openSheet={openSheet} startSession={startSession} />
      : <ProgramsList st={st} open={(pr) => setProg({ name: 'edit', id: pr.id })} createProgram={() => createProgram()} />;
  }
  if (tab === 'lab') screen = <LabScreen openSheet={openSheet} />;

  return (
    <BackupContext.Provider value={{ readBackup: actions.readBackup, restoreBackup: actions.restoreBackup, cloud: acct.mode === 'user' }}>
    <div className="device-wrap">
      <div className="device">
        <div className="app-shell app2">
          <main className="app2-main" inert={acct.migrating || acct.busy}>{screen}</main>
          {st.error ? <div className="store-message" role="alert">{st.error}</div> : null}
          {acct.migrating ? <div className="store-message" role="status">Kayıtlar hesabına taşınıyor…</div> : null}
          <nav className="tabbar tb4" aria-label="Ana gezinme" inert={acct.migrating || acct.busy}>
            {TABS2.map((t) => (
              <button key={t.id} id={'tab-' + t.id} type="button" className={'tab' + (t.id === tab ? ' on' : '')} aria-label={t.label} aria-current={t.id === tab ? 'page' : undefined} onClick={() => pick(t.id)}>
                <span className="tab-ic"><Icon name={t.icon} size={20} />{t.id === 'antrenman' && active ? <i className="tab-live" /> : null}</span>
                <span className="tab-l">{t.label}</span>
              </button>
            ))}
          </nav>
          {sheets.map((sh, i) => (
            <SheetFrame key={sh.key} title={sheetTitle(sh)} onClose={sh.type === 'consent' ? actions.rejectConsent : closeTop} size={sheetSize(sh)} z={40 + i * 2}>
              {renderSheet(sh)}
            </SheetFrame>
          ))}
        </div>
      </div>
    </div>
    </BackupContext.Provider>
  );
}

export default App;
