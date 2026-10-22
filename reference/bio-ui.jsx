/* ================= BIYOMEKANIK ================= */
const MOVES = [
  { id: 'bench', name: 'Eğimli bench', tag: 'İtiş · çok eklemli' },
  { id: 'rdl', name: 'Romanian deadlift', tag: 'Menteşe · kalça' },
  { id: 'yanaacis', name: 'Yana açış', tag: 'İzole · yan omuz' },
];
const C1 = '#e66a1c';
const C2 = '#1aa0cc';
const f1 = (v) => fmt(v, 1);
const SV = (pt) => [pt[0], -pt[1]];

/* ---------- small primitives ---------- */
function Seg({ a, b, w, cls }) {
  const A0 = SV(a), B0 = SV(b);
  return <line x1={A0[0]} y1={A0[1]} x2={B0[0]} y2={B0[1]} className={cls} strokeWidth={w} />;
}
function Dot({ at, r, cls, style }) {
  const p = SV(at);
  return <circle cx={p[0]} cy={p[1]} r={r} className={cls} style={style} />;
}
function ArmLabel({ at, text, cls, sz = 1 }) {
  const p = SV(at);
  const w = (text.length * 3.5 + 6) * sz, h = 10.8 * sz;
  return (
    <g className={'arm-label ' + (cls || '')}>
      <rect x={p[0] - w / 2} y={p[1] - h / 2} width={w} height={h} rx={h / 2} />
      <text x={p[0]} y={p[1] + 2.3 * sz} textAnchor="middle" style={{ fontSize: 6.2 * sz + 'px' }}>{text}</text>
    </g>
  );
}
function MomentArm({ from, to, label, cls, labelDy = 7, sz = 1 }) {
  const pre = label ? label + ' ' : '';
  const len = Math.abs(to[0] - from[0]);
  const y = from[1];
  const mid = [(from[0] + to[0]) / 2, y + labelDy];
  return (
    <g className={'marm ' + (cls || '')}>
      <Seg a={from} b={[to[0], y]} w={1.2} cls="marm-line" />
      <Seg a={[from[0], y - 2.4]} b={[from[0], y + 2.4]} w={1.2} cls="marm-line" />
      <Seg a={[to[0], y - 2.4]} b={[to[0], y + 2.4]} w={1.2} cls="marm-line" />
      <ArmLabel at={mid} text={pre + (len < 1.5 ? '≈0' : f1(len) + ' cm')} cls={cls} sz={sz} />
    </g>
  );
}
function Arrow({ from, dir, len, cls }) {
  const a = SV(from);
  const b = [a[0] + dir[0] * len, a[1] - dir[1] * len];
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const h = 4.2;
  const p1 = [b[0] - h * Math.cos(ang - 0.45), b[1] - h * Math.sin(ang - 0.45)];
  const p2 = [b[0] - h * Math.cos(ang + 0.45), b[1] - h * Math.sin(ang + 0.45)];
  return (
    <g className={'farrow ' + (cls || '')}>
      <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />
      <path d={`M${p1[0]} ${p1[1]} L${b[0]} ${b[1]} L${p2[0]} ${p2[1]}`} />
    </g>
  );
}
function Defs() {
  return (
    <defs>
      <filter id="bio-glow" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="3" />
      </filter>
      <filter id="bio-soft" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="1.4" result="b" />
        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>
  );
}
function Heat({ at, r, k }) {
  const p = SV(at);
  return <circle cx={p[0]} cy={p[1]} r={r} className="heat" style={{ opacity: 0.15 + 0.75 * clamp(k) }} filter="url(#bio-glow)" />;
}

/* ---------- Bench figures ---------- */
const BENCH_VB = '-78 -94 130 140';
function BenchSide({ p, pose, curve }) {
  const st = pose.st;
  const t = st.t, n = st.n;
  const T = BIO.A.trunk;
  const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const mul = (v, s) => [v[0] * s, v[1] * s];
  const S = [0, 0];
  const hip = mul(t, -T);
  const floorY = hip[1] - 55;
  const knee = [hip[0] - BIO.A.thigh * Math.cos(rad8), hip[1] - BIO.A.thigh * Math.sin(rad8)];
  const ankY = floorY + BIO.A.ankleH;
  const dy = knee[1] - ankY;
  const ank = dy >= BIO.A.shank ? [knee[0], knee[1] - BIO.A.shank] : [knee[0] + Math.sqrt(BIO.A.shank * BIO.A.shank - dy * dy), ankY];
  const padA = add(mul(t, -(T + 12)), mul(n, -13.5));
  const padB = add(mul(t, 33), mul(n, -13.5));
  const head = add(mul(t, 25), mul(n, 3));
  const H = [pose.H[0], pose.H[1]];
  const E = [pose.E[0], pose.E[1]];
  const peakS = curve.reduce((m, c) => Math.max(m, c.mS), 1);
  const peakE = curve.reduce((m, c) => Math.max(m, c.mE), 1);
  const path = curve.map((c) => SV([c.H[0], c.H[1]]).join(',')).join(' ');
  const stick = curve.filter((c) => c.q >= 0.1 && c.q <= 0.4).map((c) => SV([c.H[0], c.H[1]]).join(',')).join(' ');
  const lineTop = H[1] + 30, lineBot = Math.min(E[1], 0) - 6;
  return (
    <svg viewBox={BENCH_VB} className="bio-svg" role="img" aria-label="Eğimli bench press yandan görünüm: omuz ve dirsek moment kolları">
      <Defs />
      <line x1="-140" x2="90" y1={-floorY} y2={-floorY} className="floor" />
      {/* bench */}
      <Seg a={padA} b={padB} w={7} cls="bench-pad" />
      {p.angle >= 8 ? <Seg a={[hip[0] - 34, hip[1] - 13.5]} b={[hip[0] + 4, hip[1] - 13.5]} w={7} cls="bench-pad" /> : null}
      <Seg a={[hip[0] - 14, hip[1] - 17]} b={[hip[0] - 14, floorY]} w={3} cls="bench-leg" />
      <Seg a={add(mul(t, 12), mul(n, -17))} b={[add(mul(t, 12), mul(n, -17))[0], floorY]} w={3} cls="bench-leg" />
      {/* legs */}
      <Seg a={hip} b={knee} w={15} cls="limb far" />
      <Seg a={knee} b={ank} w={10} cls="limb far" />
      <Seg a={[ank[0] + 5, floorY + 2]} b={[ank[0] - 22, floorY + 2]} w={4} cls="limb far" />
      {/* torso + head */}
      <Seg a={add(mul(t, -(T + 3)), mul(n, 3))} b={add(mul(t, 5), mul(n, 3))} w={26} cls="torso" />
      <Seg a={add(mul(t, 6), mul(n, 2))} b={head} w={9} cls="limb" />
      <Dot at={head} r={10.5} cls="head" />
      {/* bar path */}
      <polyline points={path} className="bar-path" />
      <polyline points={stick} className="bar-path stick" />
      {/* plate */}
      <Dot at={H} r={22.5} cls="plate" />
      <Dot at={H} r={3.2} cls="plate-hub" />
      {/* heat */}
      <Heat at={S} r={9} k={pose.mS / peakS} />
      <Heat at={E} r={7} k={pose.mE / peakE} />
      {/* arm */}
      <Seg a={S} b={E} w={9} cls="limb arm" />
      <Seg a={E} b={H} w={7} cls="limb arm" />
      <Dot at={S} r={3.2} cls="joint" />
      <Dot at={E} r={2.8} cls="joint" />
      {/* line of action */}
      <Seg a={[H[0], lineTop]} b={[H[0], lineBot]} w={1} cls="force-line" />
      <Arrow from={[H[0] + 5, H[1] + 8]} dir={[0, -1]} len={16} cls="g" />
      <MomentArm from={S} to={H} label="omuz" cls="s" sz={0.66} labelDy={E[1] > 0 ? -6 : 6} />
      <MomentArm from={E} to={H} label="dirsek" cls="e" sz={0.66} labelDy={E[1] > 0 ? 6 : -6} />
      <text x={-74} y={-86} className="svg-cap">YANDAN · yakın plan</text>
    </svg>
  );
}
const rad8 = (8 * Math.PI) / 180;

/* ---------- RDL figure ---------- */
function RdlSide({ p, pose, refLen, curve }) {
  const phi = (pose.phi * Math.PI) / 180;
  const td = [Math.sin(phi), Math.cos(phi)];
  const an = [Math.cos(phi), -Math.sin(phi)];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const mul = (v, s) => [v[0] * s, v[1] * s];
  const head = add(add(pose.Sh, mul(td, 21)), mul(an, 3));
  const Larm = BIO.A.upper + BIO.A.fore + BIO.A.hangGrip;
  const elb = [pose.Sh[0] + (pose.bar[0] - pose.Sh[0]) * (BIO.A.upper / Larm), pose.Sh[1] + (pose.bar[1] - pose.Sh[1]) * (BIO.A.upper / Larm)];
  const stretch = pose.hamLen - refLen;
  const peakHip = curve.reduce((m, c) => Math.max(m, c.mHip), 1);
  const bx = pose.bar[0];
  return (
    <svg viewBox="-82 -196 200 200" className="bio-svg" role="img" aria-label="Romanian deadlift yandan görünüm: kalça moment kolu ve hamstring uzunluğu">
      <Defs />
      <line x1="-90" x2="130" y1="0" y2="0" className="floor" />
      <path d={`M${BIO.MIDFOOT} 1.5 l-3 5 h6 z`} className="midfoot" />
      <text x={BIO.MIDFOOT + 5} y="9" className="svg-cap">orta ayak</text>
      <Seg a={[-6, 2]} b={[23, 2]} w={4} cls="limb" />
      <Seg a={pose.Ank} b={pose.K} w={10} cls="limb" />
      <Seg a={pose.K} b={pose.P} w={15} cls="limb" />
      <Seg a={add(pose.P, mul(td, -4))} b={add(pose.Sh, mul(td, 3))} w={24} cls="torso" />
      <Seg a={pose.Sh} b={head} w={8} cls="limb" />
      <Dot at={head} r={10.5} cls="head" />
      <polyline points={[pose.ish, pose.tib].map((q) => SV(q).join(',')).join(' ')} className="hamstring" style={{ opacity: 0.3 + 0.55 * clamp(stretch / 11), strokeWidth: 2 + 1.6 * clamp(stretch / 11) }} filter="url(#bio-soft)" />
      <Dot at={pose.bar} r={22.5} cls="plate" />
      <Dot at={pose.bar} r={3.2} cls="plate-hub" />
      <Heat at={pose.P} r={10} k={pose.mHip / peakHip} />
      <Seg a={pose.Sh} b={elb} w={9} cls="limb arm" />
      <Seg a={elb} b={pose.bar} w={7} cls="limb arm" />
      <Dot at={pose.P} r={3.2} cls="joint" />
      <Dot at={pose.K} r={2.6} cls="joint" />
      <Dot at={pose.Sh} r={2.6} cls="joint" />
      <Dot at={pose.hat} r={2.4} cls="com" />
      <Seg a={[pose.hat[0], pose.hat[1]]} b={[pose.hat[0], pose.P[1] - 3]} w={0.8} cls="force-line body" />
      <Seg a={[bx, pose.bar[1] + 28]} b={[bx, 0]} w={1} cls="force-line" />
      <Arrow from={[bx + 6, pose.bar[1] + 6]} dir={[0, -1]} len={15} cls="g" />
      <MomentArm from={pose.P} to={pose.bar} label="kalça" cls="s" labelDy={7.5} />
      <text x={-76} y={-184} className="svg-cap">YANDAN · kalça moment kolu, hamstring</text>
    </svg>
  );
}

/* ---------- Lateral raise figure ---------- */
function LatFront({ p, pose, peak }) {
  const S = [0, 0];
  const mid = -BIO.A.shoulderHalf;
  const L = [2 * mid, 0];
  const floorY = -BIO.SH_FLOOR;
  const mirror = (pt) => [2 * mid - pt[0], pt[1]];
  const kind = p.kind;
  // perpendicular foot from S onto force line through H with dir d
  const d = pose.dir;
  const rel = [S[0] - pose.H[0], S[1] - pose.H[1]];
  const proj = rel[0] * d[0] + rel[1] * d[1];
  const F0 = [pose.H[0] + d[0] * proj, pose.H[1] + d[1] * proj];
  const lineA = [pose.H[0] - d[0] * 26, pose.H[1] - d[1] * 26];
  const lineB = kind === 'db' ? [pose.H[0] + d[0] * (Math.abs(proj) + 14) * Math.sign(proj || 1), pose.H[1] + d[1] * (Math.abs(proj) + 14) * Math.sign(proj || 1)] : F0;
  const tension = clamp(pose.F / (1.7 * p.mass));
  const bilateral = kind !== 'cable';
  const leftH = bilateral ? mirror(pose.H) : [L[0] - 2, -66];
  const leftE = bilateral ? mirror(pose.E) : [L[0] - 1, -35];
  const dbGlyph = (h) => (
    <g>
      <Seg a={[h[0] - 7, h[1]]} b={[h[0] + 7, h[1]]} w={2.6} cls="db-bar" />
      <Seg a={[h[0] - 6, h[1] - 4.5]} b={[h[0] - 6, h[1] + 4.5]} w={3.6} cls="db-plate" />
      <Seg a={[h[0] + 6, h[1] - 4.5]} b={[h[0] + 6, h[1] + 4.5]} w={3.6} cls="db-plate" />
    </g>
  );
  const anchorR = pose.anchor;
  const anchorL = kind === 'band' && pose.anchor ? mirror(pose.anchor) : null;
  const armLen = Math.hypot(F0[0] - S[0], F0[1] - S[1]);
  return (
    <svg viewBox="-104 -42 200 200" className="bio-svg" role="img" aria-label="Yana açış önden görünüm: omuz moment kolu ve direnç çizgisi">
      <Defs />
      <line x1="-120" x2="110" y1={-floorY} y2={-floorY} className="floor" />
      {/* body */}
      <Seg a={[mid - 9, -58]} b={[mid - 10, floorY + 3]} w={13} cls="limb far" />
      <Seg a={[mid + 9, -58]} b={[mid + 10, floorY + 3]} w={13} cls="limb far" />
      <Seg a={[mid, -4]} b={[mid, -50]} w={36} cls="torso" />
      <Seg a={[mid, 6]} b={[mid, 14]} w={9} cls="limb" />
      <Dot at={[mid, 24]} r={11} cls="head" />
      {/* resistance */}
      {kind === 'cable' ? (
        <g>
          <Seg a={[anchorR[0], anchorR[1] - 6]} b={[anchorR[0], floorY]} w={6} cls="bench-leg" />
          <Dot at={anchorR} r={4.5} cls="pulley" />
        </g>
      ) : null}
      {kind !== 'db' ? (
        <g>
          <Seg a={anchorR} b={pose.H} w={kind === 'band' ? 1.4 + 3 * tension : 1.3} cls={kind === 'band' ? 'band' : 'cable'} />
          {anchorL ? <Seg a={anchorL} b={leftH} w={1.4 + 3 * tension} cls="band" /> : null}
        </g>
      ) : null}
      <Heat at={S} r={10} k={pose.m / peak} />
      <Heat at={L} r={10} k={bilateral ? pose.m / peak : 0} />
      {/* arms */}
      <Seg a={L} b={leftE} w={8} cls="limb arm" />
      <Seg a={leftE} b={leftH} w={6} cls="limb arm" />
      <Seg a={S} b={pose.E} w={8} cls="limb arm" />
      <Seg a={pose.E} b={pose.H} w={6} cls="limb arm" />
      {kind === 'db' ? <g>{dbGlyph(pose.H)}{dbGlyph(leftH)}</g> : null}
      <Dot at={S} r={3} cls="joint" />
      <Dot at={pose.E} r={2.5} cls="joint" />
      <Dot at={L} r={3} cls="joint" />
      {/* line of action + perpendicular moment arm */}
      <Seg a={lineA} b={lineB} w={1} cls="force-line" />
      <Arrow from={pose.H} dir={d} len={8 + 12 * clamp(pose.F / (1.7 * p.mass))} cls="g" />
      <Seg a={S} b={F0} w={1.2} cls="marm-line s" />
      <ArmLabel at={[(S[0] + F0[0]) / 2, (S[1] + F0[1]) / 2 + 7]} text={armLen < 1.5 ? '≈0' : f1(armLen) + ' cm'} cls="s" />
      <text x={-98} y={-34} className="svg-cap">ÖNDEN</text>
    </svg>
  );
}

/* ---------- Chart ---------- */
function niceStep(max, n) {
  const raw = max / n;
  const pw = Math.pow(10, Math.floor(Math.log10(raw)));
  const m = raw / pw;
  const k = m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10;
  return k * pw;
}
function interpY(pts, x) {
  if (!pts.length) return 0;
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (x <= pts[i][0]) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0 || 1);
    }
  }
  return pts[pts.length - 1][1];
}

function TorqueChart({ id, series, xMin, xMax, xLabel, xUnit, yUnit, cur, band, onScrub, yFixed, valueFmt, valText }) {
  const W = 340, Hh = 196, m = { l: 40, r: 14, t: 18, b: 32 };
  const iw = W - m.l - m.r, ih = Hh - m.t - m.b;
  const yMaxData = yFixed || Math.max(1, ...series.map((s) => Math.max(...s.pts.map((q) => q[1]))));
  const step = yFixed ? yFixed / 4 : niceStep(yMaxData * 1.08, 4);
  const yMax = yFixed || Math.ceil((yMaxData * 1.04) / step) * step;
  const X = (x) => m.l + ((x - xMin) / (xMax - xMin)) * iw;
  const Y = (y) => m.t + ih - (y / yMax) * ih;
  const yTicks = [];
  for (let v = 0; v <= yMax + 1e-6; v += step) yTicks.push(v);
  const xStep = niceStep(xMax - xMin, 4);
  const xTicks = [];
  for (let v = Math.ceil(xMin / xStep) * xStep; v <= xMax + 1e-6; v += xStep) xTicks.push(v);
  const svgRef = useRef(null);
  const drag = useRef(false);
  const scrubAt = (e) => {
    const r = svgRef.current.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const fx = clamp((px - m.l) / iw);
    onScrub(fx);
  };
  const vf = valueFmt || ((v) => Math.round(v));
  const vt = valText || ((v) => vf(v) + (yUnit ? ' ' + yUnit : ''));
  const curX = X(cur);
  // direct labels at each series peak, nudged apart
  const labels = [];
  series.forEach((s) => {
    if (s.noLabel) return;
    let best = s.pts[0];
    s.pts.forEach((q) => { if (q[1] > best[1]) best = q; });
    let lx = clamp(X(best[0]), m.l + 26, W - m.r - 26), ly = Y(best[1]) - 7;
    labels.forEach((o) => { if (Math.abs(o.x - lx) < 60 && Math.abs(o.y - ly) < 12) ly = o.y + 13; });
    labels.push({ x: lx, y: Math.max(m.t + 2, ly), text: s.label, cls: s.muted ? 'muted' : '' });
  });
  const areaPath = (s) => {
    const top = s.pts.map((q) => `${X(q[0])},${Y(q[1])}`).join(' L');
    const low = (s.lower || s.pts.map((q) => [q[0], 0])).slice().reverse().map((q) => `${X(q[0])},${Y(q[1])}`).join(' L');
    return `M${top} L${low} Z`;
  };
  return (
    <div className="chart">
      <div className="legend-row">
        {series.map((s) => (
          <span key={s.id} className={'lg-item' + (s.muted ? ' muted' : '')}>
            <i style={{ background: s.muted ? 'transparent' : s.color, borderColor: s.color }} className={s.dash ? 'dash' : ''} />
            {s.label}
            <b className="mono">{vt(interpY(s.valuePts || s.pts, cur))}</b>
          </span>
        ))}
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${Hh}`}
        className="chart-svg"
        role="img"
        aria-label={'Grafik: ' + series.map((s) => s.label).join(', ') + ' — ' + xLabel}
        onPointerDown={(e) => { drag.current = true; try { e.currentTarget.setPointerCapture(e.pointerId); } catch (er) {} scrubAt(e); }}
        onPointerMove={(e) => { if (drag.current) scrubAt(e); }}
        onPointerUp={() => { drag.current = false; }}
        onPointerCancel={() => { drag.current = false; }}
      >
        {band ? (
          <g>
            <rect x={X(band[0])} y={m.t} width={X(band[1]) - X(band[0])} height={ih} className="chart-band" />
            <text x={(X(band[0]) + X(band[1])) / 2} y={m.t + 11} textAnchor="middle" className="chart-band-t">{band[2]}</text>
          </g>
        ) : null}
        {yTicks.map((v) => (
          <g key={'y' + v}>
            <line x1={m.l} x2={W - m.r} y1={Y(v)} y2={Y(v)} className="grid" />
            <text x={m.l - 6} y={Y(v) + 3.5} textAnchor="end" className="tick">{Math.round(v)}</text>
          </g>
        ))}
        {xTicks.map((v) => (
          <text key={'x' + v} x={X(v)} y={Hh - m.b + 14} textAnchor="middle" className="tick">{Math.round(v)}</text>
        ))}
        <text x={W - m.r} y={Hh - 4} textAnchor="end" className="axis-t">{xLabel}{xUnit ? ` (${xUnit})` : ''}</text>
        <text x={4} y={11} className="axis-t">{yUnit}</text>
        {series.filter((s) => s.area).map((s) => <path key={'a' + s.id} d={areaPath(s)} style={{ fill: s.color }} className="area" />)}
        {series.filter((s) => s.lower).map((s) => (
          <polyline key={'g' + s.id} points={s.lower.map((q) => `${X(q[0])},${Y(q[1])}`).join(' ')} className="stack-gap" />
        ))}
        {series.map((s) => (
          <polyline key={'l' + s.id} points={s.pts.map((q) => `${X(q[0])},${Y(q[1])}`).join(' ')} className={'line' + (s.dash ? ' dash' : '') + (s.muted ? ' muted' : '')} style={{ stroke: s.color }} />
        ))}
        {labels.map((l, i) => <text key={i} x={l.x} y={l.y} textAnchor="middle" className={'direct ' + l.cls}>{l.text}</text>)}
        <line x1={curX} x2={curX} y1={m.t} y2={m.t + ih} className="cursor" />
        {series.map((s) => <circle key={'c' + s.id} cx={curX} cy={Y(interpY(s.pts, cur))} r={s.muted ? 3 : 4.2} className="cursor-dot" style={{ stroke: s.color }} />)}
        <rect x={m.l} y={m.t} width={iw} height={ih} className="hit" />
      </svg>
      <details className="data-table">
        <summary>Değer tablosu</summary>
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>{xLabel}</th>{series.map((s) => <th key={s.id}>{s.label}</th>)}</tr></thead>
            <tbody>
              {[0, 0.2, 0.4, 0.6, 0.8, 1].map((k) => {
                const x = xMin + k * (xMax - xMin);
                return <tr key={k}><td className="mono">{Math.round(x)}</td>{series.map((s) => <td key={s.id} className="mono">{vf(interpY(s.valuePts || s.pts, x))}</td>)}</tr>;
              })}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

/* ---------- controls ---------- */
function Segmented({ id, label, value, options, onChange }) {
  return (
    <div className="field">
      <div className="field-top"><span className="seg-label" id={id + '-l'}>{label}</span></div>
      <div className="segmented" role="radiogroup" aria-labelledby={id + '-l'}>
        {options.map((o) => (
          <button key={o.v} id={id + '-' + o.v} type="button" role="radio" aria-checked={value === o.v} className={value === o.v ? 'on' : ''} onClick={() => onChange(o.v)}>{o.t}</button>
        ))}
      </div>
    </div>
  );
}

function Tile({ k, v, unit, sub, tone }) {
  return (
    <div className={'tile ' + (tone || '')}>
      <span className="tile-k">{k}</span>
      <span className="tile-v mono">{v}<small>{unit}</small></span>
      {sub ? <span className="tile-sub">{sub}</span> : null}
    </div>
  );
}

/* ---------- rep cycle ---------- */
// returns q in [0,1] for movement at time t (seconds)
function cycleQ(move, t) {
  const T = 4.6;
  const x = (t % T) / T;
  const ease = (u) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(u));
  // phases: hold start .06, eccentric .44, hold .08, concentric .36, hold .06
  let k;
  if (x < 0.06) k = 0;
  else if (x < 0.5) k = ease((x - 0.06) / 0.44);
  else if (x < 0.58) k = 1;
  else if (x < 0.94) k = 1 - ease((x - 0.58) / 0.36);
  else k = 0;
  // k: 0 = start position, 1 = far position
  if (move === 'bench') return 1 - k;      // start at lockout, lower to chest
  return k;                                // rdl: top → bottom, lateral: bottom → top (lift first)
}

/* ---------- Biomech screen ---------- */
function BiomechTab({ move, setMove }) {
  const [playing, setPlaying] = useState(() => !reducedMotion());
  const [q, setQ] = useState(0.3);
  const [bench, setBench] = useState({ angle: 30, grip: 'orta', flare: 'orta', load: 80 });
  const [rdl, setRdl] = useState({ load: 80, offset: 0, knee: 20, depth: 70 });
  const [lat, setLat] = useState({ mass: 10, bend: 15, kind: 'db', bandSide: 'ayni' });
  const tRef = useRef(0);
  const raf = useRef(0);

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const tick = (now) => {
      tRef.current += (now - last) / 1000;
      last = now;
      setQ(cycleQ(move, tRef.current));
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, move]);

  useEffect(() => { tRef.current = 0; setQ(move === 'bench' ? 0.3 : 0.6); }, [move]);

  const scrub = (v) => { setPlaying(false); setQ(clamp(v)); };
  const sb = (k) => (v) => setBench((o) => ({ ...o, [k]: v }));
  const sr = (k) => (v) => setRdl((o) => ({ ...o, [k]: v }));
  const sl = (k) => (v) => setLat((o) => ({ ...o, [k]: v }));

  let body = null;
  if (move === 'bench') body = <BenchPanel p={bench} set={sb} q={q} scrub={scrub} playing={playing} setPlaying={setPlaying} />;
  if (move === 'rdl') body = <RdlPanel p={rdl} set={sr} q={q} scrub={scrub} playing={playing} setPlaying={setPlaying} />;
  if (move === 'yanaacis') body = <LatPanel p={lat} set={sl} q={q} scrub={scrub} playing={playing} setPlaying={setPlaying} />;

  return (
    <div className="bio">
      <div className="bio-intro">
        <p><strong>Moment kolu</strong>, eklem ile yükün etki çizgisi arasındaki dik mesafedir. Eklemdeki zorlanma (tork) = kuvvet × moment kolu.</p>
      </div>
      <div className="move-pick" role="tablist" aria-label="Hareket seç">
        {MOVES.map((m) => (
          <button key={m.id} id={'move-' + m.id} type="button" role="tab" aria-selected={move === m.id} className={'move' + (move === m.id ? ' on' : '')} onClick={() => setMove(m.id)}>
            <span className="move-n">{m.name}</span>
            <span className="move-t">{m.tag}</span>
          </button>
        ))}
      </div>
      <p className="move-more">Programındaki diğer hareketler sırada: oturarak dumbbell omuz press, shrug, leg curl, ön omuz kaldırış.</p>
      {body}
    </div>
  );
}

function Transport({ playing, setPlaying, q, scrub, label, id }) {
  return (
    <div className="transport">
      <button type="button" id={id + '-play'} className="icon-btn" onClick={() => setPlaying(!playing)} aria-label={playing ? 'Duraklat' : 'Oynat'}>
        <Icon name={playing ? 'pause' : 'play'} size={18} />
      </button>
      <div className="tr-slider">
        <input id={id + '-phase'} type="range" min="0" max="1000" value={Math.round(q * 1000)} onChange={(e) => scrub(parseInt(e.target.value, 10) / 1000)} className="rng rng-neuro" aria-label="Hareket fazı" style={{ '--track': `linear-gradient(90deg, var(--neuro) 0%, var(--neuro) ${q * 100}%, var(--line-strong) ${q * 100}%)` }} />
        <span className="tr-label mono">{label}</span>
      </div>
    </div>
  );
}

/* ----- Bench panel ----- */
function BenchPanel({ p, set, q, scrub, playing, setPlaying }) {
  const curve = useMemo(() => BIO.benchCurve(p, 60), [p.angle, p.grip, p.flare, p.load]);
  const pose = BIO.benchPose(p, q);
  const st = pose.st;
  const bottom = curve[0];
  const avgE = curve.reduce((a, c) => a + c.dE, 0) / curve.length;
  const emph = BIO.benchEmphasis(p, avgE);
  const sPts = curve.map((c) => [c.height, c.mS]);
  const ePts = curve.map((c) => [c.height, c.mE]);
  const peakS = Math.max(...curve.map((c) => c.mS));
  const peakE = Math.max(...curve.map((c) => c.mE));
  return (
    <div className="bio-panel">
      <div className="fig-card">
        <div className="fig-top">
          <span className="fig-title">Yandan görünüm</span>
          <span className="fig-meta mono">{p.load} kg · {p.angle}°</span>
        </div>
        <div className="fig"><BenchSide p={p} pose={pose} curve={curve} /></div>
        <Transport id="bench" playing={playing} setPlaying={setPlaying} q={q} scrub={scrub} label={`Bar göğüsten ${Math.round(pose.height)} cm`} />
      </div>

      <div className="tiles">
        <Tile k="Omuz" v={Math.round(pose.mS)} unit=" N·m" sub={`kol ${f1(pose.dS)} cm`} tone={pose.mS / peakS > 0.75 ? 'hot' : ''} />
        <Tile k="Dirsek" v={Math.round(pose.mE)} unit=" N·m" sub={`kol ${f1(pose.dE)} cm`} tone={pose.mE / peakE > 0.75 ? 'hot' : ''} />
        <Tile k="Hareket açıklığı" v={Math.round(st.rom)} unit=" cm" sub="göğüs → kilit" />
        <Tile k="Altta kol–gövde" v={Math.round(bottom.abd)} unit="°" sub={`ön kol ${Math.round(bottom.foreSide)}° eğik`} />
      </div>

      <div className="card">
        <div className="card-h"><h3>Tork eğrisi</h3><span className="card-hint">Grafiğe dokunup sürükle</span></div>
        <TorqueChart
          id="bench-chart"
          series={[
            { id: 's', label: 'Omuz', color: C1, pts: sPts, area: true },
            { id: 'e', label: 'Dirsek', color: C2, pts: ePts },
          ]}
          xMin={0} xMax={st.rom} xLabel="Bar göğüsten" xUnit="cm" yUnit="N·m"
          cur={pose.height}
          band={[0.1 * st.rom, 0.4 * st.rom, 'tipik takılma bölgesi']}
          onScrub={(fx) => scrub(fx)}
        />
      </div>

      <div className="card">
        <div className="card-h"><h3>Değişkenler</h3></div>
        <div className="controls">
          <Range id="bench-angle" label="Bench açısı" value={p.angle} min={0} max={60} step={5} onChange={set('angle')} display={p.angle + '°'} hint={p.angle === 0 ? 'düz bench' : p.angle >= 50 ? 'omuz prese yaklaşıyor' : ''} />
          <Segmented id="bench-grip" label="Tutuş genişliği" value={p.grip} onChange={set('grip')} options={[{ v: 'dar', t: 'Dar 45' }, { v: 'orta', t: 'Orta 65' }, { v: 'genis', t: 'Geniş 81' }]} />
          <Segmented id="bench-flare" label="Altta dirsek açısı" value={p.flare} onChange={set('flare')} options={[{ v: 'kapali', t: 'Kapalı ~45°' }, { v: 'orta', t: 'Orta ~60°' }, { v: 'acik', t: 'Açık ~80°' }]} />
          <Range id="bench-load" label="Bar yükü" value={p.load} min={40} max={120} step={2.5} onChange={set('load')} display={fmt(p.load, p.load % 1 ? 1 : 0) + ' kg'} tone="fire" />
        </div>
      </div>

      <div className="card">
        <div className="card-h"><h3>Tahmini kas vurgusu</h3><span className="card-hint">EMG tabanlı kaba model</span></div>
        <div className="emph">
          {emph.map((m) => (
            <div key={m.k} className="emph-row">
              <div className="emph-k"><span>{m.k}</span><small>{m.sub}</small></div>
              <div className="emph-bar"><span style={{ width: m.v * 100 + '%' }} /></div>
              {m.k === 'Üst göğüs' || m.k === 'Ön omuz' ? <span className="goal-tag">hedef</span> : <span className="goal-tag ghost" />}
            </div>
          ))}
        </div>
      </div>

      <Notes
        what="Omuzdaki tork, bar ile omuz eklemi arasındaki yatay mesafeyle büyür. Bu mesafe bar göğüsteyken en uzundur (yaklaşık 14 cm), bar omzun üstüne geldikçe sıfıra iner. Dirsekteki tork ise ön kolun yandan ne kadar dik durduğuna bağlıdır. Dirsek açısı omuzdaki toplam torku değiştirmez, yükü hangi kasın taşıyacağını değiştirir."
        tip="Takılma çoğu kişide bar göğüsten kalktıktan kısa süre sonra, alt-orta bölgede olur. Bar yolunu erken yüze doğru getirmek omuz moment kolunu hızla kısaltır. O bölgeyi duraklamalı tekrar ve o yükseklikte pin press ile hedefleyebilirsin. Üst göğüs için 30° civarı iyi bir başlangıç; 45° üstünde yük belirgin şekilde ön omuza kayar."
        caveat="Model statik, yandan bakışlı bir analizdir; ivme ve kol ağırlığı yok sayılır. Önden bakışta eller barı içe ya da dışa iterek yatay kuvvet üretebildiği için (geniş tutuşta %13–16'ya varan yanal kuvvet ölçüldü, Larsen 2021) önden tork hesabı yapılmaz. Kas vurgusu kaba bir tahmindir: üst göğüs EMG'si 30°'de en yüksek, 45° üstünde ön omuz belirgin artıyor (Rodríguez-Ridao 2020). Eğimli bench üst göğüs kalınlığını düz bench'ten fazla artırdı, ancak bu bulgu antrenmansız katılımcılarda elde edildi (Chaves 2020)."
      />
    </div>
  );
}

/* ----- RDL panel ----- */
function RdlPanel({ p, set, q, scrub, playing, setPlaying }) {
  const curve = useMemo(() => BIO.rdlCurve(p, 60), [p.load, p.offset, p.knee, p.depth]);
  const ref = useMemo(() => BIO.rdlRef(p), [p.load, p.offset]);
  const pose = BIO.rdlPose(p, q);
  const stretch = pose.hamLen - ref;
  const bodyPts = curve.map((c) => [c.phi, c.hipBody]);
  const totPts = curve.map((c) => [c.phi, c.mHip]);
  const peak = Math.max(...curve.map((c) => c.mHip));
  const barShare = pose.mHip > 0 ? pose.hipBar / pose.mHip : 0;
  const kneeTop = BIO.A.ankleH + BIO.A.shank;
  const barRel = pose.barH - kneeTop;
  return (
    <div className="bio-panel">
      <div className="fig-card">
        <div className="fig-top">
          <span className="fig-title">Yandan görünüm</span>
          <span className="fig-meta mono">{p.load} kg · vücut 110 kg</span>
        </div>
        <div className="fig"><RdlSide p={p} pose={pose} refLen={ref} curve={curve} /></div>
        <Transport id="rdl" playing={playing} setPlaying={setPlaying} q={q} scrub={scrub} label={`Gövde eğimi ${Math.round(pose.phi)}°`} />
      </div>

      <div className="tiles">
        <Tile k="Kalça" v={Math.round(pose.mHip)} unit=" N·m" sub={`kol ${f1(pose.dHip)} cm`} tone={pose.mHip / peak > 0.75 ? 'hot' : ''} />
        <Tile k="Yükün kaynağı" v={'%' + Math.round(barShare * 100)} unit=" bar" sub={`%${Math.round((1 - barShare) * 100)} gövde ağırlığı`} />
        <Tile k="Hamstring" v={Math.abs(stretch) < 0.5 ? '0' : (stretch > 0 ? '+' : '') + f1(stretch)} unit=" cm" sub="dik duruşa göre uzama" tone={stretch > 8 ? 'hot' : ''} />
        <Tile k="Bar yüksekliği" v={Math.round(pose.barH)} unit=" cm" sub={barRel >= 0 ? `diz eklemi ${Math.round(barRel)} cm üstü` : `diz eklemi ${Math.round(-barRel)} cm altı`} />
      </div>

      <div className="card">
        <div className="card-h"><h3>Kalça momenti</h3><span className="card-hint">Grafiğe dokunup sürükle</span></div>
        <TorqueChart
          id="rdl-chart"
          series={[
            { id: 'b', label: 'Gövde ağırlığı', color: C2, pts: bodyPts, area: true, noLabel: false },
            { id: 't', label: 'Bar', color: C1, pts: totPts, area: true, lower: bodyPts, valuePts: curve.map((c) => [c.phi, c.hipBar]) },
          ]}
          valueFmt={(v) => Math.round(v)}
          xMin={4} xMax={p.depth} xLabel="Gövde eğimi" xUnit="°" yUnit="N·m"
          cur={pose.phi}
          onScrub={(fx) => scrub(fx)}
        />
        <p className="chart-note">Üst çizgi toplam kalça momenti. Alttaki mavi alan gövdenin kendi ağırlığından, turuncu alan bardan gelen pay.</p>
      </div>

      <div className="card">
        <div className="card-h"><h3>Değişkenler</h3></div>
        <div className="controls">
          <Range id="rdl-offset" label="Bar–orta ayak mesafesi" value={p.offset} min={0} max={12} step={1} onChange={set('offset')} display={p.offset === 0 ? 'bacağa yakın' : p.offset + ' cm önde'} />
          <Range id="rdl-knee" label="Diz bükümü" value={p.knee} min={5} max={35} step={1} onChange={set('knee')} display={p.knee + '°'} />
          <Range id="rdl-depth" label="Alt nokta (gövde eğimi)" value={p.depth} min={45} max={85} step={1} onChange={set('depth')} display={p.depth + '°'} hint="hamstring esnekliğine bağlı" />
          <Range id="rdl-load" label="Bar yükü" value={p.load} min={40} max={160} step={5} onChange={set('load')} display={p.load + ' kg'} tone="fire" />
        </div>
      </div>

      <Notes
        what="Kalça momenti, kalça eklemi ile bar arasındaki yatay mesafeyle büyür ve gövde öne eğildikçe artar. Gövdenin kendi ağırlığı da kalçaya ciddi bir yük bindirir; çoğu açıda bu pay bardan gelenden büyüktür. Bar orta ayaktan uzaklaştıkça denge için kalça daha geriye gider ve moment hızla artar."
        tip="Barı bacaklarına sürterek indir; 5 cm'lik kayma bile kalça momentini belirgin artırır. Hamstring esnekliğin arttıkça alt nokta derinleşir ve hamstring daha uzun pozisyonda yüklenir. Günlük esneme çalışman bu yüzden RDL'ye doğrudan yansır."
        caveat="Diz bükümü hamstringi diz tarafından kısaltır; dize yakın düz bacakla yapılan RDL hamstringi daha çok uzatır. Model sistemi orta ayak üstünde dengede tutar ve beli nötr kabul eder. Segment uzunlukları ve kütleleri Winter'ın antropometri oranlarıyla 190 cm / 110 kg için hesaplandı."
      />
    </div>
  );
}

/* ----- Lateral raise panel ----- */
const LAT_KINDS = [
  { v: 'db', t: 'Dumbbell' },
  { v: 'band', t: 'Band' },
  { v: 'cable', t: 'Kablo' },
];
function LatPanel({ p, set, q, scrub, playing, setPlaying }) {
  const curves = useMemo(() => {
    const o = {};
    LAT_KINDS.forEach((k) => { o[k.v] = BIO.latCurve(p, k.v, 60); });
    return o;
  }, [p.mass, p.bend, p.bandSide]);
  const pose = BIO.latPose(p, q, p.kind);
  const cur = curves[p.kind];
  const peak = Math.max(...cur.map((c) => c.m));
  const peakAt = cur.reduce((b, c) => (c.m > b.m ? c : b), cur[0]);
  const series = LAT_KINDS.map((k) => {
    const c = curves[k.v];
    const pk = Math.max(...c.map((r) => r.m)) || 1;
    const sel = k.v === p.kind;
    return { id: k.v, label: k.t, color: sel ? C1 : 'var(--faint)', pts: c.map((r) => [r.alpha, (r.m / pk) * 100]), area: sel, dash: !sel, muted: !sel };
  });
  const bottomShare = Math.round((cur[Math.round(cur.length * 0.17)].m / peak) * 100);
  return (
    <div className="bio-panel">
      <div className="fig-card">
        <div className="fig-top">
          <div className="segmented sm" role="radiogroup" aria-label="Direnç tipi">
            {LAT_KINDS.map((k) => (
              <button key={k.v} type="button" id={'lat-' + k.v} role="radio" aria-checked={p.kind === k.v} className={p.kind === k.v ? 'on' : ''} onClick={() => set('kind')(k.v)}>{k.t}</button>
            ))}
          </div>
          <span className="fig-meta mono">{p.kind === 'band' ? 'band' : p.mass + ' kg'}</span>
        </div>
        <div className="fig"><LatFront p={p} pose={pose} peak={peak} /></div>
        <Transport id="lat" playing={playing} setPlaying={setPlaying} q={q} scrub={scrub} label={`Kol açısı ${Math.round(pose.alpha)}°`} />
      </div>

      <div className="tiles">
        <Tile k="Omuz torku" v={Math.round(pose.m)} unit=" N·m" sub={`kol ${f1(pose.d)} cm`} tone={pose.m / peak > 0.75 ? 'hot' : ''} />
        <Tile k="Kuvvet" v={f1(pose.F)} unit=" kg" sub={p.kind === 'band' ? 'band gerginliği' : 'sabit'} />
        <Tile k="En zor nokta" v={Math.round(peakAt.alpha)} unit="°" sub="kol açısı" />
        <Tile k="Alt aralık yükü" v={'%' + bottomShare} unit="" sub="20° civarı, zirveye göre" />
      </div>

      <div className="card">
        <div className="card-h"><h3>Direnç profili</h3><span className="card-hint">Her biri kendi zirvesine göre</span></div>
        <TorqueChart
          id="lat-chart"
          series={series}
          yFixed={100}
          xMin={BIO.LAT_MIN} xMax={BIO.LAT_MAX} xLabel="Kol açısı" xUnit="°" yUnit="% zirve"
          cur={pose.alpha}
          valueFmt={(v) => Math.round(v)}
          valText={(v) => '%' + Math.round(v)}
          onScrub={(fx) => scrub(fx)}
        />
      </div>

      <div className="card">
        <div className="card-h"><h3>Değişkenler</h3></div>
        <div className="controls">
          <Range id="lat-mass" label={p.kind === 'band' ? 'Band direnci (üstte)' : p.kind === 'cable' ? 'Kablo ağırlığı' : 'Dumbbell'} value={p.mass} min={4} max={20} step={1} onChange={set('mass')} display={p.kind === 'band' ? '≈ ' + f1(1.6 * p.mass) + ' kg' : p.mass + ' kg'} tone="fire" />
          <Range id="lat-bend" label="Dirsek bükümü" value={p.bend} min={0} max={40} step={5} onChange={set('bend')} display={p.bend + '°'} />
          {p.kind === 'band' ? (
            <Segmented id="lat-side" label="Bandın bağlandığı yer" value={p.bandSide} onChange={set('bandSide')} options={[{ v: 'ayni', t: 'Aynı ayak altı' }, { v: 'karsi', t: 'Karşı ayak altı' }]} />
          ) : null}
        </div>
      </div>

      <Notes
        what="Dumbbell'da kuvvet hep aşağı doğrudur, moment kolu da elin omuzdan yatay uzaklığıdır. Bu yüzden kol aşağıdayken tork sıfıra yakın, kol yere paralelken en yüksektir. Band ve kablo kuvveti başka yönden çektiği için zor nokta hareketin farklı bir yerine kayar."
        tip="Cumartesi band çalışmanda bandı aynı ayağın altına bağlarsan hareketin altı neredeyse boş, üstü çok ağır olur. Karşı ayağın altından geçirmek alt bölgeye biraz yük ekler. Salonda kablo, alt aralığı en iyi yükleyen seçenek."
        caveat="Uzun kas boyunda, yani hareketin alt aralığında yüklenmenin hipertrofiye katkısı birçok kasta gösterildi; yan omuz için doğrudan kanıt hâlâ sınırlı. Band kuvveti gerilmeyle doğrusal artan basit bir yay modeliyle hesaplandı; gerçek bantların kuvvet eğrisi markaya göre değişir."
      />
    </div>
  );
}
