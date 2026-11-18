// Plan ayarları için sürüklemeli pixel kontroller (set kaydı ekranındaki gibi, ses + titreşim).
// Dokunulan yere atlamaz: bar her yerinden tutulup sürüklenir; parmak bardan yukarı/aşağı uzaklaştıkça hassaslaşır (1, 1/2, 1/4, 1/8).
// PxStair: tek değer ya da aralık (en az–en çok; dokunulan yere yakın uç oynar). PxKgTape: isteğe bağlı kilo; kenarda tutunca kayar.
import React, { useEffect, useRef, useState } from 'react';
import { pixelFx } from '../../lib/native/fx';
import type { FxSettings } from '../../lib/store/types';

const clampN = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const fineOf = (y: number, r: DOMRect) => {
  const d = Math.max(0, Math.abs(y - (r.top + r.height / 2)) - r.height / 2);
  return d < 40 ? 1 : d < 100 ? 0.5 : d < 170 ? 0.25 : 0.125;
};
const fmtN = (v: number) => (Math.round(v * 10) / 10).toString().replace('.', ',');

type StairProps = {
  id: string;
  label: string;
  min: number;
  max: number;
  step?: number;
  lo: number;
  hi?: number;
  range?: boolean;
  onChange: (lo: number, hi: number) => void;
  fx: FxSettings;
  unit?: string;
  marks?: number[];
  loLabel?: string;
  hiLabel?: string;
};

export function PxStair({ id, label, min, max, step = 1, lo, hi, range = false, onChange, fx, unit, marks, loLabel, hiLabel }: StairProps) {
  const n = Math.round((max - min) / step) + 1;
  const toI = (v: number) => clampN(Math.round((v - min) / step), 0, n - 1);
  const toV = (i: number) => Math.round((min + i * step) * 100) / 100;
  const loI = toI(lo);
  const hiI = range ? Math.max(loI, toI(hi ?? lo)) : loI;
  const drag = useRef<null | { r: DOMRect; h: 'lo' | 'hi'; x: number; acc: number }>(null);
  const [fine, setFine] = useState(1);
  const cur = useRef({ loI, hiI });
  cur.current = { loI, hiI };

  const emit = (a: number, b: number) => {
    const c = cur.current;
    if (a === c.loI && b === c.hiI) return;
    const moved = a !== c.loI ? a : b;
    cur.current = { loI: a, hiI: b };
    pixelFx.setReps(fx, moved + 1);
    onChange(toV(a), toV(b));
  };
  const idxAt = (x: number, r: DOMRect) => clampN(Math.floor(((x - r.left) / (r.width || 1)) * n), 0, n - 1);
  const apply = (i: number, h: 'lo' | 'hi') => {
    const c = cur.current;
    if (!range) return emit(i, i);
    if (h === 'lo') emit(Math.min(i, c.hiI), c.hiI);
    else emit(c.loI, Math.max(i, c.loI));
  };
  const down = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    try { el.setPointerCapture(e.pointerId); } catch { /* yoksay */ }
    pixelFx.unlock(fx);
    // konum, kenar boşluğu hariç merdiven alanına göre hesaplanır
    const r = ((el.firstElementChild as HTMLElement | null) || el).getBoundingClientRect();
    const i = idxAt(e.clientX, r);
    const c = cur.current;
    // aralıkta: dokunulan yere en yakın uç hareket eder
    const h: 'lo' | 'hi' = !range ? 'lo' : i <= c.loI ? 'lo' : i >= c.hiI ? 'hi' : (i - c.loI < c.hiI - i ? 'lo' : 'hi');
    drag.current = { r, h, x: e.clientX, acc: h === 'lo' ? c.loI : c.hiI };
  };
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const fn = fineOf(e.clientY, d.r);
    setFine(fn);
    d.acc = clampN(d.acc + ((e.clientX - d.x) * fn * n) / (d.r.width || 1), 0, n - 1);
    d.x = e.clientX;
    apply(Math.round(d.acc), d.h);
  };
  const up = () => { drag.current = null; setFine(1); };
  const key = (h: 'lo' | 'hi') => (e: React.KeyboardEvent<HTMLElement>) => {
    const k = e.key;
    const d = k === 'ArrowRight' || k === 'ArrowUp' ? 1 : k === 'ArrowLeft' || k === 'ArrowDown' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    pixelFx.unlock(fx);
    const c = cur.current;
    apply(clampN((h === 'lo' ? c.loI : c.hiI) + d, 0, n - 1), h);
  };

  const shown = range && hiI !== loI ? fmtN(toV(loI)) + '-' + fmtN(toV(hiI)) : fmtN(toV(loI));
  const pos = (i: number) => ((i + 0.5) / n) * 100 + '%';
  const thumb = (h: 'lo' | 'hi', i: number, name: string) => (
    <span
      id={id + '-' + h}
      className={'px-dr-thumb ' + h}
      role="slider"
      tabIndex={0}
      aria-label={name}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={toV(i)}
      style={{ left: pos(i) }}
      onKeyDown={key(h)}
    />
  );
  const scale = marks || [min, max];
  return (
    <div className="px-dr" id={id}>
      <div className="px-dr-head">
        <span className="px-dr-k">{label}</span>
        {fine < 1 ? <span className="px-dr-fine">HASSAS 1/{Math.round(1 / fine)}</span> : null}
        <span className="px-dr-v">{shown}{unit ? <small>{unit}</small> : null}</span>
      </div>
      <div
        className="px-dr-bar"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onLostPointerCapture={up}
      >
        <div className="px-dr-segs">
          {Array.from({ length: n }, (_, i) => {
            const on = i >= loI && i <= hiI;
            const end = i === loI || i === hiI;
            const h = Math.round(12 + (30 * i) / Math.max(1, n - 1));
            return <i key={i} className={'px-dr-sg' + (on ? ' on' : '') + (end ? ' end' : '')} style={{ height: h }} />;
          })}
          {thumb('lo', loI, range ? (loLabel || 'En az ' + label.toLowerCase()) : label)}
          {range ? thumb('hi', hiI, hiLabel || 'En çok ' + label.toLowerCase()) : null}
        </div>
      </div>
      <div className="px-dr-scale" aria-hidden="true">
        {scale.map((v) => <span key={v} style={{ left: pos(toI(v)) }}>{fmtN(v)}</span>)}
      </div>
    </div>
  );
}

type TapeProps = {
  id: string;
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  fx: FxSettings;
  step?: number;
  span?: number;
  max?: number;
  start?: number;
};

export function PxKgTape({ id, label, value, onChange, fx, step = 2.5, span = 40, max = 400, start = 20 }: TapeProps) {
  const has = value != null && Number.isFinite(Number(value));
  const v = has ? Number(value) : null;
  const winFor = (x: number) => clampN(Math.floor((x - span / 2) / 10) * 10, 0, Math.max(0, max - span));
  const [w0, setW0] = useState(() => winFor(v ?? start));
  const drag = useRef<null | { r: DOMRect; x: number; f: number; acc: number }>(null);
  const [fine, setFine] = useState(1);
  const timer = useRef(0);
  const cur = useRef({ v, w0 });
  cur.current = { v, w0 };
  useEffect(() => () => clearInterval(timer.current), []);

  const snap = (x: number) => clampN(Math.round(x / step) * step, 0, max);
  const set = (x: number) => {
    const nv = snap(x);
    if (nv === cur.current.v) return;
    cur.current.v = nv;
    pixelFx.setKg(fx, nv, step);
    onChange(nv);
  };
  // pencere değeri görünür tutacak kadar kayar
  const follow = (x: number) => {
    const w = cur.current.w0;
    let nw = w;
    if (x > w + span * 0.88) nw = x - span * 0.88;
    else if (x < w + span * 0.12) nw = x - span * 0.12;
    nw = clampN(Math.round(nw / step) * step, 0, Math.max(0, max - span));
    if (nw !== w) { cur.current.w0 = nw; setW0(nw); }
  };
  const edge = () => {
    const d = drag.current;
    if (!d) return;
    const dir = d.f > 0.92 ? 1 : d.f < 0.08 ? -1 : 0;
    if (!dir) return;
    d.acc = clampN((cur.current.v ?? start) + dir * step, 0, max);
    set(d.acc);
    follow(d.acc);
  };
  const down = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    try { el.setPointerCapture(e.pointerId); } catch { /* yoksay */ }
    pixelFx.unlock(fx);
    const r = el.getBoundingClientRect();
    drag.current = { r, x: e.clientX, f: (e.clientX - r.left) / (r.width || 1), acc: cur.current.v ?? start };
    clearInterval(timer.current);
    timer.current = window.setInterval(edge, 110);
  };
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const fn = fineOf(e.clientY, d.r);
    setFine(fn);
    d.f = (e.clientX - d.r.left) / (d.r.width || 1);
    d.acc = clampN(d.acc + ((e.clientX - d.x) * fn * span) / (d.r.width || 1), 0, max);
    d.x = e.clientX;
    set(d.acc);
    follow(d.acc);
  };
  const up = () => {
    if (!drag.current) return;
    drag.current = null;
    clearInterval(timer.current);
    setFine(1);
    if (cur.current.v != null) setW0(winFor(cur.current.v));
  };
  const key = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const k = e.key;
    const d = k === 'ArrowRight' || k === 'ArrowUp' ? 1 : k === 'ArrowLeft' || k === 'ArrowDown' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    pixelFx.unlock(fx);
    const nv = snap((cur.current.v ?? start) + d * step);
    set(nv);
    setW0(winFor(nv));
  };

  const n = Math.round(span / step);
  const segs = Array.from({ length: n + 1 }, (_, i) => w0 + i * step);
  const pct = (x: number) => ((x - w0) / span) * 100;
  return (
    <div className="px-dr px-dr-kg" id={id}>
      <div className="px-dr-head">
        <span className="px-dr-k">{label}</span>
        {fine < 1 ? <span className="px-dr-fine">HASSAS 1/{Math.round(1 / fine)}</span> : null}
        {has ? <span className="px-dr-v">{fmtN(v as number)}<small>kg</small></span> : <span className="px-dr-none">isteğe bağlı · sürükle</span>}
      </div>
      <div
        className={'px-dr-bar px-dr-tape' + (has ? '' : ' off')}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={has ? (v as number) : undefined}
        aria-valuetext={has ? fmtN(v as number) + ' kg' : 'hedef kilo yok'}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onLostPointerCapture={up}
        onKeyDown={key}
      >
        {segs.map((x) => {
          const major = Math.abs(x % 10) < 1e-6;
          const on = has && x <= (v as number) + 1e-6;
          return <i key={x} className={'px-dr-tk' + (major ? ' major' : '') + (on ? ' on' : '')} style={{ left: pct(x) + '%' }} />;
        })}
        {has && (v as number) >= w0 && (v as number) <= w0 + span ? <span className="px-dr-pin" style={{ left: pct(v as number) + '%' }} /> : null}
      </div>
      <div className="px-dr-scale" aria-hidden="true">
        {/* kenara yapışan etiketler yarım görünmesin diye pencerenin iç kısmındakiler yazılır */}
        {segs.filter((x) => Math.abs(x % 10) < 1e-6 && pct(x) > 4 && pct(x) < 96).map((x) => <span key={x} style={{ left: pct(x) + '%' }}>{x}</span>)}
      </div>
      {has ? <button type="button" className="px-dr-clear" onClick={() => onChange(null)}>Kilo hedefini kaldır</button> : null}
    </div>
  );
}
