// @ts-nocheck
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BackupContext } from '../lib/store/BackupContext';
import { AccountChip, AccountBody, ConsentBody, PrivacyBody } from '../features/hesap/Account';
import { BiomechTab, Tile } from '../features/lab/Biomekanik';
import { CompactCtx, Icon, NeedleGauge, Range, STAGES, StageFatigue, StageRate, StageRecruit, StageSignal, Switch, clamp } from '../features/lab/Cns';
import {
  BENCH_IDS, EX_LIB, FAT, EQ, PLYO_INT, isPlyo, isSkill, PLYO_W, PLYO_Q, SKILL_W, SKILL_Q, skillSetTxt, libById, MONTHS, MUSCLES, PROF, SPEED,
  WD_LONG, WD_SHORT, WEEK_ORDER, ItemEditor, Lane, SetReplay, Stepper, animVl,
  bestE1, clone, dateTxt, durTxt, e1Ok, e1rm, entryFor,
  firstOpen, hasNum, itemFromEx, mmss, newId, nextPlanned, nf, normTr,
  repTxt, repVelocities, restTxt, rirFromSpeed, rirTxt, rpeLabel,
  rpeTxt, sameDay, sessionFromDay, sessionStats, targetTxt, vlColor,
} from '../features/antrenman/core';
import {
  allPlans, dateKey, parseDateKey, plansOn, newPlanDoc, upsertPlan, removePlan,
  addOnce, addWeekly, removeOn, weekProgram, normalizeDay, weekdaysOf,
} from '../features/plan/plans';
import {
  SKILL_STAGES, readGoals, upsertGoal, removeGoal, advanceSkillStage, matchesSkillGoal, skillStats,
} from '../features/bugun/goals';
import { useLogStore } from '../lib/store/useLogStore';
import { freeEntry, isFree, sessionName } from '../lib/models/session';
import { changeRest, restDuration } from '../lib/models/rest';
import { startRest, stopRest } from '../lib/native/restTimer';
import { useAndroidBack, useBack } from './back';
import { FreePixelSession } from '../features/antrenman/FreePixelSession';
import { PixelSummaryScreen } from '../features/antrenman/PixelSummaryScreen';
import { planStats, logStats, proxW, costW, loadScore, hoursToFresh, decayK, setLoads, sleepInfo, sleepPts, fatigueAt, steadyWeek, simFromLogs, simFromPlan, simulatePlan, fatigueRecs, e1Series, prevPerf, sessionFatigue, periodMetrics, historyWarnings } from '../lib/models/fatigue';
import '../styles/cns.css';
import '../styles/app.css';
import '../styles/log.css';
import '../styles/mobile.css';
import '../styles/v7.css';
import '../styles/pixel.css';
import '../styles/px-theme.css';
import { PxIcon } from './PxIcon';

/* ================= PERFORMANCE · son kullanıcı uygulaması ================= */
const TABS2 = [
  { id: 'bugun', label: 'Dashboard', icon: 'home' },
  { id: 'antrenman', label: 'Antrenman', icon: 'bolt' },
  { id: 'gozlem', label: 'Gözlem', icon: 'calendar' },
  { id: 'lab', label: 'Lab', icon: 'flask' },
];
const MONTHS_LONG = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
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
const fullDate = (ts) => { const d = new Date(ts); return WD_LONG[d.getDay()] + ', ' + d.getDate() + ' ' + MONTHS_LONG[d.getMonth()]; };
const exMeta = (exId, name) => EX_LIB.find((e) => e.id === exId) || EX_LIB.find((e) => e.name === name) || null;
const dayMinutes = (day) => Math.round(day.items.reduce((a, i) => a + Number(i.sets || 0) * ((i.rest || 120) + 45), 0) / 60);
const hm = (ts) => { const d = new Date(ts); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
const zoneOf = (score) => (score < 40 ? { k: 'Yönetilebilir', c: 'var(--ok)', cls: 'ok' } : score < 70 ? { k: 'Birikiyor', c: 'var(--warn)', cls: 'warn' } : { k: 'Yüksek', c: 'var(--bad)', cls: 'bad' });
const tonTxt = (kg) => (kg >= 10000 ? nf(Math.round(kg / 100) / 10) + ' t' : nf(Math.round(kg)) + ' kg');
const sessionNotes = (s) => s.items.reduce((a, it) => a + (it.memo ? 1 : 0) + it.sets.filter((x) => x.note || (x.tags && x.tags.length)).length, 0);
const sessionSubTxt = (ss) => {
  if (ss.tonnage > 0) return tonTxt(ss.tonnage);
  if (ss.attempts > 0) return ss.attempts + ' deneme';
  if (ss.contacts > 0) return ss.contacts + ' temas';
  return tonTxt(0);
};
const isSkillHeavySession = (s) => {
  const sets = (s.items || []).flatMap((it) => it.sets || []);
  if (!sets.length) return false;
  const sk = sets.filter((x) => x.skill).length;
  return sk > sets.length / 2;
};

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
function SheetFrame({ title, onClose, children, size, z, head, top }) {
  useBack(top, onClose);
  return (
    <div className="sheet-wrap pxt" style={{ zIndex: z }} role="dialog" aria-modal="true" aria-label={title}>
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
function Ring({ score, zone, size = 76, label, pixel = false }) {
  if (pixel) {
    // V14 · pixel halka: 24 kare segment, dolanlar bölge renginde
    const N = 24, lit = Math.round(Math.min(1, Math.max(0, score / 100)) * N);
    const half = size / 2, seg = Math.max(6, Math.round(size / 11)), r = half - seg / 2 - 2;
    return (
      <span className="px-ring" role="img" aria-label={label} style={{ width: size, height: size }}>
        {Array.from({ length: N }, (_, i) => {
          const a = ((-90 + (i * 360) / N) * Math.PI) / 180;
          return <i key={i} style={{ left: Math.round(half + r * Math.cos(a) - seg / 2), top: Math.round(half + r * Math.sin(a) - seg / 2), width: seg, height: seg, background: i < lit ? zone.c : undefined }} />;
        })}
        <b className="px-ring-n" style={{ color: zone.c, fontSize: size >= 96 ? 24 : 16 }}>{Math.round(score)}</b>
      </span>
    );
  }
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
  if (e.kind === 'beceri') return <span className="sdot" title="Beceri" />;
  return e.kind === 'plyo' ? <span className={'pdot i' + (e.int || 2)} title={'Yoğunluk: ' + PLYO_INT[e.int || 2]} /> : e.fat ? <span className={'fatdot f' + e.fat} title={'Yorgunluk: ' + FAT[e.fat]} /> : null;
}
function exLine(e) {
  if (!e.eq) return e.muscle;
  if (e.kind === 'beceri') return e.muscle + ' · ' + EQ[e.eq] + ' · beceri' + (e.h ? ' · süre' : '');
  return e.muscle + ' · ' + EQ[e.eq] + ' · ' + (e.kind === 'plyo' ? 'yoğunluk ' + PLYO_INT[e.int || 2].split(' ')[0].toLocaleLowerCase('tr') : PROF[e.prof].k);
}
function FactChips({ ex }) {
  if (!ex) return null;
  return (
    <div className="facts">
      <span className="fact"><b>{ex.muscle}</b>{ex.sec && ex.sec.length ? ' + ' + ex.sec.join(', ') : ''}</span>
      {ex.eq ? <span className="fact">{EQ[ex.eq]}</span> : null}
      {ex.kind && ex.kind !== 'kuvvet' ? <span className={'fact ' + (ex.kind === 'beceri' ? 'skill' : 'kind')}>{ex.kind === 'plyo' ? 'Pliometrik' : ex.kind === 'beceri' ? 'Beceri' : 'Olimpik'}</span> : null}
      {ex.kind === 'beceri' && ex.h ? <span className="fact skill">Süreyle tutulur</span> : null}
      {ex.kind === 'plyo'
        ? <span className={'fact fat' + Math.min(3, ex.int || 2)}>Yoğunluk: {PLYO_INT[ex.int || 2]}</span>
        : <span className={'fact fat' + ex.fat}>Yorgunluk: {FAT[ex.fat]}</span>}
      {ex.kind !== 'plyo' && ex.kind !== 'beceri' && ex.prof ? <span className="fact prof" title={PROF[ex.prof].d}>{PROF[ex.prof].k}</span> : null}
    </div>
  );
}
const EX_KINDS = [['all', 'Tümü'], ['kuvvet', 'Kuvvet'], ['olimpik', 'Olimpik'], ['plyo', 'Pliometrik'], ['beceri', 'Beceri']];
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
      <div className="segmented seg5-scroll" role="tablist" aria-label="Hareket türü">
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

/* ================= DASHBOARD (eski BUGÜN) ================= */
function WeekRow({ programs, sessions }) {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7));
  const done = sessions.filter((s) => s.status === 'done' && !s.ready);
  const cells = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const key = dateKey(d);
    const n = done.filter((s) => sameDay(s.startedAt, d)).length;
    const plan = plansOn(key, programs).length > 0;
    return { d, wd: d.getDay(), n, plan, today: sameDay(d, today), past: d < new Date(today.getFullYear(), today.getMonth(), today.getDate()) };
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
function formatDue(due) {
  if (!due) return '';
  const d = parseDateKey(due);
  if (Number.isNaN(d.getTime())) return '';
  return d.getDate() + ' ' + MONTHS[d.getMonth()] + "'ya kadar";
}
function TodayScreen({ st, put, openSheet, startSession, newPlan, practiceSkill, goTab, acct }) {
  const fz = fatigueAt(st, Date.now());
  const sl = fz.sleep;
  const active = st.sessions.find((s) => s.status === 'active');
  const plans = allPlans(st.programs);
  const next = nextPlanned(st.programs, st.sessions);
  const goals = readGoals(st.settings);
  const setSleep = (h) => put('checkins', { id: dayKey(Date.now()), sleep: h, at: Date.now() });
  const loading = st.status === 'loading' || !st.loaded.programs || !st.loaded.sessions;
  const short = sl.known && sl.last < 6.5;
  let perfCount = 0;

  return (
    <div className="screen pxt">
      <ScreenHead title="Dashboard" sub={fullDate(Date.now())} right={<AccountChip acct={acct} onClick={() => openSheet('account', {})} />} />
      <div className="scr fit">
        {acct.mode === 'guest' && st.sessions.length ? (
          <button type="button" id="guest-banner" className="guest-banner" onClick={() => openSheet('account', {})}>
            <PxIcon name="cloud" size={18} />
            <span>Kayıtlar yalnızca bu telefonda · <b>Yedekle</b></span>
            <PxIcon name="right" size={14} />
          </button>
        ) : null}
        <section className="ready">
          <button type="button" id="ready-ring" className="ready-ring" onClick={() => openSheet('fatigue', {})} aria-label="Yorgunluk ayrıntısı">
            <Ring pixel size={104} score={fz.score} zone={fz.zone} label={'Yorgunluk ' + Math.round(fz.score)} />
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
            <div className="hc-top"><span className="live-dot" /><span className="eyebrow fire">{active.ready ? 'Hazır' : 'Antrenman sürüyor'}</span><span className="hc-when mono">{active.ready ? 'başlamadı' : active.items.reduce((a, it) => a + it.sets.length, 0) + ' set'}</span></div>
            <h3>{sessionName(active)}</h3>
            <button type="button" id="resume-btn" className="btn fire full" onClick={() => goTab('antrenman')}>Devam et <PxIcon name="right" size={16} /></button>
          </section>
        ) : next && next.off === 0 ? (
          <section className="hero-card">
            <div className="hc-top"><span className="eyebrow">Bugün</span><span className="hc-when mono">~{dayMinutes(next.day)} dk</span></div>
            <h3>{next.day.name}</h3>
            <p className="hc-sub">{next.day.items.slice(0, 3).map((i) => i.name).join(' · ')}{next.day.items.length > 3 ? ' +' + (next.day.items.length - 3) : ''}</p>
            <button type="button" id="start-next" className="btn primary full" onClick={() => startSession(next.program, next.day)}><PxIcon name="play" size={16} /> Başlat</button>
          </section>
        ) : plans.length > 0 ? (
          <section className="hero-card">
            <h3>Bugün planlı antrenman yok</h3>
            <p className="hc-sub">{next ? 'Sıradaki: ' + next.day.name + ' · ' + WD_LONG[next.weekday] : 'Takvimden istediğin güne plan ekleyebilirsin.'}</p>
            <div className="hc-actions">
              <button type="button" className="btn primary" onClick={() => startSession(null, null)}>Plansız antrenman</button>
              <button type="button" className="btn ghost" onClick={() => goTab('gozlem')}>Takvim</button>
            </div>
          </section>
        ) : (
          <section className="hero-card">
            <h3>Planın yok</h3>
            <p className="hc-sub">Plansız başla ya da ilk planını oluştur.</p>
            <div className="hc-actions">
              <button type="button" className="btn primary" onClick={() => startSession(null, null)}>Plansız antrenman</button>
              <button type="button" className="btn ghost" onClick={() => newPlan('bugun')}>Plan oluştur</button>
            </div>
          </section>
        )}

        <section className="tcard">
          <div className="tcard-h"><span className="eyebrow">Bu hafta</span><span className="mono tcard-k">{st.sessions.filter((s) => s.status === 'done' && !s.ready && Date.now() - s.startedAt < 7 * DAY_MS).length} antrenman</span></div>
          <WeekRow programs={st.programs} sessions={st.sessions} />
        </section>

        <section className="goals-sec">
          <div className="sec2-h"><span className="eyebrow">Hedefler</span>{goals.length ? <span className="mono">{goals.length}</span> : null}</div>
          {goals.map((goal) => {
            if (goal.type === 'perf') {
              const isFirstPerf = perfCount === 0;
              perfCount += 1;
              const gEx = exMeta(goal.exId, goal.name);
              const series = e1Series(st.sessions, goal.exId, gEx ? gEx.name : goal.name);
              const cur = series.length ? series[series.length - 1].v : goal.base;
              return (
                <button key={goal.id} type="button" id={isFirstPerf ? 'goal-card' : undefined} data-goal={goal.id} className="tcard goal2 goal-card" onClick={() => openSheet('goal', { id: goal.id })}>
                  <div className="goal2-l">
                    <span className="eyebrow fire">Hedef</span>
                    <span className="goal2-n">{gEx?.name || goal.name || goal.exId}</span>
                    <span className="goal2-v mono"><b>{nf(Math.round(cur * 2) / 2)}</b> → {nf(goal.target)} kg</span>
                  </div>
                  <div className="goal2-r">
                    {series.length > 1 ? <Spark pts={series.slice(-10)} goal={goal.target} /> : <span className="goal2-hint">Kayıtlar arttıkça eğri oluşur</span>}
                    <div className="goal-bar"><span style={{ width: clamp((cur - goal.base * 0.9) / (goal.target - goal.base * 0.9)) * 100 + '%' }} /></div>
                  </div>
                </button>
              );
            }
            const stats = skillStats(goal, st.sessions);
            const daysAgo = stats.last != null ? Math.max(0, Math.floor((Date.now() - stats.last) / DAY_MS)) : null;
            const statTxt = stats.n
              ? stats.n + ' pratik · son ' + (daysAgo === 0 ? 'bugün' : daysAgo + ' gün önce')
              : 'Henüz pratik yok';
            const dueTxt = formatDue(goal.due);
            const done = goal.stage === 3;
            return (
              <div
                key={goal.id}
                role="button"
                tabIndex={0}
                data-goal={goal.id}
                className={'skill-card' + (done ? ' done' : '')}
                onClick={() => openSheet('goal', { id: goal.id })}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSheet('goal', { id: goal.id }); } }}
              >
                <div className="skill-top">
                  <span className="eyebrow skill">{done ? 'Öğrenildi ✓' : 'Öğrenme'}</span>
                  <span className="mono" style={{ color: 'var(--muted)' }}>⋯</span>
                </div>
                <div className="skill-name">{goal.name}</div>
                <div className="skill-stage-row">
                  <div className="skill-bars" aria-hidden="true">
                    {[0, 1, 2, 3].map((i) => <i key={i} className={i <= goal.stage ? 'on' : ''} />)}
                  </div>
                  <span>{done ? 'Öğrenildi ✓' : SKILL_STAGES[goal.stage]}</span>
                </div>
                <div className="skill-foot">
                  <span className="skill-meta">{statTxt}{dueTxt ? ' · ' + dueTxt : ''}</span>
                  <button
                    type="button"
                    className="btn ghost sm skill-go"
                    onClick={(e) => { e.stopPropagation(); practiceSkill(goal); }}
                  >
                    Pratik et
                  </button>
                </div>
              </div>
            );
          })}
          {goals.length === 0 ? (
            <button type="button" id="goal-add" className="tcard goal-add" onClick={() => openSheet('goal', {})}>
              <span className="goal2-l">
                <span className="eyebrow fire">Hedef</span>
                <span className="goal2-n">Hedef ekle</span>
                <span className="goal-add-hint">Güç (1RM) ya da yeni bir beceri hedefi belirle.</span>
              </span>
              <span className="goal-add-plus"><PxIcon name="plus" size={18} /></span>
            </button>
          ) : (
            <button type="button" id="goal-add" className="goal-add-sm" onClick={() => openSheet('goal', {})}>+ Hedef ekle</button>
          )}
        </section>
      </div>
    </div>
  );
}

/* ================= ANTRENMAN ================= */
function StartView({ st, startSession, newPlan, openSheet }) {
  const [histLim, setHistLim] = useState(30);
  const plans = allPlans(st.programs);
  const done = useMemo(() => st.sessions.filter((s) => s.status === 'done').sort((a, b) => b.startedAt - a.startedAt), [st.sessions]);
  const last = done[0];
  const visibleDone = done.slice(0, histLim);

  // Ay başlıklarıyla grupla
  const groups = [];
  visibleDone.forEach((s) => {
    const d = new Date(s.startedAt);
    const label = MONTHS_LONG[d.getMonth()].toLocaleUpperCase('tr') + ' ' + d.getFullYear();
    const g = groups[groups.length - 1];
    if (!g || g.label !== label) groups.push({ label, items: [s] });
    else g.items.push(s);
  });

  return (
    <div className="screen pxt">
      <ScreenHead
        title="Antrenman"
        sub={last ? 'Son: ' + dateTxt(last.startedAt) + ' · ' + sessionName(last) : 'Bir antrenman planı seç ya da plansız başla'}
      />
      <div className="scr">
        <div className="start-actions">
          <button type="button" id="free-session" className="btn ghost" onClick={() => startSession(null, null)}><PxIcon name="plus" size={16} /> Plansız antrenman</button>
          <button type="button" id="new-plan" className="btn ghost" onClick={() => newPlan('antrenman')}><PxIcon name="plus" size={16} /> Yeni plan</button>
        </div>

        <section className="plan-sec">
          <div className="sec2-h"><span className="eyebrow">Planlarım</span>{plans.length ? <span className="mono">{plans.length}</span> : null}</div>
          {plans.length ? (
            <ul className="wtypes plan-list">
              {plans.map(({ programId, day: d }) => {
                const wds = WEEK_ORDER.filter((w) => (d.weekdays || []).includes(w)).map((w) => WD_SHORT[w]).join(', ');
                return (
                  <li key={d.id} className="wtype">
                    <button type="button" id={'plan-' + d.id} className="wtype-main" onClick={() => openSheet('wtype', { pid: programId, did: d.id })}>
                      <span className="wtype-t">
                        <span className="wtype-n"><strong>{d.name || 'Adsız'}</strong></span>
                        <small>{d.items.length + ' hareket' + (wds ? ' · ' + wds : '')}</small>
                      </span>
                    </button>
                    <button type="button" className="wtype-more" aria-label={(d.name || 'Plan') + ' seçenekleri'} onClick={() => openSheet('wtype', { pid: programId, did: d.id })}><Icon name="more" size={18} /></button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="plan-empty">Planın yok. Plansız başla ya da bir plan oluştur.</p>
          )}
        </section>

        <section className="hsec hist-inline">
          <div className="sec2-h"><span className="eyebrow">Geçmiş</span><span className="mono">{done.length}</span></div>
          {done.length ? (
            <React.Fragment>
              {groups.map((g) => (
                <div key={g.label} className="hsec">
                  <div className="hist-month">{g.label}</div>
                  <ul className="hlist">
                    {g.items.map((s) => {
                      const ss = sessionStats(s);
                      const d = new Date(s.startedAt);
                      const f = sessionFatigue(s, st).post;
                      const nn = sessionNotes(s);
                      return (
                        <li key={s.id}>
                          <button type="button" className="hrow" onClick={() => openSheet('summary', { id: s.id })}>
                            <span className="hrow-d"><b className="mono">{d.getDate()}</b><small>{MONTHS[d.getMonth()]}</small></span>
                            <span className="hrow-t">
                              <strong>{sessionName(s)}</strong>
                              <small className="mono">{WD_SHORT[d.getDay()]} {hm(s.startedAt)}–{hm(s.endedAt || s.startedAt)} · {durTxt(ss.dur)}</small>
                              <small className="mono">{ss.sets.length} set · {sessionSubTxt(ss)}{nn ? ' · ✎ ' + nn : ''}</small>
                            </span>
                            {f != null ? <span className="hrow-f mono" style={{ color: zoneOf(f).c, borderColor: zoneOf(f).c }}>{Math.round(f)}</span> : <span />}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
              {done.length > histLim ? (
                <button type="button" id="hist-more" className="btn ghost full" onClick={() => setHistLim(histLim + 30)}>Daha fazla göster</button>
              ) : null}
            </React.Fragment>
          ) : (
            <p className="muted-p">Bitirdiğin antrenmanlar burada listelenir.</p>
          )}
        </section>
      </div>
    </div>
  );
}

function WtypeMenuBody({ st, pid, did, put, del, onStart, onEdit, onClose }) {
  const p = st.programs.find((x) => x.id === pid);
  const rawDay = p && p.days.find((x) => x.id === did);
  const d = rawDay ? normalizeDay(rawDay) : null;
  const [name, setName] = useState(d ? d.name : '');
  const [confirm, setConfirm] = useState(false);
  if (!d) return <p className="muted-p">Bu plan artık yok.</p>;
  const saveDay = (fn) => {
    const nextDay = normalizeDay(clone(d));
    fn(nextDay);
    const updatedProg = upsertPlan(st.programs, p.id, nextDay);
    put('programs', updatedProg);
  };
  const rename = () => { const v = name.trim(); if (v && v !== d.name) saveDay((x) => { x.name = v; }); };
  const runs = st.sessions.filter((s) => s.status === 'done' && s.dayId === d.id);
  const total = d.items.reduce((a, i) => a + Number(i.sets || 0), 0);
  const remove = () => {
    const res = removePlan(st.programs, p.id, d.id);
    if (res.del) del('programs', res.del);
    else if (res.put) put('programs', res.put);
    onClose();
  };
  const copyPlan = () => {
    const cp = newPlanDoc((d.name || 'Plan') + ' (kopya)');
    cp.days[0].items = clone(d.items).map((it) => ({ ...it, id: newId('i') }));
    cp.days[0].weekdays = [...(d.weekdays || [])];
    put('programs', cp);
    onClose();
  };
  return (
    <div className="wmenu">
      <input id="wtype-name" className="text-in" aria-label="Plan adı" value={name} onChange={(e) => setName(e.target.value)} onBlur={rename} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
      <p className="wmenu-k mono">{d.items.length} hareket · {total} set · ~{dayMinutes(d)} dk{runs.length ? ' · ' + runs.length + ' kez yapıldı, son ' + dateTxt(runs[0].startedAt) : ''}</p>
      {d.items.length ? (
        <ol className="wmenu-items">
          {d.items.map((it) => <li key={it.id}><span>{it.name}</span><b className="mono">{it.sets} × {repTxt(it.repMin, it.repMax)}</b></li>)}
        </ol>
      ) : <p className="muted-p">Bu planda henüz hareket yok.</p>}
      <span className="st-k">Her hafta</span>
      <div className="wd-pick">
        {WEEK_ORDER.map((w) => {
          const on = (d.weekdays || []).includes(w);
          return (
            <button
              key={w}
              type="button"
              className={'wd-btn' + (on ? ' on' : '')}
              onClick={() => saveDay((x) => {
                const cur = x.weekdays || [];
                x.weekdays = cur.includes(w) ? cur.filter((z) => z !== w) : [...cur, w];
              })}
            >
              {WD_SHORT[w]}
            </button>
          );
        })}
      </div>
      <div className="wmenu-act">
        {d.items.length ? <button type="button" id="wtype-start" className="btn primary" onClick={() => onStart(p, d)}><Icon name="play" size={13} /> Başlat</button> : null}
        <button type="button" id="wtype-edit" className="btn ghost" onClick={() => onEdit(p, d)}><Icon name="edit" size={14} /> Düzenle</button>
        <button type="button" id="wtype-copy" className="btn ghost" onClick={copyPlan}>Kopyala</button>
      </div>
      {confirm ? (
        <div className="pop flat">
          <p>“{d.name || 'Adsız'}” planı silinsin mi? Geçmiş kayıtların kalır.</p>
          <div className="confirm-inline">
            <button type="button" id="wtype-del-yes" className="btn danger sm" onClick={remove}>Sil</button>
            <button type="button" className="btn ghost sm" onClick={() => setConfirm(false)}>Vazgeç</button>
          </div>
        </div>
      ) : <button type="button" id="wtype-del" className="btn ghost danger-t wmenu-del" onClick={() => setConfirm(true)}><Icon name="trash" size={14} /> Planı sil</button>}
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

function SetTable({ item, entry, rpe, onOpen, bodyRef, free }) {
  if (isSkill(item.exId)) return <SkillTable item={item} entry={entry} onOpen={onOpen} bodyRef={bodyRef} free={free} />;
  if (isPlyo(item.exId)) return <PlyoTable item={item} entry={entry} onOpen={onOpen} bodyRef={bodyRef} free={free} />;
  const t = item.target;
  const done = item.sets;
  const extra = done.length >= t.sets;
  const inRange = (r) => free || ((!hasNum(t.repMin) || r >= Number(t.repMin)) && (!hasNum(t.repMax) || r <= Number(t.repMax)));
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
        {free && !done.length ? <div className="srow first-set">İlk setini kaydet</div> : null}
        {!free && !extra ? (
          <div className="srow now" aria-label={'Set ' + (done.length + 1) + ' sırada'}>
            <span className="s-i mono">{done.length + 1}</span>
            <span className="s-v mono">{nf(Number(entry.kg))}</span>
            <span className={'s-v mono' + (inRange(entry.reps) ? '' : ' off')}>{entry.reps}</span>
            <span className="s-v mono">{rpe <= 6 ? '≤6' : rpe}</span>
            <span className="s-sp" style={{ '--c': vlColor(SPEED[entry.lvl].vl) }}><i />{SPEED_SHORT[entry.lvl]}</span>
            <span className="s-t now-t">sırada</span>
          </div>
        ) : null}
        {!free && plan.map((j) => (
          <div key={'p' + j} className="srow plan">
            <span className="s-i mono">{j + 1}</span>
            <span className="s-v mono">{hasNum(t.kg) ? nf(Number(t.kg)) : '–'}</span>
            <span className="s-v mono">{repTxt(t.repMin, t.repMax)}</span>
            <span className="s-v mono">{tRpe}</span>
            <span className="s-sp none">–</span>
            <span className="s-t" />
          </div>
        ))}
        {!free && extra ? <div className="srow fin"><Icon name="check" size={13} /> Hedef tamam · istersen ek set kaydet</div> : null}
      </div>
    </div>
  );
}

function PlyoTable({ item, entry, onOpen, bodyRef, free }) {
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
        {free && !done.length ? <div className="srow first-set">İlk setini kaydet</div> : null}
        {!free && !extra ? (
          <div className="srow now">
            <span className="s-i mono">{done.length + 1}</span>
            <span className="s-v mono">{Number(entry.kg) ? nf(Number(entry.kg)) : '–'}</span>
            <span className="s-v mono">{entry.reps}</span>
            <span />
            <span className="s-sp" style={{ '--c': q(entry.q).c }}><i />{q(entry.q).k}</span>
            <span className="s-t now-t">sırada</span>
          </div>
        ) : null}
        {!free && plan.map((j) => (
          <div key={'p' + j} className="srow plan">
            <span className="s-i mono">{j + 1}</span>
            <span className="s-v mono">{hasNum(t.kg) && Number(t.kg) ? nf(Number(t.kg)) : '–'}</span>
            <span className="s-v mono">{repTxt(t.repMin, t.repMax)}</span>
            <span />
            <span className="s-sp none">–</span>
            <span className="s-t" />
          </div>
        ))}
        {!free && extra ? <div className="srow fin"><Icon name="check" size={13} /> Hedef tamam · kalite düşmeden bitir</div> : null}
      </div>
    </div>
  );
}

function SkillTable({ item, entry, onOpen, bodyRef, free }) {
  const t = item.target;
  const done = item.sets;
  const extra = done.length >= t.sets;
  const lib = libById(item.exId);
  const hasHold = !!(lib && lib.h);
  const plan = [];
  for (let j = done.length + 1; j < t.sets; j++) plan.push(j);
  const q = (i) => SKILL_Q[i || 0] || SKILL_Q[0];
  return (
    <div className={'stable skill' + (hasHold ? ' has-hold' : '')}>
      <div className="srow sh" aria-hidden="true">
        <span>Set</span>
        <span>Deneme</span>
        {hasHold ? <span>Süre</span> : null}
        <span>Kalite</span>
        <span>Saat</span>
      </div>
      <div className="sbody" ref={bodyRef}>
        {done.map((x, j) => (
          <button key={x.at + '-' + j} type="button" className="srow done" onClick={() => onOpen(j)} aria-label={'Set ' + (j + 1) + ': ' + skillSetTxt(x) + '. Ayrıntı'}>
            <span className="s-i mono"><Icon name="check" size={12} />{j + 1}</span>
            <span className="s-v mono">{x.reps}</span>
            {hasHold ? <span className="s-v mono">{Number(x.hold) > 0 ? nf(Number(x.hold)) + ' sn' : '–'}</span> : null}
            <span className="s-sp" style={{ '--c': q(x.q).c }}><i />{q(x.q).k}</span>
            <span className="s-t mono">{hm(x.at)}{x.note || (x.tags && x.tags.length) ? <em>✎</em> : null}</span>
          </button>
        ))}
        {free && !done.length ? <div className="srow first-set">İlk setini kaydet</div> : null}
        {!free && !extra ? (
          <div className="srow now">
            <span className="s-i mono">{done.length + 1}</span>
            <span className="s-v mono">{entry.reps}</span>
            {hasHold ? <span className="s-v mono">{Number(entry.hold) > 0 ? nf(Number(entry.hold)) + ' sn' : '–'}</span> : null}
            <span className="s-sp" style={{ '--c': q(entry.q).c }}><i />{q(entry.q).k}</span>
            <span className="s-t now-t">sırada</span>
          </div>
        ) : null}
        {!free && plan.map((j) => (
          <div key={'p' + j} className="srow plan">
            <span className="s-i mono">{j + 1}</span>
            <span className="s-v mono">{repTxt(t.repMin, t.repMax)}</span>
            {hasHold ? <span className="s-v mono">–</span> : null}
            <span className="s-sp none">–</span>
            <span className="s-t" />
          </div>
        ))}
        {!free && extra ? <div className="srow fin"><Icon name="check" size={13} /> Hedef tamam · kalite düşmeden bitir</div> : null}
      </div>
    </div>
  );
}

function PlyoStage({ lib, item, session, compact }) {
  const total = sessionStats(session).contacts;
  const lastQ = item.sets.length ? item.sets[item.sets.length - 1].q || 0 : 0;
  return (
    <div className={'plyostage' + (lastQ === 2 ? ' warn' : '') + (compact ? ' compact' : '')}>
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

function SkillStage({ item, st, compact }) {
  const goals = readGoals(st.settings);
  const g = goals.find((x) => x.type === 'skill' && matchesSkillGoal(x, item));
  const stats = g ? skillStats(g, st.sessions) : null;
  return (
    <div className={'skillstage' + (compact ? ' compact' : '')}>
      {g
        ? <span>Hedef: <b>{SKILL_STAGES[g.stage]}</b> · <span className="mono">{stats.n + 1}. pratik</span></span>
        : <span>Kalite iki set üst üste düşerse bu hareketi bitir.</span>}
    </div>
  );
}

function SessionView2({ session, st, put, del, openSheet, onFinished, onDiscarded }) {
  const sRef = useRef(clone(session));
  const [s, setS] = useState(sRef.current);
  const [cur, setCur] = useState(() => firstOpen(session));
  const free = isFree(s);
  const getEntry = (item) => ({ ...(free ? freeEntry(item, st.sessions) : entryFor(item)), note: '', tags: [] });
  const [entry, setEntry] = useState(() => getEntry(session.items[firstOpen(session)]));
  const rest = s.rest;
  const prefsRef = useRef({});
  const prefsSource = st.settings.find(x => x.key === 'restPrefs')?.value;
  useEffect(() => { prefsRef.current = prefsSource || {}; }, [prefsSource]);
  const [compactRest, setCompactRest] = useState(false);
  const [confirm, setConfirm] = useState(null);
  useBack(!!confirm, () => setConfirm(null));
  const bodyRef = useRef(null);
  const sessionBodyRef = useRef(null);
  const stripRef = useRef(null);
  const now = useNow(500);
  const mutate = (fn) => { const ns = clone(sRef.current); fn(ns); sRef.current = ns; setS(ns); put('sessions', ns); return ns; };

  useEffect(() => {
    // Dışarıdan aktif oturuma hareket eklendiyse (ör. Pratik et) senkronla
    if (session.items.length > sRef.current.items.length) {
      sRef.current = clone(session);
      setS(sRef.current);
      const nextIdx = sRef.current.items.length - 1;
      setCur(nextIdx);
      setEntry(getEntry(sRef.current.items[nextIdx]));
    }
  }, [session.items.length]);

  const item = s.items[cur];
  const n = s.items.length;
  const go = (i) => { const j = clamp(i, 0, Math.max(0, sRef.current.items.length - 1)); setCur(j); setEntry(getEntry(sRef.current.items[j])); };
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
  const skill = !!(lib && lib.kind === 'beceri');
  const needsKg = free && !plyo && !skill && lib?.eq !== 'bw' && !(Number(entry.kg) > 0);
  useEffect(() => {
    const r = sRef.current.rest;
    if (r && r.start + r.total * 1000 > Date.now()) {
      void startRest(r, sRef.current.items.find(it => it.exId === r.exId)?.name || 'Antrenman');
    }
  }, []);
  useLayoutEffect(() => {
    const strip = stripRef.current, chip = strip?.querySelector('.fx-chip.on');
    if (chip) strip.scrollLeft = Math.max(0, chip.offsetLeft - strip.offsetLeft - (strip.clientWidth - chip.offsetWidth) / 2);
  }, [cur, n]);

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
      body.classList.toggle('compact-overflow', minimum > available);
      setCompactRest(minimum > available || body.querySelector('.ses2-mid').getBoundingClientRect().height < 72);
    };
    const observer = new ResizeObserver(fit);
    [body, ...fixed, tableHead, body.querySelector('.ses2-mid')].forEach(el => observer.observe(el));
    fit();
    return () => observer.disconnect();
  }, [item?.id, !!rest, compactRest, needsKg]);

  useEffect(() => {
    const b = bodyRef.current;
    if (!b) return;
    const row = free ? b.querySelector('.srow.done:last-child') : b.querySelector('.srow.now, .srow.fin');
    if (row && (row.offsetTop + row.offsetHeight > b.scrollTop + b.clientHeight || row.offsetTop < b.scrollTop)) b.scrollTop = row.offsetTop - b.clientHeight + row.offsetHeight;
  }, [cur, item ? item.sets.length : 0]);

  const logSet = () => {
    if (!item || needsKg) return;
    const set = skill
      ? {
          kg: 0,
          reps: Math.max(1, Math.round(entry.reps)),
          ...(lib?.h || Number(entry.hold) > 0 ? { hold: Math.max(0, Math.round(entry.hold || 0)) } : {}),
          skill: true,
          q: entry.q || 0,
          lvl: null,
          vl: 0,
          rpe: null,
          rir: 9,
          at: Date.now(),
        }
      : plyo
        ? { kg: Number(entry.kg) || 0, reps: Math.max(1, Math.round(entry.reps)), plyo: true, q: entry.q || 0, lvl: null, vl: 0, rpe: null, rir: 9, at: Date.now() }
        : { kg: Number(entry.kg) || 0, reps: Math.max(1, Math.round(entry.reps)), lvl: entry.lvl, vl: SPEED[entry.lvl].vl, rpe, rir: rirFinal, rirEst: Math.round(rirEst * 10) / 10, at: Date.now() };
    if (entry.note) set.note = entry.note;
    if (entry.tags.length) set.tags = entry.tags;
    const nextRest = { start: set.at, total: restDuration(sRef.current, item, prefsRef.current), exId: item.exId, setNo: item.sets.length + 1 };
    mutate((ns) => { delete ns.rest; ns.items[cur].sets.push(set); ns.rest = nextRest; });
    void stopRest(); void startRest(nextRest, item.name);
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
  const skipRest = () => { mutate(ns => { delete ns.rest; }); void stopRest(); };
  const adjustRest = (delta) => {
    if (!sRef.current.rest) return;
    const next = changeRest(sRef.current, sRef.current.rest, delta, prefsRef.current);
    mutate(ns => { ns.rest = next.rest; });
    if (next.prefs) { prefsRef.current = next.prefs; put('settings', { key: 'restPrefs', value: next.prefs }); }
    void startRest(next.rest, sRef.current.items.find(it => it.exId === next.rest.exId)?.name || item.name);
  };
  const discard = () => { void stopRest(); del('sessions', s.id); onDiscarded(); };
  const removeItem = (i) => {
    const removed = sRef.current.items[i];
    if (removed.sets.length) return;
    mutate(ns => { ns.items.splice(i, 1); });
    go(i < cur ? cur - 1 : Math.min(cur, sRef.current.items.length - 1));
  };
  const finish = () => {
    void stopRest();
    const end = Date.now();
    const draft = { ...clone(sRef.current), status: 'done', endedAt: end };
    const all = [draft, ...st.sessions.filter((x) => x.id !== draft.id)];
    const pre = Math.round(fatigueAt(st, draft.startedAt - 1, all).score);
    const post = Math.round(fatigueAt(st, end, all).score);
    const ns = mutate((x) => { delete x.rest; x.status = 'done'; x.endedAt = end; x.fatigue = { v: 2, pre, post }; });
    onFinished(ns);
  };

  return (
    <div className={'screen pxt ses2' + (free ? ' free-session' : '')}>
      <header className="shead ses2-head">
        <div className="shead-row">
          <span className="live-dot" />
          <div className="shead-t"><h1 className="ses2-name">{sessionName(s)}</h1><span className="shead-sub mono">{hm(s.startedAt)} başladı · {mmss(now - s.startedAt)} · {totalSets} set</span></div>
          <button type="button" id="finish-btn" className="btn fire sm" onClick={() => setConfirm(confirm ? null : 'finish')}>Bitir</button>
        </div>
      </header>

      {confirm ? (
        <div className="pop">
          {confirm === 'finish' ? (
            <React.Fragment>
              <p>{totalSets ? `Antrenmanı bitir? ${totalSets} set kaydedildi.` : 'Hiç set yok. Kaydetmeden çıkabilirsin.'}</p>
              <div className="confirm-inline">
                {totalSets ? <button type="button" id="finish-yes" className="btn fire sm" onClick={finish}>Bitir ve özetle</button> : <button type="button" id="discard-yes" className="btn danger sm" onClick={discard}>Kaydetmeden çık</button>}
                <button type="button" className="btn ghost sm" onClick={() => setConfirm(null)}>Devam</button>
                {totalSets ? <button type="button" className="btn ghost sm danger-t" onClick={() => setConfirm('discard')}>Sil</button> : null}
              </div>
            </React.Fragment>
          ) : (
            <React.Fragment>
              <p>Bu antrenman ve {totalSets} set silinsin mi?</p>
              <div className="confirm-inline">
                <button type="button" className="btn danger sm" onClick={discard}>Sil</button>
                <button type="button" className="btn ghost sm" onClick={() => setConfirm(null)}>Vazgeç</button>
              </div>
            </React.Fragment>
          )}
        </div>
      ) : null}

      {!item ? (
        <div className="scr">
          <div className="empty"><strong>Plansız antrenman</strong><p>Yaptığın hareketi ekle, setlerini kaydet.</p>
            <button type="button" id="ses-add-first" className="btn primary" onClick={() => openSheet('picker', { onPick: addItem })}><Icon name="plus" size={14} /> Hareket ekle</button>
          </div>
        </div>
      ) : (
        <div className="ses2-body" ref={sessionBodyRef}>
          {free ? <React.Fragment>
            <div className="fx-strip" ref={stripRef} aria-label="Antrenmandaki hareketler">
              {s.items.map((it, i) => <div key={it.id} className={'fx-chip' + (i === cur ? ' on' : '')}>
                <button type="button" onClick={() => go(i)} aria-pressed={i === cur}><span className="fx-label">{it.name}</span><span className="mono">{it.sets.length || ''}</span></button>
                {!it.sets.length ? <button type="button" className="fx-remove" aria-label={it.name + ' hareketini çıkar'} onClick={() => removeItem(i)}>×</button> : null}
              </div>)}
              <button type="button" id="fx-add" className="fx-add" onClick={() => openSheet('picker', { onPick: addItem })}>+ Hareket</button>
            </div>
            <div className="fx-title"><span className="exnav-n">{item.name}</span><button type="button" id="ex-info" className="nav-arrow info" aria-label="Hareket bilgisi" onClick={() => openSheet('exercise', { exId: item.exId, name: item.name })}><Icon name="info" size={17} /></button></div>
          </React.Fragment> : <React.Fragment>
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
              <span className="tg-u">{plyo ? 'set × temas' : skill ? 'set × deneme' : 'set × tekrar'}</span>
            </div>
            <div className="tg-cell"><b className="mono">{!skill && hasNum(t.kg) && (Number(t.kg) || !plyo) ? nf(Number(t.kg)) : '–'}</b><small>{plyo ? 'ek kg' : 'kg'}</small></div>
            {plyo
              ? <div className="tg-cell"><b className="tg-int">{PLYO_INT[lib.int || 2].split(' ')[0]}</b><small>yoğunluk</small></div>
              : skill
                ? <div className="tg-cell"><b style={{ color: 'var(--skill)', fontSize: '14px' }}>Beceri</b><small>kalite</small></div>
                : <div className="tg-cell"><b className="mono">{hasNum(t.rpeMin) ? rpeTxt(t.rpeMin, t.rpeMax).replace('RPE ', '') : '–'}</b><small>RPE</small></div>}
            <div className="tg-cell"><b className="mono">{restTxt(t.rest || 120).replace(' dk', '')}</b><small>dk ara</small></div>
            {prev || item.memo || item.note ? (
              <div className="tg-foot">
                {item.memo || item.note ? <span className="tg-memo"><Icon name="edit" size={11} /> {item.memo || item.note}</span> : null}
                {prev ? <span className="tg-prev mono">Son sefer {prev}</span> : null}
              </div>
            ) : null}
          </div>
          </React.Fragment>}

          <SetTable item={item} entry={entry} rpe={rpe} onOpen={openSet} bodyRef={bodyRef} free={free} />

          <div className="ses2-mid">
            {free && rest
              ? (!compactRest ? <RestBig rest={rest} now={now} onAdjust={adjustRest} onClose={skipRest} /> : null)
              : skill
                ? <SkillStage item={item} st={st} />
                : plyo
                  ? <PlyoStage lib={lib} item={item} session={s} />
                  : !free
                    ? <SpeedStage reps={entry.reps} lvl={entry.lvl} exId={item.exId} />
                    : null}
          </div>

          <div className="dock">
            {free && plyo && compactRest ? <PlyoStage lib={lib} item={item} session={s} compact /> : null}
            {free && skill && compactRest ? <SkillStage item={item} st={st} compact /> : null}
            {skill ? (
              <React.Fragment>
                <div className="dock-steps" style={lib?.h ? undefined : { gridTemplateColumns: 'minmax(0, 1fr)' }}>
                  <Stepper id={'reps-' + item.id} label="Deneme" value={entry.reps} step={1} min={1} max={30} decimals={0} onChange={(v) => setEntry({ ...entry, reps: Math.round(v) })} />
                  {lib?.h ? (
                    <Stepper id={'hold-' + item.id} label="En iyi süre (sn)" value={entry.hold || 0} step={1} min={0} max={300} decimals={0} onChange={(v) => setEntry({ ...entry, hold: Math.round(v) })} />
                  ) : null}
                </div>
                <div className="spd">
                  <div className="spd-h"><span className="st-k">Kalite</span><span className="spd-v" style={{ color: SKILL_Q[entry.q || 0].c }}>{SKILL_Q[entry.q || 0].d}</span></div>
                  <div className="pq-row" role="radiogroup" aria-label="Beceri kalitesi">
                    {SKILL_Q.map((sq, i) => (
                      <button key={i} type="button" id={'sq-' + i} role="radio" aria-checked={(entry.q || 0) === i} className={'pq' + ((entry.q || 0) === i ? ' on' : '')} style={{ '--c': sq.c }} onClick={() => setEntry({ ...entry, q: i })}>{sq.k}</button>
                    ))}
                    <button type="button" id="note-btn" className={'note-btn' + (entry.note || entry.tags.length || item.memo ? ' has' : '')} onClick={openNote} aria-label="Not ekle"><Icon name="edit" size={17} /></button>
                  </div>
                </div>
              </React.Fragment>
            ) : (
              <React.Fragment>
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
              </React.Fragment>
            )}
            {(() => {
              const two = !free && item.sets.length >= item.target.sets && cur < n - 1;
              const chip = rest && (!free || compactRest);
              return (
                <div className={'dock-go' + (two ? ' two' : '') + (chip ? ' r' : '')}>
                  {chip ? <RestChip rest={rest} now={now} onAdjust={adjustRest} onClose={skipRest} /> : null}
                  {needsKg ? <small className="kg-hint">Kiloyu gir</small> : null}
                  {two ? (
                    <React.Fragment>
                      <button type="button" id="log-set" className="btn ghost big" onClick={logSet}>Ek set</button>
                      <button type="button" id="next-ex" className="btn primary big" onClick={() => go(cur + 1)}>{rest ? 'Sonraki' : 'Sonraki hareket'} <Icon name="right" /></button>
                    </React.Fragment>
                  ) : (
                    <button type="button" id="log-set" className="btn fire big" disabled={needsKg} onClick={logSet}>{free ? 'Seti kaydet' : <>Set {item.sets.length + 1}{item.sets.length < item.target.sets ? '/' + item.target.sets : ''} kaydet{item.sets.length >= item.target.sets ? ' · ek' : ''}</>}</button>
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
  if (set.skill) {
    const lib = libById(exId);
    const q = SKILL_Q[set.q || 0] || SKILL_Q[0];
    return (
      <div className="setd">
        <div className="setd-top">
          <span className="setd-n mono">Set {idx + 1}</span>
          <span className="setd-v mono">{skillSetTxt(set)}</span>
          <span className="setd-t mono">{hm(set.at)}</span>
        </div>
        <div className="setd-grid two">
          <div><small>Kalite</small><b style={{ color: q.c }}>{q.k}</b></div>
          <div><small>Süre</small><b className="mono">{Number(set.hold) > 0 ? nf(Number(set.hold)) + ' sn' : '–'}</b></div>
          <div><small>Yorgunluk payı</small><b className="mono">{nf(Math.round(set.reps * SKILL_W[(lib && lib.fat) || 1] * 100) / 100)}</b></div>
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

function RestChip({ rest, now, onAdjust, onClose }) {
  const el = (now - rest.start) / 1000;
  const left = rest.total - el;
  const over = left <= 0;
  const k = clamp(el / rest.total);
  const R = 14, L = 2 * Math.PI * R;
  return (
    <div className={'restchip' + (over ? ' over' : '')} role="timer" aria-label={over ? 'Dinlenme bitti' : 'Dinlenme ' + mmss(left * 1000)}>
      <div className="rc-main">
        <svg viewBox="0 0 34 34" className="rc-ring" aria-hidden="true">
          <circle cx="17" cy="17" r={R} className="rr-bg" />
          <circle cx="17" cy="17" r={R} className="rr-fg" style={{ strokeDasharray: `${(1 - k) * L} ${L}` }} transform="rotate(-90 17 17)" />
        </svg>
        <span className="rc-t"><small>{over ? 'Hazırsın' : 'Dinlen'}</small><b className="mono">{over ? '+' + mmss(-left * 1000) : mmss(left * 1000)}</b></span>
      </div>
      <button type="button" className="rc-add mono" onClick={() => onAdjust(-15)} aria-label="15 saniye azalt">−15</button>
      <button type="button" className="rc-add mono" onClick={() => onAdjust(15)} aria-label="15 saniye ekle">+15</button>
      <button type="button" className="rc-add" onClick={onClose}>Atla</button>
    </div>
  );
}

function RestBig({ rest, now, onAdjust, onClose }) {
  const el = (now - rest.start) / 1000;
  const left = rest.total - el;
  const over = left <= 0;
  const k = clamp(el / rest.total);
  const R = 44, L = 2 * Math.PI * R;
  return (
    <div id="rest-big" className={'restbig' + (over ? ' over' : '')} role="timer">
      <svg viewBox="0 0 100 100" className="rb-ring" aria-hidden="true">
        <circle cx="50" cy="50" r={R} className="rr-bg" />
        <circle cx="50" cy="50" r={R} className="rr-fg" style={{ strokeDasharray: `${(1 - k) * L} ${L}` }} transform="rotate(-90 50 50)" />
      </svg>
      <div className="rb-t">
        <span className="rest-k">{over ? 'Hazırsın' : 'Dinlenme'}</span>
        <span className="mono rb-v">{over ? '+' + mmss(-left * 1000) : mmss(left * 1000)}</span>
        <div className="rb-a">
          <button type="button" className="btn ghost sm" onClick={() => onAdjust(-15)} aria-label="15 saniye azalt">−15</button>
          <button type="button" className="btn ghost sm" onClick={() => onAdjust(15)} aria-label="15 saniye ekle">+15</button>
          <button type="button" className="btn ghost sm" onClick={onClose}>Atla</button>
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
        <label className="check-row"><input id="memo-to-program" type="checkbox" checked={toProgram} onChange={(e) => setToProgram(e.target.checked)} /> Plandaki nota da kaydet, sonraki antrenmanda görünsün</label>
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

/* ---------- özet + plan kaydı ---------- */
function SummaryBody({ session, st, put, del, openSheet, onDelete, onClose }) {
  const [confirm, setConfirm] = useState(false);
  const ss = sessionStats(session);
  const all = st.sessions.some((x) => x.id === session.id) ? st.sessions.map((x) => (x.id === session.id ? session : x)) : [session, ...st.sessions];
  const ls = logStats(all, session.endedAt || Date.now());
  const goals = readGoals(st.settings);
  const matchingSkillGoals = goals.filter(
    (g) => g.type === 'skill' && session.items.some((it) => it.sets.length > 0 && matchesSkillGoal(g, it))
  );
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
  const advanceGoal = (id) => {
    const next = advanceSkillStage(goals, id);
    put('settings', { key: 'goals', value: next });
    if (st.settings.some((x) => x.key === 'goal')) del('settings', 'goal');
  };
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
          const skill = isSkill(it.exId) || it.sets.some((z) => z.skill);
          return (
            <li key={it.id}>
              <div className="se-top">
                <strong>{it.name}</strong>
                <span className="mono se-e1">
                  {best
                    ? <React.Fragment>e1RM {nf(Math.round(best * 2) / 2)}{pb ? <em className={d >= 0 ? 'up' : 'down'}> {d >= 0 ? '+' : '−'}{nf(Math.abs(Math.round(d * 2) / 2))}</em> : null}</React.Fragment>
                    : skill
                      ? it.sets.reduce((a, z) => a + z.reps, 0) + ' deneme'
                      : isPlyo(it.exId)
                        ? it.sets.reduce((a, z) => a + z.reps, 0) + ' temas'
                        : 'e1RM –'}
                </span>
              </div>
              <div className="se-sets">
                {it.sets.map((z, j) => (
                  <span key={j} className="se-set">
                    <span className="mono">
                      {z.skill
                        ? skillSetTxt(z)
                        : z.plyo
                          ? (Number(z.kg) ? '+' + nf(Number(z.kg)) + '×' : '') + z.reps + (Number(z.kg) ? '' : ' temas')
                          : nf(Number(z.kg)) + '×' + z.reps}
                    </span>
                    <i style={z.skill ? { background: (SKILL_Q[z.q || 0] || SKILL_Q[0]).c, width: '100%' } : z.plyo ? { background: PLYO_Q[z.q || 0].c, width: '100%' } : { background: vlColor(z.vl), width: Math.max(10, z.vl * 100) + '%' }} />
                    <small className="mono">{hm(z.at)}</small>
                  </span>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
      {matchingSkillGoals.map((g) => {
        const cleanAttempts = session.items
          .filter((it) => matchesSkillGoal(g, it))
          .flatMap((it) => it.sets)
          .filter((z) => (z.q || 0) === 0)
          .reduce((a, z) => a + Number(z.reps || 0), 0);
        return (
          <div key={g.id} className="sum-skill-goal">
            <span><strong>{g.name}</strong> · <span className="mono">{cleanAttempts} temiz deneme</span></span>
            {g.stage < 3 ? (
              <button type="button" className="btn primary sm" onClick={() => advanceGoal(g.id)}>Aşamayı ilerlet</button>
            ) : (
              <span className="badge ok">Öğrenildi ✓</span>
            )}
          </div>
        );
      })}
      {notes.length ? <div className="sum-notes"><span className="st-k">Notlar</span>{notes.map((t, i) => <p key={i}>{t}</p>)}</div> : null}
      {Object.keys(ls.muscles).length ? (
        <div className="sum-week">
          <span className="st-k">Son 7 gün zor set</span>
          <MuscleBars muscles={ls.muscles} compact />
        </div>
      ) : null}
      <div className="sum-actions">
        <button type="button" id="save-tmpl" className="btn ghost" onClick={() => openSheet('saveTemplate', { session })}><Icon name="plus" size={14} /> Plan olarak kaydet</button>
        {confirm ? (
          <span className="confirm-inline"><button type="button" className="btn danger sm" onClick={() => { onDelete(session.id); onClose(); }}>Kaydı sil</button><button type="button" className="btn ghost sm" onClick={() => setConfirm(false)}>Vazgeç</button></span>
        ) : <button type="button" className="btn ghost sm danger-t" onClick={() => setConfirm(true)}>Kaydı sil</button>}
      </div>
    </div>
  );
}

function SaveTemplateBody({ session, put, onClose, onSaved }) {
  const [name, setName] = useState(isFree(session) ? '' : session.dayName + ' (yeni)');
  const [wds, setWds] = useState([]);
  const items = session.items.filter((it) => it.sets.length).map((it) => {
    const reps = it.sets.map((z) => z.reps);
    const rpes = it.sets.map((z) => z.rpe).filter((r) => r != null);
    const sk = isSkill(it.exId);
    const pl = isPlyo(it.exId);
    return {
      id: newId('i'),
      exId: it.exId,
      name: it.name,
      muscle: it.muscle,
      sets: it.sets.length,
      repMin: Math.min(...reps),
      repMax: Math.max(...reps),
      kg: sk ? null : Number(it.sets[it.sets.length - 1].kg) || null,
      rpeMin: sk || pl || !rpes.length ? null : Math.min(...rpes),
      rpeMax: sk || pl || !rpes.length ? null : Math.max(...rpes),
      rest: it.target.rest || (sk ? 90 : 120),
      note: it.memo || '',
    };
  });
  const save = () => {
    const planName = name.trim() || 'Yeni plan';
    const p = newPlanDoc(planName);
    p.days[0].name = planName;
    p.days[0].weekdays = [...wds];
    p.days[0].items = items;
    put('programs', p);
    onSaved(p, p.days[0]);
    onClose();
  };
  return (
    <div className="note-sheet">
      <label className="st-k" htmlFor="tmpl-name">Adı</label>
      <input id="tmpl-name" className="text-in" placeholder="örn. Omuz + kol" value={name} onChange={(e) => setName(e.target.value)} />
      <span className="st-k">Her hafta</span>
      <div className="wd-pick">
        {WEEK_ORDER.map((w) => {
          const on = wds.includes(w);
          return (
            <button key={w} type="button" className={'wd-btn' + (on ? ' on' : '')} onClick={() => setWds(on ? wds.filter((x) => x !== w) : [...wds, w])}>
              {WD_SHORT[w]}
            </button>
          );
        })}
      </div>
      <p className="muted-p">{items.length} hareket, yaptığın set ve tekrar değerleriyle yeni bir plan olarak kaydedilir.</p>
      <button type="button" id="tmpl-save" className="btn primary full" onClick={save}>Kaydet</button>
    </div>
  );
}

/* ================= PLAN DÜZENLEYİCİ ================= */
function PlanEditor({ program, dayId, st, put, del, onBack, openSheet, startSession }) {
  const initDay = useMemo(() => {
    const raw = program.days.find((d) => d.id === dayId) || program.days[0];
    return normalizeDay(clone(raw));
  }, [program.id, dayId]);
  const [day, setDay] = useState(initDay);
  const [saved, setSaved] = useState(true);
  const [confirm, setConfirm] = useState(false);
  const latestDay = useRef(day);
  const latestProg = useRef(clone(program));
  const timer = useRef(0);
  const pending = useRef(false);

  const buildProgram = (d) => {
    const base = st.programs.find((x) => x.id === program.id) || latestProg.current;
    return upsertPlan([base], program.id, d);
  };

  const flush = () => {
    clearTimeout(timer.current);
    if (pending.current) {
      pending.current = false;
      const np = buildProgram(latestDay.current);
      latestProg.current = np;
      put('programs', np);
      setSaved(true);
    }
  };

  useBack(true, () => { flush(); onBack(); });
  useBack(confirm, () => setConfirm(false));
  useEffect(() => () => {
    clearTimeout(timer.current);
    if (pending.current) {
      pending.current = false;
      const np = buildProgram(latestDay.current);
      put('programs', np);
    }
  }, []);

  const commit = (fn) => {
    const nd = normalizeDay(clone(latestDay.current));
    fn(nd);
    latestDay.current = nd;
    setDay(nd);
    setSaved(false);
    pending.current = true;
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 600);
  };

  const wp = weekProgram(st.programs);
  const ps = planStats(wp);
  const low = MAIN_MUSCLES.filter((m) => (ps.muscles[m] || 0) < 10);

  const editItem = (i) => openSheet('item', {
    it: day.items[i], idx: i, n: day.items.length,
    onChange: (nit) => commit((nd) => { nd.items[i] = nit; }),
    onMove: (d) => commit((nd) => { const a = nd.items; const j = i + d; if (j < 0 || j >= a.length) return; const t = a[i]; a[i] = a[j]; a[j] = t; }),
    onRemove: () => commit((nd) => { nd.items.splice(i, 1); }),
  });
  const addItem = () => openSheet('picker', {
    low,
    onPick: (ex) => { const nit = itemFromEx(ex); commit((nd) => { nd.items.push(nit); }); },
  });
  const handleDelete = () => {
    clearTimeout(timer.current);
    pending.current = false;
    const exists = st.programs.some((x) => x.id === program.id);
    if (exists) {
      const res = removePlan(st.programs, program.id, day.id);
      if (res.del) del('programs', res.del);
      else if (res.put) put('programs', res.put);
    }
    onBack();
  };

  return (
    <div className="screen pxt editor2">
      <header className="shead">
        <div className="shead-row">
          <button type="button" id="ed-back" className="nav-arrow" aria-label="Geri" onClick={() => { flush(); onBack(); }}><Icon name="left" size={18} /></button>
          <div className="shead-t"><h1>Plan</h1></div>
          <span className={'save-st mono' + (saved ? ' ok' : '')}>{saved ? 'Kaydedildi' : '…'}</span>
          <button type="button" id="plan-del" className="btn ghost sm danger-t" onClick={() => setConfirm(true)}>Sil</button>
        </div>
      </header>
      {confirm ? (
        <div className="pop">
          <p>Planı sil?</p>
          <div className="confirm-inline">
            <button type="button" id="plan-del-yes" className="btn danger sm" onClick={handleDelete}>Sil</button>
            <button type="button" className="btn ghost sm" onClick={() => setConfirm(false)}>Vazgeç</button>
          </div>
        </div>
      ) : null}
      <div className="ed2-body">
        <div className="ed2-dayhead">
          <input
            id="plan-name"
            className="day-name prog-name2"
            aria-label="Plan adı"
            value={day.name}
            placeholder="Plan adı (örn. Push)"
            onChange={(e) => commit((nd) => { nd.name = e.target.value; })}
          />
        </div>
        <div className="ed2-sec">
          <span className="st-k">Her hafta</span>
          <div className="wd-pick" role="group" aria-label="Her hafta">
            {WEEK_ORDER.map((w) => {
              const on = (day.weekdays || []).includes(w);
              return (
                <button
                  key={w}
                  type="button"
                  aria-pressed={on}
                  className={'wd-btn' + (on ? ' on' : '')}
                  onClick={() => commit((nd) => {
                    const cur = nd.weekdays || [];
                    nd.weekdays = cur.includes(w) ? cur.filter((x) => x !== w) : [...cur, w];
                  })}
                >
                  {WD_SHORT[w]}
                </button>
              );
            })}
          </div>
        </div>
        <div className="ed2-list">
          <span className="st-k">Hareketler</span>
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
          ) : <div className="empty sm"><strong>Boş plan</strong><p>Hareketleri tek tek ekle. Listede olmayanı adını yazarak ekleyebilirsin.</p></div>}
          <button type="button" id="add-item" className="add-item" onClick={addItem}>+ Hareket ekle</button>
          <div className="ed2-foot">
            {day.items.length ? (
              <button
                type="button"
                id="ed-start"
                className="btn primary full"
                onClick={() => {
                  flush();
                  const np = buildProgram(latestDay.current);
                  startSession(np, latestDay.current);
                }}
              >
                <Icon name="play" size={13} /> Başlat
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= GÖZLEM (Antrenman plan ve gözlem) ================= */
function GozlemScreen({ st, put, openSheet, startSession, editPlan }) {
  const today = new Date();
  const todayKey = dateKey(today);
  const [selKey, setSelKey] = useState(() => dateKey(new Date()));
  const [viewYm, setViewYm] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [menuDid, setMenuDid] = useState(null);

  const goals = readGoals(st.settings);
  const firstPerfGoal = goals.find((g) => g.type === 'perf') || null;
  const [selEx, setSelEx] = useState(firstPerfGoal?.exId ?? null);

  const done = useMemo(() => st.sessions.filter((s) => s.status === 'done'), [st.sessions]);
  const isCurrentMonth = viewYm.y === today.getFullYear() && viewYm.m === today.getMonth();

  // 42 hücrelik takvim (Pazartesi başlangıçlı, 6 satır sabit)
  const cells = useMemo(() => {
    const first = new Date(viewYm.y, viewYm.m, 1);
    const offset = (first.getDay() + 6) % 7;
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(viewYm.y, viewYm.m, 1 - offset + i);
      const key = dateKey(d);
      const inMonth = d.getFullYear() === viewYm.y && d.getMonth() === viewYm.m;
      const isToday = key === todayKey;
      const isPast = key < todayKey;
      const daySessions = done.filter((s) => dateKey(s.startedAt) === key);
      const dayPlans = plansOn(key, st.programs);
      const markers = [];
      daySessions.forEach((s) => {
        markers.push({ type: 'done', skill: isSkillHeavySession(s) });
      });
      dayPlans.forEach(({ day: pDay }) => {
        const doneForPlan = daySessions.some((s) => s.dayId === pDay.id);
        if (!doneForPlan) {
          markers.push({ type: isPast ? 'missed' : 'plan' });
        }
      });
      const labelDate = d.getDate() + ' ' + MONTHS_LONG[d.getMonth()] + ' ' + WD_LONG[d.getDay()];
      const parts = [];
      if (daySessions.length) parts.push(daySessions.length + ' antrenman');
      if (dayPlans.length) parts.push(dayPlans.length + ' plan');
      const aria = parts.length ? labelDate + ': ' + parts.join(', ') : labelDate;
      return { d, key, inMonth, isToday, isPast, daySessions, dayPlans, markers, aria };
    });
  }, [viewYm.y, viewYm.m, todayKey, done, st.programs]);

  const changeMonth = (delta) => {
    const nd = new Date(viewYm.y, viewYm.m + delta, 1);
    setViewYm({ y: nd.getFullYear(), m: nd.getMonth() });
  };
  const goToday = () => {
    const nowD = new Date();
    setViewYm({ y: nowD.getFullYear(), m: nowD.getMonth() });
    setSelKey(dateKey(nowD));
  };
  const selectCell = (c) => {
    setSelKey(c.key);
    setMenuDid(null);
    if (!c.inMonth) setViewYm({ y: c.d.getFullYear(), m: c.d.getMonth() });
  };

  // Seçili gün verileri
  const selDate = parseDateKey(selKey);
  const selIsToday = selKey === todayKey;
  const selIsPast = selKey < todayKey;
  const selIsFuture = selKey > todayKey;
  const selSessions = done.filter((s) => dateKey(s.startedAt) === selKey);
  const selPlans = plansOn(selKey, st.programs);
  const selCheckin = st.checkins.find((c) => c.id === 'c_' + selKey);
  const selFatTs = selIsToday ? Date.now() : new Date(selDate.getFullYear(), selDate.getMonth(), selDate.getDate(), 23, 59, 59, 999).getTime();
  const selFatScore = !selIsFuture ? Math.round(fatigueAt(st, selFatTs).score) : null;

  const handleRemoveFromDay = (programId, dayObj) => {
    const updatedDay = removeOn(dayObj, selKey);
    const updatedProg = upsertPlan(st.programs, programId, updatedDay);
    put('programs', updatedProg);
    setMenuDid(null);
  };

  // Gözlem: takvimde görünen ayın özeti
  const monthSessions = useMemo(
    () => done.filter((s) => {
      const d = new Date(s.startedAt);
      return d.getFullYear() === viewYm.y && d.getMonth() === viewYm.m;
    }),
    [done, viewYm.y, viewYm.m]
  );
  const daysInMonth = new Date(viewYm.y, viewYm.m + 1, 0).getDate();
  const m = periodMetrics(monthSessions, daysInMonth);
  const scored = monthSessions.map((s) => { const f = sessionFatigue(s, st); return { s, v: f.post, pre: f.pre }; });
  const avgF = scored.length ? scored.reduce((a, x) => a + x.pre, 0) / scored.length : null;
  const avgPost = scored.length ? scored.reduce((a, x) => a + x.v, 0) / scored.length : null;
  const fz = fatigueAt(st, Date.now());
  const head = avgF != null ? avgF : fz.score;
  const warns = historyWarnings(st, monthSessions);
  const alerts = warns.filter((w) => w.lv !== 'info').length;

  // Hareket gelişimi (tüm zamanlar)
  const exs = [];
  done.forEach((s) => s.items.forEach((it) => {
    if (bestE1(it.sets) && !exs.some((e) => e.key === (it.exId || it.name))) {
      exs.push({ key: it.exId || it.name, exId: it.exId, name: it.name });
    }
  }));
  const curEx = exs.find((e) => e.key === selEx) || exs[0];
  const pts = curEx ? e1Series(st.sessions, curEx.exId, curEx.name) : [];
  const matchingPerfGoal = curEx ? goals.find((g) => g.type === 'perf' && g.exId === curEx.exId) : null;
  const gLine = matchingPerfGoal ? matchingPerfGoal.target : null;

  const wp = weekProgram(st.programs);
  const hasWeekly = wp.days.length > 0;

  return (
    <div className="screen pxt gozlem-screen">
      <ScreenHead title="Antrenman plan ve gözlem" />
      <div className="scr">
        <section className="cal-sec">
          <div className="cal-nav">
            <div className="cal-nav-l">
              <button type="button" id="cal-prev" className="nav-arrow" aria-label="Önceki ay" onClick={() => changeMonth(-1)}><PxIcon name="left" size={16} /></button>
              <span className="cal-title">{MONTHS_LONG[viewYm.m]} {viewYm.y}</span>
              <button type="button" id="cal-next" className="nav-arrow" aria-label="Sonraki ay" onClick={() => changeMonth(1)}><PxIcon name="right" size={16} /></button>
            </div>
            {!isCurrentMonth ? (
              <button type="button" id="cal-today" className="btn ghost sm" onClick={goToday}>Bugün</button>
            ) : null}
          </div>
          <div className="cal-wds" aria-hidden="true">
            {WEEK_ORDER.map((w) => <span key={w}>{WD_SHORT[w]}</span>)}
          </div>
          <div className="cal" role="grid" aria-label="Aylık antrenman takvimi">
            {cells.map((c) => {
              const showMarkers = c.markers.length <= 3 ? c.markers : c.markers.slice(0, 2);
              const extra = c.markers.length > 3;
              return (
                <button
                  key={c.key}
                  type="button"
                  data-date={c.key}
                  aria-label={c.aria}
                  aria-pressed={c.key === selKey}
                  className={'cal-d' + (c.isToday ? ' today' : '') + (c.key === selKey ? ' sel' : '') + (!c.inMonth ? ' out' : '')}
                  onClick={() => selectCell(c)}
                >
                  <span>{c.d.getDate()}</span>
                  <span className="cal-marks" aria-hidden="true">
                    {showMarkers.map((mk, idx) => (
                      <i key={idx} className={'cal-m ' + mk.type + (mk.skill ? ' skill' : '')} />
                    ))}
                    {extra ? <span className="cal-more">+</span> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section id="day-panel" aria-label="Seçili gün ayrıntısı">
          <div className="day-h">
            {selDate.getDate()} {MONTHS_LONG[selDate.getMonth()]} {WD_LONG[selDate.getDay()]}{selIsToday ? ' · Bugün' : ''}
          </div>
          {selSessions.map((s) => {
            const ss = sessionStats(s);
            const f = sessionFatigue(s, st).post;
            return (
              <button key={s.id} type="button" className="hrow sm" onClick={() => openSheet('summary', { id: s.id })}>
                <i className={'hrow-dot' + (isSkillHeavySession(s) ? ' skill' : '')} />
                <span className="hrow-t">
                  <strong>{sessionName(s)}</strong>
                  <small className="mono">{durTxt(ss.dur)} · {ss.sets.length} set</small>
                </span>
                {f != null ? <span className="hrow-f mono" style={{ color: zoneOf(f).c, borderColor: zoneOf(f).c }}>{Math.round(f)}</span> : <span />}
              </button>
            );
          })}
          {selPlans.map(({ programId, day: pDay, src }) => {
            const prog = st.programs.find((p) => p.id === programId);
            const isDone = selSessions.some((s) => s.dayId === pDay.id);
            const srcTxt = src === 'hafta' ? 'Her ' + WD_SHORT[selDate.getDay()] : 'Tek gün';
            const openMenu = menuDid === pDay.id;
            return (
              <div key={pDay.id} className="day-plan-wrap">
                <div className={'day-plan-row' + (isDone ? ' done' : '')}>
                  <span className="day-plan-ic">{isDone ? '✓' : '○'}</span>
                  <span className="day-plan-t">
                    <strong>{pDay.name}</strong>
                    <small>· {srcTxt}</small>
                  </span>
                  {selIsToday && !isDone ? (
                    <button type="button" className="btn primary sm" onClick={() => startSession(prog, pDay)}>Başlat</button>
                  ) : null}
                  <button
                    type="button"
                    className="day-plan-more"
                    aria-label={pDay.name + ' menüsü'}
                    onClick={() => setMenuDid(openMenu ? null : pDay.id)}
                  >
                    <PxIcon name="more" size={18} />
                  </button>
                </div>
                {openMenu ? (
                  <div className="day-plan-menu">
                    <button type="button" className="btn ghost sm danger-t" onClick={() => handleRemoveFromDay(programId, pDay)}>Bu günden kaldır</button>
                    <button type="button" className="btn ghost sm" onClick={() => { setMenuDid(null); if (prog) editPlan(prog, pDay, 'gozlem'); }}>Planı düzenle</button>
                  </div>
                ) : null}
              </div>
            );
          })}
          {!selIsFuture ? (
            <p className="day-meta mono">
              {selCheckin ? 'Uyku ' + nf(Number(selCheckin.sleep)) + ' sa' : 'Uyku –'} · Yorgunluk {selFatScore}
            </p>
          ) : null}
          {!selIsPast ? (
            <button type="button" id="day-add-plan" className="add-item" onClick={() => openSheet('planPick', { dayKey: selKey })}>
              + Bu güne plan ekle
            </button>
          ) : null}
        </section>

        <section className="hsec">
          <div className="sec2-h"><span className="eyebrow">{MONTHS_LONG[viewYm.m].toLocaleUpperCase('tr')} ÖZETİ</span></div>
          <div className="mgrid">
            <Metric k="Antrenman" v={m.n} sub={nf(Math.round(m.perWeek * 10) / 10) + ' / hafta'} />
            <Metric k="Toplam süre" v={m.n ? durTxt(m.dur) : '–'} sub={m.n ? 'ort. ' + durTxt(m.avgDur) : null} />
            <Metric k="Set" v={m.sets} sub={m.hard + ' zor set'} />
            <Metric k="Tonaj" v={m.sets ? tonTxt(m.ton) : '–'} sub={m.sets ? 'ort. RPE ' + nf(Math.round(m.avgRpe * 10) / 10) : null} />
          </div>
        </section>

        <button type="button" id="obs-fatigue" className="fcard" onClick={() => openSheet('fatigue', {})}>
          <Ring pixel score={head} zone={zoneOf(head)} size={72} label="Seans başında ortalama yorgunluk" />
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
              <div className="chips-scroll">{exs.map((e) => <button key={e.key} type="button" className={'fchip' + (curEx && curEx.key === e.key ? ' on' : '')} onClick={() => setSelEx(e.key)}>{e.name}</button>)}</div>
              {pts.length ? <E1Chart pts={pts} goal={gLine} /> : null}
              <p className="chart-note">Tahmini 1RM · yalnızca tükenişe yakın (RIR ≤ 4) setlerden.</p>
            </React.Fragment>
          ) : <p className="muted-p">Tükenişe yakın setler kaydettikçe her hareketin 1RM eğrisi burada oluşur.</p>}
        </section>

        <button
          type="button"
          id="obs-week"
          className="tcard obs-week"
          disabled={!hasWeekly}
          onClick={() => openSheet('plan', { getProgram: () => weekProgram(st.programs) })}
        >
          <span className="obs-week-l">
            <strong>Haftalık yük</strong>
            <small>{hasWeekly ? wp.days.length + ' planlı gün · kas başına haftalık set' : 'Haftalık tekrarlayan planın yok'}</small>
          </span>
          <PxIcon name="right" size={16} />
        </button>
      </div>
    </div>
  );
}

function PlanPickBody({ dayKey: targetKey, st, put, newPlan, onClose }) {
  const plans = allPlans(st.programs);
  const [selId, setSelId] = useState(plans[0]?.day.id ?? null);
  const [repeat, setRepeat] = useState(false);
  const d = parseDateKey(targetKey);
  const wdName = WD_LONG[d.getDay()];

  if (!plans.length) {
    return (
      <div className="note-sheet">
        <p className="muted-p">Önce bir plan oluştur</p>
        <button type="button" className="btn primary full" onClick={() => { onClose(); newPlan('gozlem'); }}>Yeni plan</button>
      </div>
    );
  }

  const chosen = plans.find((x) => x.day.id === selId) || plans[0];
  const save = () => {
    if (!chosen) return;
    const nextDay = repeat ? addWeekly(chosen.day, d.getDay()) : addOnce(chosen.day, targetKey);
    const updatedProg = upsertPlan(st.programs, chosen.programId, nextDay);
    put('programs', updatedProg);
    onClose();
  };

  return (
    <div className="note-sheet">
      <div className="plan-pick-list" role="radiogroup" aria-label="Plan seç">
        {plans.map((x) => {
          const on = chosen && chosen.day.id === x.day.id;
          return (
            <button
              key={x.day.id}
              type="button"
              role="radio"
              aria-checked={on}
              className={'plan-pick-opt' + (on ? ' on' : '')}
              onClick={() => setSelId(x.day.id)}
            >
              <strong>{x.day.name}</strong>
              <span className="mono" style={{ fontSize: '12px', color: 'var(--muted)' }}>{x.day.items.length} hareket</span>
            </button>
          );
        })}
      </div>
      <Switch id="plan-pick-repeat" label={'Her hafta ' + wdName + ' tekrarla'} on={repeat} onChange={setRepeat} />
      <button type="button" id="plan-pick-save" className="btn primary full" onClick={save}>Ekle</button>
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
  if (sim && sim.pre >= 40) recs.push('Seanslara yorgun başlıyorsun. Planlar arasında en az 48 sa bırak ya da toplam seti %20 azalt.');
  if (over.length) recs.push(over.join(', ') + ': haftada 20 zor setin üstü. Fazlası toparlanmayı uzatır, ek kazanımı belirsiz.');
  if (sim && sim.unplaced) recs.push(sim.unplaced + ' planın haftanın günü yok, hesaba katılmadı.');
  if (sim && !recs.length) recs.push('Dağılım dengeli: seanslara toparlanmış başlıyorsun.');
  return (
    <div className="plan2">
      {sim ? (
        <button type="button" className="plan2-meter" onClick={() => openSheet('fatigue', { sim: simFromPlan(p), source: 'Planına göre' })}>
          <Ring pixel score={sim.pre} zone={zoneOf(sim.pre)} size={72} label="Seans başında yorgunluk" />
          <div className="pm-t">
            <span className="zone-pill" style={{ color: zoneOf(sim.pre).c, borderColor: zoneOf(sim.pre).c }}>{zoneOf(sim.pre).k}</span>
            <span className="pm-sub mono">Seans başı ort. {Math.round(sim.pre)} · en yüksek tepe {Math.round(sim.post)}</span>
            <span className="pm-link">Simüle et ›</span>
          </div>
        </button>
      ) : <p className="muted-p">Hesap için planlara haftanın günü ve hareket ekle.</p>}
      {sim ? (
        <div className="pdays2">
          <div className="pd2 sh"><span>Gün</span><span>Plan</span><span>Başta</span><span>Sonda</span></div>
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
  const skill = m && m.kind === 'beceri';
  const setTxt = (z) => (z.skill ? skillSetTxt(z) : z.plyo ? (Number(z.kg) ? '+' + nf(Number(z.kg)) + '×' : '') + z.reps : nf(Number(z.kg)) + '×' + z.reps);
  return (
    <div className="exsheet">
      <FactChips ex={m} />
      {m && m.en ? <p className="ex-en">İngilizce: {m.en}</p> : null}
      {m && !plyo && !skill && m.prof ? <p className="ex-prof">{PROF[m.prof].d}.</p> : null}
      {m && m.not ? <p className="ex-tip"><Icon name="info" size={13} /> {m.not}</p> : null}
      {skill ? (
        <p className="ex-skill-note">Beceri dinçken öğrenilir: antrenmanın başında, kalite düşünce bırak.</p>
      ) : null}
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

function GoalBody({ id, st, put, del, addCustom, onClose }) {
  const goals = readGoals(st.settings);
  const existing = id ? goals.find((g) => g.id === id) : null;
  const [type, setType] = useState(existing ? existing.type : 'perf');
  const [q, setQ] = useState('');

  // Güç (1RM) durumu
  const [perf, setPerf] = useState(() => (
    existing && existing.type === 'perf'
      ? { exId: existing.exId, name: existing.name, base: existing.base, target: existing.target }
      : { exId: null, name: '', base: 0, target: 0 }
  ));

  // Öğrenme durumu
  const [skill, setSkill] = useState(() => (
    existing && existing.type === 'skill'
      ? { exId: existing.exId, name: existing.name, stage: existing.stage, due: existing.due || '' }
      : { exId: null, name: '', stage: 0, due: '' }
  ));

  const toks = normTr(q).split(/\s+/).filter(Boolean);

  const persistGoals = (nextGoals) => {
    put('settings', { key: 'goals', value: nextGoals });
    if (st.settings.some((x) => x.key === 'goal')) del('settings', 'goal');
  };

  // Güç seçenekleri
  const curPerfLib = libById(perf.exId);
  const recorded = st.sessions.filter(s => s.status === 'done').sort((a, b) => b.startedAt - a.startedAt)
    .flatMap(s => s.items.filter(it => bestE1(it.sets)).map(it => exMeta(it.exId, it.name)))
    .filter(e => e && e.kind !== 'plyo' && e.kind !== 'beceri');
  const suggestedPerf = [...new Map([...recorded, ...EX_LIB.filter(e => e.kind !== 'plyo' && e.kind !== 'beceri' && e.fat >= 2)].map(e => [e.id, e])).values()];
  const perfOpts = (toks.length ? EX_LIB.filter(e => e.kind !== 'plyo' && e.kind !== 'beceri' && toks.every(t => normTr(e.name + ' ' + e.en).includes(t))) : suggestedPerf).slice(0, 8);
  const perfValid = !!perf.exId && Number(perf.base) > 0 && Number(perf.target) > Number(perf.base);
  const selectPerf = (e) => {
    const pts = e1Series(st.sessions, e.id, e.name);
    setPerf({ ...perf, exId: e.id, name: e.name, base: pts.length ? Math.round(pts[pts.length - 1].v / 2.5) * 2.5 : 0 });
  };

  // Öğrenme seçenekleri (önce beceri hareketleri, sonra diğerleri, en fazla 8)
  const allSkillCandidates = useMemo(() => {
    const skills = EX_LIB.filter((e) => e.kind === 'beceri');
    const others = EX_LIB.filter((e) => e.kind !== 'beceri');
    const customs = (st.custom || []).map((c) => ({ id: c.id, name: c.name, en: '', muscle: c.muscle, kind: 'kuvvet' }));
    return [...skills, ...others, ...customs];
  }, [st.custom]);
  const skillMatches = toks.length
    ? allSkillCandidates.filter((e) => toks.every((t) => normTr(e.name + ' ' + (e.en || '')).includes(t)))
    : allSkillCandidates;
  const skillOpts = skillMatches.slice(0, 8);
  const exactSkill = allSkillCandidates.some((e) => normTr(e.name) === normTr(q));
  const skillValid = !!skill.name;

  const savePerf = () => {
    if (!perfValid) return;
    const draft = {
      id: existing ? existing.id : newId('g'),
      type: 'perf',
      exId: perf.exId,
      name: perf.name || (curPerfLib ? curPerfLib.name : perf.exId),
      base: Number(perf.base),
      target: Number(perf.target),
      createdAt: existing ? existing.createdAt : Date.now(),
    };
    persistGoals(upsertGoal(goals, draft));
    onClose();
  };

  const saveSkill = () => {
    if (!skillValid) return;
    const draft = {
      id: existing ? existing.id : newId('g'),
      type: 'skill',
      exId: skill.exId,
      name: skill.name,
      stage: skill.stage,
      ...(skill.due ? { due: skill.due } : {}),
      createdAt: existing ? existing.createdAt : Date.now(),
    };
    persistGoals(upsertGoal(goals, draft));
    onClose();
  };

  const handleRemove = () => {
    if (!existing) return;
    persistGoals(removeGoal(goals, existing.id));
    onClose();
  };

  return (
    <div className="note-sheet">
      {!existing ? (
        <div className="segmented seg2" role="tablist" aria-label="Hedef türü">
          <button type="button" role="tab" id="goal-type-perf" aria-selected={type === 'perf'} className={type === 'perf' ? 'on' : ''} onClick={() => { setType('perf'); setQ(''); }}>Güç (1RM)</button>
          <button type="button" role="tab" id="goal-type-skill" aria-selected={type === 'skill'} className={type === 'skill' ? 'on' : ''} onClick={() => { setType('skill'); setQ(''); }}>Öğrenme</button>
        </div>
      ) : null}

      {type === 'perf' ? (
        <React.Fragment>
          <span className="st-k">Hareket{curPerfLib ? ': ' + curPerfLib.name : perf.name ? ': ' + perf.name : ''}</span>
          <input id="goal-search" className="search" type="search" placeholder="Hareket ara (ör. bench, squat)" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
          <div className="chips-wrap">{perfOpts.map((e) => <button key={e.id} type="button" className={'fchip' + (perf.exId === e.id ? ' on' : '')} onClick={() => selectPerf(e)}>{e.name}</button>)}</div>
          <div className="entry-steps">
            <Stepper id="goal-base" label="Başlangıç 1RM" value={perf.base} step={2.5} min={0} max={400} onChange={(v) => setPerf({ ...perf, base: v })} />
            <Stepper id="goal-target" label="Hedef 1RM" value={perf.target} step={2.5} min={0} max={400} onChange={(v) => setPerf({ ...perf, target: v })} />
          </div>
          <button type="button" id="goal-save" className="btn primary full" disabled={!perfValid} onClick={savePerf}>Kaydet</button>
          {!perfValid ? <p className="goal-form-hint">{!perf.exId ? 'Önce bir hareket seç' : Number(perf.base) <= 0 ? 'Başlangıç 1RM değerini gir' : 'Hedef, başlangıçtan büyük olmalı'}</p> : null}
        </React.Fragment>
      ) : (
        <React.Fragment>
          <span className="st-k">Hareket{skill.name ? ': ' + skill.name : ''}</span>
          <input id="goal-search" className="search" type="search" placeholder="Beceri ya da hareket ara (ör. kip-up, amut)" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
          <div className="chips-wrap">
            {skillOpts.map((e) => (
              <button
                key={e.id}
                type="button"
                className={'fchip' + (skill.exId === e.id && skill.name === e.name ? ' on' : '')}
                onClick={() => setSkill({ ...skill, exId: e.id, name: e.name })}
              >
                {e.name}
              </button>
            ))}
          </div>
          {q.trim() && !exactSkill && !skillOpts.length ? (
            <button
              type="button"
              id="goal-custom-ex"
              className="add-item"
              onClick={() => {
                const d = addCustom(q.trim(), 'Diğer');
                setSkill({ ...skill, exId: d.id, name: d.name });
              }}
            >
              + “{q.trim()}” adıyla özel hareket
            </button>
          ) : null}
          <span className="st-k">Aşama</span>
          <div className="chips-wrap" role="radiogroup" aria-label="Aşama">
            {SKILL_STAGES.map((stLabel, idx) => (
              <button
                key={idx}
                type="button"
                role="radio"
                aria-checked={skill.stage === idx}
                className={'fchip' + (skill.stage === idx ? ' on' : '')}
                onClick={() => setSkill({ ...skill, stage: idx })}
              >
                {stLabel}
              </button>
            ))}
          </div>
          <label className="st-k" htmlFor="goal-due">Hedef tarih (isteğe bağlı)</label>
          <input id="goal-due" className="text-in" type="date" value={skill.due} onChange={(e) => setSkill({ ...skill, due: e.target.value })} />
          <button type="button" id="goal-save" className="btn primary full" disabled={!skillValid} onClick={saveSkill}>Kaydet</button>
          {!skillValid ? <p className="goal-form-hint">Önce bir hareket seç</p> : null}
        </React.Fragment>
      )}

      {existing ? <button type="button" id="goal-remove" className="btn danger-t full" onClick={handleRemove}>Hedefi kaldır</button> : null}
    </div>
  );
}

/* ================= İLERLEME / METRİKLER ================= */
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
      {pts.map((p, i) => { const h = i === pts.length - 1 ? 5 : 3.5; return <rect key={i} x={X(p.t) - h} y={Y(p.v) - h} width={h * 2} height={h * 2} className="cursor-dot" style={{ stroke: 'var(--fire)' }} />; })}
      <text x={m.l} y={H - 6} className="tick">{dateTxt(t0)}</text>
      {pts.length > 1 ? <text x={W - m.r} y={H - 6} textAnchor="end" className="tick">{dateTxt(t1)}</text> : null}
    </svg>
  );
}
function FatigueBars({ pts }) {
  const W = 132, H = 44, n = pts.length;
  if (!n) return null;
  const bw = Math.min(10, (W - (n - 1) * 3) / n);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} preserveAspectRatio="none" className="fbars" aria-hidden="true">
      <line x1="0" x2={W} y1={H - H * 0.4} y2={H - H * 0.4} className="fb-l" />
      <line x1="0" x2={W} y1={H - H * 0.7} y2={H - H * 0.7} className="fb-l" />
      {pts.map((p, i) => {
        const h = Math.max(3, (p.v / 100) * H), h0 = Math.max(2, ((p.pre || 0) / 100) * H), x = W - (n - i) * (bw + 3) + 3;
        return (
          <g key={i}>
            <rect x={x} y={H - h} width={bw} height={h} style={{ fill: zoneOf(p.v).c, opacity: 0.35 }} />
            <rect x={x} y={H - h0} width={bw} height={h0} style={{ fill: zoneOf(p.pre || 0).c }} />
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
    <div className="screen pxt lab-screen">
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
                  {e.bio ? <span className="badge bio">tork</span> : e.kind === 'beceri' ? <span className="badge skill">beceri</span> : e.kind === 'olimpik' ? <span className="badge kind">olimpik</span> : null}
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

/* ================= KABUK ================= */
const SHEET_TITLES = {
  account: 'Hesap ve yedek',
  consent: 'Verilerin nasıl kullanılır',
  privacy: 'Gizlilik',
  fatigue: 'Yorgunluk ölçer',
  lesson: 'Sinir sistemi',
  exercise: 'Hareket',
  picker: 'Hareket ekle',
  item: 'Hareketi düzenle',
  note: 'Not',
  exlist: 'Hareketler',
  summary: 'Antrenman özeti',
  saveTemplate: 'Plan olarak kaydet',
  plan: 'Haftalık yük',
  goal: 'Hedef',
  measure: 'Yorgunluk nasıl ölçülür?',
  wtype: 'Antrenman planı',
  setdetail: 'Set',
  planPick: 'Bu güne plan ekle',
};

function App() {
  const store = useLogStore();
  const [st, apiRef] = store;
  const acct = st.account;
  const actions = apiRef.current;
  const [tab, setTab] = useState(() => {
    try {
      const h = (location.hash || '').slice(1);
      if (h === 'programlar') return 'gozlem';
      return TABS2.some((t) => t.id === h) ? h : 'bugun';
    } catch (e) {
      return 'bugun';
    }
  });
  const [sheets, setSheets] = useState([]);
  const [planEd, setPlanEd] = useState(null); // { id, dayId, draft?, back } | null
  const [pixelSummary, setPixelSummary] = useState(null);
  const [jumpExId, setJumpExId] = useState(null);
  const previousAccount = useRef(acct.mode + ':' + acct.uid);
  const put = (kind, obj) => (apiRef.current ? apiRef.current.put(kind, obj) : null);
  const del = (kind, id) => (apiRef.current ? apiRef.current.del(kind, id) : null);
  const addCustom = (name, muscle) => { const doc = { id: newId('x'), name, muscle: muscle || 'Diğer', createdAt: Date.now(), pending: true }; put('custom', doc); return doc; };
  const openSheet = (type, props) => setSheets((a) => [...a, { key: newId('sh'), type, props: props || {} }]);
  const closeTop = () => setSheets((a) => a.slice(0, -1));
  const closeAll = () => setSheets([]);
  const active = st.sessions.find((s) => s.status === 'active');
  const exitToast = useAndroidBack(tab, () => setTab('bugun'));

  useEffect(() => {
    const onHash = () => {
      try {
        const h = (location.hash || '').slice(1);
        if (h === 'programlar') setTab('gozlem');
      } catch (e) {}
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => { try { history.replaceState(null, '', '#' + tab); } catch (e) {} }, [tab]);
  useEffect(() => {
    const identity = acct.mode + ':' + acct.uid;
    if (previousAccount.current === identity) return;
    previousAccount.current = identity;
    setSheets([]); setPlanEd(null); setTab('bugun');
  }, [acct.mode, acct.uid]);
  useEffect(() => { if (acct.needsConsent) setSheets(a => a.some(s => s.type === 'consent') ? a : [...a, { key: newId('sh'), type: 'consent', props: {} }]); else setSheets(a => a.filter(s => s.type !== 'consent')); }, [acct.needsConsent]);

  const startSession = (program, day) => {
    closeAll();
    setPlanEd(null);
    setPixelSummary(null);
    setJumpExId(null);
    if (active) { setTab('antrenman'); return; }
    const s = sessionFromDay(program, day);
    put('sessions', s);
    setTab('antrenman');
  };

  // Boş plan yalnızca ilk düzenlemede kaydedilir; dokunmadan çıkılırsa iz bırakmaz.
  const newPlan = (backTab = tab) => {
    closeAll();
    const p = newPlanDoc('');
    setPlanEd({ id: p.id, dayId: p.days[0].id, draft: p, back: backTab });
  };

  const editPlan = (p, d, backTab = tab) => {
    closeAll();
    setPlanEd({ id: p.id, dayId: d.id, back: backTab });
  };

  const practiceSkill = (goal) => {
    closeAll();
    setPlanEd(null);
    setPixelSummary(null);
    const lib = exMeta(goal.exId, goal.name);
    const ex = lib || { id: goal.exId || newId('x'), exId: goal.exId, name: goal.name, muscle: 'Diğer', rest: 90 };
    const d = itemFromEx(ex);
    const sessionItem = {
      id: newId('e'),
      srcId: null,
      exId: d.exId,
      name: d.name,
      muscle: d.muscle,
      note: '',
      memo: '',
      target: { sets: d.sets, repMin: d.repMin, repMax: d.repMax, kg: d.kg, rpeMin: d.rpeMin, rpeMax: d.rpeMax, rest: d.rest },
      sets: [],
    };
    setJumpExId(d.exId || d.name);
    if (active) {
      const ns = clone(active);
      if (!ns.items.some((it) => matchesSkillGoal(goal, it))) {
        ns.items.push(sessionItem);
        put('sessions', ns);
      }
      setTab('antrenman');
      return;
    }
    const s = sessionFromDay(null, null);
    s.items.push(sessionItem);
    put('sessions', s);
    setTab('antrenman');
  };

  const pick = (id) => {
    setPlanEd(null);
    if (id !== 'antrenman') setPixelSummary(null);
    setTab(id);
  };

  const renderSheet = (sh) => {
    const p = sh.props;
    const close = closeTop;
    switch (sh.type) {
      case 'account': return <AccountBody st={st} acct={acct} actions={actions} openSheet={openSheet} onClose={close} put={put} />;
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
      case 'wtype': return <WtypeMenuBody st={st} pid={p.pid} did={p.did} put={put} del={del} onStart={startSession} onEdit={(pr, d) => editPlan(pr, d, tab)} onClose={close} />;
      case 'summary': { const s = p.draft || st.sessions.find((x) => x.id === p.id); return s ? <SummaryBody session={s} st={st} put={put} del={del} openSheet={openSheet} onDelete={(id) => del('sessions', id)} onClose={close} /> : <p className="muted-p">Kayıt bulunamadı.</p>; }
      case 'saveTemplate': return <SaveTemplateBody session={p.session} st={st} put={put} onClose={close} onSaved={(pr, d) => { closeAll(); setPixelSummary(null); editPlan(pr, d, 'antrenman'); }} />;
      case 'plan': return <PlanBody getProgram={p.getProgram} st={st} openSheet={openSheet} />;
      case 'goal': return <GoalBody id={p.id} st={st} put={put} del={del} addCustom={addCustom} onClose={close} />;
      case 'planPick': return <PlanPickBody dayKey={p.dayKey} st={st} put={put} newPlan={newPlan} onClose={close} />;
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
  if (planEd) {
    const stored = st.programs.find((x) => x.id === planEd.id);
    const p = stored && (!planEd.draft || (stored.updatedAt || 0) > (planEd.draft.updatedAt || 0)) ? stored : (planEd.draft || stored);
    const back = () => {
      const b2 = planEd.back;
      setPlanEd(null);
      if (b2 && TABS2.some((t) => t.id === b2)) setTab(b2);
    };
    if (p) {
      screen = <PlanEditor key={p.id + ':' + planEd.dayId} program={p} dayId={planEd.dayId} st={st} put={put} del={del} onBack={back} openSheet={openSheet} startSession={startSession} />;
    }
  }
  if (!screen) {
    if (tab === 'bugun') screen = <TodayScreen st={st} put={put} openSheet={openSheet} startSession={startSession} newPlan={newPlan} practiceSkill={practiceSkill} goTab={setTab} acct={acct} />;
    if (tab === 'antrenman') {
      if (active && isFree(active)) {
        screen = (
          <FreePixelSession
            key={active.id}
            session={active}
            st={st}
            put={put}
            del={del}
            addCustom={addCustom}
            openSheet={openSheet}
            jumpExId={jumpExId}
            onJumpHandled={() => setJumpExId(null)}
            onFinished={(ns) => setPixelSummary(ns)}
            onDiscarded={() => { setJumpExId(null); setPixelSummary(null); }}
          />
        );
      } else if (active) {
        screen = <SessionView2 key={active.id} session={active} st={st} put={put} del={del} openSheet={openSheet} onFinished={(ns) => openSheet('summary', { id: ns.id, draft: ns })} onDiscarded={() => {}} />;
      } else if (pixelSummary) {
        const latestSummary = st.sessions.find((x) => x.id === pixelSummary.id) || pixelSummary;
        screen = (
          <PixelSummaryScreen
            key={latestSummary.id}
            session={latestSummary}
            st={st}
            put={put}
            del={del}
            openSheet={openSheet}
            onDone={() => setPixelSummary(null)}
          />
        );
      } else {
        screen = <StartView st={st} startSession={startSession} newPlan={newPlan} openSheet={openSheet} />;
      }
    }
    if (tab === 'gozlem') {
      screen = <GozlemScreen st={st} put={put} openSheet={openSheet} startSession={startSession} editPlan={editPlan} />;
    }
    if (tab === 'lab') screen = <LabScreen openSheet={openSheet} />;
  }

  return (
    <BackupContext.Provider value={{ readBackup: actions.readBackup, restoreBackup: actions.restoreBackup, cloud: acct.mode === 'user' }}>
    <div className="device-wrap">
      <div className="device">
        <div className="app-shell app2">
          <main className="app2-main" inert={acct.migrating || acct.busy}>{screen}</main>
          {st.error ? <div className="store-message" role="alert">{st.error}</div> : null}
          {acct.migrating ? <div className="store-message" role="status">Kayıtlar hesabına taşınıyor…</div> : null}
          {exitToast ? <div className="back-toast" role="status">Çıkmak için tekrar bas</div> : null}
          <nav className="tabbar tb4" aria-label="Ana gezinme" inert={acct.migrating || acct.busy}>
            {TABS2.map((t) => (
              <button key={t.id} id={'tab-' + t.id} type="button" className={'tab' + (t.id === tab ? ' on' : '')} aria-label={t.label} aria-current={t.id === tab ? 'page' : undefined} onClick={() => pick(t.id)}>
                <span className="tab-ic"><PxIcon name={t.icon} size={24} />{t.id === 'antrenman' && active ? <i className="tab-live" /> : null}</span>
                <span className="tab-l">{t.label}</span>
              </button>
            ))}
          </nav>
          {sheets.map((sh, i) => (
            <SheetFrame key={sh.key} top={i === sheets.length - 1} title={sheetTitle(sh)} onClose={sh.type === 'consent' ? actions.rejectConsent : closeTop} size={sheetSize(sh)} z={40 + i * 2}>
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
