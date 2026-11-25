// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BackupContext } from '../lib/store/BackupContext';
import { AccountChip, AccountBody, ConsentBody, PrivacyBody } from '../features/hesap/Account';
import { addShares, exShare, searchAlias } from '../lib/data/exlib';
import { LegalGate } from '../legal/LegalGate';
import { LegalDoc } from '../legal/LegalDoc';
import { appDocId, appDocTitle } from '../legal/appDocs';
import { acceptanceCurrent } from '../legal/acceptance';
import { BiomechTab, Tile } from '../features/lab/Biomekanik';
import { CompactCtx, Icon, NeedleGauge, Range, STAGES, StageFatigue, StageRate, StageRecruit, StageSignal, Switch, clamp } from '../features/lab/Cns';
import {
  BENCH_IDS, EX_LIB, FAT, EQ, PLYO_INT, isPlyo, isSkill, PLYO_W, PLYO_Q, SKILL_W, SKILL_Q, skillSetTxt, libById, MONTHS, MUSCLES, PROF, SPEED,
  WD_LONG, WD_SHORT, WEEK_ORDER, ItemEditor, SetReplay, Stepper, noteLabel,
  bestE1, clone, dateTxt, durTxt, e1Ok, e1rm, setE1,
  hasNum, itemFromEx, newId, nextPlanned, nf, normTr,
  repTxt, restTxt, rirTxt, rpeLabel,
  sameDay, sessionFromDay, sessionStats, targetTxt, vlColor,
  isWarmEx, warmFirst, SET_ATTRS, SET_CONDS, SET_FEEL, warmSetTxt,
} from '../features/antrenman/core';
import {
  allPlans, dateKey, parseDateKey, plansOn, newPlanDoc, upsertPlan, removePlan,
  addOnce, addWeekly, removeOn, weekProgram, thisWeekProgram, normalizeDay, weekdaysOf,
} from '../features/plan/plans';
import {
  SKILL_STAGES, readGoals, upsertGoal, removeGoal, advanceSkillStage, matchesSkillGoal, skillStats,
} from '../features/bugun/goals';
import { useLogStore } from '../lib/store/useLogStore';
import { isFree, sessionName } from '../lib/models/session';
import { useAndroidBack, useBack } from './back';
import { FreePixelSession } from '../features/antrenman/FreePixelSession';
import { PixelSummaryScreen } from '../features/antrenman/PixelSummaryScreen';
import { planStats, logStats, proxW, costW, loadScore, hoursToFresh, decayK, setLoads, sleepInfo, sleepPts, fatigueAt, steadyWeek, simFromLogs, simFromPlan, simulatePlan, fatigueRecs, e1Series, prevPerf, sessionFatigue, periodMetrics, historyWarnings, periodFatigue, FATIGUE_SPANS, sleepNights, weekDoneStats } from '../lib/models/fatigue';
import { exerciseIndex, RECENT_DAYS } from '../lib/models/progress';
import { ProgressListBody, ProgressDetailBody } from '../features/gozlem/ProgressSheets';
import { useIdleWatch } from '../features/antrenman/idleWatch';
import { planReminders, remindersOn } from '../features/plan/reminders';
import { hideWorkout, setReminders, showWorkout } from '../lib/native/restTimer';
import { IDLE_ASK_MS, IDLE_END_MS } from '../lib/models/idle';
import '../styles/cns.css';
import '../styles/app.css';
import '../styles/log.css';
import '../styles/mobile.css';
import '../styles/v7.css';
import '../styles/pixel.css';
import '../styles/px-theme.css';
import '../styles/modes.css';
import { PxIcon } from './PxIcon';
import { pixelFx, readFxSettings } from '../lib/native/fx';
import { LiveStrip, ModeAmbient, ModeFrame, ModeTransition } from './ModeLayer';
import { TR_MS, motionAllowed, screenMode, tabTransition } from './modes';
import { dbMultiplier } from '../lib/models/session';
import { PX_SPEED, PX_SPEED_COLORS } from '../features/antrenman/pixelHelpers';
import { HoldButton } from './HoldButton';
import { byLang, clock, getLang, lower, muscleName, num, pct, t, tc, upper, useLang } from '../i18n';
import { dayLabel, exName } from '../i18n/names';
import { rich } from '../i18n/rich';
import { REC_FRESH } from '../lib/models/fatigue';

/* ================= PERFORMANCE · son kullanıcı uygulaması ================= */
// Sekme etiketleri Türkçe kaynak metindir; gösterimde t() ile çevrilir (V21).
const TABS2 = [
  { id: 'bugun', label: 'Dashboard', icon: 'home' },
  { id: 'antrenman', label: 'Antrenman', icon: 'bolt' },
  { id: 'gozlem', label: 'Gözlem', icon: 'calendar' },
  { id: 'lab', label: 'Lab', icon: 'flask' },
];
const MONTHS_LONG = byLang('monthslong', {
  tr: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
});
const MAIN_MUSCLES = ['Göğüs', 'Omuz (ön)', 'Omuz (yan)', 'Sırt', 'Trapez', 'Triceps', 'Hamstring', 'Quadriceps'];
const SPEED_SHORT = byLang('speedshort', { tr: ['Aynı', 'Hafif', 'Belirgin', 'Çok', 'Grind'], en: ['Same', 'Slight', 'Clear', 'Big', 'Grind'] });
// Set notu etiketleri Türkçe saklanır (set.tags); gösterimde t() ile çevrilir.
const DAY_MS = 864e5;

const dayKey = (ts) => { const d = new Date(ts); return 'c_' + d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const fullDate = (ts) => { const d = new Date(ts); return t('{wd}, {d} {m}', { wd: WD_LONG[d.getDay()], d: d.getDate(), m: MONTHS_LONG[d.getMonth()] }); };
const exMeta = (exId, name) => EX_LIB.find((e) => e.id === exId) || EX_LIB.find((e) => e.name === name) || null;
const dayMinutes = (day) => Math.round(day.items.reduce((a, i) => a + (isWarmEx(i.exId) ? (Number(i.dur) || 10) * 60 : Number(i.sets || 0) * ((i.rest || 120) + 45)), 0) / 60);
const hm = (ts) => { const d = new Date(ts); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
const zoneOf = (score) => (score < 40 ? { k: t('Yönetilebilir'), c: 'var(--ok)', cls: 'ok' } : score < 70 ? { k: t('Birikiyor'), c: 'var(--warn)', cls: 'warn' } : { k: t('Yüksek'), c: 'var(--bad)', cls: 'bad' });
const tonTxt = (kg) => (kg >= 10000 ? nf(Math.round(kg / 100) / 10) + ' t' : nf(Math.round(kg)) + ' kg');
const sessionNotes = (s) => s.items.reduce((a, it) => a + (it.memo ? 1 : 0) + it.sets.filter((x) => x.note || (x.tags && x.tags.length)).length, 0);
const sessionSubTxt = (ss) => {
  if (ss.tonnage > 0) return tonTxt(ss.tonnage);
  if (ss.attempts > 0) return t('{n} deneme', { n: ss.attempts });
  if (ss.contacts > 0) return t('{n} temas', { n: ss.contacts });
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
      <button type="button" className="sheet-bg" aria-label={t('Kapat')} onClick={onClose} />
      <div className={'sheet ' + (size || '')}>
        <div className="sheet-grab" aria-hidden="true" />
        <div className="sheet-h">
          <h3>{title}</h3>
          {head || null}
          <button type="button" className="x-btn" onClick={onClose} aria-label={t('Kapat')}>✕</button>
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
const MBAR_ST = byLang('mbar', { tr: { none: 'yok', low: 'az', ok: 'iyi', high: 'fazla' }, en: { none: 'none', low: 'low', ok: 'good', high: 'high' } });
function MuscleBars({ muscles, list, max = 24, compact, mark, status, plan }) {
  const names = list || Object.keys(muscles).sort((a, b) => (muscles[b] || 0) - (muscles[a] || 0));
  return (
    <div className={'mbars' + (compact ? ' compact' : '') + (status ? ' with-st' : '') + (plan ? ' with-plan' : '')}>
      {names.map((m) => {
        const n = muscles[m] || 0;
        const st = n === 0 ? 'none' : n < 10 ? 'low' : n > 20 ? 'high' : 'ok';
        const p = plan ? plan[m] || 0 : 0;
        return (
          <div key={m} className={'mbar ' + st + (mark && mark[m] ? ' hit' : '')}>
            <span className="mbar-m">{muscleName(m)}{mark && mark[m] ? <em className="mbar-hit">+{nf(mark[m])}</em> : null}</span>
            <div className="mbar-t">
              <span className="mbar-z" style={{ left: (10 / max) * 100 + '%', width: (10 / max) * 100 + '%' }} />
              <span className="mbar-f" style={{ width: Math.min(100, (n / max) * 100) + '%' }} />
              {p ? <span className="mbar-p" style={{ left: 'calc(' + Math.min(100, (p / max) * 100) + '% - 2px)' }} /> : null}
            </div>
            <span className="mbar-n mono">{plan ? nf(n) + '/' + nf(p) : nf(n)}</span>
            {status ? <span className={'mbar-s ' + st}>{MBAR_ST[st]}</span> : null}
          </div>
        );
      })}
    </div>
  );
}

// Antrenman özeti: bu seansta çalışan (uyarılan) kaslar + son 7 günün kas başına zor seti ve uyarılar.
function SessionMuscles({ session, week }) {
  // V35: yardımcı kaslar da paylarıyla sayılır (ana 1, yardımcı ½, dengeleyici ¼)
  const here = {};
  session.items.forEach((it) => {
    const h = it.sets.filter((x) => !x.plyo && !x.skill && !x.warm && x.rir <= 4).length;
    addShares(here, it, h);
  });
  const hits = Object.entries(here).sort((a, b) => b[1] - a[1]);
  const names = Object.keys(week).sort((a, b) => (week[b] || 0) - (week[a] || 0));
  const low = names.filter((m) => week[m] > 0 && week[m] < 10);
  const none = MAIN_MUSCLES.filter((m) => !week[m]);
  const high = names.filter((m) => week[m] > 20);
  if (!hits.length && !names.length) return null;
  return (
    <div className="sum-mus">
      {hits.length ? (
        <React.Fragment>
          <span className="st-k">{t('Bu antrenmanda çalışan kaslar')}</span>
          <div className="mus-hits">
            {hits.map(([m, n]) => <span key={m} className="mus-hit"><b>{muscleName(m)}</b><span className="mono">{t('{n} zor set', { n: nf(n) })}</span></span>)}
          </div>
          <p className="mus-help">{t('Yardımcı kaslar yarım, dengeleyiciler çeyrek set sayılır.')}</p>
        </React.Fragment>
      ) : null}
      {names.length ? (
        <div className="sum-week">
          <div className="sum-week-h"><span className="st-k">{t('Son 7 gün · kas başına zor set')}</span><span className="mus-leg mono">{t('hedef 10–20')}</span></div>
          <MuscleBars muscles={week} list={names} compact mark={here} status />
          <p className="chart-note">{t('Taralı şerit haftada 10–20 zor set: kas gelişimi için sık önerilen aralık. +n bu antrenmanın katkısı. Zor set: bitişe 4 tekrar ya da daha az kala biten set.')}</p>
          <div className="mus-warn">
            {low.length ? <p className="mw low"><b>{t('Az')}</b>{t('{list}: haftalık 10 setin altında.', { list: low.map((m) => muscleName(m) + ' ' + nf(week[m])).join(', ') })}</p> : null}
            {none.length ? <p className="mw none"><b>{t('Bu hafta hiç')}</b>{none.map(muscleName).join(', ')}</p> : null}
            {high.length ? <p className="mw high"><b>{t('Fazla')}</b>{t('{list}: 20 setin üstünde, toparlanmaya dikkat.', { list: high.map((m) => muscleName(m) + ' ' + nf(week[m])).join(', ') })}</p> : null}
            {!low.length && !none.length && !high.length ? <p className="mw ok"><b>{t('Dengeli')}</b>{t('Bütün ana kaslar haftalık aralıkta.')}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
function exDot(e) {
  if (!e) return null;
  if (e.kind === 'beceri') return <span className="sdot" title={t('Beceri')} />;
  return e.kind === 'plyo' ? <span className={'pdot i' + (e.int || 2)} title={t('Yoğunluk: {x}', { x: PLYO_INT[e.int || 2] })} /> : e.fat ? <span className={'fatdot f' + e.fat} title={t('Yorgunluk: {x}', { x: FAT[e.fat] })} /> : null;
}
function exLine(e) {
  if (!e.eq) return muscleName(e.muscle);
  if (e.kind === 'beceri') return muscleName(e.muscle) + ' · ' + EQ[e.eq] + ' · ' + t('beceri') + (e.h ? ' · ' + t('süre') : '');
  return muscleName(e.muscle) + ' · ' + EQ[e.eq] + ' · ' + (e.kind === 'plyo' ? t('yoğunluk {x}', { x: lower(PLYO_INT[e.int || 2].split(' ')[0]) }) : PROF[e.prof].k);
}
// V35: yardımcı kasların set payı (½, ¼)
const fracTxt = (f) => (f === 0.5 ? '½' : f === 0.25 ? '¼' : f === 0.75 ? '¾' : nf(f));
const shareTxt = (ex) => {
  const sh = ex.id ? exShare(ex).slice(1) : (ex.sec || []).map((m) => [m, 0.5]);
  return sh.length ? ' + ' + sh.map(([m, f]) => muscleName(m) + ' ' + fracTxt(f)).join(', ') : '';
};
function FactChips({ ex }) {
  if (!ex) return null;
  return (
    <div className="facts">
      <span className="fact" title={t('Bir zor set kaslara bu paylarla sayılır')}><b>{muscleName(ex.muscle)}</b>{shareTxt(ex)}</span>
      {ex.eq ? <span className="fact">{EQ[ex.eq]}</span> : null}
      {ex.kind && ex.kind !== 'kuvvet' ? <span className={'fact ' + (ex.kind === 'beceri' ? 'skill' : 'kind')}>{ex.kind === 'plyo' ? t('Pliometrik') : ex.kind === 'beceri' ? t('Beceri') : t('Olimpik')}</span> : null}
      {ex.kind === 'beceri' && ex.h ? <span className="fact skill">{t('Süreyle tutulur')}</span> : null}
      {ex.kind === 'plyo'
        ? <span className={'fact fat' + Math.min(3, ex.int || 2)}>{t('Yoğunluk: {x}', { x: PLYO_INT[ex.int || 2] })}</span>
        : <span className={'fact fat' + ex.fat}>{t('Yorgunluk: {x}', { x: FAT[ex.fat] })}</span>}
      {ex.kind !== 'plyo' && ex.kind !== 'beceri' && ex.prof ? <span className="fact prof" title={PROF[ex.prof].d}>{PROF[ex.prof].k}</span> : null}
    </div>
  );
}
// V33 · antrenman öncesi ısınma listelerin başında
const LIB_WARM_FIRST = warmFirst(EX_LIB);
const EX_KINDS = [['all', 'Tümü'], ['kuvvet', 'Kuvvet'], ['olimpik', 'Olimpik'], ['plyo', 'Pliometrik'], ['beceri', 'Beceri'], ['isinma', 'Isınma']]; // etiketler gösterimde t() ile
function useExFilter(all, initGrp) {
  const [q, setQ0] = useState('');
  const [kind, setKind0] = useState('all');
  const [grp, setGrp0] = useState(initGrp || null);
  const [eq, setEq0] = useState(null);
  const [lim, setLim] = useState(40);
  const wrap = (f) => (v) => { f(v); setLim(40); };
  const toks = normTr(q).split(/\s+/).filter(Boolean);
  // Arama iki dilde de eşleşir: Türkçe ve İngilizce ad, kas ve ekipman.
  const hay = useMemo(() => new Map(all.map((e) => [e, normTr(e.name + ' ' + (e.en || '') + ' ' + searchAlias(e.id) + ' ' + e.muscle + ' ' + muscleName(e.muscle) + ' ' + (EQ[e.eq] || ''))])), [all]);
  const base = toks.length ? all.filter((e) => toks.every((tok) => hay.get(e).includes(tok))) : all;
  const byKind = base.filter((e) => kind === 'all' || (e.kind || 'kuvvet') === kind);
  const list = byKind.filter((e) => (!grp || e.muscle === grp) && (!eq || e.eq === eq));
  const groups = MUSCLES.map((m) => [m, byKind.filter((e) => e.muscle === m && (!eq || e.eq === eq)).length]).filter((x) => x[1]);
  const eqs = Object.keys(EQ).map((k) => [k, byKind.filter((e) => e.eq === k && (!grp || e.muscle === grp)).length]).filter((x) => x[1]);
  const kinds = EX_KINDS.map(([k, label]) => [k, t(label), k === 'all' ? base.length : base.filter((e) => (e.kind || 'kuvvet') === k).length]);
  return { q, setQ: wrap(setQ0), kind, setKind: wrap(setKind0), grp, setGrp: wrap(setGrp0), eq, setEq: wrap(setEq0), lim, more: () => setLim(lim + 60), list, groups, eqs, kinds };
}
function ExFilterBar({ f, idp, placeholder }) {
  return (
    <div className="exf">
      <input id={idp + '-search'} className="search" type="search" placeholder={placeholder || t('Hareket ara (Türkçe ya da İngilizce)')} value={f.q} onChange={(e) => f.setQ(e.target.value)} autoComplete="off" />
      <div className="segmented seg5-scroll" role="tablist" aria-label={t('Hareket türü')}>
        {f.kinds.map(([k, label]) => <button key={k} type="button" role="tab" id={idp + '-kind-' + k} aria-selected={f.kind === k} className={f.kind === k ? 'on' : ''} onClick={() => f.setKind(k)}>{label}</button>)}
      </div>
      <div className="chips-scroll" role="group" aria-label={t('Kas grubu')}>
        <button type="button" className={'fchip' + (!f.grp ? ' on' : '')} onClick={() => f.setGrp(null)}>{t('Tüm kaslar')}</button>
        {f.groups.map(([m, n]) => <button key={m} type="button" id={idp + '-g-' + normTr(m).replace(/[^a-z]/g, '')} className={'fchip' + (f.grp === m ? ' on' : '')} onClick={() => f.setGrp(f.grp === m ? null : m)}>{muscleName(m)} <span className="mono fchip-n">{n}</span></button>)}
      </div>
      <div className="chips-scroll" role="group" aria-label={t('Ekipman')}>
        <button type="button" className={'fchip sm' + (!f.eq ? ' on' : '')} onClick={() => f.setEq(null)}>{t('Tüm ekipman')}</button>
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
  return t("{d} {m}'ya kadar", { d: d.getDate(), m: MONTHS[d.getMonth()] });
}
// V32 · Dashboard yorgunluğu seçilen dönemin ortalaması (varsayılan son 7 gün; 10 ve 30 gün seçilebilir, cihazda saklanır).
const SPAN_KEY = 'outmove.fspan';
const readSpan = () => { try { const v = Number(localStorage.getItem(SPAN_KEY)); return FATIGUE_SPANS.includes(v) ? v : 7; } catch (e) { return 7; } };
function TodayScreen({ st, put, openSheet, startSession, newPlan, practiceSkill, goTab, acct }) {
  const [span, setSpan0] = useState(readSpan);
  const setSpan = (d) => { setSpan0(d); try { localStorage.setItem(SPAN_KEY, String(d)); } catch (e) { /* yer yoksa yalnızca bu açılışta */ } };
  const tick5 = Math.floor(Date.now() / 300000);
  const fz = useMemo(() => periodFatigue(st, span, Date.now()), [st.sessions, st.checkins, span, tick5]);
  const sl = fz.sleep;
  const active = st.sessions.find((s) => s.status === 'active');
  const plans = allPlans(st.programs);
  const next = nextPlanned(st.programs, st.sessions);
  const goals = readGoals(st.settings);
  // Uyku: seçili dönemin gece ortalaması (bugünle biten `span` gece). Her günün uykusu ayrı girilmez.
  const setSleep = (h) => put('checkins', { id: dayKey(Date.now()), sleep: h, at: Date.now(), span });
  const loading = st.status === 'loading' || !st.loaded.programs || !st.loaded.sessions;
  const sleepKnown = sl.avg != null;
  const sleepSel = sleepKnown ? Math.min(9, Math.max(5, Math.round(sl.avg))) : null;
  const short = sleepKnown && sl.avg < 6.5;
  let perfCount = 0;

  return (
    <div className="screen pxt">
      <ScreenHead title={t('Dashboard')} sub={fullDate(Date.now())} right={<AccountChip acct={acct} onClick={() => openSheet('account', {})} />} />
      <div className="scr fit">
        {acct.mode === 'guest' && st.sessions.length ? (
          <button type="button" id="guest-banner" className="guest-banner" onClick={() => openSheet('account', {})}>
            <PxIcon name="cloud" size={18} />
            <span>{t('Kayıtlar yalnızca bu telefonda')} · <b>{t('Yedekle')}</b></span>
            <PxIcon name="right" size={14} />
          </button>
        ) : null}
        <section className="ready">
          <button type="button" id="ready-ring" className="ready-ring" onClick={() => openSheet('fatigue', {})} aria-label={t('Yorgunluk ayrıntısı')}>
            <Ring pixel size={104} score={fz.score} zone={fz.zone} label={t('Son {d} gün ortalama yorgunluk {n}', { d: span, n: Math.round(fz.score) })} />
          </button>
          <div className="ready-r">
            <div className="ready-top">
              <span className="ready-k">{t('Yorgunluk')}</span>
              <span className="zone-pill" style={{ color: fz.zone.c, borderColor: fz.zone.c }}>{fz.zone.k}</span>
            </div>
            <div className="ready-parts mono">
              <span>{tc('load', 'Antrenman')} <b>{Math.round(fz.train)}</b>{fz.covered != null && fz.covered < span ? <em className="ready-cov">{t('{n} gün kayıt', { n: fz.covered })}</em> : null}</span>
              <span className={sleepKnown ? (fz.sleepPts >= 8 ? 'bad' : '') : 'ask'}>{t('Uyku')} {sleepKnown ? <b>+{Math.round(fz.sleepPts)}</b> : <b>?</b>}{sleepKnown && sl.n < span ? <em className="ready-cov">{t('{a}/{b} gece', { a: sl.n, b: span })}</em> : null}</span>
              <span>{fz.hrs ? t('~{n} sa toparlanma', { n: fz.hrs }) : t('toparlanmış')}</span>
            </div>
            <div className="fspan-row" role="radiogroup" aria-label={t('Yorgunluk hangi döneme göre')}>
              <span className="sleep-k">{t('Son')}</span>
              {FATIGUE_SPANS.map((d) => (
                <button key={d} type="button" id={'fspan-' + d} role="radio" aria-checked={span === d} aria-label={t('Son {n} gün', { n: d })} className={'fsp' + (span === d ? ' on' : '')} onClick={() => setSpan(d)}>{d}</button>
              ))}
              <span className="sleep-u">{t('gün')}</span>
            </div>
            <div className="sleep-row" role="radiogroup" aria-label={t('Son {n} günün gece ortalaması uyku', { n: span })}>
              <span className="sleep-k">{t('Uyku')}<small>{t('gece ort.')}</small></span>
              {[5, 6, 7, 8, 9].map((h) => (
                <button key={h} type="button" role="radio" aria-checked={sleepSel === h} className={'sl' + (sleepSel === h ? ' on' : '')} onClick={() => setSleep(h)}>{h}</button>
              ))}
              <span className="sleep-u">{t('sa')}</span>
            </div>
          </div>
          {short ? <p className="ready-warn">{t('Kısa uyku: kuvvet ~%3, çok tekrarlı setler ~%10 düşebilir.')}</p> : null}
        </section>

        {loading ? <div className="skeleton"><span /><span /></div> : active ? (
          <section className="hero-card live">
            <div className="hc-top"><span className="live-dot" /><span className="eyebrow fire">{active.ready ? t('Hazır') : t('Antrenman sürüyor')}</span><span className="hc-when mono">{active.ready ? t('başlamadı') : t('{n} set', { n: active.items.reduce((a, it) => a + it.sets.length, 0) })}</span></div>
            <h3>{sessionName(active)}</h3>
            <button type="button" id="resume-btn" className="btn fire full" onClick={() => goTab('antrenman')}>{t('Devam et')} <PxIcon name="right" size={16} /></button>
          </section>
        ) : next && next.off === 0 ? (
          <section className="hero-card">
            <div className="hc-top"><span className="eyebrow">{t('Bugün')}</span><span className="hc-when mono">~{t('{n} dk', { n: dayMinutes(next.day) })}</span></div>
            <h3>{dayLabel(next.day.name)}</h3>
            <p className="hc-sub">{next.day.items.slice(0, 3).map((i) => exName(i)).join(' · ')}{next.day.items.length > 3 ? ' +' + (next.day.items.length - 3) : ''}</p>
            <button type="button" id="start-next" className="btn primary full" onClick={() => startSession(next.program, next.day)}><PxIcon name="play" size={16} /> {t('Başlat')}</button>
          </section>
        ) : plans.length > 0 ? (
          <section className="hero-card">
            <h3>{t('Bugün planlı antrenman yok')}</h3>
            <p className="hc-sub">{next ? t('Sıradaki: {x}', { x: dayLabel(next.day.name) }) + ' · ' + WD_LONG[next.weekday] : t('Takvimden istediğin güne plan ekleyebilirsin.')}</p>
            <div className="hc-actions">
              <button type="button" className="btn primary" onClick={() => startSession(null, null)}>{t('Plansız antrenman')}</button>
              <button type="button" className="btn ghost" onClick={() => goTab('gozlem')}>{t('Takvim')}</button>
            </div>
          </section>
        ) : (
          <section className="hero-card">
            <h3>{t('Planın yok')}</h3>
            <p className="hc-sub">{t('Plansız başla ya da ilk planını oluştur.')}</p>
            <div className="hc-actions">
              <button type="button" className="btn primary" onClick={() => startSession(null, null)}>{t('Plansız antrenman')}</button>
              <button type="button" className="btn ghost" onClick={() => newPlan('bugun')}>{t('Plan oluştur')}</button>
            </div>
          </section>
        )}

        <section className="tcard">
          <div className="tcard-h"><span className="eyebrow">{t('Bu hafta')}</span><span className="mono tcard-k">{t('{n} antrenman', { n: st.sessions.filter((s) => s.status === 'done' && !s.ready && Date.now() - s.startedAt < 7 * DAY_MS).length })}</span></div>
          <WeekRow programs={st.programs} sessions={st.sessions} />
        </section>

        <section className="goals-sec">
          <div className="sec2-h"><span className="eyebrow">{t('Hedefler')}</span>{goals.length ? <span className="mono">{goals.length}</span> : null}</div>
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
                    <span className="eyebrow fire">{t('Hedef')}</span>
                    <span className="goal2-n">{exName({ exId: goal.exId, name: goal.name }) || goal.exId}</span>
                    <span className="goal2-v mono"><b>{nf(Math.round(cur * 2) / 2)}</b> → {nf(goal.target)} kg</span>
                  </div>
                  <div className="goal2-r">
                    {series.length > 1 ? <Spark pts={series.slice(-10)} goal={goal.target} /> : <span className="goal2-hint">{t('Kayıtlar arttıkça eğri oluşur')}</span>}
                    <div className="goal-bar"><span style={{ width: clamp((cur - goal.base * 0.9) / (goal.target - goal.base * 0.9)) * 100 + '%' }} /></div>
                  </div>
                </button>
              );
            }
            const stats = skillStats(goal, st.sessions);
            const daysAgo = stats.last != null ? Math.max(0, Math.floor((Date.now() - stats.last) / DAY_MS)) : null;
            const statTxt = stats.n
              ? t('{n} pratik', { n: stats.n }) + ' · ' + (daysAgo === 0 ? t('son bugün') : t('son {n} gün önce', { n: daysAgo }))
              : t('Henüz pratik yok');
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
                  <span className="eyebrow skill">{done ? t('Öğrenildi ✓') : t('Öğrenme')}</span>
                  <span className="mono" style={{ color: 'var(--muted)' }}>⋯</span>
                </div>
                <div className="skill-name">{exName({ exId: goal.exId, name: goal.name })}</div>
                <div className="skill-stage-row">
                  <div className="skill-bars" aria-hidden="true">
                    {[0, 1, 2, 3].map((i) => <i key={i} className={i <= goal.stage ? 'on' : ''} />)}
                  </div>
                  <span>{done ? t('Öğrenildi ✓') : SKILL_STAGES[goal.stage]}</span>
                </div>
                <div className="skill-foot">
                  <span className="skill-meta">{statTxt}{dueTxt ? ' · ' + dueTxt : ''}</span>
                  <button
                    type="button"
                    className="btn ghost sm skill-go"
                    onClick={(e) => { e.stopPropagation(); practiceSkill(goal); }}
                  >
                    {t('Pratik et')}
                  </button>
                </div>
              </div>
            );
          })}
          {goals.length === 0 ? (
            <button type="button" id="goal-add" className="tcard goal-add" onClick={() => openSheet('goal', {})}>
              <span className="goal2-l">
                <span className="eyebrow fire">{t('Hedef')}</span>
                <span className="goal2-n">{t('Hedef ekle')}</span>
                <span className="goal-add-hint">{t('Güç (1RM) ya da yeni bir beceri hedefi belirle.')}</span>
              </span>
              <span className="goal-add-plus"><PxIcon name="plus" size={18} /></span>
            </button>
          ) : (
            <button type="button" id="goal-add" className="goal-add-sm" onClick={() => openSheet('goal', {})}>+ {t('Hedef ekle')}</button>
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
    const label = upper(MONTHS_LONG[d.getMonth()]) + ' ' + d.getFullYear();
    const g = groups[groups.length - 1];
    if (!g || g.label !== label) groups.push({ label, items: [s] });
    else g.items.push(s);
  });

  return (
    <div className="screen pxt">
      <ScreenHead
        title={t('Antrenman')}
        sub={last ? t('Son: {x}', { x: dateTxt(last.startedAt) }) + ' · ' + sessionName(last) : t('Bir antrenman planı seç ya da plansız başla')}
      />
      <div className="scr">
        <div className="start-actions">
          <button type="button" id="free-session" className="btn ghost" onClick={() => startSession(null, null)}><PxIcon name="plus" size={16} /> {t('Plansız antrenman')}</button>
          <button type="button" id="new-plan" className="btn ghost" onClick={() => newPlan('antrenman')}><PxIcon name="plus" size={16} /> {t('Yeni plan')}</button>
        </div>

        <section className="plan-sec">
          <div className="sec2-h"><span className="eyebrow">{t('Planlarım')}</span>{plans.length ? <span className="mono">{plans.length}</span> : null}</div>
          {plans.length ? (
            <ul className="wtypes plan-list">
              {plans.map(({ programId, day: d }) => {
                const wds = WEEK_ORDER.filter((w) => (d.weekdays || []).includes(w)).map((w) => WD_SHORT[w]).join(', ');
                return (
                  <li key={d.id} className="wtype">
                    <button type="button" id={'plan-' + d.id} className="wtype-main" onClick={() => openSheet('wtype', { pid: programId, did: d.id })}>
                      <span className="wtype-t">
                        <span className="wtype-n"><strong>{dayLabel(d.name)}</strong></span>
                        <small>{t('{n} hareket', { n: d.items.length }) + (wds ? ' · ' + wds : '')}</small>
                      </span>
                    </button>
                    <button type="button" className="wtype-more" aria-label={t('{x} seçenekleri', { x: d.name ? dayLabel(d.name) : t('Plan') })} onClick={() => openSheet('wtype', { pid: programId, did: d.id })}><Icon name="more" size={18} /></button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="plan-empty">{t('Planın yok. Plansız başla ya da bir plan oluştur.')}</p>
          )}
        </section>

        <section className="hsec hist-inline">
          <div className="sec2-h"><span className="eyebrow">{t('Geçmiş')}</span><span className="mono">{done.length}</span></div>
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
                              <small className="mono">{t('{n} set', { n: ss.sets.length })} · {sessionSubTxt(ss)}{nn ? ' · ✎ ' + nn : ''}</small>
                              {s.autoEnd ? <small className="hrow-auto">{t('Kendiliğinden bitirildi')}</small> : null}
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
                <button type="button" id="hist-more" className="btn ghost full" onClick={() => setHistLim(histLim + 30)}>{t('Daha fazla göster')}</button>
              ) : null}
            </React.Fragment>
          ) : (
            <p className="muted-p">{t('Bitirdiğin antrenmanlar burada listelenir.')}</p>
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
  if (!d) return <p className="muted-p">{t('Bu plan artık yok.')}</p>;
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
    const cp = newPlanDoc(t('{x} (kopya)', { x: d.name ? dayLabel(d.name) : t('Plan') }));
    cp.days[0].items = clone(d.items).map((it) => ({ ...it, id: newId('i') }));
    cp.days[0].weekdays = [...(d.weekdays || [])];
    put('programs', cp);
    onClose();
  };
  return (
    <div className="wmenu">
      <input id="wtype-name" className="text-in" aria-label={t('Plan adı')} value={name} onChange={(e) => setName(e.target.value)} onBlur={rename} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
      <p className="wmenu-k mono">{t('{n} hareket', { n: d.items.length })} · {t('{n} set', { n: total })} · ~{t('{n} dk', { n: dayMinutes(d) })}{runs.length ? ' · ' + t('{n} kez yapıldı, son {x}', { n: runs.length, x: dateTxt(runs[0].startedAt) }) : ''}</p>
      {d.items.length ? (
        <ol className="wmenu-items">
          {d.items.map((it) => <li key={it.id}><span>{exName(it)}{it.note ? <small className="wmenu-note">{noteLabel(it.note)}</small> : null}</span><b className="mono">{it.sets} × {repTxt(it.repMin, it.repMax)}</b></li>)}
        </ol>
      ) : <p className="muted-p">{t('Bu planda henüz hareket yok.')}</p>}
      <span className="st-k">{t('Her hafta')}</span>
      {/* V33 · yanlışlıkla dokunmaya karşı günler, Başlat ve Kopyala basılı tutularak çalışır */}
      <div className="wd-pick">
        {WEEK_ORDER.map((w) => {
          const on = (d.weekdays || []).includes(w);
          return (
            <HoldButton
              key={w}
              id={'wtype-wd-' + w}
              ms={450}
              tone="go"
              hint={null}
              aria-pressed={on}
              aria-label={t('{x}: basılı tut', { x: WD_LONG[w] })}
              className={'wd-btn' + (on ? ' on' : '')}
              onHold={() => saveDay((x) => {
                const cur = x.weekdays || [];
                x.weekdays = cur.includes(w) ? cur.filter((z) => z !== w) : [...cur, w];
              })}
            >
              {WD_SHORT[w]}
            </HoldButton>
          );
        })}
      </div>
      <p className="wmenu-hint">{t('Günü seçmek ya da kaldırmak için basılı tut.')}</p>
      <div className="wmenu-act">
        {d.items.length ? <HoldButton id="wtype-start" ms={600} tone="go" className="btn primary" onHold={() => onStart(p, d)}><Icon name="play" size={13} /> {t('Başlat')}</HoldButton> : null}
        <button type="button" id="wtype-edit" className="btn ghost" onClick={() => onEdit(p, d)}><Icon name="edit" size={14} /> {t('Düzenle')}</button>
        <HoldButton id="wtype-copy" ms={600} tone="go" className="btn ghost" onHold={copyPlan}>{t('Kopyala')}</HoldButton>
      </div>
      <HoldButton id="wtype-del" className="btn ghost danger-t wmenu-del" aria-label={t('Planı sil (1 saniye basılı tut; geçmiş kayıtlar kalır)')} onHold={remove}><Icon name="trash" size={14} /> {t('Planı sil')}</HoldButton>
    </div>
  );
}

function SetDetailBody({ set, idx, exId, name, onDelete, onClose }) {
  // V34 · ısınma: kilo, tekrar ve hız gösterilmez
  if (set.warm) {
    return (
      <div className="setd">
        <div className="setd-top">
          <span className="setd-n mono">{set.dur ? t('Isınma') : t('Isınma seti')}</span>
          <span className="setd-v mono">{set.dur ? warmSetTxt(set) : t('ISN')}</span>
          <span className="setd-t mono">{hm(set.at)}</span>
        </div>
        <p className="sd-note">{t('1RM, yorgunluk, zor set, tonaj ve gelişime girmez.')}</p>
        {set.tags && set.tags.length ? <div className="chips-wrap">{set.tags.map((x) => <span key={x} className="fchip on">{t(x)}</span>)}</div> : null}
        {set.note ? <p className="sd-note">{set.note}</p> : null}
        {onDelete ? <HoldButton id="set-del" className="btn ghost sm danger-t setd-del" onHold={() => { onDelete(); onClose(); }}><Icon name="trash" size={13} /> {t('Seti sil')}</HoldButton> : null}
      </div>
    );
  }
  if (set.skill) {
    const lib = libById(exId);
    const q = SKILL_Q[set.q || 0] || SKILL_Q[0];
    return (
      <div className="setd">
        <div className="setd-top">
          <span className="setd-n mono">{t('Set')} {idx + 1}</span>
          <span className="setd-v mono">{skillSetTxt(set)}</span>
          <span className="setd-t mono">{hm(set.at)}</span>
        </div>
        <div className="setd-grid two">
          <div><small>{t('Kalite')}</small><b style={{ color: q.c }}>{q.k}</b></div>
          <div><small>{t('Süre')}</small><b className="mono">{Number(set.hold) > 0 ? t('{n} sn', { n: nf(Number(set.hold)) }) : '–'}</b></div>
          <div><small>{t('Yorgunluk payı')}</small><b className="mono">{nf(Math.round(set.reps * SKILL_W[(lib && lib.fat) || 1] * 100) / 100)}</b></div>
          <div><small>{t('Zor set')}</small><b className="mono" style={{ color: 'var(--faint)' }}>{t('hayır')}</b></div>
        </div>
        {set.tags && set.tags.length ? <div className="chips-wrap">{set.tags.map((x) => <span key={x} className="fchip on">{t(x)}</span>)}</div> : null}
        {set.note ? <p className="sd-note">{set.note}</p> : null}
        {onDelete ? <HoldButton id="set-del" className="btn ghost sm danger-t setd-del" onHold={() => { onDelete(); onClose(); }}><Icon name="trash" size={13} /> {t('Seti sil')}</HoldButton> : null}
      </div>
    );
  }
  if (set.plyo) {
    const lib = libById(exId);
    const q = PLYO_Q[set.q || 0];
    return (
      <div className="setd">
        <div className="setd-top">
          <span className="setd-n mono">{t('Set')} {idx + 1}</span>
          <span className="setd-v mono">{t('{n} temas', { n: set.reps })}{Number(set.kg) ? ' · +' + nf(Number(set.kg)) + ' kg' : ''}</span>
          <span className="setd-t mono">{hm(set.at)}</span>
        </div>
        <div className="setd-grid two">
          <div><small>{t('Kalite')}</small><b style={{ color: q.c }}>{q.k}</b></div>
          <div><small>{t('Yoğunluk')}</small><b>{PLYO_INT[(lib && lib.int) || 2].split(' ')[0]}</b></div>
          <div><small>{t('Yorgunluk payı')}</small><b className="mono">{nf(Math.round(set.reps * PLYO_W[(lib && lib.int) || 2] * 100) / 100)}</b></div>
          <div><small>{t('Zor set')}</small><b className="mono" style={{ color: 'var(--faint)' }}>{t('hayır')}</b></div>
        </div>
        {set.tags && set.tags.length ? <div className="chips-wrap">{set.tags.map((x) => <span key={x} className="fchip on">{t(x)}</span>)}</div> : null}
        {set.note ? <p className="sd-note">{set.note}</p> : null}
        {onDelete ? <HoldButton id="set-del" className="btn ghost sm danger-t setd-del" onHold={() => { onDelete(); onClose(); }}><Icon name="trash" size={13} /> {t('Seti sil')}</HoldButton> : null}
      </div>
    );
  }
  const e1 = setE1(set);
  return (
    <div className="setd">
      <div className="setd-top">
        <span className="setd-n mono">{t('Set')} {idx + 1}</span>
        <span className="setd-v mono">{nf(Number(set.kg))} kg × {set.reps}</span>
        <span className="setd-t mono">{hm(set.at)}</span>
      </div>
      <SetReplay set={set} bench={BENCH_IDS.includes(exId)} />
      <div className="setd-grid">
        <div><small>RPE</small><b className="mono">{rpeLabel(set.rpe, set.rir)}</b></div>
        <div><small>{t('Kalan tekrar')}</small><b className="mono">{rirTxt(set.rir)}</b></div>
        <div><small>{t('Zor set')}</small><b className="mono" style={{ color: set.rir <= 4 ? 'var(--ok)' : 'var(--faint)' }}>{set.rir <= 4 ? t('evet') : t('hayır')}</b></div>
        <div><small>1RM</small><b className="mono" style={e1 && !e1.ok ? { color: 'var(--faint)' } : undefined}>{e1 ? (e1.ok ? '' : '≈') + nf(e1.v) : '–'}</b></div>
      </div>
      {/* Set kaydında seçilenler: son tekrarın hızı, ROM ve tonaj */}
      <div className="setd-grid three">
        <div><small>{t('Son tekrar hızı')}</small><b style={{ color: set.lvl != null && PX_SPEED[set.lvl] ? PX_SPEED_COLORS[set.lvl] : undefined }}>{set.lvl != null && PX_SPEED[set.lvl] ? PX_SPEED[set.lvl].k : '–'}</b></div>
        <div><small>ROM</small><b className="mono">{pct(hasNum(set.rom) ? Math.round(Number(set.rom)) : 100)}</b></div>
        <div><small>{t('Tonaj')}</small><b className="mono">{nf(Math.round((Number(set.kg) || 0) * set.reps * dbMultiplier(exId, name) * 10) / 10)} kg</b></div>
      </div>
      {set.tags && set.tags.length ? <div className="chips-wrap">{set.tags.map((x) => <span key={x} className="fchip on">{t(x)}</span>)}</div> : null}
      {set.note ? <p className="sd-note">{set.note}</p> : null}
      {onDelete ? <HoldButton id="set-del" className="btn ghost sm danger-t setd-del" onHold={() => { onDelete(); onClose(); }}><Icon name="trash" size={13} /> {t('Seti sil')}</HoldButton> : null}
    </div>
  );
}

function NoteSheetBody({ init, onSave, onClose }) {
  const [memo, setMemo] = useState(init.memo || '');
  const [toProgram, setToProgram] = useState(false);
  return (
    <div className="note-sheet">
      {/* V34 · yalnızca hareket notu; set özellikleri ve set notu set kaydedildikten sonra (SetAttrSheetBody) */}
      <label className="st-k" htmlFor="ex-memo">{t('Hareket notu')}</label>
      <textarea id="ex-memo" className="text-area" rows={3} placeholder={t('örn. koltuk 4. kademe, gelecek hafta 77,5 kg')} value={memo} onChange={(e) => setMemo(e.target.value)} />
      {init.canProgram ? (
        <label className="check-row"><input id="memo-to-program" type="checkbox" checked={toProgram} onChange={(e) => setToProgram(e.target.checked)} /> {t('Plandaki nota da kaydet, sonraki antrenmanda görünsün')}</label>
      ) : null}
      <p className="muted-p" style={{ margin: 0 }}>{t('Bir setin özelliğini (drop set, hasta, yorgun…) set bitince dinlenme ekranından ya da sete dokunarak ekle.')}</p>
      <button type="button" id="note-save" className="btn primary full" onClick={() => { onSave({ memo, toProgram }); onClose(); }}>{t('Kaydet')}</button>
    </div>
  );
}

// V34 · Set özelliği: kaydedilmiş bir sete set tipi, o anki durum ve nasıl geçtiği yazılır; set ayrıntısında görünür.
function SetAttrSheetBody({ init, onSave, onClose }) {
  const [tags, setTags] = useState(init.tags || []);
  const [note, setNote] = useState(init.note || '');
  const tog = (tag) => setTags(tags.includes(tag) ? tags.filter((x) => x !== tag) : [...tags, tag]);
  const group = (id, title, list) => (
    <React.Fragment>
      <span className="st-k">{title}</span>
      <div className="chips-wrap" id={id}>
        {list.map((tag) => <button key={tag} type="button" aria-pressed={tags.includes(tag)} className={'fchip attr' + (tags.includes(tag) ? ' on' : '')} onClick={() => tog(tag)}>{t(tag)}</button>)}
      </div>
    </React.Fragment>
  );
  return (
    <div className="note-sheet">
      {init.strength ? group('set-attrs', t('Set tipi'), SET_ATTRS) : null}
      {init.strength && tags.includes('Tükenişe kadar') && !(init.tags || []).includes('Tükenişe kadar') ? <p className="muted-p" style={{ margin: 0 }}>{t('Tükenişe kadar: son tekrar hızı "Zar zor" (RIR 0) olarak kaydolur.')}</p> : null}
      {group('set-conds', t('Durum'), SET_CONDS)}
      {group('set-feel', t('Nasıl geçti'), SET_FEEL)}
      <input id="set-note" className="text-in" placeholder={t('Set notu (isteğe bağlı)')} value={note} onChange={(e) => setNote(e.target.value)} />
      <button type="button" id="attr-save" className="btn primary full" onClick={() => { onSave({ tags, note: note.trim() }); onClose(); }}>{t('Kaydet')}</button>
    </div>
  );
}

/* ---------- özet + plan kaydı ---------- */
function SummaryBody({ session, st, put, del, openSheet, onDelete, onClose }) {
  const ss = sessionStats(session);
  const all = st.sessions.some((x) => x.id === session.id) ? st.sessions.map((x) => (x.id === session.id ? session : x)) : [session, ...st.sessions];
  const ls = logStats(all, session.endedAt || Date.now());
  const goals = readGoals(st.settings);
  const matchingSkillGoals = goals.filter(
    (g) => g.type === 'skill' && session.items.some((it) => it.sets.length > 0 && matchesSkillGoal(g, it))
  );
  const notes = [];
  session.items.forEach((it) => {
    if (it.memo) notes.push(exName(it) + ': ' + it.memo);
    it.sets.forEach((x, j) => { if (x.note || (x.tags && x.tags.length)) notes.push(exName(it) + ' · ' + t('set {n}', { n: j + 1 }) + ': ' + [x.tags ? x.tags.map((tag) => t(tag)).join(', ') : '', x.note || ''].filter(Boolean).join(' · ')); });
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
      {session.autoEnd ? <p className="auto-end-note">{t('Kendiliğinden bitirildi: 15 dakika giriş olmadı. Bitiş saati son girişin saati.')}</p> : null}
      <div className="tiles">
        <Tile k={t('Süre')} v={durTxt(ss.dur)} unit="" />
        <Tile k={t('Set')} v={ss.sets.length} unit="" sub={t('{n} zor set', { n: ss.hard.length })} />
        <Tile k={t('Tonaj')} v={nf(Math.round(ss.tonnage))} unit=" kg" />
        <button type="button" className="tile tile-btn" onClick={() => openSheet('fatigue', {})}>
          <span className="tile-k">{t('Yorgunluk')}</span>
          <span className="tile-v mono" style={{ color: zoneOf(sf.post).c }}>{Math.round(sf.pre)} → {Math.round(sf.post)}</span>
          <span className="tile-sub">{t('başta → sonda')} · {zoneOf(sf.post).k}</span>
        </button>
      </div>
      <ul className="sum-ex">
        {session.items.filter((it) => it.sets.length).map((it) => {
          const best = bestE1(it.sets), pb = best ? prevBest(it) : 0, d = pb ? best - pb : 0;
          const skill = isSkill(it.exId) || it.sets.some((z) => z.skill);
          return (
            <li key={it.id}>
              <div className="se-top">
                <strong>{exName(it)}</strong>
                <span className="mono se-e1">
                  {best
                    ? <React.Fragment>e1RM {nf(Math.round(best * 2) / 2)}{pb ? <em className={d >= 0 ? 'up' : 'down'}> {d >= 0 ? '+' : '−'}{nf(Math.abs(Math.round(d * 2) / 2))}</em> : null}</React.Fragment>
                    : skill
                      ? t('{n} deneme', { n: it.sets.reduce((a, z) => a + z.reps, 0) })
                      : isPlyo(it.exId)
                        ? t('{n} temas', { n: it.sets.reduce((a, z) => a + z.reps, 0) })
                        : 'e1RM –'}
                </span>
              </div>
              <div className="se-sets">
                {it.sets.map((z, j) => (
                  <button key={j} type="button" className="se-set" aria-label={t('Set {n} ayrıntısı', { n: j + 1 })} onClick={() => openSheet('setdetail', { title: exName(it), exId: it.exId, set: z, idx: j })}>
                    <span className="mono">
                      {z.dur
                        ? warmSetTxt(z)
                        : z.warm
                        ? t('ısn')
                        : z.skill
                        ? skillSetTxt(z)
                        : z.plyo
                          ? (Number(z.kg) ? '+' + nf(Number(z.kg)) + '×' + z.reps : t('{n} temas', { n: z.reps }))
                          : nf(Number(z.kg)) + '×' + z.reps}
                    </span>
                    <i style={z.warm ? { background: '#4aa8ff', width: '100%', opacity: 0.6 } : z.skill ? { background: (SKILL_Q[z.q || 0] || SKILL_Q[0]).c, width: '100%' } : z.plyo ? { background: PLYO_Q[z.q || 0].c, width: '100%' } : { background: vlColor(z.vl), width: Math.max(10, z.vl * 100) + '%' }} />
                    <small className="mono">{hm(z.at)}</small>
                  </button>
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
            <span><strong>{exName({ exId: g.exId, name: g.name })}</strong> · <span className="mono">{t('{n} temiz deneme', { n: cleanAttempts })}</span></span>
            {g.stage < 3 ? (
              <button type="button" className="btn primary sm" onClick={() => advanceGoal(g.id)}>{t('Aşamayı ilerlet')}</button>
            ) : (
              <span className="badge ok">{t('Öğrenildi ✓')}</span>
            )}
          </div>
        );
      })}
      {notes.length ? <div className="sum-notes"><span className="st-k">{t('Notlar')}</span>{notes.map((line, i) => <p key={i}>{line}</p>)}</div> : null}
      <SessionMuscles session={session} week={ls.muscles} />
      <div className="sum-actions">
        <button type="button" id="save-tmpl" className="btn ghost" onClick={() => openSheet('saveTemplate', { session })}><Icon name="plus" size={14} /> {t('Plan olarak kaydet')}</button>
        <HoldButton id="sum-del" className="btn ghost sm danger-t" onHold={() => { onDelete(session.id); onClose(); }}>{t('Kaydı sil')}</HoldButton>
      </div>
    </div>
  );
}

function SaveTemplateBody({ session, put, onClose, onSaved }) {
  const [name, setName] = useState(isFree(session) ? '' : t('{x} (yeni)', { x: sessionName(session) }));
  const [wds, setWds] = useState([]);
  // V33 · plan kaydında ısınma setleri sayılmaz; yalnızca ısınma yapılan hareket ve antrenman öncesi ısınma süresiyle kaydedilir
  const items = session.items.filter((it) => it.sets.length).map((it) => {
    if (isWarmEx(it.exId)) {
      const last = it.sets.at(-1) || {};
      return { id: newId('i'), exId: it.exId, name: it.name, muscle: it.muscle, sets: 1, repMin: 1, repMax: 1, kg: null, rpeMin: null, rpeMax: null, rest: 60, note: '', dur: Number(last.dur) || 10, z: Number(last.z) || 2 };
    }
    const work = it.sets.filter((z) => !z.warm);
    const reps = (work.length ? work : it.sets).map((z) => z.reps);
    const rpes = work.map((z) => z.rpe).filter((r) => r != null);
    const sk = isSkill(it.exId);
    const pl = isPlyo(it.exId);
    return {
      id: newId('i'),
      exId: it.exId,
      name: it.name,
      muscle: it.muscle,
      sets: work.length || it.sets.length,
      repMin: Math.min(...reps),
      repMax: Math.max(...reps),
      kg: sk ? null : Number((work.length ? work : it.sets).at(-1).kg) || null,
      rpeMin: sk || pl || !rpes.length ? null : Math.min(...rpes),
      rpeMax: sk || pl || !rpes.length ? null : Math.max(...rpes),
      rest: it.target.rest || (sk ? 90 : 120),
      note: it.memo || '',
    };
  });
  const save = () => {
    const planName = name.trim() || t('Yeni plan');
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
      <label className="st-k" htmlFor="tmpl-name">{t('Adı')}</label>
      <input id="tmpl-name" className="text-in" placeholder={t('örn. Omuz + kol')} value={name} onChange={(e) => setName(e.target.value)} />
      <span className="st-k">{t('Her hafta')}</span>
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
      <p className="muted-p">{t('{n} hareket, yaptığın set ve tekrar değerleriyle yeni bir plan olarak kaydedilir.', { n: items.length })}</p>
      <button type="button" id="tmpl-save" className="btn primary full" onClick={save}>{t('Kaydet')}</button>
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
    it: latestDay.current.items[i], idx: i, n: latestDay.current.items.length,
    onChange: (nit) => commit((nd) => { nd.items[i] = nit; }),
    onMove: (d) => commit((nd) => { const a = nd.items; const j = i + d; if (j < 0 || j >= a.length) return; const tmp = a[i]; a[i] = a[j]; a[j] = tmp; }),
    onRemove: () => commit((nd) => { nd.items.splice(i, 1); }),
  });
  const addItem = () => openSheet('picker', {
    low,
    onPick: (ex) => {
      const nit = itemFromEx(ex);
      commit((nd) => { nd.items.push(nit); });
      // seçici kapandıktan sonra yeni hareketin set/tekrar penceresi açılır (ikinci dokunuş gerekmez)
      const i = latestDay.current.items.length - 1;
      setTimeout(() => editItem(i), 0);
    },
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
          <button type="button" id="ed-back" className="nav-arrow" aria-label={t('Geri')} onClick={() => { flush(); onBack(); }}><Icon name="left" size={18} /></button>
          <div className="shead-t"><h1>{t('Plan')}</h1></div>
          <span className={'save-st mono' + (saved ? ' ok' : '')}>{saved ? t('Kaydedildi') : '…'}</span>
          <HoldButton id="plan-del" className="btn ghost sm danger-t" aria-label={t('Planı sil (1 saniye basılı tut)')} onHold={handleDelete}>{t('Sil')}</HoldButton>
        </div>
      </header>
      <div className="ed2-body">
        <div className="ed2-dayhead">
          <input
            id="plan-name"
            className="day-name prog-name2"
            aria-label={t('Plan adı')}
            value={day.name}
            placeholder={t('Plan adı (örn. Push)')}
            onChange={(e) => commit((nd) => { nd.name = e.target.value; })}
          />
        </div>
        <div className="ed2-sec">
          <span className="st-k">{t('Her hafta')}</span>
          <div className="wd-pick" role="group" aria-label={t('Her hafta')}>
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
          <span className="st-k">{t('Hareketler')}</span>
          {day.items.length ? (
            <ol className="items">
              {day.items.map((it, i) => {
                const m = exMeta(it.exId, it.name);
                return (
                  <li key={it.id} className="item">
                    <button type="button" className="item-row" onClick={() => editItem(i)}>
                      <span className="item-i mono">{i + 1}</span>
                      <span className="item-t">
                        <strong>{exName(it)}</strong>
                        <small className="mono">{targetTxt(it, it.exId)} · {restTxt(it.rest)}</small>
                        {it.note ? <em>{noteLabel(it.note)}</em> : null}
                      </span>
                      {exDot(m)}
                    </button>
                  </li>
                );
              })}
            </ol>
          ) : <div className="empty sm"><strong>{t('Boş plan')}</strong><p>{t('Hareketleri tek tek ekle. Listede olmayanı adını yazarak ekleyebilirsin.')}</p></div>}
          <button type="button" id="add-item" className="add-item" onClick={addItem}>+ {t('Hareket ekle')}</button>
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
                <Icon name="play" size={13} /> {t('Başlat')}
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
      const labelDate = t('{d} {m} {wd}', { d: d.getDate(), m: MONTHS_LONG[d.getMonth()], wd: WD_LONG[d.getDay()] });
      const parts = [];
      if (daySessions.length) parts.push(t('{n} antrenman', { n: daySessions.length }));
      if (dayPlans.length) parts.push(t('{n} plan', { n: dayPlans.length }));
      const aria = parts.length ? labelDate + ': ' + parts.join(', ') : labelDate;
      return { d, key, inMonth, isToday, isPast, daySessions, dayPlans, markers, aria };
    });
  }, [viewYm.y, viewYm.m, todayKey, done, st.programs]);

  const [slide, setSlide] = useState(null); // V33 · ay değişiminde kısa kayma: { d: -1 | 1, n }
  const changeMonth = (delta) => {
    const nd = new Date(viewYm.y, viewYm.m + delta, 1);
    setViewYm({ y: nd.getFullYear(), m: nd.getMonth() });
    setSlide((p) => ({ d: delta, n: (p ? p.n : 0) + 1 }));
  };
  // V33 · takvimde parmakla sağa sola kaydırınca ay değişir (sola: sonraki ay). Kaydırma sonrası gelen tıklama gün seçmez.
  const swipe = useRef(null);
  const calDown = (e) => { swipe.current = { x: e.clientX, y: e.clientY, done: false }; };
  const calUp = (e) => {
    const sw = swipe.current;
    if (!sw) return;
    const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) { sw.done = true; changeMonth(dx < 0 ? 1 : -1); }
    else swipe.current = null;
  };
  const calClickCapture = (e) => { if (swipe.current && swipe.current.done) { e.stopPropagation(); e.preventDefault(); } swipe.current = null; };
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
  const selSleep = selIsFuture ? null : sleepNights(st.checkins, new Date(selDate.getFullYear(), selDate.getMonth(), selDate.getDate(), 12).getTime(), 1)[0];
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

  // Hareket gelişimi (V32): yapılmış bütün hareketler; ayrıntı pencerede.
  const progIdx = useMemo(() => exerciseIndex(st.sessions), [st.sessions]);
  const progRecent = progIdx.filter((e) => e.recent).length;

  // Haftalık yük (V32): bu hafta yapılan ve bu haftanın planı ayrı.
  const weekDone = weekDoneStats(st.sessions, Date.now());
  const twp = thisWeekProgram(st.programs, Date.now());
  const twStats = planStats(twp);
  const planSets = twStats.sets;
  const hasWeekPlan = twp.days.length > 0;

  return (
    <div className="screen pxt gozlem-screen">
      <ScreenHead title={t('Antrenman plan ve gözlem')} />
      <div className="scr">
        <section className="cal-sec">
          <div className="cal-nav">
            <div className="cal-nav-l">
              <button type="button" id="cal-prev" className="nav-arrow" aria-label={t('Önceki ay')} onClick={() => changeMonth(-1)}><PxIcon name="left" size={16} /></button>
              <span className="cal-title">{MONTHS_LONG[viewYm.m]} {viewYm.y}</span>
              <button type="button" id="cal-next" className="nav-arrow" aria-label={t('Sonraki ay')} onClick={() => changeMonth(1)}><PxIcon name="right" size={16} /></button>
            </div>
            {!isCurrentMonth ? (
              <button type="button" id="cal-today" className="btn ghost sm" onClick={goToday}>{t('Bugün')}</button>
            ) : null}
          </div>
          <div className="cal-wds" aria-hidden="true">
            {WEEK_ORDER.map((w) => <span key={w}>{WD_SHORT[w]}</span>)}
          </div>
          <div
            className={'cal' + (slide ? (slide.d > 0 ? (slide.n % 2 ? ' slA' : ' slB') : (slide.n % 2 ? ' srA' : ' srB')) : '')}
            role="grid"
            aria-label={t('Aylık antrenman takvimi')}
            onPointerDown={calDown}
            onPointerUp={calUp}
            onPointerCancel={() => { swipe.current = null; }}
            onClickCapture={calClickCapture}
          >
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

        <section id="day-panel" aria-label={t('Seçili gün ayrıntısı')}>
          <div className="day-h">
            {t('{d} {m} {wd}', { d: selDate.getDate(), m: MONTHS_LONG[selDate.getMonth()], wd: WD_LONG[selDate.getDay()] })}{selIsToday ? ' · ' + t('Bugün') : ''}
          </div>
          {selSessions.map((s) => {
            const ss = sessionStats(s);
            const f = sessionFatigue(s, st).post;
            return (
              <button key={s.id} type="button" className="hrow sm" onClick={() => openSheet('summary', { id: s.id })}>
                <i className={'hrow-dot' + (isSkillHeavySession(s) ? ' skill' : '')} />
                <span className="hrow-t">
                  <strong>{sessionName(s)}</strong>
                  <small className="mono">{durTxt(ss.dur)} · {t('{n} set', { n: ss.sets.length })}</small>
                </span>
                {f != null ? <span className="hrow-f mono" style={{ color: zoneOf(f).c, borderColor: zoneOf(f).c }}>{Math.round(f)}</span> : <span />}
              </button>
            );
          })}
          {selPlans.map(({ programId, day: pDay, src }) => {
            const prog = st.programs.find((p) => p.id === programId);
            const isDone = selSessions.some((s) => s.dayId === pDay.id);
            const srcTxt = src === 'hafta' ? t('Her {wd}', { wd: WD_SHORT[selDate.getDay()] }) : t('Tek gün');
            const openMenu = menuDid === pDay.id;
            return (
              <div key={pDay.id} className="day-plan-wrap">
                <div className={'day-plan-row' + (isDone ? ' done' : '')}>
                  <span className="day-plan-ic">{isDone ? '✓' : '○'}</span>
                  <span className="day-plan-t">
                    <strong>{dayLabel(pDay.name)}</strong>
                    <small>· {srcTxt}</small>
                  </span>
                  {selIsToday && !isDone ? (
                    <button type="button" className="btn primary sm" onClick={() => startSession(prog, pDay)}>{t('Başlat')}</button>
                  ) : null}
                  <button
                    type="button"
                    className="day-plan-more"
                    aria-label={t('{x} menüsü', { x: dayLabel(pDay.name) })}
                    onClick={() => setMenuDid(openMenu ? null : pDay.id)}
                  >
                    <PxIcon name="more" size={18} />
                  </button>
                </div>
                {openMenu ? (
                  <div className="day-plan-menu">
                    <button type="button" className="btn ghost sm danger-t" onClick={() => handleRemoveFromDay(programId, pDay)}>{t('Bu günden kaldır')}</button>
                    <button type="button" className="btn ghost sm" onClick={() => { setMenuDid(null); if (prog) editPlan(prog, pDay, 'gozlem'); }}>{t('Planı düzenle')}</button>
                  </div>
                ) : null}
              </div>
            );
          })}
          {!selIsFuture ? (
            <p className="day-meta mono">
              {selSleep != null ? t('Uyku') + ' ' + t('{n} sa', { n: nf(Math.round(selSleep * 10) / 10) }) : t('Uyku') + ' –'} · {t('Yorgunluk')} {selFatScore}
            </p>
          ) : null}
          {!selIsPast ? (
            <button type="button" id="day-add-plan" className="add-item" onClick={() => openSheet('planPick', { dayKey: selKey })}>
              + {t('Bu güne plan ekle')}
            </button>
          ) : null}
        </section>

        <section className="hsec">
          <div className="sec2-h"><span className="eyebrow">{t('{m} ÖZETİ', { m: upper(MONTHS_LONG[viewYm.m]) })}</span></div>
          <div className="mgrid">
            <Metric k={tc('metric', 'Antrenman')} v={m.n} sub={t('{n} / hafta', { n: nf(Math.round(m.perWeek * 10) / 10) })} />
            <Metric k={t('Toplam süre')} v={m.n ? durTxt(m.dur) : '–'} sub={m.n ? t('ort. {x}', { x: durTxt(m.avgDur) }) : null} />
            <Metric k={tc('metric', 'Set')} v={m.sets} sub={t('{n} zor set', { n: m.hard })} />
            <Metric k={t('Tonaj')} v={m.sets ? tonTxt(m.ton) : '–'} sub={m.sets ? t('ort. RPE {n}', { n: nf(Math.round(m.avgRpe * 10) / 10) }) : null} />
          </div>
        </section>

        <button type="button" id="obs-fatigue" className="fcard" onClick={() => openSheet('fatigue', {})}>
          <Ring pixel score={head} zone={zoneOf(head)} size={72} label={t('Seans başında ortalama yorgunluk')} />
          <span className="fcard-t">
            <span className="st-k">{avgF != null ? t('Seans başında ort.') : t('Şu an')}</span>
            <span className="zone-pill sm" style={{ color: zoneOf(head).c, borderColor: zoneOf(head).c }}>{zoneOf(head).k}</span>
            <span className="fcard-s mono">{avgPost != null ? t('sonda ort. {n}', { n: Math.round(avgPost) }) + ' · ' : ''}{t('şu an {n}', { n: Math.round(fz.score) })}</span>
          </span>
          <FatigueBars pts={scored.slice().reverse().slice(-12)} />
        </button>

        <section className="warns" aria-label={t('Uyarılar')}>
          <div className="sec2-h"><span className="eyebrow">{t('Uyarılar')}</span><span className={'mono warn-n' + (alerts ? ' on' : '')}>{alerts ? t('{n} uyarı', { n: alerts }) : t('temiz')}</span></div>
          {warns.length ? warns.map((w, i) => (
            <div key={i} className={'warn-row ' + w.lv}>
              <i />
              <span><strong>{w.t}</strong><small>{w.d}</small></span>
            </div>
          )) : (
            <div className="warn-row ok"><i /><span><strong>{t('Uyarı yok')}</strong><small>{t('Hacim, yorgunluk ve uyku dengede görünüyor.')}</small></span></div>
          )}
        </section>

        <button type="button" id="obs-progress" className="tcard obs-week" onClick={() => openSheet('progress', {})}>
          <span className="obs-week-l">
            <strong>{t('Hareket gelişimi')}</strong>
            <small>{progIdx.length ? t('{n} hareket', { n: progIdx.length }) + ' · ' + t('son {d} günde {n}', { d: RECENT_DAYS, n: progRecent }) : t('Kayıt yaptıkça hareketlerin burada listelenir')}</small>
          </span>
          <PxIcon name="right" size={16} />
        </button>

        <section className="hsec obs-load" aria-label={t('Haftalık yük')}>
          <div className="sec2-h"><span className="eyebrow">{t('Haftalık yük')}</span><span className="mono">{t('kas başına zor set')}</span></div>
          <div className="obs-load-btns">
            <button type="button" id="obs-done" className="tcard obs-week obs-load-b" onClick={() => openSheet('weekDone', {})}>
              <span className="obs-week-l">
                <strong>{t('Yapılan')}</strong>
                <small>{t('bu hafta {n} zor set', { n: weekDone.hard })}</small>
              </span>
              <PxIcon name="right" size={14} />
            </button>
            <button type="button" id="obs-plan" className="tcard obs-week obs-load-b" disabled={!hasWeekPlan} onClick={() => openSheet('plan', { getProgram: () => thisWeekProgram(st.programs, Date.now()) })}>
              <span className="obs-week-l">
                <strong>{t('Planlanan')}</strong>
                <small>{hasWeekPlan ? t('bu hafta {n} zor set', { n: planSets }) : t('bu hafta plan yok')}</small>
              </span>
              <PxIcon name="right" size={14} />
            </button>
          </div>
        </section>
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
        <p className="muted-p">{t('Önce bir plan oluştur')}</p>
        <button type="button" className="btn primary full" onClick={() => { onClose(); newPlan('gozlem'); }}>{t('Yeni plan')}</button>
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
      <div className="plan-pick-list" role="radiogroup" aria-label={t('Plan seç')}>
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
              <strong>{dayLabel(x.day.name)}</strong>
              <span className="mono" style={{ fontSize: '12px', color: 'var(--muted)' }}>{t('{n} hareket', { n: x.day.items.length })}</span>
            </button>
          );
        })}
      </div>
      <Switch id="plan-pick-repeat" label={t('Her hafta {wd} tekrarla', { wd: wdName })} on={repeat} onChange={setRepeat} />
      <button type="button" id="plan-pick-save" className="btn primary full" onClick={save}>{t('Ekle')}</button>
    </div>
  );
}

function ItemSheetBody({ it: it0, idx, n, onChange, onMove, onRemove, onClose, openSheet, fx }) {
  const [it, setIt] = useState(it0);
  const m = exMeta(it.exId, it.name);
  return (
    <div className="itemsheet">
      <FactChips ex={m} />
      {m ? <button type="button" className="mod-link" onClick={() => openSheet('exercise', { exId: m.id })}><Icon name="info" size={13} /> {m.bio ? t('Biyomekanik ve geçmiş') : t('Hareket bilgisi ve geçmiş')}</button> : null}
      <ItemEditor it={it} idx={idx} n={n} fx={fx} onChange={(nit) => { setIt(nit); onChange(nit); }} onMove={(d) => { onMove(d); onClose(); }} onRemove={() => { onRemove(); onClose(); }} />
      {/* V33 · değişiklikler anında kaydedilir; onay düğmesi pencereyi kapatır */}
      <button type="button" id="item-ok" className="btn primary full item-ok" onClick={onClose}>{t('Onayla')}</button>
    </div>
  );
}

function PickerBody({ custom, addCustom, onPick, onClose, low, openSheet }) {
  const [newMuscle, setNewMuscle] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const all = useMemo(() => [
    ...warmFirst(EX_LIB.map((e) => ({ ...e, exId: e.id, src: 'lib' }))),
    ...custom.map((c) => ({ id: c.id, exId: c.id, name: c.name, muscle: c.muscle, rest: 90, kind: 'kuvvet', src: 'custom' })),
  ], [custom]);
  const f = useExFilter(all);
  const exact = all.some((e) => normTr(e.name) === normTr(f.q));
  const pick = (e) => { onPick(e); onClose(); };
  return (
    <div className="picker2">
      <ExFilterBar f={f} idp="ex" placeholder={t('Ara ya da yeni hareket yaz')} />
      {low && low.length && !f.q ? (
        <div className="lowrow"><span className="st-k">{t('Haftada 10 setin altında')}</span>
          <div className="chips-scroll">{low.map((m) => <button key={m} type="button" className={'fchip warn' + (f.grp === m ? ' on' : '')} onClick={() => f.setGrp(f.grp === m ? null : m)}>{muscleName(m)}</button>)}</div>
        </div>
      ) : null}
      {f.q.trim() && !exact && (showNew || !f.list.length) ? (
        <div className="new-ex">
          <div className="new-ex-top"><span className="badge new">{t('Yeni')}</span><strong>{f.q.trim()}</strong></div>
          <div className="chips-wrap">{MUSCLES.map((m) => <button key={m} type="button" className={'fchip sm' + (newMuscle === m ? ' on' : '')} onClick={() => setNewMuscle(m)}>{muscleName(m)}</button>)}</div>
          <button type="button" id="ex-add-new" className="btn fire full" onClick={() => { const d = addCustom(f.q.trim(), newMuscle); pick({ exId: d.id, name: d.name, muscle: d.muscle, rest: 90 }); }}>{t('Ekle')}</button>
        </div>
      ) : null}
      <span className="exf-count mono">{t('{n} hareket', { n: f.list.length })}</span>
      <ul className="ex-list2">
        {f.list.slice(0, f.lim).map((e) => (
          <li key={e.src + e.id} className="exr">
            <button type="button" className="exr-main" onClick={() => pick(e)}>
              <span className="exr-n">{exName(e)}</span>
              <span className="exr-k">
                {exDot(e)}
                <span>{exLine(e)}</span>
                {e.src === 'custom' ? <span className="badge own">{t('özel')}</span> : null}
              </span>
            </button>
            {e.src === 'lib' ? <button type="button" className="nav-arrow info" aria-label={t('{x} bilgisi', { x: exName(e) })} onClick={() => openSheet('exercise', { exId: e.id })}><Icon name="info" size={16} /></button> : null}
          </li>
        ))}
      </ul>
      {f.list.length > f.lim ? <button type="button" id="ex-more" className="btn ghost full" onClick={f.more}>{t('Daha fazla göster')} ({f.list.length - f.lim})</button> : null}
      {f.q.trim() && !exact && f.list.length && !showNew ? <button type="button" id="ex-new-open" className="add-item" onClick={() => setShowNew(true)}>{t('+ “{x}” adıyla özel hareket ekle', { x: f.q.trim() })}</button> : null}
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
  if (sim && sim.post >= 85) recs.push(t('En ağır günün sonunda yorgunluk çok yüksek. O günün setlerini iki güne böl ya da birkaç seti 2–3 tekrar kala bitir.'));
  if (sim && sim.pre >= 40) recs.push(t('Seanslara yorgun başlıyorsun. Planlar arasında en az 48 sa bırak ya da toplam seti %20 azalt.'));
  if (over.length) recs.push(t('{list}: haftada 20 zor setin üstü. Fazlası toparlanmayı uzatır, ek kazanımı belirsiz.', { list: over.map(muscleName).join(', ') }));
  if (sim && sim.unplaced) recs.push(t('{n} planın haftanın günü yok, hesaba katılmadı.', { n: sim.unplaced }));
  if (sim && !recs.length) recs.push(t('Dağılım dengeli: seanslara toparlanmış başlıyorsun.'));
  return (
    <div className="plan2">
      {sim ? (
        <button type="button" className="plan2-meter" onClick={() => openSheet('fatigue', { sim: simFromPlan(p), source: t('Planına göre') })}>
          <Ring pixel score={sim.pre} zone={zoneOf(sim.pre)} size={72} label={t('Seans başında yorgunluk')} />
          <div className="pm-t">
            <span className="zone-pill" style={{ color: zoneOf(sim.pre).c, borderColor: zoneOf(sim.pre).c }}>{zoneOf(sim.pre).k}</span>
            <span className="pm-sub mono">{t('Seans başı ort. {a} · en yüksek tepe {b}', { a: Math.round(sim.pre), b: Math.round(sim.post) })}</span>
            <span className="pm-link">{t('Simüle et')} ›</span>
          </div>
        </button>
      ) : <p className="muted-p">{t('Hesap için planlara haftanın günü ve hareket ekle.')}</p>}
      {sim ? (
        <div className="pdays2">
          <div className="pd2 sh"><span>{t('Gün')}</span><span>{t('Plan')}</span><span>{t('Başta')}</span><span>{t('Sonda')}</span></div>
          {sim.per.map((x, i) => (
            <div key={i} className="pd2">
              <span className="mono">{x.d.weekday == null ? '—' : WD_SHORT[x.d.weekday]}</span>
              <span className="pd2-n">{dayLabel(x.d.name)}</span>
              <b className="mono" style={{ color: zoneOf(x.pre).c }}>{Math.round(x.pre)}</b>
              <b className="mono" style={{ color: zoneOf(x.post).c }}>{Math.round(x.post)}</b>
            </div>
          ))}
        </div>
      ) : null}
      <span className="st-k">{t('Kas başına haftalık zor set')}</span>
      <MuscleBars muscles={ps.muscles} list={names} />
      <p className="chart-note">{t('Taralı alan haftada 10–20 set: hipertrofi için sık önerilen aralık. RPE hedefi 6’nın altındaki setler sayılmaz.')}</p>
      <div className="recs2">{recs.slice(0, 3).map((x, i) => <p key={i}>{x}</p>)}</div>
    </div>
  );
}

// V32 · Bu hafta yapılan yük (Pazartesi'den şu ana): kas başına zor set; plan varsa her kasta planlanan da işaretlenir.
function WeekDoneBody({ st }) {
  const now = Date.now();
  const w = weekDoneStats(st.sessions, now);
  const twp = thisWeekProgram(st.programs, now);
  const plan = twp.days.length ? planStats(twp).muscles : null;
  const names = Array.from(new Set([...MAIN_MUSCLES, ...Object.keys(w.muscles), ...(plan ? Object.keys(plan) : [])]))
    .sort((a, b) => (w.muscles[b] || 0) - (w.muscles[a] || 0) || ((plan && plan[b]) || 0) - ((plan && plan[a]) || 0));
  const planTotal = plan ? Object.values(plan).reduce((a, n) => a + n, 0) : 0;
  const d0 = new Date(w.from);
  return (
    <div className="plan2 week-done">
      <p className="wd-sum mono">
        {t('{d} {m} – bugün', { d: d0.getDate(), m: MONTHS[d0.getMonth()] })} · {t('{n} antrenman', { n: w.n })} · <b>{t('{n} zor set', { n: w.hard })}</b>
        {plan ? ' · ' + t('plan {n}', { n: planTotal }) : ''}
      </p>
      {w.contacts || w.attempts ? (
        <p className="wd-sum mono">{[w.contacts ? t('{n} temas', { n: w.contacts }) : null, w.attempts ? t('{n} deneme', { n: w.attempts }) : null].filter(Boolean).join(' · ')}</p>
      ) : null}
      <span className="st-k">{t('Kas başına zor set · bu hafta')}</span>
      <MuscleBars muscles={w.muscles} list={names} plan={plan} status />
      <p className="chart-note">{plan
        ? t('Sayı: yapılan/planlanan. Çizgi bu haftanın planı, taralı alan haftada 10–20 zor set. Zor set: bitişe 4 tekrar ya da daha az kala biten set.')
        : t('Taralı alan haftada 10–20 zor set: kas gelişimi için sık önerilen aralık. Zor set: bitişe 4 tekrar ya da daha az kala biten set.')}</p>
    </div>
  );
}

function FatigueBody({ st, init, source, showNow, openSheet }) {
  const [v, setV] = useState(init);
  // Ölçer iki şey gösterebilir: kayıtlardan "şu an" ya da kaydırıcılardaki "simülasyon".
  // Kaydırıcıya dokunulunca ibre simülasyona geçer ki değişiklik ibrede görünsün; "Şu an" ile geri dönülür.
  const [mode, setMode] = useState(showNow ? 'now' : 'sim');
  const set = (k) => (x) => { setV((p) => ({ ...p, [k]: x })); setMode('sim'); };
  const r = steadyWeek(v);
  const now = showNow ? fatigueAt(st, Date.now()) : null;
  const useNow = now && mode === 'now';
  const head = useNow
    ? { score: now.score, zone: now.zone, l1: t('antrenman {a} + uyku {b}', { a: Math.round(now.train), b: now.sleep.known ? Math.round(now.sleepPts) : '?' }), l2: now.hrs ? t('~{n} sa sonra toparlanmış', { n: now.hrs }) : t('antrenmandan toparlanmış'), l3: t('Şu an · kayıtların ve uykun') }
    : { score: r.pre, zone: r.zone, l1: t('seans başında · sonda {n}', { n: Math.round(r.post) }), l2: t('seans sonrası ~{n} sa toparlanma', { n: r.hrs }), l3: (now ? t('Simülasyon') : source) + ' · ' + t('haftan böyle sürerse') };
  const recs = useNow
    ? fatigueRecs({ score: now.score, sleepLast: now.sleep.lastAvg ? null : now.sleep.last, sleepAvg: now.sleep.avg3, sleepN: now.sleep.lastAvg ? 3 : now.sleep.n }).concat(fatigueRecs({ pre: 0, rir: v.rir, perSession: r.perSession, post: r.post }).filter((x) => x !== t(REC_FRESH))).slice(0, 3)
    : fatigueRecs({ pre: r.pre, post: r.post, sleepLast: v.sleepLast, sleepAvg: v.sleepAvg, rir: v.rir, perSession: r.perSession });
  return (
    <div className="fat2">
      {now ? (
        <div className="segmented seg2 fat2-mode" role="tablist" aria-label={t('Ölçer neyi göstersin')}>
          <button type="button" role="tab" id="fat-now" aria-selected={mode === 'now'} className={mode === 'now' ? 'on' : ''} onClick={() => setMode('now')}>{t('Şu an')}</button>
          <button type="button" role="tab" id="fat-sim" aria-selected={mode === 'sim'} className={mode === 'sim' ? 'on' : ''} onClick={() => setMode('sim')}>{t('Simülasyon')}</button>
        </div>
      ) : null}
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
        <span className="st-k">{now ? t('Simülasyon · haftan böyle geçerse') : t('Değerleri değiştir')}</span>
        {now ? <span className="mono fat2-simv">{t('başta')} <b style={{ color: r.zone.c }}>{Math.round(r.pre)}</b> · {t('sonda')} <b style={{ color: zoneOf(r.post).c }}>{Math.round(r.post)}</b></span> : null}
      </div>
      <div className="fat2-in">
        <Range id="f-sets" label={t('Haftalık zor set (tüm kaslar)')} value={v.sets} min={4} max={80} step={2} onChange={set('sets')} display={t('{n} set', { n: v.sets })} tone="fire" />
        <Range id="f-rir" label={t('Setleri nerede bitiriyorsun')} value={v.rir} min={0} max={4} step={0.5} onChange={set('rir')} display={v.rir === 0 ? t('tükenişte') : t('{n} tekrar kala', { n: nf(v.rir) })} tone="fire" />
        <Range id="f-n" label={t('Haftada seans')} value={v.n} min={1} max={6} onChange={set('n')} display={t('{n} seans', { n: v.n })} />
        <Range id="f-heavy" label={t('Ağır bileşik hareket payı')} value={v.heavy} min={0} max={100} step={10} onChange={set('heavy')} display={pct(v.heavy)} />
        <Range id="f-sleep" label={t('Dün gece uyku')} value={v.sleepLast} min={4} max={9} step={0.5} onChange={set('sleepLast')} display={t('{n} sa', { n: nf(v.sleepLast) })} />
        <Range id="f-sleep3" label={t('Son 3 gece ortalaması')} value={v.sleepAvg} min={4} max={9} step={0.5} onChange={set('sleepAvg')} display={t('{n} sa', { n: nf(v.sleepAvg) })} />
        <Switch id="f-deload" label={t('Deload haftası')} on={v.deload} onChange={set('deload')} />
      </div>
      <div className="fat2-learn">
        <span className="st-k">{t('Nasıl hesaplanır?')}</span>
        <div className="chips-wrap">
          <button type="button" className="fchip" onClick={() => openSheet('measure', {})}>{t('Yorgunluk nasıl ölçülür?')}</button>
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

// Hareket sayfasındaki ikinci ad: Türkçede İngilizce ad, İngilizcede Türkçe ad; diğer dillerde
// hareketin o dilde kendi adı varsa İngilizce ad (yoksa başlık zaten İngilizce, satır gösterilmez).
function ExAltName({ m }) {
  const lang = getLang();
  if (lang === 'tr') return <p className="ex-en">{t('İngilizce: {x}', { x: m.en })}</p>;
  if (lang === 'en') return <p className="ex-en">{t('Türkçe: {x}', { x: m.name })}</p>;
  return exName(m) !== m.en ? <p className="ex-en">{t('İngilizce: {x}', { x: m.en })}</p> : null;
}

function ExerciseBody({ exId, name, st }) {
  const m = exMeta(exId, name);
  const series = e1Series(st.sessions, m ? m.id : exId, m ? m.name : name);
  const last = st.sessions.filter((s) => s.status === 'done').map((s) => ({ s, it: s.items.find((i) => (m && i.exId === m.id) || i.name === (m ? m.name : name)) })).filter((x) => x.it && x.it.sets.length).slice(0, 4);
  const latKind = m && m.id === 'band-yana-acis' ? 'band' : m && m.id === 'kablo-yana-acis' ? 'cable' : 'db';
  const plyo = m && m.kind === 'plyo';
  const skill = m && m.kind === 'beceri';
  const setTxt = (z) => (z.dur ? warmSetTxt(z) : z.skill ? skillSetTxt(z) : z.plyo ? (Number(z.kg) ? '+' + nf(Number(z.kg)) + '×' : '') + z.reps : (z.warm ? t('ısn') : nf(Number(z.kg)) + '×' + z.reps));
  return (
    <div className="exsheet">
      <FactChips ex={m} />
      {m && m.en ? <ExAltName m={m} /> : null}
      {m && !plyo && !skill && m.prof ? <p className="ex-prof">{PROF[m.prof].d}.</p> : null}
      {m && m.not ? <p className="ex-tip"><Icon name="info" size={13} /> {t(m.not)}</p> : null}
      {skill ? (
        <p className="ex-skill-note">{t('Beceri dinçken öğrenilir: antrenmanın başında, kalite düşünce bırak.')}</p>
      ) : null}
      {plyo ? (
        <div className="ex-plyo">
          <span className="st-k">{t('Pliometrik doz')}</span>
          <p>{t('Seans başına toplam temas: başlangıç 80–100, orta 100–120, ileri 120–140. Aynı bölgeye pliometrik çalışmalar arasında 48–72 sa bırak. Her tekrar en yüksek niyetle; kalite düşünce dur.')}</p>
          <p className="ex-src">{t('Kaynak: NSCA önerileri')}</p>
        </div>
      ) : null}
      {m && m.bio ? (
        <CompactCtx.Provider value={true}>
          <BiomechTab move={m.bio} setMove={() => {}} latKind={latKind} />
        </CompactCtx.Provider>
      ) : null}
      <div className="ex-hist">
        <span className="st-k">{t('Geçmiş')}</span>
        {last.length ? last.map(({ s, it }) => (
          <div key={s.id} className="exh-row mono"><span>{dateTxt(s.startedAt)}</span><span>{it.sets.map(setTxt).join(', ')}</span></div>
        )) : <p className="muted-p">{t('Bu hareketle henüz kayıt yok.')}</p>}
        {series.length ? <p className="mono exh-best">{t('En iyi e1RM {x} kg', { x: nf(Math.round(Math.max(...series.map((p) => p.v)) * 2) / 2) })}</p> : null}
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
  const suggestedPerf = [...new Map([...recorded, ...EX_LIB.filter(e => e.kind !== 'plyo' && e.kind !== 'beceri' && e.kind !== 'isinma' && e.fat >= 2)].map(e => [e.id, e])).values()];
  const perfOpts = (toks.length ? EX_LIB.filter(e => e.kind !== 'plyo' && e.kind !== 'beceri' && e.kind !== 'isinma' && toks.every(t => normTr(e.name + ' ' + e.en).includes(t))) : suggestedPerf).slice(0, 8);
  const perfValid = !!perf.exId && Number(perf.base) > 0 && Number(perf.target) > Number(perf.base);
  const selectPerf = (e) => {
    const pts = e1Series(st.sessions, e.id, e.name);
    setPerf({ ...perf, exId: e.id, name: e.name, base: pts.length ? Math.round(pts[pts.length - 1].v / 2.5) * 2.5 : 0 });
  };

  // Öğrenme seçenekleri (önce beceri hareketleri, sonra diğerleri, en fazla 8)
  const allSkillCandidates = useMemo(() => {
    const skills = EX_LIB.filter((e) => e.kind === 'beceri');
    const others = EX_LIB.filter((e) => e.kind !== 'beceri' && e.kind !== 'isinma');
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
        <div className="segmented seg2" role="tablist" aria-label={t('Hedef türü')}>
          <button type="button" role="tab" id="goal-type-perf" aria-selected={type === 'perf'} className={type === 'perf' ? 'on' : ''} onClick={() => { setType('perf'); setQ(''); }}>{t('Güç (1RM)')}</button>
          <button type="button" role="tab" id="goal-type-skill" aria-selected={type === 'skill'} className={type === 'skill' ? 'on' : ''} onClick={() => { setType('skill'); setQ(''); }}>{t('Öğrenme')}</button>
        </div>
      ) : null}

      {type === 'perf' ? (
        <React.Fragment>
          <span className="st-k">{t('Hareket')}{curPerfLib ? ': ' + exName(curPerfLib) : perf.name ? ': ' + exName(perf) : ''}</span>
          <input id="goal-search" className="search" type="search" placeholder={t('Hareket ara (ör. bench, squat)')} value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
          <div className="chips-wrap">{perfOpts.map((e) => <button key={e.id} type="button" className={'fchip' + (perf.exId === e.id ? ' on' : '')} onClick={() => selectPerf(e)}>{exName(e)}</button>)}</div>
          <div className="entry-steps">
            <Stepper id="goal-base" label={t('Başlangıç 1RM')} value={perf.base} step={2.5} min={0} max={400} onChange={(v) => setPerf({ ...perf, base: v })} />
            <Stepper id="goal-target" label={t('Hedef 1RM')} value={perf.target} step={2.5} min={0} max={400} onChange={(v) => setPerf({ ...perf, target: v })} />
          </div>
          <button type="button" id="goal-save" className="btn primary full" disabled={!perfValid} onClick={savePerf}>{t('Kaydet')}</button>
          {!perfValid ? <p className="goal-form-hint">{!perf.exId ? t('Önce bir hareket seç') : Number(perf.base) <= 0 ? t('Başlangıç 1RM değerini gir') : t('Hedef, başlangıçtan büyük olmalı')}</p> : null}
        </React.Fragment>
      ) : (
        <React.Fragment>
          <span className="st-k">{t('Hareket')}{skill.name ? ': ' + exName(skill) : ''}</span>
          <input id="goal-search" className="search" type="search" placeholder={t('Beceri ya da hareket ara (ör. kip-up, amut)')} value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
          <div className="chips-wrap">
            {skillOpts.map((e) => (
              <button
                key={e.id}
                type="button"
                className={'fchip' + (skill.exId === e.id && skill.name === e.name ? ' on' : '')}
                onClick={() => setSkill({ ...skill, exId: e.id, name: e.name })}
              >
                {exName(e)}
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
              {t('+ “{x}” adıyla özel hareket', { x: q.trim() })}
            </button>
          ) : null}
          <span className="st-k">{t('Aşama')}</span>
          <div className="chips-wrap" role="radiogroup" aria-label={t('Aşama')}>
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
          <label className="st-k" htmlFor="goal-due">{t('Hedef tarih (isteğe bağlı)')}</label>
          <input id="goal-due" className="text-in" type="date" value={skill.due} onChange={(e) => setSkill({ ...skill, due: e.target.value })} />
          <button type="button" id="goal-save" className="btn primary full" disabled={!skillValid} onClick={saveSkill}>{t('Kaydet')}</button>
          {!skillValid ? <p className="goal-form-hint">{t('Önce bir hareket seç')}</p> : null}
        </React.Fragment>
      )}

      {existing ? <button type="button" id="goal-remove" className="btn danger-t full" onClick={handleRemove}>{t('Hedefi kaldır')}</button> : null}
    </div>
  );
}

/* ================= İLERLEME / METRİKLER ================= */
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
// Başlık ve açıklamalar gösterimde t() ile çevrilir.
const LAB_BASICS = [
  { id: 'measure', t: 'Yorgunluk nasıl ölçülür?', d: 'Bar hızı → kalan tekrar → yorgunluk skoru', sheet: ['measure', {}] },
  { id: 'signal', t: 'Beyinden kasa sinyal', d: 'Hareket komutu kasa nasıl ulaşır', sheet: ['lesson', { stage: 0 }] },
  { id: 'recruit', t: 'Motor ünite kazanımı', d: 'Yük arttıkça hangi lifler devreye girer', sheet: ['lesson', { stage: 1 }] },
  { id: 'rate', t: 'Ateşleme hızı', d: 'Sinyal sıklığı kuvveti nasıl artırır', sheet: ['lesson', { stage: 2 }] },
  { id: 'fatigue', t: 'Merkezi ve periferik yorgunluk', d: 'Set içinde ve sonrasında ne yorulur', sheet: ['lesson', { stage: 3 }] },
  { id: 'meter', t: 'Toparlanma ve yorgunluk ölçer', d: 'Yük, RPE, hacim ve uykuyu kendin dene', sheet: ['fatigue', {}] },
];
function LabScreen({ openSheet }) {
  const f = useExFilter(LIB_WARM_FIRST);
  const [part, setPart] = useState('temel');
  return (
    <div className="screen pxt lab-screen">
      <ScreenHead title={t('Lab')} sub={t('Antrenmanın arkasındaki bilim')} />
      <div className="segmented seg3 labseg" role="tablist" aria-label={t('Lab bölümleri')}>
        <button type="button" role="tab" id="lab-part-temel" aria-selected={part === 'temel'} className={part === 'temel' ? 'on' : ''} onClick={() => setPart('temel')}><b className="mono">01</b> {t('Temeller')}</button>
        <button type="button" role="tab" id="lab-part-hareket" aria-selected={part === 'hareket'} className={part === 'hareket' ? 'on' : ''} onClick={() => setPart('hareket')}><b className="mono">02</b> {t('Hareketler')} <small className="mono">{EX_LIB.length}</small></button>
      </div>
      <div className="scr">
        {part === 'temel' ? <section className="labsec">
          <ol className="lablist">
            {LAB_BASICS.map((x, i) => (
              <li key={x.id}>
                <button type="button" id={'lab-' + x.id} className="labrow" onClick={() => openSheet(x.sheet[0], x.sheet[1])}>
                  <span className="labrow-i mono">{i + 1}</span>
                  <span className="labrow-t"><strong>{t(x.t)}</strong><small>{t(x.d)}</small></span>
                  <Icon name="right" size={14} />
                </button>
              </li>
            ))}
          </ol>
        </section> : <section className="labsec">
          <ExFilterBar f={f} idp="lab" />
          <span className="exf-count mono">{t('{n} hareket', { n: f.list.length })}</span>
          <ul className="lablist ex">
            {f.list.slice(0, f.lim).map((e) => (
              <li key={e.id}>
                <button type="button" id={'labex-' + e.id} className="labrow" onClick={() => openSheet('exercise', { exId: e.id })}>
                  {exDot(e)}
                  <span className="labrow-t"><strong>{exName(e)}</strong><small>{exLine(e)}</small></span>
                  {e.bio ? <span className="badge bio">{t('tork')}</span> : e.kind === 'beceri' ? <span className="badge skill">{t('beceri')}</span> : e.kind === 'olimpik' ? <span className="badge kind">{t('olimpik')}</span> : null}
                  <Icon name="right" size={14} />
                </button>
              </li>
            ))}
          </ul>
          {f.list.length > f.lim ? <button type="button" id="lab-more" className="btn ghost full" onClick={f.more}>{t('Daha fazla göster')} ({f.list.length - f.lim})</button> : null}
        </section>}
      </div>
    </div>
  );
}
function MeasureBody({ openSheet }) {
  return (
    <div className="measure">
      <p className="ms-lede">{rich(t('Yorgunluk iki parçadan oluşur: **antrenmanların** bıraktığı ve zamanla azalan yük, bir de **uyku açığın**. İkisi ayrı hesaplanır, sonra toplanır.'))}</p>
      <section className="ms-step">
        <span className="ms-n mono">1</span>
        <div className="ms-b">
          <h4>{t('Son tekrarın hızı → kalan tekrar')}</h4>
          <p>{t('Her setten sonra son tekrarın ilkine göre ne kadar yavaşladığını seçersin. Bu seçim doğrudan kaç tekrar daha çıkarabileceğine çevrilir; yükten bağımsızdır.')}</p>
          <div className="ms-table">
            <div className="ms-row sh"><span>{t('Seçim')}</span><span>{t('Anlamı')}</span><span>{t('Kalan')}</span><span>RPE</span></div>
            {SPEED.map((sp, i) => (
              <div key={i} className="ms-row">
                <span className="s-sp" style={{ '--c': vlColor(sp.vl) }}><i />{SPEED_SHORT[i]}</span>
                <span className="ms-d">{sp.d.split(' · ')[0]}</span>
                <span className="mono">{rirTxt(sp.rir)}</span>
                <span className="mono">{rpeLabel(clamp(10 - sp.rir, 6, 10), sp.rir)}</span>
              </div>
            ))}
          </div>
          <p className="ms-note">{t('Aynı yüzde hız kaybı hafif yükte tükenişten uzak, ağır yükte yakın demektir. Bu yüzden yüzde değil, “kaç tekrar daha çıkardı” hissi kullanılır.')}</p>
        </div>
      </section>
      <section className="ms-step">
        <span className="ms-n mono">2</span>
        <div className="ms-b">
          <h4>{t('Zor setler ağırlıklandırılır')}</h4>
          <p>{rich(t('4 veya daha az tekrar kala biten set **zor set** sayılır. Tükenişe yaklaştıkça ve hareket ağırlaştıkça yükü artar.'))}</p>
          <div className="ms-grid mono">
            <span>{t('Tükeniş')} <b>{nf(1.6)}×</b></span><span>{t('{n} kala', { n: 1 })} <b>{nf(1.3)}×</b></span><span>{t('{n} kala', { n: 2 })} <b>{nf(1.1)}×</b></span><span>{t('{n} kala', { n: 3 })} <b>1×</b></span><span>{t('{n} kala', { n: 4 })} <b>{nf(0.8)}×</b></span>
            <span>{t('Bench, squat, RDL')} <b>{nf(1.5)}×</b></span><span>{t('Dumbbell press, barfiks')} <b>1×</b></span><span>{t('İzolasyon')} <b>{nf(0.6)}×</b></span>
          </div>
        </div>
      </section>
      <section className="ms-step">
        <span className="ms-n mono">3</span>
        <div className="ms-b">
          <h4>{t('Zamanla azalır')}</h4>
          <p>{t('Her setin etkisi saat saat düşer: 24 sa sonra %51’i, 48 sa sonra %26’sı, 72 sa sonra %14’ü kalır. Tükenişe giden antrenmanlar 24–48 sa daha geç toparlanır.')}</p>
        </div>
      </section>
      <section className="ms-step">
        <span className="ms-n mono">4</span>
        <div className="ms-b">
          <h4>{t('Uyku ayrı eklenir')}</h4>
          <p>{t('Dün gece 7,5 saatin altı en çok +20, son 3 gecenin ortalaması 7 saatin altı en çok +10. Tek gece kısa uyku maksimal kuvveti ortalama ~%3, çok tekrarlı setleri ~%10 düşürür; birkaç gece üst üste daha fazla.')}</p>
          <div className="ms-zones"><span className="ok">{t('0–39 yönetilebilir')}</span><span className="warn">{t('40–69 birikiyor')}</span><span className="bad">{t('70+ yüksek')}</span></div>
        </div>
      </section>
      <p className="ms-cav">{t('Bu bir tahmindir; ağırlıklar aşağıdaki çalışmalardan türetildi, doğrulanmış bir ölçek değil. Hız ölçer kullanmadığın için hız senin hissin; hep aynı ölçütle seçersen eğilim güvenilir olur. Kaynaklar: Zourdos ve ark. 2016 (RIR ile bar hızı), Rodríguez-Rosell ve ark. 2020 (hız kaybı ve kalan tekrar), Morán-Navarro ve ark. 2017 (tükeniş ve toparlanma), Craven ve ark. 2022 (uyku ve performans).')}</p>
      <button type="button" id="ms-meter" className="btn primary full" onClick={() => openSheet('fatigue', {})}>{t('Yorgunluk ölçeri aç')}</button>
    </div>
  );
}

/* ================= KABUK ================= */
const SHEET_TITLES = {
  account: 'Hesap ve ayarlar',
  consent: 'Verilerin nasıl kullanılır',
  privacy: 'Gizlilik',
  fatigue: 'Yorgunluk ölçer',
  lesson: 'Sinir sistemi',
  exercise: 'Hareket',
  picker: 'Hareket ekle',
  item: 'Hareketi düzenle',
  note: 'Not',
  summary: 'Antrenman özeti',
  saveTemplate: 'Plan olarak kaydet',
  plan: 'Planlanan haftalık yük',
  weekDone: 'Yapılan haftalık yük',
  progress: 'Hareket gelişimi',
  exprog: 'Hareket gelişimi',
  goal: 'Hedef',
  measure: 'Yorgunluk nasıl ölçülür?',
  wtype: 'Antrenman planı',
  setdetail: 'Set',
  planPick: 'Bu güne plan ekle',
  legal: 'Yasal metin',
};

// V32 · "Hâlâ orada mısın?": cevap için kalan süre geri sayılır; dokunmak yeterli, düğmeyle de seçilebilir.
function IdleAskModal({ ask, onStay, onEnd }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const iv = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(iv); }, []);
  const left = Math.max(0, ask.from + IDLE_ASK_MS + IDLE_END_MS - now);
  const mm = Math.floor(left / 60000), ss = Math.floor((left % 60000) / 1000);
  useBack(true, onStay);
  return (
    <div className="idle-wrap pxt" role="alertdialog" aria-modal="true" aria-labelledby="idle-h">
      <div className="idle-box">
        <h3 id="idle-h">{t('Hâlâ orada mısın?')}</h3>
        <p>{t('10 dakikadır giriş yok. Cevap gelmezse antrenman son girişin saatinde ({h}) kendiliğinden biter.', { h: clock(ask.last) })}</p>
        <span className="idle-count" aria-label={t('Kalan süre')}>{mm}:{String(ss).padStart(2, '0')}</span>
        <div className="idle-btns">
          <button type="button" id="idle-stay" className="btn primary full" onClick={onStay}>{t('Buradayım, devam')}</button>
          <button type="button" id="idle-end" className="btn ghost full" onClick={onEnd}>{t('Antrenmanı bitir')}</button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const lang = useLang();
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
  const [legalOk, setLegalOk] = useState(acceptanceCurrent);
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
  // V36 · ekran modu (zemin paleti + ortam efekti) ve modlar arası geçişler. Anlamı olan renkler değişmez.
  const fxNow = readFxSettings(st.settings);
  const fxLive = useRef(fxNow);
  fxLive.current = fxNow;
  const live = !!(active && !active.ready);
  const mode = screenMode({ tab, editing: !!planEd, active, summary: !!pixelSummary });
  const [modeTr, setModeTr] = useState(null);
  const trTimer = useRef(null);
  const playTr = (kind) => {
    if (!motionAllowed(fxLive.current.motion)) return;
    if (trTimer.current) clearTimeout(trTimer.current);
    setModeTr((p) => ({ kind, n: (p ? p.n : 0) + 1 }));
    trTimer.current = setTimeout(() => { trTimer.current = null; setModeTr(null); }, TR_MS[kind]);
  };
  useEffect(() => () => { if (trTimer.current) clearTimeout(trTimer.current); }, []);
  const prevTab = useRef(tab);
  useEffect(() => {
    const from = prevTab.current;
    prevTab.current = tab;
    const kind = tabTransition(from, tab, live);
    if (!kind) return;
    playTr(kind);
    if (kind === 'into') pixelFx.modeInto(fxLive.current);
    else if (kind === 'out') pixelFx.modeOut(fxLive.current);
    else pixelFx.modeWarm(fxLive.current);
  }, [tab]);
  // İdman başladığı an (İDMANI BAŞLAT ya da ilk setle kendiliğinden): BAŞLA! dalgası. Ses oturum ekranında çalar.
  const liveId = live ? active.id : '';
  const prevLiveId = useRef(liveId);
  useEffect(() => {
    const was = prevLiveId.current;
    prevLiveId.current = liveId;
    if (liveId && !was && tab === 'antrenman' && !planEd) playTr('start');
  }, [liveId]);
  // V32 · unutulan antrenman: 10 dk giriş yoksa sor, 5 dk daha cevap yoksa son giriş saatinde bitir.
  const idle = useIdleWatch(active, st, put, (ns) => { setJumpExId(null); setPixelSummary(ns); });
  // V33 · süren antrenman bildirim panelinde ileri sayan süreyle durur; bitince kalkar.
  const liveSig = active && !active.ready ? active.id + '|' + active.startedAt + '|' + active.dayName + '|' + lang : '';
  useEffect(() => {
    if (!liveSig) { void hideWorkout(); return; }
    void showWorkout({ startedAt: active.startedAt, title: isFree(active) ? t('Plansız antrenman') : sessionName(active), body: t('Antrenman sürüyor · dokun: devam et') });
  }, [liveSig]);
  // V33 · plan hatırlatmaları: planlı günden bir gün önce 20:00; plan, ayar ya da dil değişince yeniden kurulur.
  const remindOn = remindersOn(st.settings);
  const remindList = useMemo(() => (st.loaded.programs && remindOn ? planReminders(st.programs) : []), [st.programs, st.loaded.programs, remindOn, lang, new Date().toDateString()]);
  const remindSig = useRef('');
  useEffect(() => {
    if (!st.loaded.programs) return;
    const sig = JSON.stringify(remindList.map((x) => [x.at, x.title, x.body]));
    if (sig === remindSig.current) return;
    remindSig.current = sig;
    void setReminders(remindList.map(({ at, title, body }) => ({ at, title, body })));
  }, [remindList, st.loaded.programs]);
  useEffect(() => {
    if (!idle.notice) return undefined;
    const tm = setTimeout(idle.clearNotice, 9000);
    return () => clearTimeout(tm);
  }, [idle.notice]);

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
      case 'consent': return <ConsentBody onAccept={actions.acceptConsent} onClose={actions.rejectConsent} busy={acct.busy} openSheet={openSheet} />;
      case 'privacy': return <PrivacyBody openSheet={openSheet} />;
      case 'legal': return <LegalDoc id={appDocId(p.doc)} onOpen={(id) => openSheet('legal', { doc: id })} hideTitle />;
      case 'fatigue': { const init = p.sim || simFromLogs(st); return <FatigueBody st={st} init={init} source={p.source || init.src} showNow={!p.sim} openSheet={openSheet} />; }
      case 'lesson': return <LessonBody stage={p.stage} />;
      case 'measure': return <MeasureBody openSheet={openSheet} />;
      case 'exercise': return <ExerciseBody exId={p.exId} name={p.name} st={st} />;
      case 'picker': return <PickerBody custom={st.custom} addCustom={addCustom} onPick={p.onPick} onClose={close} low={p.low} openSheet={openSheet} />;
      case 'item': return <ItemSheetBody {...p} fx={readFxSettings(st.settings)} onClose={close} openSheet={openSheet} />;
      case 'note': return <NoteSheetBody init={p.init} onSave={p.onSave} onClose={close} />;
      case 'setattr': return <SetAttrSheetBody init={p.init} onSave={p.onSave} onClose={close} />;
      case 'setdetail': return <SetDetailBody set={p.set} idx={p.idx} exId={p.exId} name={p.title} onDelete={p.onDelete} onClose={close} />;
      case 'wtype': return <WtypeMenuBody st={st} pid={p.pid} did={p.did} put={put} del={del} onStart={startSession} onEdit={(pr, d) => editPlan(pr, d, tab)} onClose={close} />;
      case 'summary': { const s = p.draft || st.sessions.find((x) => x.id === p.id); return s ? <SummaryBody session={s} st={st} put={put} del={del} openSheet={openSheet} onDelete={(id) => del('sessions', id)} onClose={close} /> : <p className="muted-p">{t('Kayıt bulunamadı.')}</p>; }
      case 'saveTemplate': return <SaveTemplateBody session={p.session} st={st} put={put} onClose={close} onSaved={(pr, d) => { closeAll(); setPixelSummary(null); editPlan(pr, d, 'antrenman'); }} />;
      case 'plan': return <PlanBody getProgram={p.getProgram} st={st} openSheet={openSheet} />;
      case 'weekDone': return <WeekDoneBody st={st} />;
      case 'progress': return <ProgressListBody st={st} openSheet={openSheet} />;
      case 'exprog': return <ProgressDetailBody exKey={p.key} st={st} />;
      case 'goal': return <GoalBody id={p.id} st={st} put={put} del={del} addCustom={addCustom} onClose={close} />;
      case 'planPick': return <PlanPickBody dayKey={p.dayKey} st={st} put={put} newPlan={newPlan} onClose={close} />;
      default: return null;
    }
  };
  const sheetTitle = (sh) => {
    const p = sh.props;
    if (sh.type === 'exercise') return exName(exMeta(p.exId, p.name) || { name: p.name }) || t('Hareket');
    if (sh.type === 'exprog') return exName({ exId: p.exId, name: p.name }) || t(SHEET_TITLES.exprog);
    if (sh.type === 'legal') return appDocTitle(p.doc);
    if (sh.type === 'note' || sh.type === 'setattr' || sh.type === 'item' || sh.type === 'setdetail') return p.title || (p.it && exName(p.it)) || t(SHEET_TITLES[sh.type]);
    if (sh.type === 'wtype') { const pr = st.programs.find((x) => x.id === p.pid); const d = pr && pr.days.find((x) => x.id === p.did); return d ? dayLabel(d.name) : t(SHEET_TITLES.wtype); }
    return t(SHEET_TITLES[sh.type]);
  };
  const sheetSize = (sh) => (['lesson', 'exercise', 'fatigue', 'summary', 'picker', 'measure', 'legal', 'progress', 'exprog'].includes(sh.type) ? 'full' : '');

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
      // Plansız ve planlı oturum aynı pixel ekranı kullanır (V29).
      if (active) {
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
            onFinished={(ns) => { setPixelSummary(ns); playTr('end'); }}
            onDiscarded={() => { setJumpExId(null); setPixelSummary(null); }}
          />
        );
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
    {/* V21: dil değişince ekran ağacı yeniden kurulur; sekme, açık pencereler ve veri App'te kalır. */}
    <div className="device-wrap" key={lang}>
      <div className="device">
        <div className={'app-shell app2 px-mode px-mode-' + mode + (fxNow.motion ? ' px-mode-motion' : '')} data-px-mode={mode}>
          <main className="app2-main" inert={acct.migrating || acct.busy || !legalOk}><ModeAmbient mode={mode} />{screen}<ModeFrame mode={mode} /></main>
          {st.error ? <div className="store-message" role="alert">{t(st.error)}</div> : null}
          {acct.migrating ? <div className="store-message" role="status">{t('Kayıtlar hesabına taşınıyor…')}</div> : null}
          {exitToast ? <div className="back-toast" role="status">{t('Çıkmak için tekrar bas')}</div> : null}
          {idle.notice ? (
            <button type="button" key={idle.notice.n} id="idle-notice" className="back-toast idle-toast" role="status" onClick={idle.clearNotice}>
              {idle.notice.kind === 'done'
                ? t('Antrenman 15 dakika giriş olmadığı için kendiliğinden bitti. Bitiş saati son girişin saati: {h}.', { h: clock(idle.notice.last) })
                : t('15 dakika giriş olmadı ve set kaydı yoktu: süre durdu, antrenman hazır bekliyor.')}
            </button>
          ) : null}
          {idle.ask ? <IdleAskModal ask={idle.ask} onStay={idle.stay} onEnd={idle.endNow} /> : null}
          {live && (tab !== 'antrenman' || planEd) ? <LiveStrip session={active} onOpen={() => pick('antrenman')} /> : null}
          <nav className="tabbar tb4" aria-label={t('Ana gezinme')} inert={acct.migrating || acct.busy || !legalOk}>
            {TABS2.map((tb) => (
              <button key={tb.id} id={'tab-' + tb.id} type="button" className={'tab' + (tb.id === tab ? ' on' : '')} aria-label={t(tb.label)} aria-current={tb.id === tab ? 'page' : undefined} onClick={() => pick(tb.id)}>
                <span className="tab-ic"><PxIcon name={tb.icon} size={24} />{tb.id === 'antrenman' && active ? <i className="tab-live" /> : null}</span>
                <span className="tab-l">{t(tb.label)}</span>
              </button>
            ))}
          </nav>
          <ModeTransition tr={modeTr} />
          {sheets.map((sh, i) => (
            <SheetFrame key={sh.key} top={i === sheets.length - 1} title={sheetTitle(sh)} onClose={sh.type === 'consent' ? actions.rejectConsent : closeTop} size={sheetSize(sh)} z={40 + i * 2}>
              {renderSheet(sh)}
            </SheetFrame>
          ))}
          {!legalOk ? <LegalGate onDone={() => setLegalOk(true)} /> : null}
        </div>
      </div>
    </div>
    </BackupContext.Provider>
  );
}

export default App;
