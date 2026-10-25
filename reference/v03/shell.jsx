/* ================= APP SHELL ================= */
const TABS = [
  { id: 'merkez', label: 'Merkez', icon: 'home', ready: true, title: 'Merkez', sub: 'Hedef, modüller ve veri akışı' },
  { id: 'gunluk', label: 'Günlük', icon: 'book', ready: true, title: 'Günlük', sub: 'Programını yaz, antrenmanını kaydet' },
  { id: 'biyomekanik', label: 'Biyomekanik', icon: 'joint', ready: true, title: 'Biyomekanik', sub: 'Hareket analizi ve moment kolları' },
  { id: 'yorgunluk', label: 'Yorgunluk', icon: 'pulse', ready: true, title: 'Yorgunluk', sub: 'Sinir sistemi, yorgunluk ve toparlanma' },
  { id: 'ilerleme', label: 'İlerleme', icon: 'chart', ready: false, title: 'İlerleme', sub: 'Sırada' },
];

function parseHash() {
  let h = '';
  try { h = (location.hash || '').replace('#', ''); } catch (e) {}
  const out = { tab: 'merkez', move: 'bench', step: 0 };
  if (TABS.some((t) => t.id === h && t.ready)) out.tab = h;
  const mi = MOVES.findIndex((m) => m.id === h);
  if (mi >= 0) { out.tab = 'biyomekanik'; out.move = h; }
  const si = STAGES.findIndex((s) => s.id === h);
  if (si >= 0) { out.tab = 'yorgunluk'; out.step = si; }
  return out;
}

/* ---------- Merkez ---------- */
const MODULES = [
  { id: 'merkez', icon: 'home', name: 'Merkez', state: 'partial', desc: 'Günün özeti ve ana hedef. Hazırlık check-in\'i buraya gelecek: uyku ve ısınma RPE\'sinden günlük hazır olma skoru.', data: ['hedef', 'hazırlık · sırada'] },
  { id: 'gunluk', icon: 'book', name: 'Günlük', state: 'ready', desc: 'Kendi programını boş sayfaya yaz, antrenmanda set set kaydet. Son tekrarın hızını seçersin; hız kaybı, RIR ve tahmini 1RM hesaplanır.', links: [{ t: 'Programlarım', to: ['gunluk', 'home'] }] },
  { id: 'biyomekanik', icon: 'joint', name: 'Biyomekanik', state: 'ready', desc: 'Hareketlerin moment kolu, tork eğrisi ve kas vurgusu.', links: [{ t: 'Eğimli bench', to: ['biyomekanik', 'bench'] }, { t: 'RDL', to: ['biyomekanik', 'rdl'] }, { t: 'Yana açış', to: ['biyomekanik', 'yanaacis'] }] },
  { id: 'yorgunluk', icon: 'pulse', name: 'Yorgunluk', state: 'ready', desc: 'Sinir sistemi dersi (5 aşama) ve toparlanma simülatörü.', links: [{ t: 'Sinyal dersi', to: ['yorgunluk', 0] }, { t: 'Merkezi / periferik', to: ['yorgunluk', 3] }, { t: 'Simülatör', to: ['yorgunluk', 4] }] },
  { id: 'ilerleme', icon: 'chart', name: 'İlerleme', state: 'next', desc: 'Günlükten tahmini 1RM (e1RM) eğrisi ve 100 kg hedef çizgisi.', data: ['e1RM', 'hedef'] },
];
const STATE_LABEL = { ready: 'Hazır', partial: 'Kısmen', next: 'Sırada' };

function FlowMap() {
  const N = [
    { id: 'hz', x: 6, y: 8, t: 'Hazırlık', s: 'uyku · ısınma RPE', ready: false },
    { id: 'gn', x: 6, y: 104, t: 'Günlük', s: 'set · kg · RPE', ready: true },
    { id: 'bm', x: 6, y: 200, t: 'Biyomekanik', s: 'hareket analizi', ready: true },
    { id: 'yr', x: 206, y: 56, t: 'Yorgunluk', s: 'yük ve toparlanma', ready: true },
    { id: 'il', x: 206, y: 152, t: 'İlerleme', s: 'e1RM · hedef', ready: false },
  ];
  const w = 128, h = 44;
  const edge = (x1, y1, x2, y2) => `M${x1} ${y1} C${x1 + 40} ${y1} ${x2 - 40} ${y2} ${x2} ${y2}`;
  return (
    <svg viewBox="0 0 340 252" className="flow" role="img" aria-label="Modüller arası veri akışı: Hazırlık ve Günlük Yorgunluk'u besler, Günlük İlerleme'yi besler, Biyomekanik Günlük ile bağlıdır">
      <defs>
        <marker id="fl-arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L8 4 L0 8 z" className="fl-head" />
        </marker>
      </defs>
      <path d={edge(134, 30, 206, 72)} className="fl-edge" markerEnd="url(#fl-arr)" />
      <path d={edge(134, 120, 206, 88)} className="fl-edge" markerEnd="url(#fl-arr)" />
      <path d={edge(134, 132, 206, 174)} className="fl-edge" markerEnd="url(#fl-arr)" />
      <path d="M48 150 L48 198" className="fl-edge two" markerEnd="url(#fl-arr)" markerStart="url(#fl-arr)" />
      <text x="168" y="40" className="fl-lbl" textAnchor="middle">uyku</text>
      <text x="170" y="98" className="fl-lbl" textAnchor="middle">hacim · RPE</text>
      <text x="170" y="166" className="fl-lbl" textAnchor="middle">kg · tekrar</text>
      <text x="56" y="178" className="fl-lbl">hareket kartı</text>
      {N.map((n) => (
        <g key={n.id} className={'fl-node' + (n.ready ? ' ready' : '')}>
          <rect x={n.x} y={n.y} width={w} height={h} rx="10" />
          <circle cx={n.x + 14} cy={n.y + 22} r="4" className="fl-dot" />
          <text x={n.x + 26} y={n.y + 19} className="fl-t">{n.t}</text>
          <text x={n.x + 26} y={n.y + 34} className="fl-s">{n.s}</text>
        </g>
      ))}
    </svg>
  );
}

function Hub({ open }) {
  const lo = 85, hi = 120;
  const pos = (v) => ((v - lo) / (hi - lo)) * 100;
  return (
    <div className="hub">
      <section className="goal">
        <div className="goal-top">
          <span className="eyebrow">Ana hedef</span>
          <span className="goal-lift">Eğimli bench · 1RM</span>
        </div>
        <div className="goal-nums">
          <div><span className="g-v mono">95</span><span className="g-k">son test</span></div>
          <Icon name="arrow" size={20} />
          <div><span className="g-v mono hot">100</span><span className="g-k">hedef, kg</span></div>
        </div>
        <div className="goal-track" aria-hidden="true">
          <span className="gt-fill" style={{ width: pos(95) + '%' }} />
          {[[85, 'başlangıç'], [95, 'test'], [100, 'hedef'], [120, 'sonraki']].map(([v, k]) => (
            <i key={v} className={'gt-mark' + (v === 100 ? ' target' : '')} style={{ left: pos(v) + '%' }} />
          ))}
        </div>
        <div className="goal-scale mono" aria-hidden="true">
          {[[85, 'başlangıç'], [95, 'test'], [100, 'hedef'], [120, 'sonraki']].map(([v, k]) => (
            <span key={v} style={{ left: pos(v) + '%' }} className={v === 120 ? 'end' : v === 85 ? 'start' : ''}><b>{v}</b>{k}</span>
          ))}
        </div>
        <p className="goal-note">Şu an kas kütlesi bloğundasın. Hedefe kalan 5 kg; sonraki adım kalorik fazlada 120 kg.</p>
      </section>

      <section className="hub-sec">
        <div className="sec-h">
          <h3>Uygulama mimarisi</h3>
          <span className="sec-k mono">5 sekme · 3 modül hazır</span>
        </div>
        <ol className="mods">
          {MODULES.map((m) => (
            <li key={m.id} className={'mod ' + m.state}>
              <span className="mod-ic"><Icon name={m.icon} size={18} /></span>
              <div className="mod-body">
                <div className="mod-top">
                  <strong>{m.name}</strong>
                  <span className={'pill ' + m.state}>{STATE_LABEL[m.state]}</span>
                </div>
                <p>{m.desc}</p>
                {m.links ? (
                  <div className="mod-links">
                    {m.links.map((l) => (
                      <button key={l.t} type="button" id={'go-' + m.id + '-' + l.to[1]} className="mod-link" onClick={() => open(l.to[0], l.to[1])}>
                        {l.t} <Icon name="right" size={13} />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="mod-data">{m.data.map((d) => <span key={d} className="mono">{d}</span>)}</div>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="hub-sec">
        <div className="sec-h">
          <h3>Veri akışı</h3>
          <span className="sec-k">Hangi modül hangisini besler</span>
        </div>
        <div className="flow-card">
          <FlowMap />
          <div className="flow-legend">
            <span><i className="fl-key ready" /> hazır</span>
            <span><i className="fl-key" /> sırada</span>
          </div>
        </div>
        <p className="flow-note">Antrenman özetindeki “Yorgunluk simülatöründe aç” düğmesi haftalık zor set, ortalama RPE, yük ve dinlenmeyi simülatöre aktarır. İlerleme sekmesi de kayıtlı setlerden hesaplanan tahmini 1RM ile çalışacak.</p>
      </section>

      <section className="hub-sec">
        <div className="sec-h"><h3>Renk dili</h3></div>
        <div className="palette-row">
          <span><i style={{ background: 'var(--neuro)' }} />Sinyal ve veri</span>
          <span><i style={{ background: 'var(--fire)' }} />Kas yükü</span>
          <span><i style={{ background: 'var(--burn)' }} />Yorgunluk</span>
        </div>
      </section>
    </div>
  );
}

/* ---------- Yorgunluk tab ---------- */
function FatigueTab({ step, setStep }) {
  const Comp = [StageSignal, StageRecruit, StageRate, StageFatigue, StageRecovery][step];
  return (
    <div className="fatigue">
      <div className="sub-nav"><Axon step={step} go={setStep} /></div>
      <div key={step} className="stage-wrap"><Comp /></div>
      <nav className="pager" aria-label="Aşama gezinme">
        <button type="button" id="prev-btn" className="btn ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}><Icon name="left" /> Geri</button>
        <div className="pager-mid"><span className="mono">{step + 1}/5</span><span>{STAGES[step].short}</span></div>
        {step < 4
          ? <button type="button" id="next-btn" className="btn primary" onClick={() => setStep(step + 1)}>İleri <Icon name="right" /></button>
          : <button type="button" id="next-btn" className="btn primary" onClick={() => setStep(0)}><Icon name="reset" /> Başa dön</button>}
      </nav>
    </div>
  );
}

/* ---------- App ---------- */
function App() {
  const init = useMemo(parseHash, []);
  const [tab, setTab] = useState(init.tab);
  const [move, setMove] = useState(init.move);
  const [step, setStep] = useState(init.step);
  const [toast, setToast] = useState(null);
  const logStore = useLogStore();
  const [logNav, setLogNav] = useState({ name: 'home' });
  const openSim = (prefill) => { SIM_PREFILL = prefill; setStep(4); setTab('yorgunluk'); };
  const openBio = (m) => { setMove(m); setTab('biyomekanik'); };
  const mainRef = useRef(null);
  const toastT = useRef(0);

  useEffect(() => {
    let h = tab;
    if (tab === 'biyomekanik') h = move;
    if (tab === 'yorgunluk') h = STAGES[step].id;
    try { history.replaceState(null, '', '#' + h); } catch (e) {}
  }, [tab, move, step]);

  useEffect(() => { if (mainRef.current) mainRef.current.scrollTop = 0; }, [tab, step, move, logNav.name, logNav.id]);

  useEffect(() => {
    const onKey = (e) => {
      if (tab !== 'yorgunluk') return;
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.altKey || e.metaKey || e.ctrlKey) return;
      if (e.key === 'ArrowRight') setStep((x) => Math.min(4, x + 1));
      if (e.key === 'ArrowLeft') setStep((x) => Math.max(0, x - 1));
    };
    const onHash = () => { const p = parseHash(); setTab(p.tab); setMove(p.move); setStep(p.step); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('hashchange', onHash);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('hashchange', onHash); };
  }, [tab]);

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(null), 2600);
  };
  const pick = (t) => {
    if (!t.ready) { showToast(t.title + ' sırada. Planı Merkez\'deki mimaride görebilirsin.'); return; }
    if (t.id === 'gunluk' && tab === 'gunluk') setLogNav({ name: 'home' });
    setTab(t.id);
  };
  const open = (id, arg) => {
    if (id === 'gunluk') { setLogNav({ name: 'home' }); setTab('gunluk'); }
    if (id === 'biyomekanik') { setMove(arg); setTab('biyomekanik'); }
    if (id === 'yorgunluk') { setStep(arg); setTab('yorgunluk'); }
  };
  const cur = TABS.find((t) => t.id === tab);

  return (
    <div className="device-wrap">
      <div className="device">
        <div className="app-shell">
          <header className="app-head">
            <div className="brand-row">
              <span className="wordmark"><span className="wm-mark"><Icon name="zap" size={11} /></span>PERFORMANCE</span>
              <span className="ver mono">prototip v0.3</span>
            </div>
            <h1 className="tab-title">{cur.title}</h1>
            <p className="tab-sub">{cur.sub}</p>
          </header>
          <main className="app-main" ref={mainRef}>
            {tab === 'merkez' ? <Hub open={open} /> : null}
            {tab === 'gunluk' ? <LogTab store={logStore} nav={logNav} setNav={setLogNav} openBio={openBio} openSim={openSim} /> : null}
            {tab === 'biyomekanik' ? <BiomechTab move={move} setMove={setMove} /> : null}
            {tab === 'yorgunluk' ? <FatigueTab step={step} setStep={setStep} /> : null}
          </main>
          {toast ? <div className="toast" role="status">{toast}</div> : null}
          <div id="sheet-root" />
          <nav className="tabbar" aria-label="Ana gezinme">
            {TABS.map((t) => (
              <button
                key={t.id}
                id={'tab-' + t.id}
                type="button"
                className={'tab' + (t.id === tab ? ' on' : '') + (t.ready ? '' : ' soon')}
                aria-current={t.id === tab ? 'page' : undefined}
                aria-disabled={!t.ready}
                onClick={() => pick(t)}
              >
                <span className="tab-ic"><Icon name={t.icon} size={20} /></span>
                <span className="tab-l">{t.label}</span>
                {!t.ready ? <span className="soon-dot" aria-hidden="true" /> : null}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
