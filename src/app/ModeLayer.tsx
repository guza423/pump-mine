// V36 · Ekran modlarının görsel katmanı: ortam efekti (içeriğin arkasında), çerçeve (üstünde, dokunulmaz),
// modlar arası geçiş bindirmesi ve süren idman şeridi. Hiçbiri dokunmayı engellemez; DOM ve akışlar aynı kalır.
import React, { useEffect, useMemo, useState } from 'react';
import { t, upper } from '../i18n';
import { hms } from '../features/antrenman/pixelHelpers';
import { PxIcon } from './PxIcon';
import type { ModeTr, ScreenMode } from './modes';

let seed = 7;
const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
const pct = (v: number) => (Math.round(v * 10) / 10) + '%';
// Konumlar sabit (her açılışta aynı); yüzde olduğu için her ekran boyuna uyar.
const STARS = Array.from({ length: 14 }, (_, i) => ({ x: pct(3 + rnd() * 94), y: pct(2 + rnd() * 90), d: (rnd() * 3.6).toFixed(2) + 's', x4: i % 4 === 0 }));
const EMBERS = Array.from({ length: 12 }, (_, i) => ({ x: pct(4 + rnd() * 92), s: [3, 4, 6][Math.floor(rnd() * 3)], c: ['#ff5b3a', '#ffc53d', '#ff8a3a'][i % 3], du: (2.8 + rnd() * 2).toFixed(2) + 's', d: (rnd() * 4).toFixed(2) + 's', v: ['a', 'b', 'c'][i % 3] }));
const RAIN = Array.from({ length: 12 }, () => ({ x: pct(2 + rnd() * 96), h: [6, 9, 12][Math.floor(rnd() * 3)], du: (5 + rnd() * 4).toFixed(2) + 's', d: (-rnd() * 8).toFixed(2) + 's' }));
const FLAME = Array.from({ length: 60 }, (_, i) => 4 + Math.round(Math.abs(Math.sin(i * 1.7)) * 11));

/** İçeriğin arkasında: sakin yıldızlar, ısınmada kor ve kıvılcım, idmanda durağan ısı bantları ve alev, Lab'da veri yağmuru. */
export function ModeAmbient({ mode }: { mode: ScreenMode }) {
  return (
    <div className="px-md-amb" aria-hidden="true">
      {mode === 'sakin' ? STARS.map((s, i) => <i key={i} className={'px-md-star' + (s.x4 ? ' x' : '')} style={{ left: s.x, top: s.y, animationDelay: s.d }} />) : null}
      {mode === 'isinma' || mode === 'idman' ? <i className={'px-md-glow' + (mode === 'isinma' ? ' rise' : '')} /> : null}
      {mode === 'isinma' ? EMBERS.map((e, i) => (
        <i key={i} className={'px-md-emb ' + e.v} style={{ left: e.x, width: e.s, height: e.s, background: e.c, animationDuration: e.du, animationDelay: e.d }} />
      )) : null}
      {mode === 'idman' ? <div className="px-md-flame">{FLAME.map((h, i) => <i key={i} style={{ height: h }} />)}</div> : null}
      {mode === 'lab' ? (
        <React.Fragment>
          {RAIN.map((r, i) => <i key={i} className="px-md-drop" style={{ left: r.x, height: r.h, animationDuration: r.du, animationDelay: r.d }} />)}
          <i className="px-md-roll" />
        </React.Fragment>
      ) : null}
    </div>
  );
}

/** İçeriğin üstünde, durağan: idmanda kor çerçeve, Lab'da tarama çizgileri. */
export function ModeFrame({ mode }: { mode: ScreenMode }) {
  if (mode === 'idman') return <i className="px-md-heat" aria-hidden="true" />;
  if (mode === 'lab') return <i className="px-md-scan" aria-hidden="true" />;
  return null;
}

const COAL = ['#1d0d0a', '#2a120d'];
const NIGHT = ['#100e1b', '#1b1830'];

/** Modlar arası geçiş: başlarken BAŞLA! ile pixel blok dalgası, bitince sakin moda soğuma, süren idmana girip çıkarken şerit, ısınmaya girerken ısı dalgası. */
export function ModeTransition({ tr }: { tr: { kind: ModeTr; n: number } | null }) {
  const kind = tr?.kind;
  const cells = useMemo(() => {
    if (kind !== 'start' && kind !== 'end') return [];
    const oc = 4.5, or = kind === 'start' ? 18 : 11;
    const col = kind === 'start' ? COAL : NIGHT;
    const out = [];
    for (let r = 0; r < 22; r++) {
      for (let c = 0; c < 10; c++) {
        out.push({ k: r * 10 + c, l: c * 10 + '%', tp: (r * 100) / 22 + '%', bg: col[(r + c) % 2], d: ((Math.abs(c - oc) + Math.abs(r - or)) * 0.014).toFixed(3) + 's' });
      }
    }
    return out;
  }, [kind]);
  if (!tr) return null;
  if (tr.kind === 'warm') {
    return <div key={tr.n} className="px-md-tr" aria-hidden="true"><i className="px-md-wave" /></div>;
  }
  if (tr.kind === 'into' || tr.kind === 'out') {
    const col = tr.kind === 'into' ? COAL : NIGHT;
    return (
      <div key={tr.n} className="px-md-tr" aria-hidden="true">
        {Array.from({ length: 12 }, (_, i) => <i key={i} className="px-md-bar" style={{ top: (i * 100) / 12 + '%', background: col[i % 2], animationDelay: (i * 0.012).toFixed(3) + 's' }} />)}
      </div>
    );
  }
  return (
    <div key={tr.n} className="px-md-tr" aria-hidden="true">
      {cells.map((c) => <i key={c.k} className="px-md-cell" style={{ left: c.l, top: c.tp, background: c.bg, animationDelay: c.d }} />)}
      {tr.kind === 'start' ? <span className="px-md-go">{t('BAŞLA!')}</span> : null}
    </div>
  );
}

/** Süren idman şeridi: Antrenman sekmesi dışındayken sekme çubuğunun üstünde durur; dokununca idmana döner. */
export function LiveStrip({ session, onOpen }: { session: any; onOpen: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);
  const sec = Math.max(0, Math.floor((now - (session.startedAt || now)) / 1000));
  const sets = (session.items || []).reduce((a: number, it: any) => a + (it.sets ? it.sets.length : 0), 0);
  const time = hms(sec);
  return (
    <button type="button" id="live-strip" className="px-md-strip" onClick={onOpen} aria-label={t('İdmana dön') + ' · ' + time + ' · ' + t('{n} set', { n: sets })}>
      <span className="px-md-sparks" aria-hidden="true"><i /><i className="g" /><i /><i className="g" /><i /></span>
      <i className="px-md-dot" aria-hidden="true" />
      <span className="px-md-strip-l">{upper(t('Antrenman sürüyor'))}</span>
      <span className="px-md-strip-t">{time}</span>
      <span className="px-md-strip-n">{t('{n} set', { n: sets })}</span>
      <PxIcon name="right" size={14} />
    </button>
  );
}
