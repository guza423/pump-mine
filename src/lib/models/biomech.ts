// @ts-nocheck
/* Biomechanics models — static, sagittal/frontal plane. Units: cm, kg, degrees in params. */
export const BIO = (function () {
  var G = 9.81;
  var H = 190, BM = 110;
  var A = {
    upper: 0.186 * H,          // 35.3
    fore: 0.146 * H,           // 27.7
    gripOff: 5,                // wrist → bar centre in a pressing grip
    hangGrip: 7,               // wrist → bar centre in a hanging grip
    thigh: 0.245 * H,          // 46.6
    shank: 0.246 * H,          // 46.7
    trunk: 0.288 * H,          // 54.7
    ankleH: 0.039 * H,         // 7.4
    shoulderHalf: 19,
  };
  var rad = function (d) { return (d * Math.PI) / 180; };
  var deg = function (r) { return (r * 180) / Math.PI; };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var Nm = function (kg, cm) { return (kg * G * cm) / 100; };

  /* ---------- vector helpers (3D) ---------- */
  var v3 = {
    add: function (a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; },
    sub: function (a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; },
    mul: function (a, s) { return [a[0] * s, a[1] * s, a[2] * s]; },
    dot: function (a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; },
    cross: function (a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; },
    len: function (a) { return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]); },
    norm: function (a) { var l = Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  };

  /* ================= INCLINE BENCH ================= */
  var GRIPS = { dar: 45, orta: 65, genis: 81 };
  var FLARE = { kapali: 42, orta: 60, acik: 80 };

  function benchSetup(p) {
    var th = rad(p.angle);
    var t = [Math.cos(th), Math.sin(th), 0];      // toward head
    var n = [-Math.sin(th), Math.cos(th), 0];     // anterior (out of chest)
    var hz = GRIPS[p.grip] / 2 - A.shoulderHalf;  // hand lateral offset from shoulder
    var a = A.upper, b = A.fore + A.gripOff, R = a + b;
    var touch = Math.max(3, 14 - 0.22 * p.angle);
    var chest = 16;                                // shoulder joint → bar on chest, along n
    var C = v3.sub(v3.mul(n, chest), v3.mul(t, touch));
    var topY = Math.sqrt(Math.pow(R - 0.6, 2) - hz * hz);
    return { t: t, n: n, hz: hz, a: a, b: b, C: C, topY: topY, rom: topY - C[1], touch: touch };
  }

  function benchHand(st, q) {
    // q: 0 = chest, 1 = lockout. J-curve: bar drifts back toward the shoulder early.
    var x = st.C[0] * Math.pow(1 - q, 1.5);
    var y = st.C[1] + (st.topY - st.C[1]) * q;
    return [x, y, st.hz];
  }

  function abductionOf(st, v) {
    // angle between upper-arm projection on torso frontal plane (t,z) and the caudal direction (-t)
    var zt = v[2], tt = v3.dot(v, st.t);
    return deg(Math.atan2(zt, -tt));
  }

  function benchElbow(st, Hd, flareTarget, q, prev) {
    var wAbd = 1 - 0.7 * q, wVert = 0.2 + 0.9 * q;
    var d = v3.len(Hd);
    var a = st.a, b = st.b;
    d = Math.min(d, a + b - 0.01);
    var u = v3.norm(Hd);
    var c = (a * a - b * b + d * d) / (2 * d);
    var r = Math.sqrt(Math.max(0, a * a - c * c));
    var centre = v3.mul(u, c);
    var ref = Math.abs(u[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
    var e1 = v3.norm(v3.sub(ref, v3.mul(u, v3.dot(ref, u))));
    var e2 = v3.cross(u, e1);
    var best = null, bestCost = Infinity;
    for (var i = 0; i < 240; i++) {
      var ph = (i / 240) * Math.PI * 2;
      var E = v3.add(centre, v3.add(v3.mul(e1, Math.cos(ph) * r), v3.mul(e2, Math.sin(ph) * r)));
      if (E[2] < 4) continue;                                   // elbow stays outside the torso
      var abd = abductionOf(st, E);
      var fore = v3.sub(Hd, E);
      if (fore[1] <= 0) continue;                               // hand above elbow
      var tiltSide = deg(Math.atan2(Math.abs(fore[0]), fore[1]));
      var post = v3.dot(E, st.n);
      var cost = wAbd * Math.pow((Math.min(abd, 110) - flareTarget) / 8, 2)
        + wVert * Math.pow(tiltSide / 10, 2)
        + (E[0] > 2 ? (E[0] - 2) * 2 : 0)                       // elbows do not travel toward the head
        + (post > 6 ? (post - 6) * 0.6 : 0)
        + (prev ? v3.dot(v3.sub(E, prev), v3.sub(E, prev)) / 3 : 0);
      if (cost < bestCost) { bestCost = cost; best = E; }
    }
    return best || centre;
  }

  function poseFrom(p, st, Hd, E, q) {
    var dS = Math.abs(Hd[0]);
    var dE = Math.abs(Hd[0] - E[0]);
    var per = p.load / 2;
    var fore = v3.sub(Hd, E);
    return {
      st: st, H: Hd, E: E, q: q,
      dS: dS, dE: dE,
      mS: Nm(per, dS), mE: Nm(per, dE),
      abd: abductionOf(st, E),
      foreSide: deg(Math.atan2(Math.abs(fore[0]), fore[1])),
      foreFront: deg(Math.atan2(fore[2], fore[1])),
      height: Hd[1] - st.C[1],
    };
  }

  var benchCache = {};
  function benchCurveFull(p) {
    var key = [p.angle, p.grip, p.flare, p.load].join('|');
    if (benchCache[key]) return benchCache[key];
    var st = benchSetup(p);
    var N = 120, out = [], prev = null;
    for (var i = 0; i <= N; i++) {
      var q = i / N;
      var Hd = benchHand(st, q);
      var E = benchElbow(st, Hd, FLARE[p.flare], q, prev);
      prev = E;
      out.push(poseFrom(p, st, Hd, E, q));
    }
    // smooth elbow path (solver is sampled) and rebuild poses
    var Es = out.map(function (o) { return o.E; });
    var K = 6, sm = [];
    for (var j = 0; j < Es.length; j++) {
      var acc = [0, 0, 0], wsum = 0;
      for (var k = -K; k <= K; k++) {
        var idx = Math.min(Es.length - 1, Math.max(0, j + k));
        var w = Math.exp(-(k * k) / (2 * 3 * 3));
        acc = v3.add(acc, v3.mul(Es[idx], w)); wsum += w;
      }
      sm.push(v3.mul(acc, 1 / wsum));
    }
    out = out.map(function (o, j) { return poseFrom(p, st, o.H, sm[j], o.q); });
    benchCache[key] = out;
    return out;
  }

  function benchPose(p, q) {
    var full = benchCurveFull(p);
    var x = clamp(q, 0, 1) * (full.length - 1);
    var i = Math.floor(x), f = x - i;
    if (i >= full.length - 1) return full[full.length - 1];
    var A0 = full[i], B0 = full[i + 1];
    var lerp3 = function (u, v) { return [u[0] + (v[0] - u[0]) * f, u[1] + (v[1] - u[1]) * f, u[2] + (v[2] - u[2]) * f]; };
    return poseFrom(p, A0.st, lerp3(A0.H, B0.H), lerp3(A0.E, B0.E), q);
  }

  function benchCurve(p, N) {
    N = N || 60;
    var out = [];
    for (var i = 0; i <= N; i++) { out.push(benchPose(p, i / N)); }
    return out;
  }

  function benchEmphasis(p, avgElbowArm) {
    var th = p.angle;
    var flare = FLARE[p.flare];
    var grip = GRIPS[p.grip];
    var clav = 0.56 + 0.44 * Math.exp(-Math.pow((th - 30) / 20, 2));
    var stern = 1 - 0.58 * Math.pow(th / 60, 1.4);
    var delt = 0.5 + 0.5 * Math.pow(th / 60, 1.25);
    var tri = 0.55;
    // elbow flare: open → more horizontal adduction (sternal pec); closed → more flexion (delt, clavicular)
    var f = (flare - 60) / 20;
    stern += 0.08 * f; delt -= 0.06 * f; clav -= 0.03 * f;
    // grip: wide → pec, narrow → triceps
    var g = (grip - 65) / 16;
    stern += 0.05 * g; tri -= 0.1 * g;
    tri += clamp(avgElbowArm / 12, 0, 1) * 0.3;
    var all = [
      { k: 'Üst göğüs', sub: 'klaviküler baş', v: clav },
      { k: 'Orta-alt göğüs', sub: 'sternokostal baş', v: stern },
      { k: 'Ön omuz', sub: 'anterior deltoid', v: delt },
      { k: 'Triceps', sub: 'dirsek ekstansiyonu', v: tri },
    ];
    return all.map(function (m) { return { k: m.k, sub: m.sub, v: clamp(m.v, 0.15, 1) }; });
  }

  /* ================= ROMANIAN DEADLIFT ================= */
  var MASS = { hat: 0.678, thigh: 0.1, shank: 0.0465, foot: 0.0145 };
  var MIDFOOT = 7.5;

  function rdlPose(p, q) {
    var phi = rad(4 + q * (p.depth - 4));            // trunk from vertical
    var kap = rad(p.knee);                             // fixed knee flexion
    var Larm = A.upper + A.fore + A.hangGrip;
    var barX = MIDFOOT + p.offset;
    var Ank = [0, A.ankleH];
    function build(s) {
      var tau = kap - s;
      var K = [Ank[0] + A.shank * Math.sin(s), Ank[1] + A.shank * Math.cos(s)];
      var P = [K[0] - A.thigh * Math.sin(tau), K[1] + A.thigh * Math.cos(tau)];
      var Sh = [P[0] + A.trunk * Math.sin(phi), P[1] + A.trunk * Math.cos(phi)];
      var hat = [P[0] + 0.62 * A.trunk * Math.sin(phi), P[1] + 0.62 * A.trunk * Math.cos(phi)];
      var thighC = [P[0] + 0.433 * (K[0] - P[0]), P[1] + 0.433 * (K[1] - P[1])];
      var shankC = [K[0] + 0.433 * (Ank[0] - K[0]), K[1] + 0.433 * (Ank[1] - K[1])];
      var dx = barX - Sh[0];
      var barY = Sh[1] - Math.sqrt(Math.max(0, Larm * Larm - dx * dx));
      var m = BM;
      var com = (MASS.hat * m * hat[0] + 2 * MASS.thigh * m * thighC[0] + 2 * MASS.shank * m * shankC[0] + 2 * MASS.foot * m * 5 + p.load * barX) /
        (m * (MASS.hat + 2 * MASS.thigh + 2 * MASS.shank + 2 * MASS.foot) + p.load);
      return { tau: tau, s: s, K: K, P: P, Sh: Sh, hat: hat, thighC: thighC, bar: [barX, barY], com: com };
    }
    // solve shank angle so that whole-system COM sits over mid-foot
    var lo = rad(-30), hi = rad(35);
    var flo = build(lo).com - MIDFOOT;
    for (var i = 0; i < 40; i++) {
      var mid = (lo + hi) / 2;
      var fm = build(mid).com - MIDFOOT;
      if ((fm > 0) === (flo > 0)) { lo = mid; flo = fm; } else { hi = mid; }
    }
    var b = build((lo + hi) / 2);
    var m = BM;
    var hipBar = Nm(p.load, Math.abs(b.bar[0] - b.P[0]));
    var hipBody = Nm(MASS.hat * m, Math.abs(b.hat[0] - b.P[0]));
    var mHip = hipBar + hipBody;
    var kneeRaw = (p.load * (b.bar[0] - b.K[0]) + MASS.hat * m * (b.hat[0] - b.K[0]) + 2 * MASS.thigh * m * (b.thighC[0] - b.K[0])) * G / 100;
    // hamstring path: ischial tuberosity (pelvis frame) → posterior proximal tibia (shank frame)
    var ischL = [-5.5, -6];
    var ish = [b.P[0] + ischL[0] * Math.cos(phi) + ischL[1] * Math.sin(phi), b.P[1] - ischL[0] * Math.sin(phi) + ischL[1] * Math.cos(phi)];
    var sDir = [Math.sin(b.s), Math.cos(b.s)];         // ankle → knee
    var back = [-sDir[1], sDir[0]];                     // posterior of shank
    var tib = [b.K[0] - sDir[0] * 5 + back[0] * 3.5, b.K[1] - sDir[1] * 5 + back[1] * 3.5];
    var hamLen = Math.hypot(ish[0] - tib[0], ish[1] - tib[1]);
    return {
      q: q, phi: deg(phi), s: deg(b.s), tau: deg(b.tau),
      Ank: Ank, K: b.K, P: b.P, Sh: b.Sh, bar: b.bar, hat: b.hat, ish: ish, tib: tib,
      hipFlex: deg(phi) + deg(b.tau), kneeFlex: p.knee,
      dHip: Math.abs(b.bar[0] - b.P[0]), dKnee: Math.abs(b.bar[0] - b.K[0]),
      mHip: mHip, hipBar: hipBar, hipBody: hipBody, mKnee: Math.abs(kneeRaw), kneeSign: kneeRaw,
      hamLen: hamLen, barH: b.bar[1],
    };
  }
  function rdlRef(p) {
    // hamstring length standing tall with straight knees (reference)
    var r = rdlPose({ load: p.load, offset: p.offset, knee: 0.01, depth: 4 }, 0);
    return r.hamLen;
  }
  function rdlCurve(p, N) {
    N = N || 60;
    var out = [];
    for (var i = 0; i <= N; i++) out.push(rdlPose(p, i / N));
    return out;
  }

  /* ================= LATERAL RAISE ================= */
  var SH_FLOOR = 0.818 * H;   // shoulder height ≈ 155 cm
  var ANCHORS = {
    band: [-10, -SH_FLOOR + 2],          // under same-side foot
    bandX: [-28, -SH_FLOOR + 2],         // under opposite foot
    cable: [-70, -SH_FLOOR + 25],        // low pulley, opposite side
  };
  function latArm(p, alphaDeg) {
    var al = rad(alphaDeg), be = rad(p.bend);
    var E = [A.upper * Math.sin(al), -A.upper * Math.cos(al)];
    var b = A.fore + A.hangGrip;
    var Hd = [E[0] + b * Math.sin(al - be), E[1] - b * Math.cos(al - be)];
    return { E: E, H: Hd, alpha: alphaDeg };
  }
  function perpDist(Pt, dir) { return Math.abs(Pt[0] * dir[1] - Pt[1] * dir[0]); }
  function latForce(kind, p, Hd) {
    if (kind === 'db') return { F: p.mass, dir: [0, -1], anchor: null };
    var A0 = kind === 'band' ? (p.bandSide === 'karsi' ? ANCHORS.bandX : ANCHORS.band) : ANCHORS.cable;
    var vx = A0[0] - Hd[0], vy = A0[1] - Hd[1];
    var L = Math.hypot(vx, vy);
    var dir = [vx / L, vy / L];
    if (kind === 'cable') return { F: p.mass, dir: dir, anchor: A0, len: L };
    // band: tension ∝ stretch beyond rest length; scaled so top-of-rep tension ≈ 1.6 × dumbbell mass
    var rest = 72;
    var top = latArm(p, 90).H;
    var Ltop = Math.hypot(A0[0] - top[0], A0[1] - top[1]);
    var k = (1.6 * p.mass) / Math.max(1, Ltop - rest);
    return { F: Math.max(0, k * (L - rest)), dir: dir, anchor: A0, len: L };
  }
  var LAT_MIN = 5, LAT_MAX = 95;
  function latPose(p, q, kind) {
    var alpha = LAT_MIN + q * (LAT_MAX - LAT_MIN);
    var arm = latArm(p, alpha);
    var f = latForce(kind || p.kind, p, arm.H);
    var d = perpDist(arm.H, f.dir);
    return { alpha: alpha, E: arm.E, H: arm.H, F: f.F, dir: f.dir, anchor: f.anchor, d: d, m: Nm(f.F, d) };
  }
  function latCurve(p, kind, N) {
    N = N || 60;
    var out = [];
    for (var i = 0; i <= N; i++) out.push(latPose(p, i / N, kind));
    return out;
  }

  return {
    A: A, G: G, H: H, BM: BM, GRIPS: GRIPS, FLARE: FLARE, MIDFOOT: MIDFOOT, SH_FLOOR: SH_FLOOR, ANCHORS: ANCHORS, LAT_MIN: LAT_MIN, LAT_MAX: LAT_MAX,
    benchSetup: benchSetup, benchPose: benchPose, benchCurve: benchCurve, benchEmphasis: benchEmphasis,
    rdlPose: rdlPose, rdlCurve: rdlCurve, rdlRef: rdlRef,
    latPose: latPose, latCurve: latCurve,
  };
})();
