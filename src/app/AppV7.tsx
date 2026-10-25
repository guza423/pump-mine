import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bugun, fatigueFromState } from '../features/bugun/Bugun';
import { ProgramsTab, TEMPLATES, WorkoutTab, programFromTemplate, sessionFromDay } from '../features/gunluk/Gunluk';
import { Lab } from '../features/lab/Lab';
import { Icon } from '../features/yorgunluk/Yorgunluk';
import { useLogStore } from '../lib/store/useLogStore';
import '../styles/app.css';
import '../styles/cns.css';
import '../styles/log.css';
import '../styles/mobile.css';
import '../styles/v7.css';

const TABS = [
  { id: 'bugun', label: 'Bugün', icon: 'home' },
  { id: 'antrenman', label: 'Antrenman', icon: 'pulse' },
  { id: 'programlar', label: 'Programlar', icon: 'book' },
  { id: 'lab', label: 'Lab', icon: 'flask' },
] as const;
type Tab = typeof TABS[number]['id'];

function initialTab(): Tab {
  const value = location.hash.slice(1) as Tab;
  return TABS.some((tab) => tab.id === value) ? value : 'bugun';
}

export default function AppV7() {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [workoutNav, setWorkoutNav] = useState<any>({ name: 'home' });
  const [programNav, setProgramNav] = useState<any>({ name: 'home' });
  const [toast, setToast] = useState<string | null>(null);
  const mainRef = useRef<HTMLElement>(null);
  const store = useLogStore(() => programFromTemplate(TEMPLATES[0]));
  const [state, apiRef] = store;
  const fatigue = useMemo(() => fatigueFromState(state), [state.sessions, state.checkins]);

  useEffect(() => { history.replaceState(null, '', `#${tab}`); mainRef.current?.scrollTo(0, 0); }, [tab]);
  useEffect(() => { const listener = () => setTab(initialTab()); window.addEventListener('hashchange', listener); return () => window.removeEventListener('hashchange', listener); }, []);

  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(null), 2400); };
  const start = (program: any, day: any) => {
    const active = state.sessions.find((session) => session.status === 'active');
    if (active) { setWorkoutNav({ name: 'session', id: active.id }); setTab('antrenman'); notify('Devam eden antrenman açıldı.'); return; }
    if (!day?.items?.length) return;
    const session = { ...sessionFromDay(program, day), fatigue: { v: 2 as const, pre: fatigue.total, post: null } };
    void apiRef.current?.put('sessions', session as any);
    setWorkoutNav({ name: 'session', id: session.id, draft: session });
    setTab('antrenman');
  };
  const editProgram = (id: string) => { setProgramNav({ name: 'editor', id }); setTab('programlar'); };
  const calculatePostFatigue = (session: any) => fatigueFromState({
    ...state,
    sessions: state.sessions.some((item) => item.id === session.id)
      ? state.sessions.map((item) => item.id === session.id ? session : item)
      : [session, ...state.sessions],
  }).total;

  return <div className="device-wrap"><div className="device"><div className="app-shell v7-shell">
    <header className="app-head v7-head"><div className="brand-row"><span className="wordmark"><span className="wm-mark"><Icon name="zap" size={11}/></span>PERFORMANCE</span><span className="ver mono">v0.7</span></div></header>
    <main className="app-main v7-main" ref={mainRef}>
      {tab === 'bugun' ? <Bugun store={store} onStart={start}/> : null}
      {tab === 'antrenman' ? <WorkoutTab store={store} nav={workoutNav} setNav={setWorkoutNav} openBio={() => setTab('lab')} fatigueNow={fatigue.total} calculateFatigue={calculatePostFatigue} editProgram={editProgram}/> : null}
      {tab === 'programlar' ? <ProgramsTab store={store} nav={programNav} setNav={setProgramNav} fatigueNow={fatigue.total}/> : null}
      {tab === 'lab' ? <Lab/> : null}
    </main>
    {toast ? <div className="toast" role="status">{toast}</div> : null}<div id="sheet-root"/>
    <nav className="tabbar v7-tabbar" aria-label="Ana gezinme">{TABS.map((item) => <button key={item.id} className={`tab${tab===item.id?' on':''}`} aria-current={tab===item.id?'page':undefined} onClick={() => { setTab(item.id); if(item.id==='antrenman')setWorkoutNav({name:'home'}); if(item.id==='programlar')setProgramNav({name:'home'}); }}><span className="tab-ic"><Icon name={item.icon} size={20}/></span><span className="tab-l">{item.label}</span></button>)}</nav>
  </div></div></div>;
}
