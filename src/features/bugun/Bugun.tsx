// @ts-nocheck
import React, { useMemo, useState } from 'react';
import { fatigueResult, isoLocalDate } from '../../lib/models/fatigue';
import { Icon } from '../yorgunluk/Yorgunluk';
import { WeekStrip, nextPlanned } from '../gunluk/Gunluk';

const HOUR = 3_600_000;
const FAT3 = new Set(['rdl', 'squat', 'barfiks']);
const FAT1 = new Set(['yana-acis', 'band-yana-acis', 'leg-curl', 'band-leg-curl', 'boyun', 'triceps-pushdown']);

export function fatigueFromState(st, now = Date.now()) {
  const sets = st.sessions.flatMap((session) => session.items.flatMap((item) => item.sets.map((set) => ({
    at: set.at || session.startedAt,
    rir: Number.isFinite(set.rir) ? set.rir : Math.max(0, 10 - (set.rpe || 6)),
    fatigue: FAT3.has(item.exId) ? 3 : FAT1.has(item.exId) ? 1 : 2,
  }))));
  const byDate = new Map(st.checkins.map((checkin) => [checkin.id.slice(2), checkin.sleep]));
  const nights = [0, 1, 2].map((offset) => byDate.get(isoLocalDate(now - offset * 86_400_000)) ?? null);
  return fatigueResult(sets, nights, now);
}

function Ring({ value, label }) {
  const radius = 46; const circumference = 2 * Math.PI * radius;
  return <div className="fat-ring"><svg viewBox="0 0 112 112"><circle className="ring-track" cx="56" cy="56" r={radius}/><circle className={`ring-value ${value>=70?'bad':value>=40?'warn':'ok'}`} cx="56" cy="56" r={radius} strokeDasharray={circumference} strokeDashoffset={circumference*(1-value/100)}/></svg><div><strong className="mono">{Math.round(value)}</strong><span>{label}</span></div></div>;
}

export function Bugun({ store, onStart }) {
  const [st, apiRef] = store;
  const now = Date.now();
  const fatigue = useMemo(() => fatigueFromState(st, now), [st.sessions, st.checkins]);
  const todayId = `c_${isoLocalDate(now)}`;
  const existing = st.checkins.find((x) => x.id === todayId);
  const [sleep, setSleep] = useState(existing?.sleep ?? 7.5);
  const next = nextPlanned(st.programs, st.sessions);
  const goal = st.settings.find((x) => x.key === 'goal')?.value || { exercise: 'Eğimli bench', current: 95, target: 100 };
  const saveSleep = () => apiRef.current?.put('checkins', { id: todayId, sleep: Number(sleep), at: Date.now() });
  const recovery = fatigue.recoveryHours < 1 ? 'hazır' : fatigue.recoveryHours < 24 ? `${Math.ceil(fatigue.recoveryHours)} sa` : `${Math.ceil(fatigue.recoveryHours/24)} gün`;

  return <div className="today-v7">
    <section className="today-fatigue">
      <Ring value={fatigue.total} label={fatigue.label}/>
      <div className="fat-break"><span><i className="train"/>Antrenman <b className="mono">{Math.round(fatigue.training)}</b></span><span><i className="sleep"/>Uyku <b className="mono">+{Math.round(fatigue.sleep)}</b></span><span><Icon name="clock" size={14}/>Toparlanma <b className="mono">{recovery}</b></span></div>
    </section>
    <section className={`sleep-card${sleep < 6 ? ' short' : ''}`}><div><span className="eyebrow">Dün gece</span><strong><Icon name="moon"/> {String(sleep).replace('.',',')} saat</strong></div><input aria-label="Uyku saati" type="range" min="3" max="10" step="0.5" value={sleep} onChange={(e)=>setSleep(Number(e.target.value))} onPointerUp={saveSleep} onKeyUp={saveSleep}/>{sleep<6?<p>Kısa uyku: kuvvet yaklaşık %3, kuvvet-dayanıklılık yaklaşık %10 düşebilir.</p>:null}</section>
    {next ? <section className="next-card"><div><span className="eyebrow">Sıradaki</span><h3>{next.day.name}</h3><p>{next.off===0?'Bugün':next.off===1?'Yarın':next.day.weekday==null?'Planlanmadı':['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'][next.day.weekday]} · {next.day.items.length} hareket</p></div><button className="btn primary" onClick={()=>onStart(next.program,next.day)}>Başlat <Icon name="play"/></button></section> : <section className="next-card"><div><span className="eyebrow">Sıradaki</span><h3>Planlanmış antrenman yok</h3><p>Programlar'dan bir güne antrenman türü ekle.</p></div></section>}
    <WeekStrip programs={st.programs} sessions={st.sessions}/>
    <section className="goal-mini"><span><small>HEDEF</small><strong>{goal.exercise}</strong></span><span className="mono"><b>{goal.current}</b> → <b className="fire">{goal.target} kg</b></span></section>
  </div>;
}
