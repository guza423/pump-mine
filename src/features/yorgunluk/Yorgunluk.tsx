// @ts-nocheck
import React from 'react';
const { useState, useEffect, useRef, useMemo, useCallback } = React;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
let SIM_PREFILL = null; // Günlük özetinden Yorgunluk simülatörüne aktarılan değerler
const smooth = (x) => x * x * (3 - 2 * x);
const reducedMotion = () => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
};
const fmt = (n, d = 0) => n.toFixed(d).replace('.', ',');

const STAGES = [
  { id: 'sinyal', short: 'Sinyal' },
  { id: 'kazanim', short: 'Kazanım' },
  { id: 'atesleme', short: 'Ateşleme' },
  { id: 'periferik', short: 'Yorgunluk' },
  { id: 'toparlanma', short: 'Toparlanma' },
];

/* ---------------- Icons ---------------- */
function Icon({ name, size = 16 }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' };
  switch (name) {
    case 'zap': return <svg {...p}><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" /></svg>;
    case 'pulse': return <svg {...p}><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>;
    case 'target': return <svg {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></svg>;
    case 'flask': return <svg {...p}><path d="M9 3h6" /><path d="M10 3v6L4.6 18.8A1.5 1.5 0 0 0 5.9 21h12.2a1.5 1.5 0 0 0 1.3-2.2L14 9V3" /><path d="M7.5 15h9" /></svg>;
    case 'left': return <svg {...p}><path d="m15 18-6-6 6-6" /></svg>;
    case 'right': return <svg {...p}><path d="m9 18 6-6-6-6" /></svg>;
    case 'reset': return <svg {...p}><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>;
    case 'moon': return <svg {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>;
    case 'up': return <svg {...p}><path d="M12 19V5" /><path d="m5 12 7-7 7 7" /></svg>;
    case 'send': return <svg {...p}><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4 20-7z" /></svg>;
    case 'home': return <svg {...p}><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v10h13V10" /><path d="M10 20v-5h4v5" /></svg>;
    case 'book': return <svg {...p}><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z" /><path d="M5 17a3 3 0 0 1 3-3h11" /><path d="M9 8h6" /></svg>;
    case 'joint': return <svg {...p}><path d="M4 20 9.5 12.5" /><path d="M9.5 12.5 20 6.5" /><circle cx="9.5" cy="12.5" r="2.4" /><circle cx="20" cy="6.5" r="1.4" /><circle cx="4" cy="20" r="1.4" /></svg>;
    case 'chart': return <svg {...p}><path d="M3 3v18h18" /><path d="m7 15 4-4 3 3 6-7" /></svg>;
    case 'play': return <svg {...p}><path d="M7 4.5v15l12-7.5z" /></svg>;
    case 'pause': return <svg {...p}><path d="M8 5v14" /><path d="M16 5v14" /></svg>;
    case 'arrow': return <svg {...p}><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>;
    case 'clock': return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
    default: return null;
  }
}

/* ---------------- Shared ---------------- */
function Notes({ what, tip, caveat }) {
  return (
    <aside className="notes">
      <div className="note note-what">
        <div className="note-label"><Icon name="pulse" size={14} /> Ne oluyor?</div>
        <p>{what}</p>
      </div>
      <div className="note note-tip">
        <div className="note-label"><Icon name="target" size={14} /> Pratik ipucu</div>
        <p>{tip}</p>
      </div>
      {caveat ? (
        <div className="note note-caveat">
          <div className="note-label"><Icon name="flask" size={14} /> Bilimsel not</div>
          <p>{caveat}</p>
        </div>
      ) : null}
    </aside>
  );
}

function StageShell({ index, title, lede, notes, children }) {
  return (
    <section className="stage" aria-labelledby={'h-' + index}>
      <div className="stage-head">
        <div className="eyebrow">Aşama {index + 1} / 5</div>
        <h2 id={'h-' + index}>{title}</h2>
        <p className="lede">{lede}</p>
      </div>
      <div className="stage-grid">
        <div className="lab">{children}</div>
        {notes}
      </div>
    </section>
  );
}

function Range({ id, label, value, min, max, step = 1, onChange, display, tone = 'neuro', hint }) {
  const pct = ((value - min) / (max - min)) * 100;
  const color = tone === 'fire' ? 'var(--fire)' : 'var(--neuro)';
  return (
    <div className="field">
      <div className="field-top">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id} className="field-val">{display != null ? display : value}</output>
      </div>
      <input
        id={id}
        className={'rng rng-' + tone}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ '--track': `linear-gradient(90deg, ${color} 0%, ${color} ${pct}%, var(--line-strong) ${pct}%)` }}
      />
      {hint ? <div className="field-hint">{hint}</div> : null}
    </div>
  );
}

function Switch({ id, on, onChange, label }) {
  return (
    <div className="switch-row">
      <span id={id + '-lbl'}>{label}</span>
      <button id={id} type="button" role="switch" aria-checked={on} aria-labelledby={id + '-lbl'} className={'switch' + (on ? ' on' : '')} onClick={() => onChange(!on)}>
        <span className="knob" />
        <span className="switch-txt">{on ? 'Açık' : 'Kapalı'}</span>
      </button>
    </div>
  );
}

function ArcGauge({ value, color, label }) {
  const r = 70;
  const L = Math.PI * r;
  const v = clamp(value);
  return (
    <svg viewBox="0 0 180 106" className="arc-gauge" role="img" aria-label={label + ': yüzde ' + Math.round(v * 100)}>
      <path d="M20 96 A70 70 0 0 1 160 96" className="arc-bg" />
      {[0, 0.25, 0.5, 0.75, 1].map((k) => {
        const a = Math.PI * (1 - k);
        const x1 = 90 + Math.cos(a) * 58, y1 = 96 - Math.sin(a) * 58;
        const x2 = 90 + Math.cos(a) * 52, y2 = 96 - Math.sin(a) * 52;
        return <line key={k} x1={x1} y1={y1} x2={x2} y2={y2} className="arc-tick" />;
      })}
      <path d="M20 96 A70 70 0 0 1 160 96" className="arc-val" style={{ stroke: color, strokeDasharray: `${v * L} ${L}` }} />
      <text x="90" y="84" textAnchor="middle" className="arc-num">{Math.round(v * 100)}</text>
      <text x="90" y="101" textAnchor="middle" className="arc-unit">% maks.</text>
    </svg>
  );
}

/* ---------------- Progress (myelinated axon) ---------------- */
function Axon({ step, go }) {
  return (
    <nav className="axon" aria-label="Aşamalar">
      <div className="axon-track" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={'myelin' + (i < step ? ' lit' : '')}
            style={{ left: `calc(${10 + i * 20}% + 15px)`, width: 'calc(20% - 30px)', transitionDelay: i < step ? `${120 + (i === step - 1 ? 250 : 0)}ms` : '0ms' }}
          />
        ))}
        <span className="axon-pulse" style={{ left: `${10 + step * 20}%` }} />
      </div>
      <ol className="axon-nodes">
        {STAGES.map((s, i) => (
          <li key={s.id}>
            <button
              type="button"
              id={'node-' + s.id}
              className={'node' + (i === step ? ' current' : '') + (i < step ? ' done' : '')}
              aria-current={i === step ? 'step' : undefined}
              onClick={() => go(i)}
            >
              <span className="node-dot"><span>{i + 1}</span></span>
              <span className="node-label">{s.short}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/* ================= STAGE 1: Signal ================= */
const TL = { A: 1100, SYN: 1350, B: 2200, NMJ: 2450, AP: 2800, HOLD: 3700, END: 4300 };
const MS_MAP = [[0, 0], [TL.A, 9], [TL.SYN, 10], [TL.B, 17], [TL.NMJ, 18], [TL.AP, 21], [TL.HOLD, 55], [TL.END, 90]];
const msAt = (t) => {
  for (let i = 1; i < MS_MAP.length; i++) {
    if (t <= MS_MAP[i][0]) {
      const [t0, m0] = MS_MAP[i - 1], [t1, m1] = MS_MAP[i];
      return m0 + ((m1 - m0) * (t - t0)) / (t1 - t0);
    }
  }
  return 90;
};
const STATIONS = [
  { name: 'Motor korteks', desc: 'Hareket planı elektriksel uyarıya dönüşür (üst motor nöron).' },
  { name: 'Kortikospinal yol', desc: 'Uyarı beyin sapından geçerek omuriliğe iner.' },
  { name: 'Alfa motor nöron', desc: 'Omuriliğin ön boynuzunda sinaps kurulur; sinyal sinir boyunca 50–120 m/s hızla kasa ilerler.' },
  { name: 'Nöromüsküler kavşak', desc: 'Asetilkolin salınır ve kas zarını uyarır.' },
  { name: 'Kas lifi', desc: 'Ca²⁺ açığa çıkar, aktin–miyozin köprüleri kurulur, lif kısalır.' },
];
const MARKERS = [[196, 62], [196, 206], [196, 330], [556, 184], [520, 322]];
const FIBERS = [226, 238, 250, 262, 274];
const CA_DOTS = Array.from({ length: 16 }, (_, i) => ({ x: 452 + ((i * 53) % 136), y: 224 + ((i * 29) % 52) }));
const ACH = Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2);

function StageSignal() {
  const aRef = useRef(null);
  const bRef = useRef(null);
  const raf = useRef(0);
  const [ready, setReady] = useState(false);
  const [t, setT] = useState(-1);

  useEffect(() => { setReady(true); return () => cancelAnimationFrame(raf.current); }, []);

  const fire = () => {
    cancelAnimationFrame(raf.current);
    const speed = reducedMotion() ? 2 : 1;
    const start = performance.now();
    const tick = (now) => {
      const el = (now - start) * speed;
      if (el >= TL.END) { setT(TL.END); return; }
      setT(el);
      raf.current = requestAnimationFrame(tick);
    };
    setT(0);
    raf.current = requestAnimationFrame(tick);
  };

  const running = t >= 0 && t < TL.END;
  const done = t >= TL.END;
  const la = ready && aRef.current ? aRef.current.getTotalLength() : 1;
  const lb = ready && bRef.current ? bRef.current.getTotalLength() : 1;
  const posA = t < 0 ? 0 : clamp(t / TL.A) * la;
  const posB = t < TL.SYN ? 0 : clamp((t - TL.SYN) / (TL.B - TL.SYN)) * lb;

  let particle = null;
  if (ready && running && aRef.current && bRef.current) {
    let pt = null;
    if (t <= TL.A) pt = aRef.current.getPointAtLength(posA);
    else if (t <= TL.SYN) pt = aRef.current.getPointAtLength(la);
    else if (t <= TL.B) pt = bRef.current.getPointAtLength(posB);
    if (pt) particle = { x: pt.x, y: pt.y };
  }

  const trail = 54;
  const somaGlow = t >= TL.A - 100 && t <= TL.SYN + 200 ? 1 : 0;
  const ach = t >= TL.B && t <= TL.NMJ + 300 ? clamp((t - TL.B) / (TL.NMJ + 300 - TL.B)) : -1;
  const sweep = t < TL.NMJ ? 0 : clamp((t - TL.NMJ) / (TL.AP - TL.NMJ));
  const c = t < TL.NMJ + 80 ? 0 : t < TL.AP ? clamp((t - TL.NMJ - 80) / (TL.AP - TL.NMJ - 80)) : t < TL.HOLD ? 1 : clamp(1 - (t - TL.HOLD) / (TL.END - TL.HOLD));
  const ce = smooth(c);
  const hot = t >= TL.NMJ && t < TL.END ? Math.max(t < TL.AP ? 1 : 0, c) : 0;
  const station = t < 0 ? -1 : t < 380 ? 0 : t < TL.A ? 1 : t < TL.B ? 2 : t < TL.NMJ ? 3 : t < TL.END ? 4 : 5;
  const ms = t < 0 ? 0 : msAt(Math.min(t, TL.END));
  const pathLit = done ? 0.32 : 0.6;
  const sx = 1 - 0.13 * ce, sy = 1 + 0.14 * ce;

  const status =
    station === -1 ? 'Hazır. Sinyali başlat.'
      : station === 5 ? 'Tamamlandı. Kas lifi yaklaşık 20 ms içinde uyarıldı.'
        : STATIONS[station].name;

  return (
    <StageShell
      index={0}
      title="Beyinden kasa sinyal"
      lede="Her tekrar, motor kortekste doğan bir elektrik sinyaliyle başlar."
      notes={
        <Notes
          what="Kaldırma kararı motor kortekste elektriksel bir uyarıya dönüşür. Uyarı kortikospinal yolla omuriliğe iner, alfa motor nörona aktarılır ve sinir boyunca kasa ulaşır. Nöromüsküler kavşakta asetilkolin salınır, kas lifinde Ca²⁺ açığa çıkar ve aktin–miyozin köprüleri kurulur."
          tip="Isınma setlerini de maksimum hız niyetiyle kaldır. Barı hızlı itmeye niyet etmek, bar yavaş hareket etse bile sinir sisteminin daha güçlü ve hızlı sinyal göndermesini sağlar."
        />
      }
    >
      <div className="lab-bar">
        <button type="button" id="fire-btn" className="btn primary" onClick={fire} disabled={running}>
          <Icon name="send" /> {done ? 'Tekrar gönder' : 'Sinyal Gönder'}
        </button>
        <div className="readout-chip"><span className="rc-k">Gerçek zaman</span><span className="rc-v mono">≈ {Math.round(ms)} ms</span></div>
        <div className={'status-line' + (running ? ' live' : '')} aria-live="polite">{status}</div>
      </div>

      <div className="diagram">
        <svg viewBox="0 0 640 380" role="img" aria-label="Motor korteksten omuriliğe, alfa motor nörondan kas lifine sinyal yolu">
          <defs>
            <filter id="g-neuro" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3.2" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="g-fire" x="-30%" y="-60%" width="160%" height="220%">
              <feGaussianBlur stdDeviation="7" />
            </filter>
            <clipPath id="belly-clip">
              <path d="M420 250 C455 196 585 196 620 250 C585 304 455 304 420 250 Z" />
            </clipPath>
            <radialGradient id="belly-grad" cx="50%" cy="45%" r="60%">
              <stop offset="0%" stopColor="#3a1a1c" />
              <stop offset="100%" stopColor="#1a0e14" />
            </radialGradient>
          </defs>

          {/* Brain */}
          <path className="brain" d="M60 104 C48 74 70 44 104 40 C120 22 162 16 190 30 C222 26 250 48 250 76 C266 96 256 126 228 132 C214 148 186 150 168 140 C148 150 116 150 100 138 C76 140 58 126 60 104 Z" />
          <g className="gyri">
            <path d="M84 70 C98 80 110 62 126 72" />
            <path d="M200 50 C206 70 226 70 230 90" />
            <path d="M80 104 C100 110 116 96 136 106" />
            <path d="M184 104 C198 114 214 104 232 114" />
            <path d="M108 128 C122 120 136 130 150 122" />
            <path d="M118 40 C124 56 140 54 146 70" />
          </g>
          <path className={'motor-strip' + (station === 0 ? ' on' : '')} d="M176 22 C166 44 172 72 160 104" filter="url(#g-neuro)" />

          {/* Brainstem + spinal cord */}
          <path className="cord" d="M150 136 C153 150 154 162 151 176 L173 176 C170 160 172 148 177 134 Z" />
          {[184, 208, 232, 256, 280, 304, 328, 352].map((y) => (
            <rect key={y} className="vertebra" x="136" y={y} width="50" height="17" rx="5" />
          ))}
          <rect className="cord" x="148" y="172" width="26" height="198" rx="13" />

          {/* Base pathways */}
          <path ref={aRef} className="path-base" d="M168 52 C164 86 162 120 161 160 L161 290" />
          <path ref={bRef} className="path-base" d="M171 302 C246 306 320 262 404 222 C450 200 494 192 520 204" />

          {/* Traversed glow */}
          <path className="path-lit" d="M168 52 C164 86 162 120 161 160 L161 290" style={{ strokeDasharray: `${posA} ${la + 10}`, opacity: t < 0 ? 0 : pathLit }} />
          <path className="path-lit" d="M171 302 C246 306 320 262 404 222 C450 200 494 192 520 204" style={{ strokeDasharray: `${posB} ${lb + 10}`, opacity: t < TL.SYN ? 0 : pathLit }} />

          {/* Comet trail */}
          {running && t <= TL.A ? (
            <path className="path-trail" filter="url(#g-neuro)" d="M168 52 C164 86 162 120 161 160 L161 290" style={{ strokeDasharray: `${trail} ${la + trail}`, strokeDashoffset: trail - posA }} />
          ) : null}
          {running && t > TL.SYN && t <= TL.B ? (
            <path className="path-trail" filter="url(#g-neuro)" d="M171 302 C246 306 320 262 404 222 C450 200 494 192 520 204" style={{ strokeDasharray: `${trail} ${lb + trail}`, strokeDashoffset: trail - posB }} />
          ) : null}

          {/* Alpha motor neuron soma */}
          <g className={'soma' + (somaGlow ? ' on' : '')}>
            <path d="M163 300 L150 292 M163 300 L152 312 M163 300 L158 286" />
            <circle cx="163" cy="300" r="8" filter={somaGlow ? 'url(#g-neuro)' : undefined} />
          </g>

          {/* Tendons */}
          <path className="tendon" d="M394 250 L424 250" />
          <path className="tendon" d="M616 250 L636 250" />

          {/* Muscle */}
          <g transform={`translate(520 250) scale(${sx} ${sy}) translate(-520 -250)`}>
            <ellipse cx="520" cy="250" rx="96" ry="44" className="belly-glow" style={{ opacity: 0.55 * ce }} filter="url(#g-fire)" />
            <path className="belly" d="M420 250 C455 196 585 196 620 250 C585 304 455 304 420 250 Z" fill="url(#belly-grad)" />
            <g clipPath="url(#belly-clip)">
              {FIBERS.map((y) => <line key={y} className="fiber" x1="424" y1={y} x2="616" y2={y} />)}
              {FIBERS.map((y) => (
                <g key={'h' + y} style={{ opacity: hot }}>
                  <line className="fiber-hot" x1="520" y1={y} x2="424" y2={y} style={{ strokeDasharray: `${sweep * 100} 200` }} />
                  <line className="fiber-hot" x1="520" y1={y} x2="616" y2={y} style={{ strokeDasharray: `${sweep * 100} 200` }} />
                </g>
              ))}
              {CA_DOTS.map((d, i) => <circle key={i} className="ca-dot" cx={d.x} cy={d.y} r="2.2" style={{ opacity: ce * (0.5 + (i % 3) * 0.25) }} />)}
            </g>
          </g>

          {/* NMJ */}
          <g className="nmj">
            <circle cx="520" cy="206" r="5" className={'nmj-core' + (t >= TL.B && t < TL.AP ? ' on' : '')} />
            {ach >= 0 ? ACH.map((a, i) => (
              <circle key={i} className="ach" cx={520 + Math.cos(a) * (4 + ach * 16)} cy={206 + Math.sin(a) * (4 + ach * 12)} r={2.2} style={{ opacity: 1 - ach }} />
            )) : null}
          </g>

          {/* Particle */}
          {particle ? (
            <g filter="url(#g-neuro)">
              <circle cx={particle.x} cy={particle.y} r="7" className="spark-halo" />
              <circle cx={particle.x} cy={particle.y} r="3.6" className="spark-core" />
            </g>
          ) : null}

          {/* Markers */}
          {MARKERS.map(([x, y], i) => (
            <g key={i} className={'marker' + (station === i ? ' active' : station > i ? ' passed' : '')}>
              <circle cx={x} cy={y} r="12" />
              <text x={x} y={y + 4.5} textAnchor="middle">{i + 1}</text>
            </g>
          ))}
        </svg>
      </div>

      <ol className="stations">
        {STATIONS.map((s, i) => (
          <li key={s.name} className={station === i ? 'active' : station > i ? 'passed' : ''}>
            <span className="st-num mono">{i + 1}</span>
            <div className="st-body">
              <strong>{s.name}</strong>
              <span>{s.desc}</span>
            </div>
          </li>
        ))}
      </ol>
      <p className="caption">Gerçekte bu yol kas lifine yaklaşık 20 ms'de ulaşır, kuvvet birkaç on milisaniye sonra zirve yapar. Animasyon yaklaşık 70 kat yavaşlatıldı.</p>
    </StageShell>
  );
}

/* ================= STAGE 2: Recruitment ================= */
const UNITS = (() => {
  const u = [];
  const add = (type, n, lo, hi) => {
    for (let i = 0; i < n; i++) u.push({ id: type + i, type, thr: lo + (hi - lo) * (i / (n - 1)), ph: ((i * 37) % 17) / 17 });
  };
  add('I', 24, 5, 45);
  add('IIa', 16, 36, 72);
  add('IIx', 8, 64, 88);
  return u;
})();
const TYPE_META = {
  I: { label: 'Küçük · Tip I', note: 'Yavaş kasılır, yorgunluğa dirençli', force: 1, cls: 't1' },
  IIa: { label: 'Orta · Tip IIa', note: 'Hızlı kasılır, orta dayanıklı', force: 4, cls: 't2' },
  IIx: { label: 'Büyük · Tip IIx', note: 'En hızlı ve güçlü, çabuk yorulur', force: 10, cls: 't3' },
};
const FORCE_TOTAL = UNITS.reduce((a, u) => a + TYPE_META[u.type].force, 0);

function StageRecruit() {
  const [load, setLoad] = useState(55);
  const prev = useRef(55);
  const from = prev.current;
  useEffect(() => { prev.current = load; }, [load]);

  const active = UNITS.filter((u) => u.thr <= load);
  const pct = Math.round((active.length / UNITS.length) * 100);
  const forcePct = Math.round((active.reduce((a, u) => a + TYPE_META[u.type].force, 0) / FORCE_TOTAL) * 100);
  const span = Math.min(900, Math.abs(load - from) * 14);
  const delayFor = (u) => {
    if (load > from && u.thr > from && u.thr <= load) return ((u.thr - from) / (load - from)) * span;
    if (load < from && u.thr <= from && u.thr > load) return ((from - u.thr) / (from - load)) * span;
    return 0;
  };

  const explain =
    load < 40 ? 'Hafif yük: çoğunlukla küçük, yorgunluğa dirençli Tip I üniteler çalışıyor. Kuvvet ihtiyacı düşük olduğu için büyük üniteler beklemede.'
      : load < 64 ? 'Orta yük: Tip IIa üniteler devreye giriyor. Her yeni orta ünite, küçüklere göre birkaç kat daha fazla kuvvet ekliyor.'
        : load < 88 ? 'Ağır yük: en büyük ve en güçlü Tip IIx üniteler de kazanılıyor. Kuvvet kapasitesinin büyük kısmı bu son eklenen ünitelerden geliyor.'
          : 'Kazanım tamamlandı. Büyük kaslarda bu sınır yaklaşık %80–90 civarıdır. Bunun üstünde kuvvet artışı çoğunlukla ateşleme hızıyla gelir (Aşama 3).';

  const zones = [
    { k: 'Tip I', w: 21 },
    { k: 'Tip IIa', w: 39 },
    { k: 'Tip IIx', w: 23 },
    { k: 'Frekans', w: 17 },
  ];

  return (
    <StageShell
      index={1}
      title="Motor ünite kazanımı"
      lede="Henneman boyut prensibi: sinir sistemi motor üniteleri küçükten büyüğe sırayla devreye alır."
      notes={
        <Notes
          what="Motor ünite, tek bir motor nöron ve onun uyardığı kas liflerinden oluşur. Küçük motor nöronların uyarılma eşiği düşüktür, bu yüzden önce onlar devreye girer; gereken kuvvet arttıkça orta ve büyük üniteler eklenir. Büyük üniteler çok sayıda hızlı kasılan Tip II life komuta eder ve kuvvetin büyük kısmını üretir."
          tip="Büyük üniteleri çalıştırmanın iki yolu var: ağır yük ya da tükenişe yakın (0–3 RIR) setler. Kas büyümesi için %30–80 1RM aralığı tükenişe yakın yapıldığında benzer sonuç verir; maksimal kuvvet için ağır yük yine üstündür."
          caveat="Hafif yükle tükenişe giderken yorgunlukla birlikte büyük ünitelerin de devreye girdiği kabul edilir; bunun ağır yük kadar eksiksiz olup olmadığı EMG çalışmalarında tartışmalıdır. Kaydırıcı %1RM'yi kabaca gereken kuvvete eşler, gerçek eşikler kasa ve harekete göre değişir."
        />
      }
    >
      <div className="recruit-top">
        <div className="big-readout">
          <span className="big-num mono">{pct}<small>%</small></span>
          <span className="big-k">aktif motor ünite</span>
        </div>
        <div className="big-readout">
          <span className="big-num mono fire">{forcePct}<small>%</small></span>
          <span className="big-k">devredeki kuvvet kapasitesi</span>
        </div>
      </div>

      <div className="load-ctl">
        <Range id="load-slider" label="Yük" value={load} min={30} max={100} onChange={setLoad} display={'%' + load + ' 1RM'} tone="fire" />
        <div className="zones" aria-hidden="true">
          {zones.map((z) => <span key={z.k} style={{ width: z.w + '%' }}>{z.k}</span>)}
        </div>
        <div className="chips" role="group" aria-label="Hazır yükler">
          {[30, 60, 85, 100].map((v) => (
            <button key={v} type="button" id={'preset-' + v} className={'chip' + (load === v ? ' on' : '')} onClick={() => setLoad(v)}>%{v}</button>
          ))}
        </div>
      </div>

      <div className="mu-groups">
        {['I', 'IIa', 'IIx'].map((type) => {
          const meta = TYPE_META[type];
          const units = UNITS.filter((u) => u.type === type);
          const on = units.filter((u) => u.thr <= load).length;
          return (
            <div key={type} className={'mu-group ' + meta.cls}>
              <div className="mu-head">
                <div>
                  <strong>{meta.label}</strong>
                  <span>{meta.note}</span>
                </div>
                <span className="mono mu-count">{on}/{units.length}</span>
              </div>
              <div className="mu-grid">
                {units.map((u) => (
                  <span
                    key={u.id}
                    className={'mu-dot' + (u.thr <= load ? ' on' : '')}
                    style={{ transitionDelay: delayFor(u) + 'ms', '--ph': u.ph * 1.4 + 's' }}
                    title={'Eşik ≈ %' + Math.round(u.thr)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p className="live-explain" aria-live="polite">{explain}</p>
    </StageShell>
  );
}

/* ================= STAGE 3: Rate coding ================= */
function Oscilloscope({ freq, sync, onForce }) {
  const wrapRef = useRef(null);
  const cvRef = useRef(null);
  const params = useRef({ freq, sync });
  params.current = { freq, sync };
  const cb = useRef(onForce);
  cb.current = onForce;

  useEffect(() => {
    const cv = cvRef.current;
    const ctx = cv.getContext('2d');
    const cs = getComputedStyle(document.documentElement);
    const col = (n, f) => (cs.getPropertyValue(n).trim() || f);
    const NEURO = col('--neuro', '#36d6ff');
    const FIRE = col('--fire', '#ff8a3d');
    const MUTED = col('--faint', '#5b6a8c');
    const GRID = 'rgba(80,140,220,0.10)';
    let w = 0, h = 0, dpr = 1;
    const resize = () => {
      const r = wrapRef.current.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = Math.max(10, r.width); h = Math.max(10, r.height);
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      cv.style.width = w + 'px'; cv.style.height = h + 'px';
    };
    resize();
    let ro = null;
    try { ro = new ResizeObserver(resize); ro.observe(wrapRef.current); } catch (e) { window.addEventListener('resize', resize); }

    const N = 5, WIN = 1.0, Tc = 0.035, KMAX = 0.3;
    const offs = [-0.06, -0.03, 0, 0.03, 0.06];
    const spikes = Array.from({ length: N }, () => []);
    const next = Array.from({ length: N }, () => Math.random() * 0.1);
    const gauss = () => { let u = 0; while (!u) u = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random()); };
    let master = 0, simT = 0, last = performance.now(), raf = 0, lastReport = 0, wasSync = params.current.sync;
    const kern = (u) => (u > 0 && u < KMAX ? (u / Tc) * Math.exp(1 - u / Tc) : 0);

    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now; simT += dt;
      const { freq: f, sync: sy } = params.current;
      if (sy !== wasSync) {
        if (sy) master = simT + 0.005;
        else for (let i = 0; i < N; i++) next[i] = simT + Math.random() / f;
        wasSync = sy;
      }
      if (sy) {
        while (master <= simT) {
          for (let i = 0; i < N; i++) spikes[i].push(master + gauss() * 0.0012);
          master += (1 / f) * Math.max(0.7, 1 + gauss() * 0.04);
        }
      } else {
        for (let i = 0; i < N; i++) {
          const fi = f * (1 + offs[i]);
          while (next[i] <= simT) {
            spikes[i].push(next[i]);
            next[i] += (1 / fi) * Math.max(0.55, 1 + gauss() * 0.13);
          }
        }
      }
      const tMin = simT - WIN - KMAX;
      for (let i = 0; i < N; i++) { while (spikes[i].length && spikes[i][0] < tMin) spikes[i].shift(); }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const t0 = simT - WIN;
      const muTop = 8, muH = h * 0.56, fTop = h * 0.64, fBot = h - 18;
      const rowH = muH / N;

      // scrolling graticule
      ctx.strokeStyle = GRID; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let k = Math.ceil(t0 / 0.1); k <= Math.floor(simT / 0.1); k++) {
        const x = ((k * 0.1 - t0) / WIN) * w;
        ctx.moveTo(x, 0); ctx.lineTo(x, h);
      }
      for (let i = 0; i <= N; i++) { const y = muTop + i * rowH; ctx.moveTo(0, y); ctx.lineTo(w, y); }
      ctx.moveTo(0, fTop); ctx.lineTo(w, fTop); ctx.moveTo(0, fBot); ctx.lineTo(w, fBot);
      ctx.stroke();

      // spike trains
      ctx.lineJoin = 'round';
      for (let i = 0; i < N; i++) {
        const y0 = muTop + rowH * (i + 0.55);
        const amp = rowH * (0.26 + i * 0.035);
        ctx.beginPath(); ctx.moveTo(0, y0);
        for (const s of spikes[i]) {
          if (s < t0) continue;
          const x = ((s - t0) / WIN) * w;
          ctx.lineTo(x - 2, y0); ctx.lineTo(x - 0.6, y0 - amp); ctx.lineTo(x + 1, y0 + amp * 0.45); ctx.lineTo(x + 2.4, y0);
        }
        ctx.lineTo(w, y0);
        ctx.strokeStyle = NEURO; ctx.lineWidth = 1.4; ctx.shadowColor = NEURO; ctx.shadowBlur = 8;
        ctx.stroke(); ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(3,6,13,0.85)';
        ctx.fillRect(2, muTop + rowH * i + 2, 30, 13);
        ctx.fillStyle = MUTED; ctx.font = '600 10px "JetBrains Mono", monospace';
        ctx.fillText('MÜ' + (i + 1), 6, muTop + rowH * i + 12);
      }

      // force trace (twitch summation)
      const stepPx = 3;
      const pts = [];
      let acc = 0, accN = 0;
      for (let x = 0; x <= w; x += stepPx) {
        const tau = t0 + (x / w) * WIN;
        let S = 0;
        for (let i = 0; i < N; i++) {
          const arr = spikes[i];
          for (let j = arr.length - 1; j >= 0; j--) {
            const u = tau - arr[j];
            if (u > KMAX) break;
            S += kern(u);
          }
        }
        const F = 1 - Math.exp(-(S / N) / 1.9);
        pts.push([x, F]);
        if (x > w * 0.72) { acc += F; accN++; }
      }
      const yOf = (F) => fBot - F * (fBot - fTop) * 0.92;
      // max line
      ctx.setLineDash([4, 5]); ctx.strokeStyle = 'rgba(255,138,61,0.28)'; ctx.beginPath();
      ctx.moveTo(0, yOf(1)); ctx.lineTo(w, yOf(1)); ctx.stroke(); ctx.setLineDash([]);
      // area
      const grad = ctx.createLinearGradient(0, fTop, 0, fBot);
      grad.addColorStop(0, 'rgba(255,138,61,0.30)'); grad.addColorStop(1, 'rgba(255,65,85,0.02)');
      ctx.beginPath(); ctx.moveTo(0, fBot);
      for (const [x, F] of pts) ctx.lineTo(x, yOf(F));
      ctx.lineTo(w, fBot); ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
      ctx.beginPath();
      pts.forEach(([x, F], k) => (k ? ctx.lineTo(x, yOf(F)) : ctx.moveTo(x, yOf(F))));
      ctx.strokeStyle = FIRE; ctx.lineWidth = 2; ctx.shadowColor = FIRE; ctx.shadowBlur = 10; ctx.stroke(); ctx.shadowBlur = 0;
      ctx.fillStyle = MUTED; ctx.font = '600 10px "JetBrains Mono", monospace';
      ctx.fillText('KUVVET', 6, fTop + 13);
      ctx.textAlign = 'right';
      ctx.fillText('maks.', w - 6, yOf(1) - 4);
      ctx.fillText('100 ms / bölme', w - 6, h - 5);
      ctx.textAlign = 'left';

      if (now - lastReport > 140 && accN) { lastReport = now; cb.current(acc / accN); }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); if (ro) ro.disconnect(); else window.removeEventListener('resize', resize); };
  }, []);

  return (
    <div className="scope" ref={wrapRef}>
      <canvas ref={cvRef} aria-label="Beş motor ünitenin ateşleme izleri ve toplam kuvvet eğrisi" role="img" />
    </div>
  );
}

function StageRate() {
  const [intensity, setIntensity] = useState(40);
  const [sync, setSync] = useState(false);
  const [force, setForce] = useState(0.5);
  const freq = 8 + intensity * 0.52;
  const shownForce = clamp(force * (sync ? 1.04 : 1));
  const rfd = clamp((0.22 + 0.78 * ((freq - 8) / 52)) * (sync ? 1.15 : 1));
  const fusion = freq < 16 ? 'Ayrı seğirmeler: kuvvet dalgalı' : freq < 34 ? 'Kısmi kaynaşma: seğirmeler üst üste biniyor' : 'Tetanusa yakın: kuvvet düzgün ve yüksek';

  return (
    <StageShell
      index={2}
      title="Ateşleme hızı ve senkronizasyon"
      lede="Üniteler devreye girdikten sonra kuvveti sinyalin sıklığı belirler."
      notes={
        <Notes
          what="Motor nöron saniyede ne kadar sık ateşlerse kas lifi o kadar güçlü kasılır. Düşük frekansta seğirmeler tek tek görülür; frekans yükseldikçe üst üste binip kaynaşır ve kuvvet artar (tetanus). Senkronizasyon, farklı ünitelerin aynı anda ateşlemesidir."
          tip="Ateşleme hızını en iyi ağır ve patlayıcı çalışma geliştirir: %80 1RM üzeri düşük tekrar ve maksimum hız niyeti. Yeni başlayanların ilk haftalardaki hızlı kuvvet artışının önemli kısmı bu tür nöral uyumlardan gelir."
          caveat="Senkronizasyonun maksimal kuvvete katkısı küçük ve tartışmalıdır; daha çok kuvvet gelişim hızıyla (RFD) ilişkilendirilir. Simülasyonda bu yüzden kuvveti az, patlayıcılığı daha çok artırır. Patlayıcı başlangıçlarda anlık frekans kısa süreliğine 100 Hz'in üzerine çıkabilir."
        />
      }
    >
      <div className="rate-head">
        <div className="hz-readout">
          <span className="big-num mono neuro">{Math.round(freq)}<small> Hz</small></span>
          <span className="big-k">ateşleme frekansı</span>
        </div>
        <div className="fusion-tag" aria-live="polite">{fusion}</div>
      </div>
      <Oscilloscope freq={freq} sync={sync} onForce={setForce} />
      <div className="rate-ctl">
        <div className="rate-inputs">
          <Range id="intensity-slider" label="Yoğunluk" value={intensity} min={0} max={100} onChange={setIntensity} display={'%' + intensity} />
          <Switch id="sync-switch" label="Senkronizasyon" on={sync} onChange={setSync} />
        </div>
        <div className="rate-out">
          <div className="gauge-box">
            <ArcGauge value={shownForce} color="var(--fire)" label="Kuvvet çıktısı" />
            <span className="gauge-k">Kuvvet çıktısı</span>
          </div>
          <div className="rfd-box">
            <div className="rfd-top"><span>Patlayıcılık (RFD)</span><span className="mono">{Math.round(rfd * 100)}</span></div>
            <div className="meter"><span style={{ width: rfd * 100 + '%' }} /></div>
            <p className="rfd-note">{sync ? 'Senkron ateşleme kuvvetin daha hızlı yükselmesine yardım eder.' : 'Senkronizasyonu aç ve izlerin hizalanmasını izle.'}</p>
          </div>
        </div>
      </div>
    </StageShell>
  );
}

/* ================= STAGE 4: Fatigue ================= */
const M0 = 6, V0 = 0.5, ROM = 0.4;
const METAB = Array.from({ length: 36 }, (_, i) => ({
  x: 22 + ((i * 47) % 216), y: 26 + ((i * 31) % 78), k: i % 2 === 0 ? 'h' : 'p', d: ((i * 13) % 10) / 10,
}));
const CAS = Array.from({ length: 18 }, (_, i) => ({ x: 30 + (i % 9) * 26, y: i < 9 ? 34 : 96 }));
const initFatigue = () => ({ set: 1, reps: 0, M: M0, resP: 0, resC: 0, vels: [], history: [] });

function StageFatigue() {
  const [s, setS] = useState(initFatigue);
  const [lift, setLift] = useState({ phase: 'rest', dur: 0.8, key: 0 });
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const p = s.reps / s.M;
  const P = s.resP + (1 - s.resP) * 0.88 * Math.pow(p, 1.25);
  const C = s.resC + (1 - s.resC) * 0.42 * Math.pow(p, 2.2);
  const v0 = V0 * (1 - 0.22 * s.resP - 0.08 * s.resC);
  const velOf = (r) => v0 * (1 - 0.66 * Math.pow((r - 1) / Math.max(1, s.M - 1), 1.5));
  const busy = lift.phase !== 'rest';
  const atFailure = s.reps >= s.M;
  const signal = 1 - 0.8 * C;
  const ca = 1 - 0.55 * P;
  const nMetab = Math.round(P * METAB.length);
  const curV = s.vels.length ? s.vels[s.vels.length - 1] : null;
  const vl = s.vels.length > 1 ? 1 - curV / s.vels[0] : 0;
  const rir = s.M - s.reps;
  const rpe = s.reps ? 10 - rir : null;

  const doRep = () => {
    if (busy || atFailure) return;
    const r = s.reps + 1;
    const v = velOf(r);
    const dur = clamp(ROM / v, 0.5, 2.6) * (reducedMotion() ? 0.35 : 1);
    setS((prev) => ({ ...prev, reps: r, vels: [...prev.vels, v] }));
    setLift((l) => ({ phase: 'up', dur, key: l.key + 1 }));
    timers.current.push(setTimeout(() => setLift((l) => ({ ...l, phase: 'down' })), dur * 1000 + 140));
    timers.current.push(setTimeout(() => setLift((l) => ({ ...l, phase: 'rest' })), dur * 1000 + 640));
  };
  const rest = () => {
    if (busy || s.reps === 0) return;
    const resP = P * 0.25, resC = C * 0.45;
    const M = Math.max(2, Math.round(M0 * (1 - 0.6 * resP - 0.6 * resC)));
    setS((prev) => ({
      set: prev.set + 1, reps: 0, M, resP, resC, vels: [],
      history: [...prev.history, { set: prev.set, reps: prev.reps, vl: prev.vels.length > 1 ? 1 - prev.vels[prev.vels.length - 1] / prev.vels[0] : 0, fail: prev.reps >= prev.M }].slice(-4),
    }));
  };
  const reset = () => { timers.current.forEach(clearTimeout); setLift({ phase: 'rest', dur: 0.8, key: 0 }); setS(initFatigue()); };

  const liftStyle = lift.phase === 'up'
    ? { transform: 'translateY(-92px)', transition: `transform ${lift.dur}s cubic-bezier(.22,.7,.32,1)` }
    : { transform: 'translateY(0)', transition: 'transform .5s ease-in' };
  const velColor = (v) => (1 - v / V0 < 0.2 ? 'var(--neuro)' : 1 - v / V0 < 0.4 ? 'var(--amber)' : 1 - v / V0 < 0.55 ? 'var(--fire)' : 'var(--burn)');

  return (
    <StageShell
      index={3}
      title="Yorgunluk: merkezi ve periferik"
      lede="Set ilerledikçe hem sinyalin kaynağı hem de kasın kendisi yorulur. %85 1RM ile bir set yap."
      notes={
        <Notes
          what="Merkezi yorgunluk, beyin ve omuriliğin kasa ulaştırdığı etkin sinyalin azalmasıdır. Periferik yorgunluk kasın içinde olur: inorganik fosfat (Pᵢ) ve H⁺ birikir, sarkoplazmik retikulumdan Ca²⁺ salınımı azalır ve aynı sinyal daha az kuvvet üretir. Bar hızındaki düşüş ikisinin toplam etkisini gösterir."
          tip="Bar hızı kalan tekrar için iyi bir göstergedir. Kuvvet odaklı setlerde ilk tekrara göre %20–30 hız kaybında durmak güçlü bir uyaran sağlar ve sonraki setlere daha az yorgunluk taşır. Hız ölçerin yoksa tekrarlar belirgin yavaşladığında 1–2 RIR'de bırak."
          caveat="Tek bir ağır sette yorgunluğun büyük kısmı periferiktir. Set içinde beyin sinyali artırarak telafi etmeye çalışır; merkezi yorgunluk bu telafinin yetmediği noktadır ve uzun, çok setli seanslarda belirginleşir. Laktatın kendisi yorgunluğun nedeni sayılmaz, Pᵢ ve H⁺ birikimi daha belirleyicidir."
        />
      }
    >
      <div className="lab-bar">
        <button type="button" id="rep-btn" className="btn fire" onClick={doRep} disabled={busy || atFailure}>
          <Icon name="up" /> {atFailure ? 'Tükeniş' : 'Tekrar Yap'}
        </button>
        <button type="button" id="rest-btn" className="btn ghost" onClick={rest} disabled={busy || s.reps === 0}>
          <Icon name="moon" /> 3 dk dinlen
        </button>
        <button type="button" id="reset-btn" className="btn ghost" onClick={reset} disabled={busy}>
          <Icon name="reset" /> Sıfırla
        </button>
        <div className="set-info mono">Set {s.set} · tekrar {s.reps}/{s.M}</div>
      </div>

      <div className="fatigue-panels">
        <div className="fpanel central">
          <div className="fpanel-head">
            <strong>Merkezi yorgunluk</strong>
            <span>Beyin ve omurilik çıkışı</span>
          </div>
          <svg viewBox="0 0 260 130" className="fp-svg" aria-hidden="true">
            <g transform="translate(8 6) scale(0.42)">
              <path className="brain" d="M60 104 C48 74 70 44 104 40 C120 22 162 16 190 30 C222 26 250 48 250 76 C266 96 256 126 228 132 C214 148 186 150 168 140 C148 150 116 150 100 138 C76 140 58 126 60 104 Z" />
            </g>
            <rect className="cord" x="72" y="64" width="12" height="60" rx="6" />
            <path className="path-base" d="M78 30 L78 104 C78 116 120 116 160 112 L252 112" />
            <path
              className="drive"
              d="M78 30 L78 104 C78 116 120 116 160 112 L252 112"
              style={{ opacity: 0.2 + 0.8 * signal, '--dur': (0.55 / Math.max(0.25, signal)).toFixed(2) + 's', strokeWidth: 2 + 2 * signal }}
            />
            <text x="250" y="102" textAnchor="end" className="svg-k">kasa</text>
          </svg>
          <div className="fbar-row">
            <div className="fbar"><span style={{ width: C * 100 + '%' }} /></div>
            <span className="mono fbar-v">{Math.round(C * 100)}</span>
          </div>
          <div className="fp-stat"><span>Etkin sinyal</span><span className="mono neuro">%{Math.round(signal * 100)}</span></div>
        </div>

        <div className="fpanel peripheral">
          <div className="fpanel-head">
            <strong>Periferik yorgunluk</strong>
            <span>Kas lifinin içi</span>
          </div>
          <svg viewBox="0 0 260 130" className="fp-svg" aria-hidden="true">
            <rect x="8" y="14" width="244" height="102" rx="20" className="fiber-body" />
            {Array.from({ length: 11 }, (_, i) => <line key={i} x1={24 + i * 21} y1="22" x2={24 + i * 21} y2="108" className="zline" />)}
            <line x1="20" y1="34" x2="240" y2="34" className="sr" />
            <line x1="20" y1="96" x2="240" y2="96" className="sr" />
            {CAS.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r="2.6" className="ca-dot" style={{ opacity: ca * (0.55 + (i % 3) * 0.2) }} />)}
            {METAB.map((m, i) => (
              <circle key={i} cx={m.x} cy={m.y} r={m.k === 'h' ? 2.4 : 3} className={'metab ' + m.k} style={{ opacity: i < nMetab ? 0.9 : 0, animationDelay: m.d * 2 + 's' }} />
            ))}
          </svg>
          <div className="fbar-row">
            <div className="fbar"><span style={{ width: P * 100 + '%' }} /></div>
            <span className="mono fbar-v">{Math.round(P * 100)}</span>
          </div>
          <div className="fp-stat"><span>Ca²⁺ salınımı</span><span className="mono neuro">%{Math.round(ca * 100)}</span></div>
          <div className="legend">
            <span><i className="lg ca" /> Ca²⁺</span>
            <span><i className="lg h" /> H⁺</span>
            <span><i className="lg p" /> Pᵢ</span>
          </div>
        </div>
      </div>

      <div className="perf-row">
        <div className="lane" aria-hidden="true">
          <div className="lane-rail" />
          <div className="barbell" style={liftStyle}>
            <i className="plate" /><i className="plate s" /><i className="bar" /><i className="plate s" /><i className="plate" />
          </div>
          <span className="lane-k">ROM 40 cm</span>
        </div>
        <div className="vel-box">
          <div className="vel-top">
            <div><span className="vk">Bar hızı</span><span className="mono vv">{curV ? fmt(curV, 2) : '–'} <small>m/s</small></span></div>
            <div><span className="vk">Hız kaybı</span><span className="mono vv">%{Math.round(vl * 100)}</span></div>
          </div>
          <div className="vel-bars">
            {Array.from({ length: Math.max(s.M, 6) }, (_, i) => {
              const v = s.vels[i];
              return (
                <div key={i} className={'vbar' + (v ? ' on' : '') + (i >= s.M ? ' void' : '')}>
                  <span style={{ height: v ? (v / V0) * 100 + '%' : '0%', background: v ? velColor(v) : 'transparent' }} />
                  <em className="mono">{i + 1}</em>
                </div>
              );
            })}
          </div>
        </div>
        <div className="rpe-box">
          <div className="vel-top">
            <div><span className="vk">RPE</span><span className="mono vv">{rpe != null ? rpe : '–'}</span></div>
            <div><span className="vk">RIR</span><span className="mono vv">{s.reps ? rir : '–'}</span></div>
          </div>
          <div className="rpe-scale" role="img" aria-label={rpe != null ? 'RPE ' + rpe : 'Henüz tekrar yok'}>
            {[5, 6, 7, 8, 9, 10].map((n) => (
              <div key={n} className={'rpe-seg r' + n + (rpe != null && n <= rpe ? ' on' : '') + (rpe === n ? ' cur' : '')}>
                <span className="mono">{n}</span>
              </div>
            ))}
          </div>
          <div className="rpe-legend mono"><span>RIR 5</span><span>RIR 0</span></div>
        </div>
      </div>

      <p className="live-explain" aria-live="polite">
        {atFailure
          ? 'Tükeniş: bu sette başka tekrar çıkmaz. Dinlen ve bir sonraki sette tahmini maksimum tekrarın nasıl düştüğüne bak.'
          : s.reps === 0
            ? (s.set === 1 ? 'Taze başlangıç. Tekrar Yap ile ilk tekrarı kaldır.' : `Dinlendin ama yorgunluğun bir kısmı taşındı. Bu sette tahmini maksimum ${s.M} tekrar.`)
            : vl >= 0.3
              ? 'Hız kaybı %30\'u geçti. Kuvvet odaklı bir sette burada durmak mantıklı.'
              : 'Periferik yorgunluk merkezi yorgunluktan hızlı birikiyor. Bar hızını izle.'}
      </p>
      {s.history.length ? (
        <div className="history">
          {s.history.map((h) => (
            <span key={h.set} className="hist-chip mono">Set {h.set}: {h.reps} tekrar · %{Math.round(h.vl * 100)} hız kaybı{h.fail ? ' · tükeniş' : ''}</span>
          ))}
        </div>
      ) : null}
    </StageShell>
  );
}

/* ================= STAGE 5: Recovery ================= */
function model({ load, rest, rpe, sets, sleep, deload }) {
  const L = clamp((load - 60) / 35), R = clamp((rpe - 6) / 4), V = clamp((sets - 8) / 20), S = clamp((8.5 - sleep) / 3.5), D = clamp((5 - rest) / 4);
  const f = deload ? 0.55 : 1;
  const parts = [
    { k: 'Temel', v: 6 },
    { k: 'Yük', v: 18 * L },
    { k: 'RPE', v: 16 * R },
    { k: 'Hacim', v: 14 * V },
    { k: 'Uyku açığı', v: 12 * S },
    { k: 'Kısa dinlenme', v: 6 * D },
    { k: 'Yük × RPE × uyku', v: 30 * L * R * S },
    { k: 'RPE × hacim', v: 8 * R * V },
  ].map((p) => ({ ...p, v: p.v * f }));
  const score = clamp(parts.reduce((a, p) => a + p.v, 0), 0, 100);
  const hours = 24 + 0.72 * score;
  let lo = Math.round((hours * 0.85) / 6) * 6, hi = Math.round((hours * 1.15) / 6) * 6;
  if (hi <= lo) hi = lo + 6;
  const zone = score < 40 ? { k: 'Yönetilebilir', c: 'var(--ok)', cls: 'ok' } : score < 70 ? { k: 'Birikiyor', c: 'var(--warn)', cls: 'warn' } : { k: 'Yüksek', c: 'var(--bad)', cls: 'bad' };

  const recs = [];
  if (load >= 90 && rpe >= 9) recs.push({ p: 4.2, t: 'Çok ağır yükte (%90 üzeri) RPE\'yi 8–9\'da tut ve bu setleri haftada birkaç tane ile sınırla.' });
  if (!deload && score >= 65) recs.push({ p: 4 + (score - 65) / 20, t: 'Bu tablo deload sinyali: 1 hafta hacmi %40–50 azalt, yükü koru veya hafifçe düşür.' });
  if (sleep < 7.5) recs.push({ p: 1.2 + S * 3, t: 'Uykuyu 7–9 saate çıkar. Kısa uyku maksimal kuvveti her zaman düşürmez, ama aynı yükü daha ağır hissettirir ve tekrar kapasitesini azaltır.' });
  if (rpe >= 9) recs.push({ p: 1 + R * 2.6, t: 'Setlerin çoğunu 1–3 RIR\'de bitir. Tükenişe gitmekle benzer kuvvet kazanımı sağlar, yorgunluğu ve toparlanma süresini ise belirgin azaltır.' });
  if (score >= 40 && score < 65) recs.push({ p: 1.3, t: 'Yorgunluk birikiyor ama yönetilebilir. Bir sonraki hafta yükü artırırken toplam set sayısını sabit tut.' });
  if (sets > 20) recs.push({ p: 0.8 + V * 2.4, t: 'Haftalık hacmi 2–3 seansa böl. Çoğu kişide tek seansta kas başına yaklaşık 6–10 zor setten sonra verim düşer.' });
  if (rest < 2.5 && load >= 75) recs.push({ p: 0.8 + D * 2.2, t: 'Ağır bileşik hareketlerde 3–5 dk dinlen. Kısa dinlenme sonraki setlerde tekrar sayısını ve kuvveti düşürür.' });
  if (deload) recs.push({ p: 1.6, t: 'Deload haftasında yükü tamamen bırakma. Hacmi düşür, hareket kalıbını ve teknik kaliteyi koru.' });
  if (score < 40) recs.push({ p: 1.4, t: 'Yük dengeli görünüyor. Yükü küçük adımlarla artır ve ısınma setindeki RPE\'yi haftalık takip et.' });
  if (recs.length < 2) recs.push({ p: 0.5, t: 'Zor setlerin sayısını, yükü ve uykuyu birlikte not al; tek bir değişkeni aynı anda değiştir.' });
  recs.sort((a, b) => b.p - a.p);
  return { score, hours, lo, hi, zone, parts, recs: recs.slice(0, 3) };
}

function NeedleGauge({ score, zone }) {
  const r = 78, L = Math.PI * r;
  const d = 'M22 100 A78 78 0 0 1 178 100';
  const seg = (a, b) => `0 ${a * L} ${(b - a) * L} ${L}`;
  const ang = -90 + (score / 100) * 180;
  return (
    <svg viewBox="0 0 200 118" className="needle-gauge" role="img" aria-label={'SSS yorgunluk ölçer: ' + Math.round(score) + ', ' + zone.k}>
      <path d={d} className="ng-track" />
      <path d={d} className="ng-zone" style={{ stroke: 'var(--ok)', strokeDasharray: seg(0, 0.395) }} />
      <path d={d} className="ng-zone" style={{ stroke: 'var(--warn)', strokeDasharray: seg(0.405, 0.695) }} />
      <path d={d} className="ng-zone" style={{ stroke: 'var(--bad)', strokeDasharray: seg(0.705, 1) }} />
      <g className="ng-needle" style={{ transform: `rotate(${ang}deg)` }}>
        <line x1="100" y1="100" x2="100" y2="34" />
        <circle cx="100" cy="100" r="7" />
      </g>
      <text x="22" y="115" className="ng-lbl" textAnchor="middle">0</text>
      <text x="178" y="115" className="ng-lbl" textAnchor="middle">100</text>
    </svg>
  );
}

function StageRecovery() {
  const [v, setV] = useState(() => ({ load: 82, rest: 3, rpe: 8.5, sets: 14, sleep: 7, deload: false, ...(SIM_PREFILL ? SIM_PREFILL.values : {}) }));
  const [src] = useState(() => (SIM_PREFILL ? SIM_PREFILL.label : null));
  const set = (k) => (x) => setV((prev) => ({ ...prev, [k]: x }));
  const r = useMemo(() => model(v), [v]);
  const maxPart = Math.max(...r.parts.map((p) => p.v), 1);

  return (
    <StageShell
      index={4}
      title="Toparlanma ve yorgunluk yönetimi"
      lede="Antrenman değişkenlerini ayarla; toplam yorgunluk yükünü ve toparlanma süresini gör."
      notes={
        <Notes
          what="Haftalık antrenmanın yarattığı yorgunluk; yük, efor (RPE), hacim, set arası dinlenme ve uykunun birleşimidir. Ölçer bu girdileri basit bir formülle puanlar. Çok ağır yük, yüksek RPE ve kısa uyku birbirini büyüttüğü için bu üçlü puanı en çok yükseltir."
          tip="Toparlanmayı izlemenin en basit yolu: her hafta aynı ısınma yükünde RPE'yi veya bar hızını not al. Aynı yük belirgin daha ağır geliyorsa (yaklaşık +1 RPE) o hafta hacmi azalt."
          caveat="Ağır kaldırmanın sinir sistemini günlerce yorduğu fikri popüler kültürde abartılır. Çalışmalarda istemli aktivasyondaki düşüş genelde 24 saat içinde toparlanırken, kasın kendi kasılma kapasitesi 48–72 saat düşük kalabiliyor. Bu ölçer gerçek bir SSS ölçümü değildir, toplam yorgunluk için sezgisel bir göstergedir."
        />
      }
    >
      {src ? <div className="import-note"><Icon name="book" size={14} /><span><b>Günlükten aktarıldı:</b> {src}. Yük, RPE, hacim ve dinlenme kayıtlarından; uyku girilmediği için 7 saat varsayıldı.</span></div> : null}
      <div className="sim-grid">
        <div className="sim-inputs">
          <Range id="sim-load" label="Ortalama yük" value={v.load} min={60} max={95} onChange={set('load')} display={'%' + v.load + ' 1RM'} tone="fire" />
          <Range id="sim-rpe" label="Set başına RPE" value={v.rpe} min={6} max={10} step={0.5} onChange={set('rpe')} display={fmt(v.rpe, v.rpe % 1 ? 1 : 0)} tone="fire" hint={'≈ ' + fmt(10 - v.rpe, (10 - v.rpe) % 1 ? 1 : 0) + ' RIR'} />
          <Range id="sim-sets" label="Haftalık set (kas grubu başına)" value={v.sets} min={4} max={30} onChange={set('sets')} display={v.sets + ' set'} />
          <Range id="sim-rest" label="Set arası dinlenme" value={v.rest} min={1} max={5} step={0.5} onChange={set('rest')} display={fmt(v.rest, v.rest % 1 ? 1 : 0) + ' dk'} />
          <Range id="sim-sleep" label="Uyku" value={v.sleep} min={5} max={9} step={0.5} onChange={set('sleep')} display={fmt(v.sleep, v.sleep % 1 ? 1 : 0) + ' saat'} />
          <Switch id="sim-deload" label="Deload haftası" on={v.deload} onChange={set('deload')} />
        </div>

        <div className="sim-out">
          <div className={'meter-card ' + r.zone.cls}>
            <div className="mc-head"><span>SSS yorgunluk ölçer</span><span className="zone-pill" style={{ color: r.zone.c, borderColor: r.zone.c }}>{r.zone.k}</span></div>
            <NeedleGauge score={r.score} zone={r.zone} />
            <div className="score mono" style={{ color: r.zone.c }}>{Math.round(r.score)}</div>
          </div>
          <div className="recov">
            <span className="vk">Tahmini toparlanma</span>
            <span className="mono recov-v">{r.lo}–{r.hi} <small>saat</small></span>
            <span className="recov-k">Aynı kas grubunu yeniden ağır çalışmadan önce</span>
          </div>
          <div className="recs">
            <span className="vk">Öneriler</span>
            <ol>
              {r.recs.map((x, i) => <li key={i}>{x.t}</li>)}
            </ol>
          </div>
          <details className="formula">
            <summary>Puan nasıl hesaplanıyor?</summary>
            <div className="parts">
              {r.parts.map((p) => (
                <div key={p.k} className="part">
                  <span>{p.k}</span>
                  <div className="part-bar"><span style={{ width: (p.v / maxPart) * 100 + '%' }} /></div>
                  <span className="mono">{fmt(p.v, 1)}</span>
                </div>
              ))}
            </div>
            <p className="formula-note">Her girdi 0–1 arasına ölçeklenir ve ağırlıkla çarpılır. Yük, RPE ve uyku açığının çarpımı ayrıca eklenir, bu yüzden üçü birlikte yüksekken puan hızla tırmanır. Deload toplamı %45 azaltır. Toparlanma ≈ 24 + 0,72 × puan saat.</p>
          </details>
        </div>
      </div>
    </StageShell>
  );
}


export function setSimPrefill(value) { SIM_PREFILL = value; }
export { clamp, reducedMotion, fmt, STAGES, Icon, Range, Axon, StageSignal, StageRecruit, StageRate, StageFatigue, StageRecovery };
