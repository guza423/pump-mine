// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  EQ, EX_LIB, MUSCLES, PLYO_INT, PLYO_W, SKILL_W,
  bestE1, clone, e1Ok, e1rm, setE1, firstOpen, hasNum, itemFromEx, libById, newId, nf, normTr, noteLabel, rpeLabel, sessionStats, skillSetTxt, targetTxt,
  WARM_Z, WARM_Z_COLORS, warmSetTxt, canBodyweight, warmFirst, repTxt,
  isFight, FIGHT_Z, fightZ, fightSetTxt, fightDur, minTxt,
} from './core';
import { PxStair } from './PxDrag';
import { dbMultiplier, freeEntry, isFree, sessionName } from '../../lib/models/session';
import { searchAlias } from '../../lib/data/exlib';
import { detailSearch } from '../../lib/data/exdetail';
import { changeRest, restDuration } from '../../lib/models/rest';
import { startRest, stopRest } from '../../lib/native/restTimer';
import { fatigueAt } from '../../lib/models/fatigue';
import { clamp } from '../lab/Cns';
import { useBack } from '../../app/back';
import { pixelFx, readFxSettings } from '../../lib/native/fx';
import { PixelWeightVisual } from './PixelWeightVisual';
import { HoldButton } from '../../app/HoldButton';
import {
  dragRate, eqConfig, eqLabel, fk, hms, P_ALL, P_UP, par, PX_PLYO_Q, PX_SKILL_Q, PX_SPEED, PX_SPEED_COLORS, upTr,
} from './pixelHelpers';
import { readGoals, matchesSkillGoal, skillStats, SKILL_STAGES } from '../bugun/goals';
import { clock, locale, lower, muscleName, num, pct, t, upper } from '../../i18n';
import { exName as exLabel } from '../../i18n/names';

// Etiketler gösterimde t() ile çevrilir.
const EX_KINDS: Array<[string, string]> = [
  ['all', 'Tümü'],
  ['kuvvet', 'Kuvvet'],
  ['olimpik', 'Olimpik'],
  ['plyo', 'Pliometrik'],
  ['beceri', 'Beceri'],
  ['dovus', 'Dövüş'],
  ['isinma', 'Isınma'],
];

const exMeta = (exId: string | null, name?: string) =>
  EX_LIB.find((e) => e.id === exId) || EX_LIB.find((e) => e.name === name) || null;

interface Props {
  session: any;
  st: any;
  put: (kind: string, obj: any) => void;
  del: (kind: string, id: string) => void;
  addCustom: (name: string, muscle?: string) => any;
  openSheet: (type: string, props: any) => void;
  onFinished: (ns: any) => void;
  onDiscarded: () => void;
  jumpExId?: string | null;
  onJumpHandled?: () => void;
}

function RangeWin({ it, reps, fx, onSave, onClose }: { it: any; reps: number; fx: any; onSave: (next: any) => void; onClose: () => void }) {
  const [rg, setRg] = useState(() => it.range || { lo: Math.max(1, Math.min(reps, 8)), hi: Math.max(reps, 12) });
  return (
    <React.Fragment>
      <button type="button" className="bd" onClick={onClose} aria-label={t('Pencereyi kapat')} />
      <div className="win" role="dialog" aria-label={t('Hedef tekrar aralığı')}>
        <span className="lbl" style={{ color: 'var(--gold)', fontSize: 15 }}>{t('HEDEF TEKRAR ARALIĞI')}</span>
        <div style={{ fontSize: 13, color: 'var(--mt)' }}>{t('Setleri yine yaptığın tekrar sayısıyla kaydedersin; aralık hedef olarak görünür ve bu hareket için hatırlanır.')}</div>
        <PxStair id="range-stair" label={t('Tekrar')} min={1} max={30} range lo={rg.lo} hi={rg.hi} onChange={(a, b) => setRg({ lo: a, hi: b })} fx={fx} marks={[1, 5, 10, 15, 20, 25, 30]} loLabel={t('En az tekrar')} hiLabel={t('En çok tekrar')} />
        <div style={{ display: 'flex', gap: 12 }}>
          {it.range ? <button type="button" id="range-clear" className="bb" onClick={() => onSave(null)}>{t('KALDIR')}</button> : <button type="button" className="bb" onClick={onClose}>{t('VAZGEÇ')}</button>}
          <button type="button" id="range-ok" className="go" onClick={() => onSave(rg)}>{t('TAMAM')}</button>
        </div>
      </div>
    </React.Fragment>
  );
}

export const FreePixelSession: React.FC<Props> = ({
  session, st, put, del, addCustom, openSheet, onFinished, onDiscarded, jumpExId, onJumpHandled,
}) => {
  const sRef = useRef(clone(session));
  const [s, setS] = useState(sRef.current);
  // Planlı oturum da aynı pixel ekranı kullanır (V29): plan adı, hareket hedefleri ve notları eklenir.
  const planned = !isFree(s);
  const [scr, setScr] = useState<'list' | 'pick' | 'log'>('list');
  const [cur, setCur] = useState(() => (isFree(session) ? 0 : firstOpen(session)));
  const [now, setNow] = useState(() => Date.now());
  const lastSec = useRef(0);
  const lastBurst = useRef(0);

  const fxRef = useRef(readFxSettings(st.settings));
  useEffect(() => { fxRef.current = readFxSettings(st.settings); }, [st.settings]);
  const motionOn = readFxSettings(st.settings).motion;

  const prefsRef = useRef<Record<string, number>>({});
  const prefsSource = st.settings.find((x: any) => x.key === 'restPrefs')?.value;
  useEffect(() => { prefsRef.current = prefsSource || {}; }, [prefsSource]);

  // Set ekranı giriş durumu
  const curVals = useRef({ kg: 20, lo: 0, reps: 10, lvl: 1, rom: 100 });
  const [kg, setKgState] = useState(20);
  const [lo, setLoState] = useState(0);
  const [reps, setRepsState] = useState(10);
  const [lvl, setLvlState] = useState<0 | 1 | 2 | 3 | 4>(1);
  const [rom, setRomState] = useState(100);
  const [qQuality, setQQuality] = useState<0 | 1 | 2>(0);
  const [hold, setHold] = useState(0);
  // V33 · ısınma seti (hız satırının solunda), antrenman öncesi ısınmanın süresi ve yoğunluğu, hedef tekrar aralığı penceresi
  const [warm, setWarm] = useState(false);
  const [wDur, setWDur] = useState(10);
  const [wZ, setWZ] = useState(2);
  const [rangeOpen, setRangeOpen] = useState(false);

  // Efekt sayaçları
  const [fxKg, setFxKg] = useState(0);
  const [fxMaj, setFxMaj] = useState(0);
  const [fxRep, setFxRep] = useState(0);
  const [fxLvl, setFxLvl] = useState(0);
  const [fxShake, setFxShake] = useState(0);
  const [fxLog, setFxLog] = useState(0);
  const [fxRom, setFxRom] = useState(0);
  const [fxRt, setFxRt] = useState(0);
  const [fxReady, setFxReady] = useState(0);

  const [kgDrag, setKgDrag] = useState(false);
  const [edge, setEdge] = useState<-1 | 0 | 1>(0);
  const [barWidth, setBarWidth] = useState(354);
  const [listEnd, setListEnd] = useState(false);

  // Pencereler ve akış
  const [restOpen, setRestOpen] = useState(false);
  // V13.1: set iniş animasyonu; dinlenme ekranı iniş bitince açılır
  const [fly, setFly] = useState<null | { n: number; x: number; y: number; w: number; h: number; dx: number; dy: number; txt: string }>(null);
  const landT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logBtnRef = useRef<HTMLButtonElement | null>(null);
  const scrNow = useRef<string>('');
  scrNow.current = scr;
  const [selIdx, setSelIdx] = useState<number | null>(null);
  const [, setConfirmDelSet] = useState(false);
  const [confirmModal, setConfirmModal] = useState<null | 'finish' | 'discard'>(null);
  const [toast, setToast] = useState<{ t: string; n: number } | null>(null);
  // Bitirme animasyonları (İDMANI BİTİR / HAREKETİ BİTİR) ve hassas sürükleme göstergesi
  const [endFx, setEndFx] = useState(0);
  const [exFx, setExFx] = useState<null | { name: string; n: number }>(null);
  const [scrollLast, setScrollLast] = useState(0);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Seçici (çoklu) durumu
  const [pickQ, setPickQ] = useState('');
  const [pickKind, setPickKind] = useState('all');
  const [pickGrp, setPickGrp] = useState<string | null>(null);
  const [pickEq, setPickEq] = useState<string | null>(null);
  const [pickLim, setPickLim] = useState(40);
  const [picked, setPicked] = useState<string[]>([]);
  const [showNewEx, setShowNewEx] = useState(false);
  const [newExMuscle, setNewExMuscle] = useState<string | null>(null);

  // İşaretçi sürükleme refs
  const kgTrackRef = useRef<HTMLDivElement | null>(null);
  const setListRef = useRef<HTMLDivElement | null>(null);
  const kgD = useRef<{ r: DOMRect; f: number; n: number; x: number; acc: number; rate: number } | null>(null);
  const repD = useRef<{ r: DOMRect; x: number; acc: number; rate: number } | null>(null);
  const lvD = useRef<{ r: DOMRect } | null>(null);
  const romD = useRef<{ r: DOMRect; x: number; w: number; acc: number; rate: number } | null>(null);
  const rtD = useRef<{ r: DOMRect; x: number; w: number; acc: number; done: number; rate: number } | null>(null);
  const edgeT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const barWRef = useRef(354);
  const cfgRef = useRef(eqConfig(undefined));

  const mutate = (fn: (ns: any) => void) => {
    const ns = clone(sRef.current);
    fn(ns);
    sRef.current = ns;
    setS(ns);
    put('sessions', ns);
    return ns;
  };

  // Kilo penceresinin sol ucu (V33: barbell 20 kg'dan başlar, pencere en altta min değerden açılır).
  const centerKg = (v: number, cfg = cfgRef.current) => {
    const span = Math.max(cfg.min, cfg.max - cfg.W);
    return Math.min(span, Math.max(cfg.min, Math.round((v - cfg.W / 2) / cfg.step) * cfg.step));
  };

  const autoStart = (why: string) => {
    if (!sRef.current.ready) return;
    const nowTs = Date.now();
    mutate((ns) => {
      delete ns.ready;
      ns.startedAt = nowTs;
    });
    setNow(nowTs);
    setToast((prev) => ({ t: t('{x}, süreyi başlattım', { x: t(why) }), n: (prev ? prev.n : 0) + 1 }));
    if (toastT.current) clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(null), 3600);
    pixelFx.autoStart(fxRef.current);
  };

  const enterEx = (idx: number, itemsList?: any[], opts?: { skipSound?: boolean; openRestOverlay?: boolean }) => {
    const list = itemsList || sRef.current.items;
    const target = list[idx];
    if (!target) return;
    const lib = exMeta(target.exId, target.name);
    const cfg = eqConfig(lib?.eq);
    cfgRef.current = cfg;

    kgD.current = null;
    repD.current = null;
    lvD.current = null;
    romD.current = null;
    if (edgeT.current) { clearTimeout(edgeT.current); edgeT.current = null; }

    // Planlıda ilk set hedeften başlar (kilo, en çok tekrar); sonra son kaydedilen set; yoksa geçmiş.
    const fe = freeEntry(target, st.sessions);
    const tg = target.target || {};
    const init = isFree(sRef.current) || target.sets.length ? fe : {
      ...fe,
      kg: lib?.kind !== 'beceri' && hasNum(tg.kg) && Number(tg.kg) > 0 ? Number(tg.kg) : fe.kg,
      reps: hasNum(tg.repMax) ? Number(tg.repMax) : hasNum(tg.repMin) ? Number(tg.repMin) : fe.reps,
    };
    const snappedKg = Math.min(cfg.max, Math.max(cfg.min, Math.round(init.kg / cfg.step) * cfg.step));
    // V33 · plansızda hareketin hedef aralığı varsa ilk set aralığın üst ucundan başlar
    const rg = isFree(sRef.current) && !target.sets.length && target.range ? target.range : null;
    const initReps = clamp(Math.round(rg ? rg.hi : init.reps || 10), 1, lib?.kind === 'plyo' || lib?.kind === 'beceri' ? 60 : 30);
    const initLvl = (clamp(init.lvl ?? 1, 0, 4)) as 0 | 1 | 2 | 3 | 4;
    const initLo = centerKg(snappedKg, cfg);

    curVals.current = { kg: snappedKg, lo: initLo, reps: initReps, lvl: initLvl, rom: 100 };
    setCur(idx);
    setKgState(snappedKg);
    setLoState(initLo);
    setRepsState(initReps);
    setLvlState(initLvl);
    setRomState(100);
    setQQuality(0);
    setHold(init.hold || 0);
    setWarm(false);
    setRangeOpen(false);
    {
      const lastW = target.sets.filter((x: any) => x.dur).at(-1);
      // V39 · dövüşte raund süresi yarım dakikalık adımla (0,5–10 dk), yoğunluk varsayılanı Orta
      if (isFight(target.exId)) {
        setWDur(fightDur(lastW?.dur ?? tg.dur ?? 3));
        setWZ(clamp(Math.round(Number(lastW?.z ?? tg.z ?? 3)) || 3, 1, 5));
      } else {
        setWDur(clamp(Math.round(Number(lastW?.dur ?? tg.dur ?? 10)) || 10, 1, 60));
        setWZ(clamp(Math.round(Number(lastW?.z ?? tg.z ?? 2)) || 2, 1, 5));
      }
    }
    setSelIdx(null);
    setConfirmDelSet(false);
    setListEnd(false);
    setKgDrag(false);
    setEdge(0);
    setRestOpen(!!opts?.openRestOverlay);
    setScr('log');

    if (sRef.current.ready) {
      autoStart('Set ekranını açtın');
    }
    if (!opts?.skipSound) {
      pixelFx.enterEx(fxRef.current);
    }
  };

  // Dışarıdan aktif oturuma hareket eklendiyse (ör. Pratik et) senkronla
  useEffect(() => {
    if (session.items.length > sRef.current.items.length) {
      sRef.current = clone(session);
      setS(sRef.current);
      if (jumpExId) {
        const idx = sRef.current.items.findIndex((it: any) => it.exId === jumpExId || it.name === jumpExId);
        if (idx >= 0) {
          enterEx(idx, sRef.current.items);
          onJumpHandled?.();
        }
      }
    }
  }, [session.items.length, jumpExId]);

  // İlk açılışta jumpExId varsa doğrudan o harekete gir
  useEffect(() => {
    if (jumpExId) {
      const idx = sRef.current.items.findIndex((it: any) => it.exId === jumpExId || it.name === jumpExId);
      if (idx >= 0) {
        enterEx(idx, sRef.current.items);
        onJumpHandled?.();
      }
    }
  }, []);

  // Dinlenme ve süre sayacı
  useEffect(() => {
    const r = sRef.current.rest;
    if (r && r.start + r.total * 1000 > Date.now()) {
      void startRest(r, exLabel(sRef.current.items.find((it: any) => it.exId === r.exId)) || t('Antrenman'));
    }
    let tickN = 0;
    const iv = setInterval(() => {
      tickN += 1;
      const curRest = sRef.current.rest;
      const t = Date.now();
      if (!curRest) {
        if (tickN % 4 === 0) setNow(t);
        return;
      }
      if (t - curRest.start >= curRest.total * 1000) {
        rtD.current = null;
        mutate((ns) => { delete ns.rest; });
        setRestOpen(false);
        setFxReady((n) => n + 1);
        setNow(t);
        pixelFx.chime(fxRef.current);
      } else if (Math.floor(t / 1000) !== Math.floor(lastSec.current / 1000)) {
        // sayaç saniye gösterir; animasyonlar sırasında gereksiz yeniden çizim olmasın
        lastSec.current = t;
        setNow(t);
      }
    }, 250);
    return () => {
      clearInterval(iv);
      if (edgeT.current) clearTimeout(edgeT.current);
      if (toastT.current) clearTimeout(toastT.current);
    };
  }, []);

  // Kilo çubuğu genişliğini ölç
  useEffect(() => {
    const el = kgTrackRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = () => {
      const w = el.clientWidth;
      if (w > 40) {
        barWRef.current = w;
        setBarWidth(w);
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [scr, cur]);

  const goList = () => {
    kgD.current = null;
    if (edgeT.current) { clearTimeout(edgeT.current); edgeT.current = null; }
    setSelIdx(null);
    setConfirmDelSet(false);
    setRestOpen(false);
    setKgDrag(false);
    setEdge(0);
    setScr('list');
    pixelFx.goList(fxRef.current);
  };

  const goPick = () => {
    setPickQ('');
    setPickKind('all');
    setPickGrp(null);
    setPickEq(null);
    setPickLim(40);
    setPicked([]);
    setShowNewEx(false);
    setNewExMuscle(null);
    setScr('pick');
    pixelFx.goPick(fxRef.current);
  };

  const pickBack = () => {
    setPicked([]);
    setScr('list');
    pixelFx.pickBack(fxRef.current);
  };

  const closeSel = () => {
    setSelIdx(null);
    setConfirmDelSet(false);
    pixelFx.closeSel(fxRef.current);
  };

  const hideRest = () => {
    rtD.current = null;
    setRestOpen(false);
    pixelFx.hideRest(fxRef.current);
  };

  useEffect(() => () => { if (landT.current) clearTimeout(landT.current); }, []);

  // Android geri tuşu zinciri (üste açık pencereden aşağı)
  useBack(!!confirmModal, () => setConfirmModal(null));
  useBack(rangeOpen && !confirmModal, () => setRangeOpen(false));
  useBack(selIdx != null && !confirmModal, closeSel);
  useBack(scr === 'log' && restOpen && selIdx == null && !confirmModal, hideRest);
  useBack(scr === 'log' && !restOpen && selIdx == null && !confirmModal, goList);
  useBack(scr === 'pick' && !confirmModal, pickBack);

  const item = s.items[cur];
  const itemLib = item ? exMeta(item.exId, item.name) : null;
  const isPlyoEx = !!(itemLib && itemLib.kind === 'plyo');
  const isSkillEx = !!(itemLib && itemLib.kind === 'beceri');
  const isWarmupEx = !!(itemLib && itemLib.kind === 'isinma');
  const isFightEx = !!(itemLib && itemLib.kind === 'dovus');
  const bwOk = canBodyweight(itemLib);
  const cfg = eqConfig(itemLib?.eq);
  cfgRef.current = cfg;

  // V34 · planlıda sıradaki hedef kutucuğunun satırı kutunun en üstüne hizalanır (yanıp söner, iki satır görünür)
  const alignNextSlot = (smooth: boolean) => {
    const g = setListRef.current;
    if (!g || isFree(sRef.current)) return false;
    const next = g.querySelector('.slot-next') as HTMLElement | null;
    if (!next) return false;
    try {
      const top = Math.max(0, next.getBoundingClientRect().top - g.getBoundingClientRect().top + g.scrollTop);
      if (smooth && typeof g.scrollTo === 'function') g.scrollTo({ top, behavior: 'smooth' });
      else g.scrollTop = top;
    } catch { /* ignore */ }
    return true;
  };
  useEffect(() => {
    if (scr === 'log') alignNextSlot(false);
  }, [scr, cur]);

  // Set eklenince: plansızda liste başına (en yeni set en üstte), planlıda sıradaki kutucuğa
  const prevLenRef = useRef(item?.sets.length ?? 0);
  useEffect(() => {
    const len = item?.sets.length ?? 0;
    if (len !== prevLenRef.current) {
      prevLenRef.current = len;
      const g = setListRef.current;
      if (g && !alignNextSlot(true)) {
        try { g.scrollTop = 0; } catch { /* ignore */ }
      }
      setListEnd(false);
    }
  }, [cur, item?.sets.length]);

  const startSes = () => {
    const t = Date.now();
    mutate((ns) => {
      delete ns.ready;
      ns.startedAt = t;
    });
    setNow(t);
    pixelFx.startSes(fxRef.current);
  };

  const removeItem = (idx: number) => {
    const target = sRef.current.items[idx];
    if (!target || target.sets.length) return;
    mutate((ns) => { ns.items.splice(idx, 1); });
    if (cur >= sRef.current.items.length) {
      setCur(Math.max(0, sRef.current.items.length - 1));
    } else if (idx < cur) {
      setCur(Math.max(0, cur - 1));
    }
  };

  const discard = () => {
    void stopRest();
    setConfirmModal(null);
    del('sessions', sRef.current.id);
    onDiscarded();
  };

  const finish = () => {
    void stopRest();
    setConfirmModal(null);
    rtD.current = null;
    const end = Date.now();
    const draft = { ...clone(sRef.current), status: 'done', endedAt: end };
    delete draft.ready;
    delete draft.rest;
    const all = [draft, ...st.sessions.filter((x: any) => x.id !== draft.id)];
    const pre = Math.round(fatigueAt(st, draft.startedAt - 1, all).score);
    const post = Math.round(fatigueAt(st, end, all).score);
    const ns = mutate((x) => {
      delete x.rest;
      delete x.ready;
      x.status = 'done';
      x.endedAt = end;
      x.fatigue = { v: 2, pre, post };
    });
    onFinished(ns);
  };

  const endSes = () => {
    if (!sessionStats(sRef.current).sets.length) { setConfirmModal('discard'); return; }
    void stopRest();
    setEndFx(Date.now());
    pixelFx.endSes(fxRef.current);
    setTimeout(finish, 650);
  };

  // HAREKETİ BİTİR: hareket bitti olarak işaretlenir, kısa animasyonla listeye dönülür, sıradaki hareket seçili olur.
  const finishEx = () => {
    if (!item) return;
    const idx = cur;
    mutate((ns) => { if (ns.items[idx]) ns.items[idx].done = true; });
    setExFx({ name: exLabel(item), n: item.sets.length });
    pixelFx.land(fxRef.current);
    setTimeout(() => {
      setExFx(null);
      const its = sRef.current.items;
      let next = its.findIndex((x: any, i: number) => i > idx && !x.done);
      if (next < 0) next = its.findIndex((x: any) => !x.done);
      goList();
      setCur(next >= 0 ? next : idx);
    }, 650);
  };

  // Yardımcı pointer & slider fonksiyonları
  const grab = (e: React.PointerEvent<HTMLElement>) => {
    const el = e.currentTarget;
    try { el.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    return el.getBoundingClientRect();
  };

  const frac = (clientX: number, r: DOMRect) => {
    const w = r.width || barWRef.current || 354;
    return Math.min(1, Math.max(0, (clientX - r.left) / w));
  };

  const setKgVal = (v: number) => {
    const c = cfgRef.current;
    const nk = Math.min(c.max, Math.max(c.min, Math.round(Math.round(v / c.step) * c.step * 100) / 100));
    if (nk === curVals.current.kg) return;
    curVals.current.kg = nk;
    const maj = nk % 10 === 0;
    setKgState(nk);
    const tb = Date.now();
    if (tb - lastBurst.current > 110 || maj) { lastBurst.current = tb; setFxKg((n) => n + 1); }
    if (maj) setFxMaj((n) => n + 1);
    pixelFx.setKg(fxRef.current, nk, c.step);
  };

  // V34 · Parmak bardan aşağı iyice inince sürükleme %40 hıza iner (`dragRate`); gösterge yok.

  // Kilo penceresi değeri görünür tutacak kadar kayar.
  const keepKgInView = (v: number) => {
    const c = cfgRef.current;
    const lo = curVals.current.lo;
    let nlo = lo;
    if (v > lo + c.W * 0.88) nlo = v - c.W * 0.88;
    else if (v < lo + c.W * 0.12) nlo = v - c.W * 0.12;
    nlo = Math.min(Math.max(c.min, c.max - c.W), Math.max(c.min, Math.round(nlo / c.step) * c.step));
    if (nlo !== lo) { curVals.current.lo = nlo; setLoState(nlo); }
  };

  const edgeTick = () => {
    const d = kgD.current;
    if (!d) return;
    const c = cfgRef.current;
    const ed: -1 | 0 | 1 = d.f >= 0.93 ? 1 : d.f <= 0.07 ? -1 : 0;
    let delay = 70;
    if (ed !== 0) {
      // kenarda tut: değer o yöne adım adım, giderek hızlanarak ilerler
      const nv = Math.min(c.max, Math.max(c.min, curVals.current.kg + c.step * ed));
      if (nv !== curVals.current.kg) {
        d.n += 1;
        d.acc = nv;
        setEdge(ed);
        setKgVal(nv);
        keepKgInView(curVals.current.kg);
        delay = Math.max(35, 120 - d.n * 7) / d.rate;
      } else {
        setEdge(0);
      }
    } else {
      d.n = 0;
      setEdge(0);
    }
    edgeT.current = setTimeout(edgeTick, delay);
  };

  // Dokunulan yere atlamaz: bar her yerinden tutulup sürüklenir, değer parmağın hareketi kadar değişir.
  const kgDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = grab(e);
    pixelFx.unlock(fxRef.current);
    kgD.current = { r, f: frac(e.clientX, r), n: 0, x: e.clientX, acc: curVals.current.kg, rate: 1 };
    setKgDrag(true);
    if (edgeT.current) clearTimeout(edgeT.current);
    edgeT.current = setTimeout(edgeTick, 320);
  };

  const kgMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = kgD.current;
    if (!d) return;
    const c = cfgRef.current;
    d.rate = dragRate(e.clientY, d.r, d.rate);
    d.f = frac(e.clientX, d.r);
    d.acc = Math.min(c.max, Math.max(c.min, d.acc + ((e.clientX - d.x) * d.rate * c.W) / (d.r.width || barWRef.current || 354)));
    d.x = e.clientX;
    setKgVal(d.acc);
    keepKgInView(curVals.current.kg);
  };

  const kgUp = () => {
    if (!kgD.current) return;
    kgD.current = null;
    if (edgeT.current) { clearTimeout(edgeT.current); edgeT.current = null; }
    const nlo = centerKg(curVals.current.kg);
    curVals.current.lo = nlo;
    setKgDrag(false);
    setEdge(0);
    setLoState(nlo);
  };

  const kgKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const stp = cfgRef.current.step;
    const k = e.key;
    const d = (k === 'ArrowRight' || k === 'ArrowUp') ? stp
      : (k === 'ArrowLeft' || k === 'ArrowDown') ? -stp
      : k === 'PageUp' ? stp * 4
      : k === 'PageDown' ? -stp * 4 : 0;
    if (!d) return;
    e.preventDefault();
    pixelFx.unlock(fxRef.current);
    setKgVal(curVals.current.kg + d);
    const nlo = centerKg(curVals.current.kg);
    curVals.current.lo = nlo;
    setLoState(nlo);
  };

  const setRepsVal = (v: number) => {
    const n = Math.min(30, Math.max(1, Math.round(v)));
    if (n === curVals.current.reps) return;
    curVals.current.reps = n;
    setRepsState(n);
    setFxRep((x) => x + 1);
    pixelFx.setReps(fxRef.current, n);
  };

  const repDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = grab(e);
    pixelFx.unlock(fxRef.current);
    repD.current = { r, x: e.clientX, acc: curVals.current.reps, rate: 1 };
  };

  const repMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = repD.current;
    if (!d) return;
    d.rate = dragRate(e.clientY, d.r, d.rate);
    d.acc = Math.min(30.49, Math.max(0.5, d.acc + ((e.clientX - d.x) * d.rate * 30) / (d.r.width || barWRef.current || 354)));
    d.x = e.clientX;
    setRepsVal(d.acc);
  };

  const repUp = () => { repD.current = null; };

  const repKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const k = e.key;
    const d = (k === 'ArrowRight' || k === 'ArrowUp') ? 1 : (k === 'ArrowLeft' || k === 'ArrowDown') ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    pixelFx.unlock(fxRef.current);
    setRepsVal(curVals.current.reps + d);
  };

  const setLvlVal = (v: number) => {
    const l = Math.min(4, Math.max(0, Math.round(v))) as 0 | 1 | 2 | 3 | 4;
    setWarm(false);
    if (l === curVals.current.lvl) return;
    curVals.current.lvl = l;
    setLvlState(l);
    setFxLvl((x) => x + 1);
    if (l === 4) setFxShake((x) => x + 1);
    pixelFx.setLvl(fxRef.current, l);
  };

  const lvDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = grab(e);
    pixelFx.unlock(fxRef.current);
    lvD.current = { r };
    setLvlVal(Math.floor(frac(e.clientX, r) * 4.999));
  };

  const lvMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!lvD.current) return;
    setLvlVal(Math.floor(frac(e.clientX, lvD.current.r) * 4.999));
  };

  const lvUp = () => { lvD.current = null; };

  const lvKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const k = e.key;
    const d = (k === 'ArrowRight' || k === 'ArrowUp') ? 1 : (k === 'ArrowLeft' || k === 'ArrowDown') ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    pixelFx.unlock(fxRef.current);
    setLvlVal(curVals.current.lvl + d);
  };

  const setRomVal = (v: number) => {
    const n = Math.min(100, Math.max(10, Math.round(v / 5) * 5));
    if (n === curVals.current.rom) return;
    curVals.current.rom = n;
    setRomState(n);
    setFxRom((x) => x + 1);
    pixelFx.setRom(fxRef.current, n);
  };

  const romDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = grab(e);
    pixelFx.unlock(fxRef.current);
    romD.current = { r, x: e.clientX, w: r.width || 90, acc: curVals.current.rom, rate: 1 };
  };

  const romMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = romD.current;
    if (!d) return;
    d.rate = dragRate(e.clientY, d.r, d.rate);
    d.acc = Math.min(100, Math.max(10, d.acc + ((e.clientX - d.x) * d.rate * 35) / d.w));
    d.x = e.clientX;
    setRomVal(Math.round(d.acc / 5) * 5);
  };

  const romUp = () => { romD.current = null; };

  const romKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const k = e.key;
    const d = (k === 'ArrowRight' || k === 'ArrowUp') ? 5 : (k === 'ArrowLeft' || k === 'ArrowDown') ? -5 : 0;
    if (!d) return;
    e.preventDefault();
    pixelFx.unlock(fxRef.current);
    setRomVal(curVals.current.rom + d);
  };

  const adjustRest = (delta: number) => {
    const curRest = sRef.current.rest;
    if (!curRest || !delta) return;
    const next = changeRest(sRef.current, curRest, delta, prefsRef.current);
    if (next.rest.total === curRest.total) return;
    mutate((ns) => { ns.rest = next.rest; });
    if (next.prefs) {
      prefsRef.current = next.prefs;
      put('settings', { key: 'restPrefs', value: next.prefs });
    }
    const restEx = exLabel(sRef.current.items.find((it: any) => it.exId === next.rest.exId) || item) || t('Antrenman');
    void startRest(next.rest, restEx);
    setFxRt((x) => x + 1);
    setNow(Date.now());
    pixelFx.addRest(fxRef.current, delta);
  };

  const skipRest = () => {
    rtD.current = null;
    mutate((ns) => { delete ns.rest; });
    setRestOpen(false);
    void stopRest();
    pixelFx.skipRest(fxRef.current);
  };

  const openRest = () => {
    pixelFx.openRest(fxRef.current);
    setRestOpen(true);
  };

  const rtDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = grab(e);
    pixelFx.unlock(fxRef.current);
    rtD.current = { r, x: e.clientX, w: r.width || 300, acc: 0, done: 0, rate: 1 };
  };

  const rtMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = rtD.current;
    if (!d) return;
    d.rate = dragRate(e.clientY, d.r, d.rate);
    d.acc += (e.clientX - d.x) * d.rate;
    d.x = e.clientX;
    const steps = Math.trunc(d.acc / (d.w / 9));
    if (steps !== d.done) {
      adjustRest(15 * (steps - d.done));
      d.done = steps;
    }
  };

  const rtUp = () => { rtD.current = null; };

  const rtKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const k = e.key;
    const d = (k === 'ArrowRight' || k === 'ArrowUp') ? 15 : (k === 'ArrowLeft' || k === 'ArrowDown') ? -15 : 0;
    if (!d) return;
    e.preventDefault();
    pixelFx.unlock(fxRef.current);
    adjustRest(d);
  };

  const logSet = () => {
    if (!item) return;
    if (sRef.current.ready) {
      autoStart('İlk setini kaydettin');
    }
    const nowTs = Date.now();
    const set: any = isWarmupEx
      // V33 · antrenman öncesi ısınma: yalnızca süre ve yoğunluk; hesaplara girmez
      ? { kg: 0, reps: 1, dur: wDur, z: wZ, warm: true, lvl: null, vl: 0, rpe: null, rir: 9, at: nowTs }
      : isFightEx
      // V39 · dövüş raundu: süre ve yoğunluk; zor sete girmez, yorgunluğa seans-RPE ile girer
      ? { kg: 0, reps: 1, dur: wDur, z: wZ, fight: true, lvl: null, vl: 0, rpe: null, rir: 9, at: nowTs }
      : warm && !isSkillEx && !isPlyoEx
      // V33 · ısınma seti: kilo ve tekrar kayda geçer ama 1RM, yorgunluk, zor set, tonaj ve gelişime girmez
      ? { kg: curVals.current.kg, reps: curVals.current.reps, warm: true, lvl: null, vl: 0, rpe: null, rir: 9, rom: 100, at: nowTs }
      : isSkillEx
      ? {
          kg: 0,
          reps: Math.max(1, Math.round(reps)),
          ...(itemLib?.h || Number(hold) > 0 ? { hold: Math.max(0, Math.round(hold || 0)) } : {}),
          skill: true,
          q: qQuality,
          lvl: null,
          vl: 0,
          rpe: null,
          rir: 9,
          at: nowTs,
        }
      : isPlyoEx
        ? {
            kg: Number(kg) || 0,
            reps: Math.max(1, Math.round(reps)),
            plyo: true,
            q: qQuality,
            lvl: null,
            vl: 0,
            rpe: null,
            rir: 9,
            at: nowTs,
          }
        : {
            kg: curVals.current.kg,
            reps: curVals.current.reps,
            lvl: curVals.current.lvl,
            vl: PX_SPEED[curVals.current.lvl].vl,
            rpe: null,
            rir: PX_SPEED[curVals.current.lvl].rir,
            rirEst: PX_SPEED[curVals.current.lvl].rir,
            rom: curVals.current.rom,
            at: nowTs,
          };
    const nextRest = {
      start: nowTs,
      // ısınma setinden sonra en çok 60 sn
      total: set.warm ? Math.min(60, restDuration(sRef.current, item, prefsRef.current)) : restDuration(sRef.current, item, prefsRef.current),
      exId: item.exId,
      setNo: item.sets.length + 1,
    };

    mutate((ns) => {
      delete ns.rest;
      ns.items[cur].sets.push(set);
      delete ns.items[cur].done;
      ns.rest = nextRest;
    });

    void stopRest();
    void startRest(nextRest, exLabel(item));

    curVals.current.rom = 100;
    setRomState(100);
    setQQuality(0);
    // her ısınma seti ayrıca seçilir: unutulursa iş seti ısınma sayılmasın
    setWarm(false);
    setSelIdx(null);
    setFxLog((x) => x + 1);
    setNow(nowTs);
    pixelFx.logSet(fxRef.current);

    // Uçan blok kaydet düğmesinden ilk set hücresine iner; dinlenme ekranı inişten sonra açılır.
    // Cihaz "animasyonları azalt" diyorsa (ve Hesap'ta "Animasyonlar" açık değilse) uçuş olmaz:
    // yeni kutucuk yerinde yanıp söner, dinlenme ekranı yine kısa bir bekleyişten sonra açılır.
    const noMM = typeof window === 'undefined' || !window.matchMedia;
    const reduce = !noMM && !fxRef.current.motion && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const btn = logBtnRef.current;
    const grid = setListRef.current as HTMLElement | null;
    const root = btn ? (btn.closest('.px') as HTMLElement | null) : null;
    if (noMM || !btn || !grid || !root) {
      setRestOpen(true);
      return;
    }
    // planlıda kutucuklar yerinde kalır (sıradaki zaten hizalı); plansızda yeni set en üste iner
    const slotMode = !!grid.querySelector('.st.slot');
    if (!slotMode) { try { grid.scrollTop = 0; grid.scrollLeft = 0; } catch { /* yok say */ } }
    if (reduce) {
      if (landT.current) clearTimeout(landT.current);
      landT.current = setTimeout(() => {
        landT.current = null;
        if (sRef.current.rest && scrNow.current === 'log') setRestOpen(true);
      }, 650);
      return;
    }
    const rr = root.getBoundingClientRect();
    const br = btn.getBoundingClientRect();
    const gr = grid.getBoundingClientRect();
    const cs = getComputedStyle(grid);
    // hedef: planlıda iş seti sıradaki kutucuğa, ısınma seti ilk kutucuğun yerine (ısınmalar kutucukların önüne dizilir); plansızda ilk kutucuk
    const first = (slotMode ? grid.querySelector(set.warm ? '.st.slot' : '.st.slot-next') : null) as HTMLElement | null
      || (grid.querySelector('.st') as HTMLElement | null);
    const fr = first ? first.getBoundingClientRect() : null;
    const gap = parseFloat(cs.columnGap || '8') || 8;
    const w = fr ? fr.width : Math.max(80, (gr.width - (parseFloat(cs.paddingRight) || 0) - 2 * gap) / 3);
    const h = fr ? fr.height : 34;
    const x = (fr ? fr.left : gr.left + (parseFloat(cs.paddingLeft) || 0)) - rr.left;
    const y = (fr ? fr.top : gr.top + (parseFloat(cs.paddingTop) || 0)) - rr.top;
    const txt = isWarmupEx ? t('{n} dk', { n: set.dur }) : set.fight ? minTxt(set.dur) : set.warm ? t('ISN') : isSkillEx ? t('{n}d', { n: set.reps }) : isPlyoEx ? t('{n}t', { n: set.reps }) : `${fk(Number(set.kg))}×${set.reps}`;
    setFly({ n: nowTs, x, y, w, h, dx: br.left + br.width / 2 - (rr.left + x + w / 2), dy: br.top + br.height / 2 - (rr.top + y + h / 2), txt });
    pixelFx.land(fxRef.current);
    if (landT.current) clearTimeout(landT.current);
    landT.current = setTimeout(() => {
      landT.current = null;
      setFly(null);
      if (sRef.current.rest && scrNow.current === 'log') setRestOpen(true);
    }, 900);
  };

  const openNote = () => {
    if (!item) return;
    openSheet('note', {
      title: exLabel(item),
      // V34 · sağ üstteki düğme yalnızca hareket notu; set özellikleri set kaydedildikten sonra (openAttr)
      init: { memo: item.memo || '', canProgram: !!(sRef.current.programId && item.srcId) },
      onSave: (r: any) => {
        mutate((ns) => { ns.items[cur].memo = r.memo || ''; });
        // Planlı oturumda not istenirse plana da yazılır
        if (r.toProgram) {
          const pr = st.programs.find((x: any) => x.id === sRef.current.programId);
          if (pr) {
            const np = clone(pr);
            np.days.forEach((d: any) => d.items.forEach((it: any) => { if (it.id === item.srcId) it.note = r.memo; }));
            np.updatedAt = Date.now();
            put('programs', np);
          }
        }
      },
    });
  };

  // V34 · Set özelliği: kaydedilmiş sete yazılır (dinlenme ekranından ya da set ayrıntısından).
  // "Tükenişe kadar" yeni eklenirse son tekrar hızı Zar zor (RIR 0) olur: yorgunluk ve e1RM set özelliğiyle tutarlı kalır.
  const openAttr = (idx: number) => {
    if (!item) return;
    const ci = cur;
    const x = item.sets[idx];
    if (!x || x.warm) return;
    const n = item.sets.slice(0, idx + 1).filter((z: any) => !z.warm).length;
    pixelFx.unlock(fxRef.current);
    openSheet('setattr', {
      title: t('Set {n} · {x}', { n, x: exLabel(item) }),
      init: { tags: x.tags || [], note: x.note || '', strength: !x.plyo && !x.skill && !x.fight },
      onSave: (r: any) => {
        mutate((ns) => {
          const y = ns.items[ci] && ns.items[ci].sets[idx];
          if (!y) return;
          const had = (y.tags || []).includes('Tükenişe kadar');
          if (r.tags && r.tags.length) y.tags = r.tags; else delete y.tags;
          if (r.note) y.note = r.note; else delete y.note;
          if (!had && (r.tags || []).includes('Tükenişe kadar') && !y.plyo && !y.skill && !y.warm && !y.fight && y.lvl !== 4) {
            y.lvl = 4;
            y.vl = PX_SPEED[4].vl;
            y.rir = PX_SPEED[4].rir;
            y.rirEst = PX_SPEED[4].rir;
          }
        });
      },
    });
  };

  // Seçici (scrPick) için veri
  const allPickerExercises = useMemo(() => [
    ...warmFirst(EX_LIB.map((e) => ({ ...e, exId: e.id, src: 'lib' }))),
    ...(st.custom || []).map((c: any) => ({ id: c.id, exId: c.id, name: c.name, en: '', muscle: c.muscle, eq: 'dg', rest: 90, kind: 'kuvvet', src: 'custom' })),
  ], [st.custom]);

  const pickerFiltered = useMemo(() => {
    const toks = normTr(pickQ).split(/\s+/).filter(Boolean);
    const hay = allPickerExercises.map((e) => ({
      e,
      // Arama iki dilde de eşleşir: Türkçe ve İngilizce ad, kas ve ekipman.
      text: normTr(e.name + ' ' + (e.en || '') + ' ' + searchAlias(e.id) + ' ' + e.muscle + ' ' + muscleName(e.muscle) + ' ' + eqLabel(e.eq) + ' ' + (e.src === 'lib' ? detailSearch(e) : '')),
    }));
    const base = toks.length ? hay.filter((x) => toks.every((tok) => x.text.includes(tok))).map((x) => x.e) : allPickerExercises;
    const byKind = base.filter((e) => pickKind === 'all' || (e.kind || 'kuvvet') === pickKind);
    const list = byKind.filter((e) => (!pickGrp || e.muscle === pickGrp) && (!pickEq || e.eq === pickEq));
    const groups = MUSCLES.map((m) => [m, byKind.filter((e) => e.muscle === m && (!pickEq || e.eq === pickEq)).length] as [string, number]).filter((x) => x[1] > 0);
    const eqs = Object.keys(EQ).map((k) => [k, byKind.filter((e) => e.eq === k && (!pickGrp || e.muscle === pickGrp)).length] as [string, number]).filter((x) => x[1] > 0);
    return { base, list, groups, eqs };
  }, [allPickerExercises, pickQ, pickKind, pickGrp, pickEq]);

  const togglePick = (exId: string) => {
    const wasOn = picked.includes(exId);
    setPicked((prev) => (wasOn ? prev.filter((x) => x !== exId) : [...prev, exId]));
    pixelFx.togglePick(fxRef.current, wasOn);
  };

  const addPicked = () => {
    if (!picked.length) return;
    const chosen = picked.map((id) => allPickerExercises.find((e) => e.exId === id)).filter(Boolean);
    if (!chosen.length) return;
    const ranges = st.settings.find((x: any) => x.key === 'repRanges')?.value || {};
    mutate((ns) => {
      chosen.forEach((ex: any) => {
        const d = itemFromEx(ex);
        const rg = ranges[d.exId || d.name];
        ns.items.push({
          ...(isFree(ns) && Array.isArray(rg) ? { range: { lo: rg[0], hi: rg[1] } } : {}),
          id: newId('e'),
          srcId: null,
          exId: d.exId,
          name: d.name,
          muscle: d.muscle,
          note: '',
          memo: '',
          target: { sets: d.sets, repMin: d.repMin, repMax: d.repMax, kg: d.kg, rpeMin: d.rpeMin, rpeMax: d.rpeMax, rest: d.rest, ...(d.dur ? { dur: d.dur, z: d.z } : {}) },
          sets: [],
        });
      });
    });
    setPicked([]);
    setCur(Math.max(0, sRef.current.items.length - 1));
    setScrollLast(Date.now());
    setScr('list');
    pixelFx.addPicked(fxRef.current);
  };

  useEffect(() => {
    if (scr !== 'list' || !scrollLast) return;
    const cards = listRef.current ? listRef.current.querySelectorAll('.px-card') : null;
    const last = cards && cards.length ? (cards[cards.length - 1] as HTMLElement) : null;
    if (last && typeof last.scrollIntoView === 'function') last.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [scr, scrollLast]);

  // Ortak oturum hesapları
  const ss = sessionStats(s);
  const totalSets = ss.sets.length;
  const elapsedSec = s.ready ? 0 : Math.max(0, Math.floor((now - s.startedAt) / 1000));
  const sesD = new Date(s.ready ? now : s.startedAt);
  const sesDate = sesD.toLocaleDateString(locale(), { day: 'numeric', month: 'short', weekday: 'short' });
  const sesStart = String(sesD.getHours()).padStart(2, '0') + ':' + String(sesD.getMinutes()).padStart(2, '0');
  const rest = s.rest;
  let restTxt = '';
  let restSec = 0;
  let restPct = 0;
  let restSegs: Array<{ on: boolean }> = [];
  if (rest) {
    const left = Math.max(0, rest.total - (now - rest.start) / 1000);
    restSec = Math.ceil(left);
    restTxt = Math.floor(restSec / 60) + ':' + String(restSec % 60).padStart(2, '0');
    restPct = Math.round((left / rest.total) * 100);
    const lit = Math.ceil((left / rest.total) * 30);
    restSegs = Array.from({ length: 30 }, (_, i) => ({ on: i < lit }));
  }

  const restToLog = () => {
    pixelFx.unlock(fxRef.current);
    const restIdx = rest?.exId ? s.items.findIndex((it: any) => it.exId === rest.exId) : -1;
    const idx = restIdx >= 0 ? restIdx : cur < s.items.length ? cur : 0;
    if (idx >= 0 && s.items[idx]) {
      enterEx(idx, s.items, { skipSound: true, openRestOverlay: true });
    }
  };

  const rpeForSet = (x: any) => {
    if (x.rpe != null) return rpeLabel(x.rpe, x.rir);
    const sp = PX_SPEED[x.lvl ?? 1] || PX_SPEED[1];
    return rpeLabel(sp.rpe, sp.rir);
  };

  // Render yardımcıları
  const renderToast = () =>
    toast ? (
      <div className={'px-toast ' + (toast.n % 2 ? 'tA' : 'tB')} role="status">
        <span className="lbl" style={{ color: 'var(--btx)', fontSize: 13 }}>{t('İDMAN BAŞLADI')}</span>
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--btx)' }}>{toast.t}</span>
      </div>
    ) : null;

  // İdman / hareket bitti animasyonu (basılı tutma tamamlanınca)
  const renderFx = () => (
    <React.Fragment>
      {endFx ? (
        <div className="px-endfx" role="status" key={'e' + endFx}>
          <span className="px-endfx-t">{t('İDMAN BİTTİ')}</span>
          <span className="px-endfx-s">{t('{n} set', { n: totalSets })} · {num(Math.round(ss.tonnage))} kg</span>
        </div>
      ) : null}
      {exFx ? (
        <div className="px-endfx ex" role="status">
          <span className="px-endfx-t">{t('HAREKET BİTTİ')}</span>
          <span className="px-endfx-s">{exFx.name} · {t('{n} set', { n: exFx.n })}</span>
        </div>
      ) : null}
    </React.Fragment>
  );

  const renderConfirmModal = () => {
    if (!confirmModal) return null;
    // İDMANI BİTİR basılı tutulunca doğrudan biter; bu pencere yalnızca hiç set yokken çıkar.
    return (
      <React.Fragment>
        <button type="button" className="bd" onClick={() => setConfirmModal(null)} aria-label={t('Pencereyi kapat')} />
        <div className="win" role="dialog" aria-label={t('İdmanı iptal et')}>
          <span className="lbl" style={{ color: 'var(--gold)', fontSize: 15 }}>{t('HİÇ SET YOK')}</span>
          <div style={{ fontSize: 16, color: 'var(--tx)' }}>{t('Hiç set kaydetmedin. Kaydetmeden çıkabilirsin.')}</div>
          {/* Press Start yalnızca 16 px (keskin); uzun metin sığsın diye düğmeler alt alta */}
          <div style={{ display: 'flex', gap: 20, flexDirection: 'column' }}>
            <button type="button" className="bb" style={{ flex: 'none' }} onClick={() => setConfirmModal(null)}>{t('GERİ DÖN')}</button>
            <HoldButton id="discard-yes" className="go" style={{ flex: 'none', height: 64 }} onHold={discard}>
              <span>{upper(t('Kaydetmeden çık'))}</span>
            </HoldButton>
          </div>
        </div>
      </React.Fragment>
    );
  };

  // V33 · plansızda hareketin hedef tekrar aralığı: setler yine tek sayı; aralık hareket için hatırlanır (ayar: repRanges).
  const saveRange = (it: any, next: any) => {
    const idx = sRef.current.items.findIndex((x: any) => x.id === it.id);
    if (idx < 0) return;
    mutate((ns) => { if (next) ns.items[idx].range = next; else delete ns.items[idx].range; });
    const key = it.exId || it.name;
    const cur0 = st.settings.find((x: any) => x.key === 'repRanges')?.value || {};
    const nv = { ...cur0 };
    if (next) nv[key] = [next.lo, next.hi]; else delete nv[key];
    put('settings', { key: 'repRanges', value: nv });
    if (next && !it.sets.length) setRepsVal(next.hi);
    setRangeOpen(false);
  };

  /* ================= EKRAN 1: HAREKET LİSTESİ ================= */
  if (scr === 'list') {
    return (
      <div className={'screen px night' + (motionOn ? ' px-motion' : '')}>
        <div className="px-scr">
          <div className="px-head">
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span className="px-ses-title" style={{ fontSize: 21, fontWeight: 700, letterSpacing: '0.04em', lineHeight: 1.1 }}>{planned ? upTr(sessionName(s)) : upper(t('Plansız antrenman'))}</span>
              <span className="px-ses-meta">
                <span className="px-ses-date">{sesDate}</span>
                {s.ready ? (
                  <span>{t('HAZIR')} · <b>{t('başlamadı')}</b></span>
                ) : (
                  <React.Fragment>
                    <span>{t("{x}'de başladı", { x: sesStart })}</span>
                    <span>{t('SÜRE')} <b className="nm">{hms(elapsedSec)}</b></span>
                  </React.Fragment>
                )}
              </span>
            </div>
            {s.ready ? (
              <HoldButton id="discard-ready-btn" className="ib px-ib-hold" aria-label={t('İdmanı iptal et (1 saniye basılı tut)')} onHold={discard} hint="basılı tut">
                {t('İPTAL')}
              </HoldButton>
            ) : null}
          </div>

          <div className="pxb" style={{ margin: '8px 3px 0', padding: '10px 12px', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, flex: '0 0 auto' }}>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span className="lbl" style={{ fontSize: 13 }}>{t('HAREKET')}</span>
              <span className="nm" style={{ fontSize: 18 }}>{s.items.length}</span>
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span className="lbl" style={{ fontSize: 13 }}>{t('SET')}</span>
              <span className="nm" style={{ fontSize: 18 }}>{totalSets}</span>
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span className="lbl" style={{ fontSize: 13 }}>{t('TONAJ')}</span>
              <span className="nm" style={{ fontSize: 17, color: 'var(--gold)' }}>
                {num(Math.round(ss.tonnage))} kg
              </span>
            </span>
          </div>

          <div style={{ height: 22, marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 3px', flex: '0 0 auto' }}>
            <span className="lbl">{t('HAREKETLER')}</span>
            <span style={{ fontSize: 13, color: 'var(--mt)' }}>{t('dokun: devam et')}</span>
          </div>

          <div ref={listRef} className="px-scroll" style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', marginTop: 8, padding: '4px 3px 8px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {s.items.map((it: any, k: number) => {
              const lib = exMeta(it.exId, it.name);
              const eqTxt = lib ? eqLabel(lib.eq) : t('Özel');
              const mult = dbMultiplier(it.exId, it.name);
              const plyo = !!(lib && lib.kind === 'plyo');
              const skill = !!(lib && lib.kind === 'beceri');
              const n = it.sets.length;
              const ton = it.sets.reduce((a: number, x: any) => a + (x.plyo || x.skill || x.warm ? 0 : (Number(x.kg) || 0) * x.reps * mult), 0);
              const wu = !!(lib && lib.kind === 'isinma');
              const fi = !!(lib && lib.kind === 'dovus');
              const tgSets = planned && it.target && !wu ? Number(it.target.sets) || 0 : 0;
              const nWork = it.sets.filter((x: any) => !x.warm).length;
              const sum = wu
                ? (n ? t('{n} dk', { n: it.sets.reduce((a: number, x: any) => a + (Number(x.dur) || 0), 0) }) : targetTxt(it.target || {}, it.exId))
                : fi
                ? (tgSets ? t('{d}/{n} raund', { d: n, n: tgSets }) : t('{n} raund', { n })) + (n ? ' · ' + minTxt(it.sets.reduce((a: number, x: any) => a + (Number(x.dur) || 0), 0)) : '')
                : tgSets
                ? t('{d}/{n} set', { d: nWork, n: tgSets }) + (n && !plyo && !skill ? ' · ' + num(Math.round(ton)) + ' kg' : '')
                : !n
                ? t('set yok')
                : plyo
                  ? t('{n} set', { n }) + ' · ' + t('{n} temas', { n: it.sets.reduce((a: number, x: any) => a + x.reps, 0) })
                  : skill
                    ? t('{n} set', { n }) + ' · ' + t('{n} deneme', { n: it.sets.reduce((a: number, x: any) => a + x.reps, 0) })
                    : t('{n} set', { n }) + ' · ' + num(Math.round(ton)) + ' kg';
              const recent = it.sets.slice(-4).reverse();

              return (
                <div key={it.id} className={'px-card' + (k === cur && s.items.length > 0 ? ' cur' : '') + (it.done ? ' done' : '')}>
                  <button
                    type="button"
                    className="card-main"
                    onClick={() => enterEx(k)}
                    aria-label={t('{x}, {n} set. Devam etmek için dokun.', { x: exLabel(it), n })}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: '0.03em', color: 'var(--tx)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {exLabel(it)}
                      </span>
                      {it.done ? <span className="px-done-tag">{t('BİTTİ')}</span> : null}
                      <svg width="14" height="14" viewBox="0 0 9 9" shapeRendering="crispEdges" aria-hidden="true" style={{ flex: '0 0 auto', color: 'var(--mt)' }}>
                        <path d="M2 1h2v1H2zM3 2h2v1H3zM4 3h2v1H4zM5 4h2v1H5zM4 5h2v1H4zM3 6h2v1H3zM2 7h2v1H2z" fill="currentColor" />
                      </svg>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, fontSize: 13, color: 'var(--mt)' }}>
                      <span>{eqTxt} · {muscleName(it.muscle)}</span>
                      <span style={{ color: n ? 'var(--tx)' : 'var(--mt)' }}>{sum}</span>
                    </span>
                    {tgSets ? (
                      <span className="px-card-tg">
                        <b>{upper(t('Hedef'))}</b> {targetTxt(it.target, it.exId)}
                        {it.memo || it.note ? <i>{it.memo || noteLabel(it.note)}</i> : null}
                      </span>
                    ) : null}
                    {n > 0 ? (
                      <span style={{ display: 'flex', gap: 6, flexWrap: 'nowrap', overflow: 'hidden' }}>
                        {recent.map((x: any, rIdx: number) => {
                          const chipColor = x.fight
                            ? WARM_Z_COLORS[(Number(x.z) || 3) - 1]
                            : x.warm
                            ? WARM_Z_COLORS[0]
                            : x.plyo
                            ? PX_PLYO_Q[x.q || 0].c
                            : x.skill
                              ? PX_SKILL_Q[x.q || 0].c
                              : PX_SPEED_COLORS[x.lvl ?? 1];
                          const chipTxt = x.fight
                            ? minTxt(x.dur)
                            : x.dur
                            ? t('{n} dk', { n: x.dur })
                            : x.warm
                            ? t('ISN')
                            : x.skill
                            ? t('{n}d', { n: x.reps })
                            : x.plyo
                              ? (Number(x.kg) ? '+' + fk(Number(x.kg)) + '×' : '') + t('{n}t', { n: x.reps })
                              : `${fk(Number(x.kg))}×${x.reps}`;
                          return (
                            <span key={rIdx} className="chp nm" style={{ color: chipColor }}>{chipTxt}</span>
                          );
                        })}
                        {n > 4 ? <span className="chp nm" style={{ color: 'var(--mt)' }}>+{n - 4}</span> : null}
                      </span>
                    ) : null}
                  </button>
                  {n === 0 ? (
                    <HoldButton className="card-del" aria-label={t('{x} hareketini çıkar', { x: exLabel(it) })} onHold={() => removeItem(k)} hint="tut">
                      ×
                    </HoldButton>
                  ) : null}
                </div>
              );
            })}

            <button
              type="button"
              id={s.items.length === 0 ? 'ses-add-first' : 'fx-add'}
              className="addrow"
              onClick={goPick}
            >
              <svg width="16" height="16" viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden="true">
                <path d="M3 0h2v8H3zM0 3h8v2H0z" fill="currentColor" />
              </svg>
              {t('HAREKET EKLE')}
            </button>
          </div>

          <div className="px-actions" style={{ marginTop: 10 }}>
            {rest ? (
              <button type="button" className="px-rchip" onClick={restToLog} aria-label={t('Dinlenme sayacı: devam eden harekete dön')}>
                <span className="nm" style={{ fontSize: 19 }}>{restTxt}</span>
                <i style={{ position: 'absolute', left: 0, bottom: 0, height: 6, width: restPct + '%', background: 'var(--gold)' }} />
              </button>
            ) : null}
            {s.ready ? (
              <button type="button" id="start-ses-btn" className="go" onClick={startSes}>{t('İDMANI BAŞLAT')}</button>
            ) : (
              <HoldButton id="finish-btn" className="go end" ms={500} tone="go" onHold={endSes}>{t('İDMANI BİTİR')}</HoldButton>
            )}
          </div>
        </div>
        {renderToast()}
        {renderFx()}
        {renderConfirmModal()}
        <div className={'fl ' + par(fxReady, 'flA', 'flB')} />
      </div>
    );
  }

  /* ================= EKRAN 2: HAREKET SEÇİCİ (ÇOKLU) ================= */
  if (scr === 'pick') {
    const inSesIds = s.items.map((it: any) => it.exId).filter(Boolean);
    const exactMatch = allPickerExercises.some((e) => normTr(e.name) === normTr(pickQ));

    return (
      <div className={'screen px night' + (motionOn ? ' px-motion' : '')}>
        <div className="px-scr">
          <div className="px-head">
            <button type="button" className="ib" onClick={pickBack} aria-label={t('Geri: antrenman listesi')}>
              <svg width="22" height="22" viewBox="0 0 9 9" shapeRendering="crispEdges" aria-hidden="true">
                <path d="M5 1h2v1H5zM4 2h2v1H4zM3 3h2v1H3zM2 4h2v1H2zM3 5h2v1H3zM4 6h2v1H4zM5 7h2v1H5z" fill="currentColor" />
              </svg>
            </button>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 19, fontWeight: 700, letterSpacing: '0.04em', lineHeight: 1.1 }}>{t('HAREKET EKLE')}</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--mt)', letterSpacing: '0.08em' }}>{t('TEK TEK YA DA BİRKAÇ TANE SEÇ')}</span>
            </div>
          </div>

          <label className="pxb" style={{ margin: '8px 3px 0', height: 46, display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px', flex: '0 0 auto' }}>
            <svg width="18" height="18" viewBox="0 0 9 9" shapeRendering="crispEdges" aria-hidden="true" style={{ flex: '0 0 auto', color: 'var(--mt)' }}>
              <path d="M2 1h3v1H2zM1 2h1v3H1zM5 2h1v3H5zM2 5h3v1H2zM5 6h1v1H5zM6 7h1v1H6zM7 8h1v1H7z" fill="currentColor" />
            </svg>
            <span className="visually-hidden">{t('Hareket ara')}</span>
            <input
              id="ex-search"
              className="q"
              type="search"
              value={pickQ}
              onChange={(e) => { setPickQ(e.target.value); setPickLim(40); }}
              placeholder={t('Hareket ara: bench, curl, omuz…')}
              autoComplete="off"
            />
          </label>

          <div className="px-fchips" style={{ marginTop: 8 }} role="tablist" aria-label={t('Hareket türü')}>
            {EX_KINDS.map(([k, lbl]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={pickKind === k}
                className={'px-fchip' + (pickKind === k ? ' on' : '')}
                onClick={() => { setPickKind(k); setPickLim(40); }}
              >
                {t(lbl)}
              </button>
            ))}
          </div>

          <div className="px-fchips" style={{ marginTop: 4 }} role="group" aria-label={t('Kas grubu')}>
            <button type="button" className={'px-fchip' + (!pickGrp ? ' on' : '')} onClick={() => { setPickGrp(null); setPickLim(40); }}>
              {t('Tüm kaslar')}
            </button>
            {pickerFiltered.groups.map(([m, cnt]) => (
              <button
                key={m}
                type="button"
                className={'px-fchip' + (pickGrp === m ? ' on' : '')}
                onClick={() => { setPickGrp(pickGrp === m ? null : m); setPickLim(40); }}
              >
                {muscleName(m)} ({cnt})
              </button>
            ))}
          </div>

          {pickQ.trim() && !exactMatch && (showNewEx || !pickerFiltered.list.length) ? (
            <div className="pxb" style={{ margin: '8px 3px 0', padding: 10, display: 'flex', flexDirection: 'column', gap: 8, flex: '0 0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="chp" style={{ color: 'var(--gold)' }}>{t('YENİ')}</span>
                <strong style={{ fontSize: 15 }}>{pickQ.trim()}</strong>
              </div>
              <div className="px-fchips" role="group" aria-label={t('Kas grubu seç')}>
                {MUSCLES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={'px-fchip' + (newExMuscle === m ? ' on' : '')}
                    onClick={() => setNewExMuscle(m)}
                  >
                    {muscleName(m)}
                  </button>
                ))}
              </div>
              <button
                type="button"
                id="ex-add-new"
                className="px-fchip on"
                style={{ height: 44 }}
                onClick={() => {
                  const doc = addCustom(pickQ.trim(), newExMuscle || 'Diğer');
                  setPicked((prev) => (prev.includes(doc.id) ? prev : [...prev, doc.id]));
                  setPickQ('');
                  setShowNewEx(false);
                }}
              >
                {t('Özel hareketi seçime ekle')}
              </button>
            </div>
          ) : null}

          <div className="px-scroll" style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', marginTop: 8, padding: '4px 3px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pickerFiltered.list.slice(0, pickLim).map((e: any) => {
              const alreadyIn = inSesIds.includes(e.exId);
              const isOn = picked.includes(e.exId);
              const meta = `${eqLabel(e.eq)} · ${muscleName(e.muscle)}`;
              return (
                <button
                  key={e.src + e.id}
                  type="button"
                  className={'pk' + (alreadyIn ? ' in' : isOn ? ' on' : '')}
                  disabled={alreadyIn}
                  aria-pressed={alreadyIn ? false : isOn}
                  aria-label={exLabel(e) + ', ' + (alreadyIn ? t('zaten listede') : isOn ? t('seçili') : t('seçmek için dokun'))}
                  onClick={() => { if (!alreadyIn) togglePick(e.exId); }}
                >
                  <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--tx)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {exLabel(e)}
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--mt)' }}>{meta}</span>
                  </span>
                  {alreadyIn ? (
                    <span style={{ flex: '0 0 auto', fontSize: 13, fontWeight: 600, color: 'var(--gold)' }}>{t('listede')}</span>
                  ) : null}
                  <i className="box" />
                </button>
              );
            })}

            {pickerFiltered.list.length > pickLim ? (
              <button type="button" id="ex-more" className="px-fchip" style={{ height: 44 }} onClick={() => setPickLim(pickLim + 60)}>
                {t('Daha fazla göster')} ({pickerFiltered.list.length - pickLim})
              </button>
            ) : null}

            {pickerFiltered.list.length === 0 ? (
              <div style={{ padding: '20px 10px', textAlign: 'center', fontSize: 14, color: 'var(--mt)' }}>{t('Eşleşen hareket yok.')}</div>
            ) : null}

            {pickQ.trim() && !exactMatch && pickerFiltered.list.length > 0 && !showNewEx ? (
              <button type="button" id="ex-new-open" className="addrow" onClick={() => setShowNewEx(true)}>
                {t('+ “{x}” özel hareket ekle', { x: pickQ.trim() })}
              </button>
            ) : null}
          </div>

          <div className="px-actions" style={{ marginTop: 8 }}>
            <button type="button" id="pick-add" className="go" disabled={picked.length === 0} onClick={addPicked}>
              {picked.length === 0 ? t('HAREKET SEÇ') : t('{n} HAREKET EKLE', { n: picked.length })}
            </button>
          </div>
        </div>
        {renderToast()}
        {renderFx()}
        <div className={'fl ' + par(fxReady, 'flA', 'flB')} />
      </div>
    );
  }

  /* ================= EKRAN 3: SET EKRANI ================= */
  if (!item) return null;

  const sets = item.sets;
  const nS = sets.length;
  // V33 · ısınma setleri sayılmaz: set numarası ve hedef sayacı iş setlerinden
  const workN = sets.filter((x: any) => !x.warm).length;
  const tgt = planned && item.target && Number(item.target.sets) && !isWarmupEx ? item.target : null;
  const setCount = isFightEx
    ? (tgt ? t('{d}/{n} raund', { d: workN, n: tgt.sets }) : t('{n} raund', { n: workN }))
    : tgt ? t('{d}/{n} set', { d: workN, n: tgt.sets }) : t('{n} set', { n: workN });
  const planNote = planned ? (item.memo || noteLabel(item.note) || '') : '';
  const mult = dbMultiplier(item.exId, item.name);
  const vol = sets.reduce((a: number, x: any) => a + (x.plyo || x.skill || x.warm ? 0 : (Number(x.kg) || 0) * x.reps * mult), 0);
  const range = !planned && item.range ? item.range : null;
  const eqNameUpper = upper(itemLib ? eqLabel(itemLib.eq) : t('Özel'));
  const hasNote = !!item.memo;

  const hasMore = nS > 6;
  const rowsReversed = sets.map((x: any, i: number) => ({ x, i })).reverse();
  // V33 · planlıda hedef setler sırayla kutucuk: yapıldıkça dolar; ısınma setleri önde, ayrı renkte
  const slotPlan = (() => {
    if (!tgt || isFightEx) return null;
    const all = sets.map((x: any, i: number) => ({ x, i }));
    const work = all.filter((o: any) => !o.x.warm);
    const n = Math.max(Number(tgt.sets) || 0, work.length);
    return { warm: all.filter((o: any) => o.x.warm), slots: Array.from({ length: n }, (_, k) => work[k] || null), next: work.length };
  })();
  const slotTxt = tgt ? (hasNum(tgt.kg) && Number(tgt.kg) > 0 ? fk(Number(tgt.kg)) + '×' : '') + repTxt(tgt.repMin, tgt.repMax) : '';
  // V34 · kutucukta "SET n · 60 kg" üstte, "8–12 tekrar" altta
  const slotKg = tgt && hasNum(tgt.kg) && Number(tgt.kg) > 0 ? fk(Number(tgt.kg)) + ' kg' : '';
  const slotReps = tgt ? repTxt(tgt.repMin, tgt.repMax) : '';
  const slotUnit = isPlyoEx ? t('temas') : isSkillEx ? t('deneme') : t('tekrar');

  // Kuvvet / Olimpik hesapları
  // Bant, ekipmanın en düşük değerinden başlar (V33: barbell 20 kg); ek yüksüz yapılabilen harekette 0 = VA.
  const PPK = barWidth / cfg.W;
  const ticks: Array<{ v: number; x: number; cls: string }> = [];
  const labels: Array<{ v: number; x: number; t: string; cls: string }> = [];
  for (let v = cfg.min; v <= cfg.max + 1e-9; v += cfg.step) {
    const rv = Math.round(v * 100) / 100;
    const x = +((rv - cfg.min) * PPK).toFixed(2);
    const kind = rv % 10 === 0 ? 'mj' : rv % 5 === 0 ? 'md' : 'mn';
    ticks.push({ v: rv, x, cls: kind + (rv <= kg ? ' on' : '') });
    if (rv % 10 === 0) labels.push({ v: rv, x, t: rv === 0 && bwOk ? t('VA') : String(rv), cls: rv === kg ? 'lb cur' : 'lb' });
  }
  const thumbX = +((kg - cfg.min) * PPK).toFixed(2);
  const tapeX = -(+((lo - cfg.min) * PPK).toFixed(2));
  const prevSet = sets[sets.length - 1];
  const ghostX = prevSet && !prevSet.warm ? +((Number(prevSet.kg) - cfg.min) * PPK).toFixed(2) : -40;
  const trackW = Math.ceil((cfg.max - cfg.min) * PPK) + 24;

  const kgPop = par(fxKg, 'popA', 'popB');
  const repPop = par(fxRep, 'popA', 'popB');
  const curSp = PX_SPEED[lvl];
  const rir = curSp.rir;
  // V34 · setin 1RM tahmini her zaman yazılır; güvenilir aralığın dışında ≈ ile ve soluk (gelişime girmez)
  const e1L = warm ? null : setE1({ kg, reps, rir, rom });
  const e1okLive = !!(e1L && e1L.ok);
  const e1Live = e1L ? (e1L.ok ? '' : '≈') + fk(e1L.v) : '—';

  const sx = selIdx != null ? sets[selIdx] : null;
  const lastLogged = sets[sets.length - 1];

  const burst = (list: typeof P_UP, n: number) =>
    list.map((p) => ({ a: p.a, cls: par(n, p.far ? 'fA' : 'nA', p.far ? 'fB' : 'nB') }));

  const onSetsScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const end = el.scrollTop + el.clientHeight >= el.scrollHeight - 4;
    if (end !== listEnd) setListEnd(end);
  };

  // Pliometrik / Beceri bilgi
  const totalContacts = ss.contacts;
  const lastPlyoQ = isPlyoEx && sets.length ? sets[sets.length - 1].q || 0 : 0;
  const goals = readGoals(st.settings);
  const matchingGoal = isSkillEx ? goals.find((g) => g.type === 'skill' && matchesSkillGoal(g, item)) : null;
  const skillStat = matchingGoal ? skillStats(matchingGoal, st.sessions) : null;

  return (
    <div className={'screen px night' + (motionOn ? ' px-motion' : '')}>
      <div className="px-scr">
        {fly ? (
          <div
            key={fly.n}
            className="px-fly nm"
            aria-hidden="true"
            style={{ left: fly.x, top: fly.y, width: fly.w, height: fly.h, ['--fx' as string]: fly.dx + 'px', ['--fy' as string]: fly.dy + 'px' } as React.CSSProperties}
          >
            {fly.txt}
          </div>
        ) : null}
        <div className={'px-log-inner ' + par(fxShake, 'shA', 'shB') + (slotPlan && slotPlan.warm.length + slotPlan.slots.length > 3 ? ' px-slot2' : '')}>
          {/* Üst başlık */}
          <div className="px-head">
            <button type="button" className="ib" onClick={goList} aria-label={t('Geri: antrenman listesi')}>
              <svg width="22" height="22" viewBox="0 0 9 9" shapeRendering="crispEdges" aria-hidden="true">
                <path d="M5 1h2v1H5zM4 2h2v1H4zM3 3h2v1H3zM2 4h2v1H2zM3 5h2v1H3zM4 6h2v1H4zM5 7h2v1H5z" fill="currentColor" />
              </svg>
            </button>
            <button
              type="button"
              className="px-head-btn"
              onClick={() => openSheet('exercise', { exId: item.exId, name: item.name })}
              aria-label={t('{x} bilgisi', { x: exLabel(item) })}
            >
              <span className="px-head-title">{upTr(exLabel(item))}</span>
              <span className="px-head-sub">
                {isWarmupEx ? <React.Fragment>{t('ISINMA')}</React.Fragment> : isFightEx ? <React.Fragment>{t('RAUND')} {workN + 1}{tgt ? '/' + tgt.sets : ''}</React.Fragment> : warm ? <span style={{ color: WARM_Z_COLORS[0] }}>{t('ISINMA SETİ')}</span> : planned && tgt ? <React.Fragment>{t('SET')} {workN + 1}/{tgt.sets}</React.Fragment> : <React.Fragment>{t('PLANSIZ')} · {t('SET')} {workN + 1}</React.Fragment>} · {planNote ? <span className="px-plan-note">{planNote}</span> : <span style={{ color: 'var(--gold)' }}>{eqNameUpper}</span>}
              </span>
            </button>
            <button type="button" id="note-btn" className={'ib' + (hasNote ? ' has' : '')} onClick={openNote} aria-label={t('Hareket notu')}>
              <svg width="22" height="22" viewBox="0 0 9 9" shapeRendering="crispEdges" aria-hidden="true">
                <path d="M6 1h2v2H6zM5 3h2v1H5zM4 4h2v1H4zM3 5h2v1H3zM2 6h1v1H2zM1 8h7v1H1z" fill="currentColor" />
              </svg>
            </button>
          </div>

          {/* Setler kutusu */}
          <div className={'pxb px-sets-box ' + par(fxLog, 'px-pnlA', 'px-pnlB') + (slotPlan ? ' px-slotbox' : '')}>
            <div className="px-sets-head">
              {tgt ? (
                <span className="px-plan">
                  <span className="px-plan-k">{upper(t('Hedef'))}</span>
                  <span className="px-plan-v">{targetTxt(tgt, item.exId)}</span>
                </span>
              ) : range ? (
                <span className="px-plan">
                  <span className="px-plan-k">{upper(t('Hedef'))}</span>
                  <span className="px-plan-v">{repTxt(range.lo, range.hi)} {t('tekrar')}</span>
                </span>
              ) : <span className="lbl">{t('SETLER')}</span>}
              <span className="px-sets-sum">
                {tgt && !isFightEx
                  ? setCount
                  : isPlyoEx
                  ? setCount + ' · ' + t('{n} temas', { n: sets.reduce((a: number, x: any) => a + x.reps, 0) })
                  : isSkillEx
                    ? setCount + ' · ' + t('{n} deneme', { n: sets.reduce((a: number, x: any) => a + x.reps, 0) })
                    : isWarmupEx
                      ? t('{n} dk', { n: sets.reduce((a: number, x: any) => a + (Number(x.dur) || 0), 0) })
                      : isFightEx
                        ? setCount + ' · ' + minTxt(sets.reduce((a: number, x: any) => a + (Number(x.dur) || 0), 0))
                        : setCount + ' · ' + t('tonaj {x} kg', { x: num(Math.round(vol)) })}
              </span>
            </div>
            <div className="px-sets-wrap">
              <div
                ref={setListRef}
                onScroll={onSetsScroll}
                className={'px-scroll px-sets-grid' + (hasMore && !listEnd && !slotPlan ? ' fade' : '') + (sets.length === 0 && !slotPlan ? ' px-empty' : '') + (slotPlan ? ' px-slots' : '')}
              >
                {(slotPlan ? [...slotPlan.warm] : rowsReversed).map(({ x, i }) => {
                  const isNewest = i === nS - 1;
                  const c = x.fight
                    ? WARM_Z_COLORS[(Number(x.z) || 3) - 1]
                    : x.warm
                    ? WARM_Z_COLORS[0]
                    : x.plyo
                    ? PX_PLYO_Q[x.q || 0].c
                    : x.skill
                      ? PX_SKILL_Q[x.q || 0].c
                      : PX_SPEED_COLORS[x.lvl ?? 1];
                  // V34 · ısınma setinde kilo ve tekrar yazılmaz, yalnızca ISN (WU)
                  const mainTxt = x.fight
                    ? minTxt(x.dur)
                    : x.dur
                    ? t('{n} dk', { n: x.dur })
                    : x.warm
                    ? t('ISN')
                    : x.skill
                    ? t('{n}d', { n: x.reps }) + (Number(x.hold) > 0 ? '·' + x.hold + 's' : '')
                    : x.plyo
                      ? (Number(x.kg) ? '+' + fk(Number(x.kg)) + '×' : '') + t('{n}t', { n: x.reps })
                      : `${fk(Number(x.kg))}×${x.reps}`;
                  const rightBadge = x.dur
                    ? String(x.z || 1)
                    : x.warm
                    ? null
                    : x.skill
                    ? PX_SKILL_Q[x.q || 0].k.slice(0, 3)
                    : x.plyo
                      ? (x.q === 0 ? '✓' : x.q === 1 ? '~' : '!')
                      : rpeForSet(x);
                  const aria = x.fight
                    ? t('Raund {n}: {x}. Ayrıntı', { n: i + 1, x: fightSetTxt(x) })
                    : x.dur
                    ? t('Isınma: {x}. Ayrıntı', { x: warmSetTxt(x) })
                    : x.warm
                    ? t('Isınma seti. Ayrıntı')
                    : x.skill
                    ? t('Set {n}: {x}. Ayrıntı', { n: i + 1, x: skillSetTxt(x) })
                    : x.plyo
                      ? t('Set {n}: {r} temas. Ayrıntı', { n: i + 1, r: x.reps })
                      : t('Set {n}: {kg} kilo, {r} tekrar, RPE {rpe}. Ayrıntı için dokun.', { n: i + 1, kg: fk(Number(x.kg)), r: x.reps, rpe: rightBadge });

                  return (
                    <button
                      key={x.at + '-' + i}
                      type="button"
                      className={'st' + (x.warm && !x.dur ? ' wu' : '') + (isNewest ? ' new ' + par(fxLog, 'px-landA', 'px-landB') : '')}
                      aria-label={aria}
                      onClick={() => { setSelIdx(i); setConfirmDelSet(false); pixelFx.openSel(fxRef.current); }}
                    >
                      <span className="nm st-main">{mainTxt}</span>
                      {rightBadge != null ? <span className="nm st-rpe" style={{ background: c }}>{rightBadge}</span> : null}
                      {(x.tags && x.tags.length) || x.note ? <i className="st-attr" aria-hidden="true" /> : null}
                    </button>
                  );
                })}
                {slotPlan ? slotPlan.slots.map((o: any, k: number) => {
                  if (!o) {
                    return (
                      <div key={'slot' + k} className={'st slot' + (k === slotPlan.next ? ' slot-next' : '')} aria-label={t('Set {n}: hedef {x}', { n: k + 1, x: slotTxt })}>
                        <span className="st-no">{t('SET')} {k + 1}{slotKg ? ' · ' + slotKg : ''}</span>
                        <span className="st-main"><b className="nm">{slotReps}</b><small>{slotUnit}</small></span>
                      </div>
                    );
                  }
                  const { x, i } = o;
                  const isNewest = i === nS - 1;
                  return (
                    <button
                      key={x.at + '-' + i}
                      type="button"
                      className={'st slot slot-done' + (isNewest ? ' new ' + par(fxLog, 'px-landA', 'px-landB') : '')}
                      aria-label={t('Set {n}: {kg} kilo, {r} tekrar, RPE {rpe}. Ayrıntı için dokun.', { n: k + 1, kg: fk(Number(x.kg)), r: x.reps, rpe: x.skill || x.plyo ? '–' : rpeForSet(x) })}
                      onClick={() => { setSelIdx(i); setConfirmDelSet(false); pixelFx.openSel(fxRef.current); }}
                    >
                      <span className="st-no">{t('SET')} {k + 1}</span>
                      <span className="nm st-main">{x.skill ? t('{n}d', { n: x.reps }) : x.plyo ? (Number(x.kg) ? '+' + fk(Number(x.kg)) + '×' : '') + t('{n}t', { n: x.reps }) : `${fk(Number(x.kg))}×${x.reps}`}</span>
                      <span className="nm st-rpe" style={{ background: x.plyo ? PX_PLYO_Q[x.q || 0].c : x.skill ? PX_SKILL_Q[x.q || 0].c : PX_SPEED_COLORS[x.lvl ?? 1] }}>{x.skill ? PX_SKILL_Q[x.q || 0].k.slice(0, 3) : x.plyo ? (x.q === 0 ? '✓' : x.q === 1 ? '~' : '!') : rpeForSet(x)}</span>
                      {(x.tags && x.tags.length) || x.note ? <i className="st-attr" aria-hidden="true" /> : null}
                    </button>
                  );
                }) : null}
                {sets.length === 0 && !slotPlan ? <div className="px-sets-empty">{isWarmupEx || isFightEx ? t('Süreyi ve yoğunluğu seç') : t('İlk setini kaydet')}</div> : null}
              </div>
              {hasMore && !listEnd && !slotPlan ? (
                <span className="more">
                  <svg width="10" height="10" viewBox="0 0 6 6" shapeRendering="crispEdges" aria-hidden="true">
                    <path d="M0 1h6v1H0zM1 2h4v1H1zM2 3h2v1H2z" fill="currentColor" />
                  </svg>
                  {t('{n} eski set daha', { n: nS - 6 })}
                </span>
              ) : null}
            </div>
          </div>

          {isFightEx ? (
            /* V39 · Dövüş raundu: raund süresi (yarım dakika adım) ve yoğunluk */
            <React.Fragment>
              <div className="pxb px-alt-stage">
                <span style={{ fontSize: 13, color: 'var(--mt)', lineHeight: 1.35 }}>{t('Her kayıt bir raund. Yorgunluğa süre × yoğunlukla girer.')}</span>
              </div>
              <div className="px-wu-dur">
                <PxStair id={'fdur-' + item.id} label={t('Raund süresi')} unit={t('dk')} min={0.5} max={5} step={0.5} lo={Math.min(5, wDur)} onChange={(a) => setWDur(a)} fx={readFxSettings(st.settings)} marks={[0.5, 1, 2, 3, 4, 5]} />
              </div>
              <div style={{ marginTop: 8 }}>
                <div className="px-ctl-head">
                  <span className="lbl">{t('YOĞUNLUK')}</span>
                  <span className="px-ctl-hint" style={{ color: WARM_Z_COLORS[wZ - 1] }}>{fightZ(wZ).d}</span>
                </div>
                <div className="px-hz-row" role="radiogroup" aria-label={t('Dövüş yoğunluğu')}>
                  {FIGHT_Z.map((zo: any, i: number) => (
                    <button
                      key={i}
                      type="button"
                      id={'fz-' + (i + 1)}
                      role="radio"
                      aria-checked={wZ === i + 1}
                      className={'px-hz' + (wZ === i + 1 ? ' on' : '')}
                      style={{ '--c': WARM_Z_COLORS[i] } as React.CSSProperties}
                      onClick={() => { pixelFx.unlock(fxRef.current); pixelFx.setLvl(fxRef.current, Math.min(4, i)); setWZ(i + 1); }}
                    >
                      <span className="px-hz-bar"><i style={{ height: 20 + i * 20 + '%' }} /></span>
                      <span className="px-hz-k">{zo.k}</span>
                    </button>
                  ))}
                </div>
              </div>
            </React.Fragment>
          ) : isWarmupEx ? (
            /* V33 · Antrenman öncesi ısınma: yalnızca süre ve nabız skalası (sayı değil, konuşma testi) */
            <React.Fragment>
              <div className="pxb px-alt-stage">
                <span style={{ fontSize: 13, color: 'var(--mt)', lineHeight: 1.35 }}>{t('Kas sıcaklığını ve nabzı yükselt. Hesaplara girmez.')}</span>
              </div>
              <div className="px-wu-dur">
                <PxStair id={'wdur-' + item.id} label={t('Süre')} unit={t('dk')} min={1} max={30} lo={wDur} onChange={(a) => setWDur(a)} fx={readFxSettings(st.settings)} marks={[1, 5, 10, 15, 20, 25, 30]} />
              </div>
              <div style={{ marginTop: 8 }}>
                <div className="px-ctl-head">
                  <span className="lbl">{t('NABIZ')}</span>
                  <span className="px-ctl-hint" style={{ color: WARM_Z_COLORS[wZ - 1] }}>{WARM_Z[wZ - 1].d}</span>
                </div>
                <div className="px-hz-row" role="radiogroup" aria-label={t('Nabız skalası')}>
                  {WARM_Z.map((zo: any, i: number) => (
                    <button
                      key={i}
                      type="button"
                      id={'hz-' + (i + 1)}
                      role="radio"
                      aria-checked={wZ === i + 1}
                      className={'px-hz' + (wZ === i + 1 ? ' on' : '')}
                      style={{ '--c': WARM_Z_COLORS[i] } as React.CSSProperties}
                      onClick={() => { pixelFx.unlock(fxRef.current); pixelFx.setLvl(fxRef.current, Math.min(4, i)); setWZ(i + 1); }}
                    >
                      <span className="px-hz-bar"><i style={{ height: 20 + i * 20 + '%' }} /></span>
                      <span className="px-hz-k">{zo.k}</span>
                    </button>
                  ))}
                </div>
              </div>
            </React.Fragment>
          ) : isPlyoEx || isSkillEx ? (
            /* Pliometrik / Beceri: bugünkü giriş mantığı yeni .px kabuğunda */
            <React.Fragment>
              {isPlyoEx ? (
                <div className={'pxb px-alt-stage' + (lastPlyoQ === 2 ? ' px-warn' : '')}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span className="lbl" style={{ fontSize: 12 }}>{t('YOĞUNLUK')}</span>
                    <strong style={{ fontSize: 14, color: 'var(--gold)' }}>{PLYO_INT[(itemLib && itemLib.int) || 2]}</strong>
                  </div>
                  <div style={{ flex: 1, fontSize: 12, color: 'var(--mt)', lineHeight: 1.3 }}>
                    {lastPlyoQ === 2 ? t('Kalite düştü: dinlenmeyi uzat ya da bitir.') : t('Her tekrarda en yükseğe, en hızlıya.')}
                  </div>
                  <div className="ps-r" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span className="lbl" style={{ fontSize: 11 }}>{t('TEMAS')}</span>
                    <b className="nm" style={{ fontSize: 18, color: totalContacts > 140 ? 'var(--bad)' : 'var(--tx)' }}>{totalContacts}</b>
                  </div>
                </div>
              ) : (
                <div className="pxb px-alt-stage">
                  {matchingGoal && skillStat ? (
                    <span style={{ fontSize: 13 }}>{t('Hedef:')} <strong style={{ color: 'var(--gold)' }}>{SKILL_STAGES[matchingGoal.stage]}</strong> · {t('{n}. pratik', { n: skillStat.n + 1 })}</span>
                  ) : (
                    <span style={{ fontSize: 13, color: 'var(--mt)' }}>{t('Kalite iki set üst üste düşerse bitir.')}</span>
                  )}
                </div>
              )}

              <div className="px-step-row" style={isSkillEx && !itemLib?.h ? { gridTemplateColumns: 'minmax(0, 1fr)' } : undefined}>
                {isPlyoEx ? (
                  <React.Fragment>
                    <div className="pxb px-stepper">
                      <label htmlFor={'kg-' + item.id} className="lbl" style={{ fontSize: 12 }}>{t('EK YÜK (KG)')}</label>
                      <div className="px-stepper-ctrl">
                        <button type="button" className="px-stepper-btn" aria-label={t('Ek yük azalt')} onClick={() => setKgState((v) => Math.max(0, v - 2.5))}>−</button>
                        <input
                          id={'kg-' + item.id}
                          className="px-stepper-in"
                          inputMode="decimal"
                          value={fk(kg)}
                          onChange={(e) => {
                            const n = parseFloat(e.target.value.replace(',', '.'));
                            if (Number.isFinite(n)) setKgState(clamp(n, 0, 500));
                          }}
                        />
                        <button type="button" className="px-stepper-btn" aria-label={t('Ek yük artır')} onClick={() => setKgState((v) => Math.min(500, v + 2.5))}>+</button>
                      </div>
                    </div>
                    <div className="pxb px-stepper">
                      <label htmlFor={'reps-' + item.id} className="lbl" style={{ fontSize: 12 }}>{t('TEMAS')}</label>
                      <div className="px-stepper-ctrl">
                        <button type="button" className="px-stepper-btn" aria-label={t('Temas azalt')} onClick={() => setRepsState((v) => Math.max(1, v - 1))}>−</button>
                        <input
                          id={'reps-' + item.id}
                          className="px-stepper-in"
                          inputMode="numeric"
                          value={String(reps)}
                          onChange={(e) => {
                            const n = parseInt(e.target.value, 10);
                            if (Number.isFinite(n)) setRepsState(clamp(n, 1, 60));
                          }}
                        />
                        <button type="button" className="px-stepper-btn" aria-label={t('Temas artır')} onClick={() => setRepsState((v) => Math.min(60, v + 1))}>+</button>
                      </div>
                    </div>
                  </React.Fragment>
                ) : (
                  <React.Fragment>
                    <div className="pxb px-stepper">
                      <label htmlFor={'reps-' + item.id} className="lbl" style={{ fontSize: 12 }}>{t('DENEME')}</label>
                      <div className="px-stepper-ctrl">
                        <button type="button" className="px-stepper-btn" aria-label={t('Deneme azalt')} onClick={() => setRepsState((v) => Math.max(1, v - 1))}>−</button>
                        <input
                          id={'reps-' + item.id}
                          className="px-stepper-in"
                          inputMode="numeric"
                          value={String(reps)}
                          onChange={(e) => {
                            const n = parseInt(e.target.value, 10);
                            if (Number.isFinite(n)) setRepsState(clamp(n, 1, 30));
                          }}
                        />
                        <button type="button" className="px-stepper-btn" aria-label={t('Deneme artır')} onClick={() => setRepsState((v) => Math.min(30, v + 1))}>+</button>
                      </div>
                    </div>
                    {itemLib?.h ? (
                      <div className="pxb px-stepper">
                        <label htmlFor={'hold-' + item.id} className="lbl" style={{ fontSize: 12 }}>{t('SÜRE (SN)')}</label>
                        <div className="px-stepper-ctrl">
                          <button type="button" className="px-stepper-btn" aria-label={t('Süre azalt')} onClick={() => setHold((v) => Math.max(0, v - 1))}>−</button>
                          <input
                            id={'hold-' + item.id}
                            className="px-stepper-in"
                            inputMode="numeric"
                            value={String(hold)}
                            onChange={(e) => {
                              const n = parseInt(e.target.value, 10);
                              if (Number.isFinite(n)) setHold(clamp(n, 0, 300));
                            }}
                          />
                          <button type="button" className="px-stepper-btn" aria-label={t('Süre artır')} onClick={() => setHold((v) => Math.min(300, v + 1))}>+</button>
                        </div>
                      </div>
                    ) : null}
                  </React.Fragment>
                )}
              </div>

              <div style={{ marginTop: 10 }}>
                <div className="px-ctl-head">
                  <span className="lbl">{isPlyoEx ? t('SON TEKRARLARIN KALİTESİ') : t('KALİTE')}</span>
                  <span className="px-ctl-hint" style={{ color: (isPlyoEx ? PX_PLYO_Q : PX_SKILL_Q)[qQuality].c }}>
                    {(isPlyoEx ? PX_PLYO_Q : PX_SKILL_Q)[qQuality].d}
                  </span>
                </div>
                <div className="px-q-row" role="radiogroup" aria-label={isPlyoEx ? t('Sıçrama kalitesi') : t('Beceri kalitesi')}>
                  {(isPlyoEx ? PX_PLYO_Q : PX_SKILL_Q).map((qOpt, i) => (
                    <button
                      key={i}
                      type="button"
                      id={(isPlyoEx ? 'pq-' : 'sq-') + i}
                      role="radio"
                      aria-checked={qQuality === i}
                      className={'px-q-btn' + (qQuality === i ? ' on' : '')}
                      style={{ '--c': qOpt.c } as React.CSSProperties}
                      onClick={() => setQQuality(i as 0 | 1 | 2)}
                    >
                      {qOpt.k}
                    </button>
                  ))}
                </div>
              </div>
            </React.Fragment>
          ) : (
            /* Kuvvet / Olimpik: Pixel görsel + sürüklemeli barlar */
            <React.Fragment>
              <PixelWeightVisual vis={cfg.vis} eq={itemLib?.eq} kg={kg} kgPop={kgPop} itemName={item.name} />

              {/* Kilo barı */}
              <div className="px-kg-sec">
                <div className="px-ctl-head">
                  <span className="lbl">{t('KİLO')}</span>
                  <span className={'px-kg-inline ' + kgPop}>
                    <span className="num" style={{ fontSize: 20, color: 'var(--tx)' }}>{fk(kg)}</span>
                    <span className="nm" style={{ fontSize: 13, color: 'var(--mt)' }}>KG</span>
                  </span>
                </div>
                <div
                  ref={kgTrackRef}
                  id={'kg-' + item.id}
                  className="ctl pxb px-kg-bar"
                  role="slider"
                  tabIndex={0}
                  aria-label={t('Kilo')}
                  aria-valuemin={cfg.min}
                  aria-valuemax={cfg.max}
                  aria-valuenow={kg}
                  aria-valuetext={t('{x} kilogram', { x: fk(kg) })}
                  onPointerDown={kgDown}
                  onPointerMove={kgMove}
                  onPointerUp={kgUp}
                  onPointerCancel={kgUp}
                  onLostPointerCapture={kgUp}
                  onKeyDown={kgKey}
                >
                  <div
                    style={{
                      position: 'absolute', left: 0, top: 0, bottom: 0, width: trackW,
                      transform: `translateX(${tapeX}px)`,
                      transition: kgDrag ? 'transform .08s linear' : 'transform .24s steps(8)', willChange: 'transform',
                    }}
                  >
                    <div className="fill" style={{ width: thumbX }} />
                    {ticks.map((t) => <i key={t.v} className={'tk ' + t.cls} style={{ left: t.x }} />)}
                    {labels.map((l) => <span key={l.v} className={l.cls} style={{ left: l.x }}>{l.t}</span>)}
                    {prevSet ? <i className="ghost" style={{ left: ghostX }} /> : null}
                    <i className={'thumb ' + kgPop} style={{ left: thumbX }} />
                    <div style={{ position: 'absolute', left: thumbX, bottom: 48, width: 0, height: 0 }}>
                      {burst(P_UP, fxKg).map((p, idx) => (
                        <div key={idx} className="rot" style={{ transform: `rotate(${p.a}deg)` }}>
                          <i className={'pt ' + p.cls} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <span className={'eg' + (edge === -1 ? ' on' : '')} style={{ left: 6 }}>&lt;&lt;</span>
                  <span className={'eg' + (edge === 1 ? ' on' : '')} style={{ right: 6 }}>&gt;&gt;</span>
                  <div className={'fl ' + par(fxMaj, 'flA', 'flB')} />
                </div>
              </div>

              {/* Tekrar barı */}
              <div className="px-rep-sec">
                <div className="px-rep-head">
                  <span className="lbl">{t('TEKRAR')}</span>
                  {!planned ? (
                    <button type="button" id="rep-range" className={'px-sens' + (range ? ' on' : '')} onClick={() => { pixelFx.unlock(fxRef.current); setRangeOpen(true); }}>
                      {range ? <React.Fragment>{t('HEDEF')} <b className="nm">{repTxt(range.lo, range.hi)}</b></React.Fragment> : '+ ' + t('HEDEF ARALIK')}
                    </button>
                  ) : null}
                  <span className={'num px-rep-num ' + repPop}>{reps}</span>
                </div>
                <div
                  id={'reps-' + item.id}
                  className="ctl pxb px-rep-bar"
                  role="slider"
                  tabIndex={0}
                  aria-label={t('Tekrar')}
                  aria-valuemin={1}
                  aria-valuemax={30}
                  aria-valuenow={reps}
                  onPointerDown={repDown}
                  onPointerMove={repMove}
                  onPointerUp={repUp}
                  onPointerCancel={repUp}
                  onLostPointerCapture={repUp}
                  onKeyDown={repKey}
                >
                  <div className="px-rep-segs">
                    {Array.from({ length: 30 }, (_, i) => {
                      const on = i < reps;
                      const top = i === reps - 1;
                      const h = Math.round(14 + (38 * i) / 29);
                      const inRg = range && i + 1 >= range.lo && i + 1 <= range.hi;
                      const cls = 'sg' + ((i + 1) % 5 === 0 ? ' five' : '') + (on ? ' on' : '') + (inRg ? ' rg' : '') + (top ? ' top ' + repPop : '');
                      return <i key={i} className={cls} style={{ height: h }} />;
                    })}
                    <div style={{ position: 'absolute', left: `${((reps - 0.5) / 30) * 100}%`, bottom: Math.round(14 + (38 * (reps - 1)) / 29) + 2, width: 0, height: 0 }}>
                      {burst(P_UP, fxRep).map((p, idx) => (
                        <div key={idx} className="rot" style={{ transform: `rotate(${p.a}deg)` }}>
                          <i className={'pt px-pfire ' + p.cls} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="px-rep-scale" aria-hidden="true">
                  {[1, 5, 10, 15, 20, 25, 30].map((nVal) => (
                    <span key={nVal} className={'sc' + (nVal === reps ? ' cur' : '')} style={{ left: `${((nVal - 0.5) / 30) * 100}%` }}>
                      {nVal}
                    </span>
                  ))}
                </div>
              </div>

              {/* Son tekrarın hızı; solunda ısınma seti (V33) */}
              <div className="px-spd-sec">
                <div className="px-spd-head">
                  <span className="lbl">{warm ? t('ISINMA SETİ') : t('SON TEKRARIN HIZI')}</span>
                  <span className="px-spd-desc" style={{ color: warm ? WARM_Z_COLORS[0] : PX_SPEED_COLORS[lvl] }}>{warm ? t('Kilo, tekrar ve hız hesaplara girmez') : curSp.d}</span>
                </div>
                <div className="px-spd-wrap">
                <button
                  type="button"
                  id="speed-warm"
                  className={'sb wu' + (warm ? ' sel' : '')}
                  aria-pressed={warm}
                  aria-label={t('Isınma seti')}
                  style={{ border: 0, padding: 0, font: 'inherit', color: 'inherit', cursor: 'pointer' }}
                  onClick={() => { pixelFx.unlock(fxRef.current); pixelFx.setLvl(fxRef.current, 0); setWarm((w) => !w); }}
                >
                  <span className="sbl">
                    <svg width="14" height="14" viewBox="0 0 7 7" shapeRendering="crispEdges" aria-hidden="true"><path d="M3 0h1v1H3zM2 1h2v1H2zM2 2h3v1H2zM1 3h5v1H1zM1 4h5v1H1zM2 5h3v1H2zM3 6h1v1H3z" fill="currentColor" /></svg>
                  </span>
                  <span className="sbw"><i className="sbf" style={{ height: '22%', background: WARM_Z_COLORS[0] }} /></span>
                </button>
                <div
                  className="ctl px-spd-row"
                  role="radiogroup"
                  aria-label={t('Son tekrarın hızı')}
                  onPointerDown={lvDown}
                  onPointerMove={lvMove}
                  onPointerUp={lvUp}
                  onPointerCancel={lvUp}
                  onLostPointerCapture={lvUp}
                  onKeyDown={lvKey}
                >
                  {PX_SPEED.map((sp, i) => {
                    const sel = !warm && i === lvl;
                    const fillPct = Math.round((1 - sp.vl) * 100);
                    return (
                      <button
                        key={i}
                        type="button"
                        id={'speed-' + i}
                        role="radio"
                        aria-checked={sel}
                        tabIndex={sel ? 0 : -1}
                        className={'sb' + (sel ? ' sel ' + par(fxLvl, 'popA', 'popB') : '')}
                        style={{ border: 0, padding: 0, font: 'inherit', color: 'inherit', cursor: 'pointer' }}
                        onClick={() => { pixelFx.unlock(fxRef.current); setLvlVal(i); }}
                      >
                        <span className="sbl">{sp.k}</span>
                        <span className="sbw"><i className="sbf" style={{ height: fillPct + '%', background: PX_SPEED_COLORS[i] }} /></span>
                      </button>
                    );
                  })}
                  <div style={{ position: 'absolute', left: `${((lvl + 0.5) / 5) * 100}%`, top: 28, width: 0, height: 0, pointerEvents: 'none' }}>
                    {burst(P_UP, fxLvl).map((p, idx) => (
                      <div key={idx} className="rot" style={{ transform: `rotate(${p.a}deg)` }}>
                        <i className={'pt ' + p.cls} style={{ background: PX_SPEED_COLORS[lvl] }} />
                      </div>
                    ))}
                  </div>
                </div>
                </div>
              </div>

              {/* RPE · 1RM · ROM (V34: RIR yazılmaz, RPE aynı bilgiyi verir) */}
              <div className="px-ro-grid three">
                <div className="ro">
                  <span className="ro-k">RPE</span>
                  <span className="nm ro-v" style={{ color: warm ? 'var(--mt)' : 'var(--tx)' }}>{warm ? '–' : rir >= 5 ? '≤6' : String(10 - rir)}</span>
                </div>
                <div className="ro">
                  <span className="ro-k">1RM</span>
                  <span className={'nm ro-v ' + (e1okLive ? kgPop : '')} style={{ color: e1okLive ? 'var(--gold)' : 'var(--mt)' }} aria-label={e1L && !e1L.ok ? t('yaklaşık {x} kg', { x: fk(e1L.v) }) : undefined}>{e1Live}</span>
                </div>
                <div
                  className={'ro ctl' + (rom < 100 ? ' px-part' : '')}
                  role="slider"
                  tabIndex={0}
                  aria-label={t('Hareket açıklığı (ROM)')}
                  aria-valuemin={10}
                  aria-valuemax={100}
                  aria-valuenow={rom}
                  aria-valuetext={t('yüzde {n}', { n: rom })}
                  onPointerDown={romDown}
                  onPointerMove={romMove}
                  onPointerUp={romUp}
                  onPointerCancel={romUp}
                  onLostPointerCapture={romUp}
                  onKeyDown={romKey}
                >
                  <span className="ro-k">ROM<span style={{ letterSpacing: 0 }}>&lt;&gt;</span></span>
                  <span className={'nm ro-v ' + par(fxRom, 'popA', 'popB')} style={{ color: rom < 100 ? 'var(--gold)' : 'var(--tx)', transformOrigin: '0 100%' }}>
                    {pct(rom)}
                  </span>
                  <span style={{ display: 'flex', gap: 2, height: 4 }}>
                    {Array.from({ length: 10 }, (_, idx) => (
                      <i key={idx} className={'rs' + (idx < Math.round(rom / 10) ? ' on' : '')} />
                    ))}
                  </span>
                </div>
              </div>
            </React.Fragment>
          )}

          <div className="px-spacer" />

          {/* Alt kaydet satırı */}
          <div className="px-actions">
            {rest && !restOpen ? (
              <button type="button" className="px-restbar" onClick={openRest} aria-label={t('Dinlenme sürüyor: sayacı aç')}>
                <span className="px-restbar-l">
                  <span className="lbl" style={{ color: 'var(--gold)' }}>{t('DİNLENİYOR')}</span>
                  <span className="px-restbar-h">{t('dokun: sayacı aç')}</span>
                </span>
                <span className="num px-restbar-t">{restTxt}</span>
                <i style={{ position: 'absolute', left: 0, bottom: 0, height: 6, width: restPct + '%', background: 'var(--gold)' }} />
              </button>
            ) : (
              <button
                ref={logBtnRef}
                type="button"
                id="log-set"
                className={'go' + (isWarmupEx || warm ? ' px-wu' : isFightEx ? ' px-lv' + Math.min(4, wZ - 1) : !isPlyoEx && !isSkillEx ? ' px-lv' + lvl : '')}
                onClick={logSet}
              >
                {isWarmupEx ? t('ISINMA BİTTİ') : isFightEx ? t('RAUND {n} BİTTİ', { n: workN + 1 }) : warm ? t('ISINMA SETİ BİTTİ') : t('SET {n} BİTTİ', { n: workN + 1 })}
              </button>
            )}
            {sets.length ? (
              <HoldButton id="ex-done" className="px-exdone" ms={500} tone="go" onHold={finishEx} aria-label={t('Hareketi bitir (yarım saniye basılı tut)')}>
                {t('HAREKETİ BİTİR')}
              </HoldButton>
            ) : null}
            <div style={{ position: 'absolute', left: '50%', top: 28, width: 0, height: 0, pointerEvents: 'none' }}>
              {burst(P_ALL, fxLog).map((p, idx) => (
                <div key={idx} className="rot" style={{ transform: `rotate(${p.a}deg)` }}>
                  <i className={'pt ' + p.cls} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Büyük dinlenme ekranı (#rest-big) */}
        {rest && restOpen && lastLogged ? (
          <div id="rest-big" className="ov" role="timer" aria-label={t('Dinlenme sayacı')}>
            <div className="pxb" style={{ margin: '3px 3px 0', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6, flex: '0 0 auto' }}>
              <span className="lbl" style={{ color: 'var(--gold)' }}>
                {lastLogged.fight ? t('RAUND {n} BİTTİ', { n: workN }) : lastLogged.warm ? (lastLogged.dur ? t('ISINMA BİTTİ') : t('ISINMA SETİ BİTTİ')) : t('SET {n} BİTTİ', { n: workN })}{!lastLogged.plyo && !lastLogged.skill && !lastLogged.warm && (lastLogged.rom ?? 100) < 100 ? ' · ' + pct(lastLogged.rom) + ' ROM' : ''}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span className="nm" style={{ fontSize: 21, color: 'var(--tx)' }}>
                  {lastLogged.fight
                    ? fightSetTxt(lastLogged)
                    : lastLogged.dur
                    ? warmSetTxt(lastLogged)
                    : lastLogged.warm
                    ? t('ISN')
                    : lastLogged.skill
                    ? skillSetTxt(lastLogged)
                    : lastLogged.plyo
                      ? (Number(lastLogged.kg) ? '+' + fk(Number(lastLogged.kg)) + '×' : '') + t('{n} temas', { n: lastLogged.reps })
                      : `${fk(Number(lastLogged.kg))} × ${lastLogged.reps}`}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'var(--mt)' }}>
                  <i
                    style={{
                      display: 'block',
                      width: 10,
                      height: 10,
                      background: lastLogged.fight
                        ? WARM_Z_COLORS[(Number(lastLogged.z) || 3) - 1]
                        : lastLogged.warm
                        ? WARM_Z_COLORS[0]
                        : lastLogged.plyo
                        ? PX_PLYO_Q[lastLogged.q || 0].c
                        : lastLogged.skill
                          ? PX_SKILL_Q[lastLogged.q || 0].c
                          : PX_SPEED_COLORS[lastLogged.lvl ?? 1],
                    }}
                  />
                  {lastLogged.fight
                    ? t('yorgunluğa girer')
                    : lastLogged.warm
                    ? t('hesaplara girmez')
                    : lastLogged.plyo
                    ? PX_PLYO_Q[lastLogged.q || 0].k
                    : lastLogged.skill
                      ? PX_SKILL_Q[lastLogged.q || 0].k
                      : t('hız: {x}', { x: PX_SPEED[lastLogged.lvl ?? 1].k })}
                </span>
              </span>
            </div>

            <div className="px-rest-mid" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 0 }}>
              <div className="lbl px-rest-lbl" style={{ textAlign: 'center', fontSize: 18, color: 'var(--gold)' }}>{t('DİNLEN')}</div>
              <div
                className="ctl"
                role="slider"
                tabIndex={0}
                aria-label={t('Dinlenme süresi')}
                aria-valuemin={0}
                aria-valuemax={600}
                aria-valuenow={restSec}
                aria-valuetext={restTxt}
                onPointerDown={rtDown}
                onPointerMove={rtMove}
                onPointerUp={rtUp}
                onPointerCancel={rtUp}
                onLostPointerCapture={rtUp}
                onKeyDown={rtKey}
                style={{ position: 'relative', padding: '12px 3px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}
              >
                <span className={'num px-rest-num ' + par(fxRt, 'popA', 'popB')}>{restTxt}</span>
                <span style={{ display: 'flex', gap: 3, width: '100%', height: 18 }}>
                  {restSegs.map((g, idx) => <i key={idx} className={'rs' + (g.on ? ' on' : '')} />)}
                </span>
                <span className="px-rest-hint" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: 13, color: 'var(--mt)' }}>
                  <span>&lt;&lt; -{t('{n} sn', { n: 15 })}</span><span>{t('sürükle')}</span><span>+{t('{n} sn', { n: 15 })} &gt;&gt;</span>
                </span>
                <div style={{ position: 'absolute', left: '50%', top: 44, width: 0, height: 0, pointerEvents: 'none' }}>
                  {burst(P_UP, fxRt).map((p, idx) => (
                    <div key={idx} className="rot" style={{ transform: `rotate(${p.a}deg)` }}>
                      <i className={'pt ' + p.cls} />
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 14, padding: '0 4px' }}>
                <button type="button" className="bb" aria-label={t('15 saniye azalt')} onClick={() => { pixelFx.unlock(fxRef.current); adjustRest(-15); }}>-{t('15 SN')}</button>
                <button type="button" className="bb" aria-label={t('15 saniye ekle')} onClick={() => { pixelFx.unlock(fxRef.current); adjustRest(15); }}>+{t('15 SN')}</button>
              </div>
              <div style={{ textAlign: 'center', fontSize: 14, color: 'var(--mt)' }}>
                {isFightEx ? t('sıradaki: RAUND {n}', { n: workN + 1 }) : t('sıradaki: SET {n}', { n: workN + 1 })} · {isFightEx ? fightSetTxt({ dur: wDur, z: wZ }) : isWarmupEx ? warmSetTxt({ dur: wDur, z: wZ }) : isSkillEx ? t('{n} deneme', { n: reps }) : `${fk(kg)} kg`}
              </div>
            </div>

            {/* V34 · bu setin özelliği: dinlenirken sorulur, kaydedilen sete yazılır */}
            {!lastLogged.warm ? (() => {
              const tags: string[] = lastLogged.tags || [];
              const has = tags.length > 0 || !!lastLogged.note;
              return (
                <button type="button" id="set-attr-btn" className={'px-attr-ask' + (has ? ' has' : '')} onClick={() => openAttr(sets.length - 1)}>
                  <span className="q">{has ? [...tags.map((x) => t(x)), lastLogged.note || ''].filter(Boolean).join(' · ') : t('Bu sette özel bir durum var mı?')}</span>
                  <b className="nm">{has ? t('DÜZENLE') : '+ ' + t('EKLE')}</b>
                </button>
              );
            })() : null}

            <div className="px-actions">
              <button type="button" className="bb" onClick={hideRest}>{t('GİZLE')}</button>
              <button type="button" className="go" onClick={skipRest}>{t('GEÇ')}</button>
            </div>
          </div>
        ) : null}

        {/* Set ayrıntısı penceresi */}
        {sx != null && selIdx != null ? (
          <React.Fragment>
            <button type="button" className="bd" onClick={closeSel} aria-label={t('Pencereyi kapat')} />
            <div className="win" role="dialog" aria-label={t('Set ayrıntısı')}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="lbl" style={{ color: 'var(--gold)', fontSize: 15 }}>{sx.warm ? t('ISINMA') : sx.fight ? <React.Fragment>{t('RAUND')} {selIdx + 1}</React.Fragment> : <React.Fragment>{t('SET')} {sets.slice(0, selIdx + 1).filter((z: any) => !z.warm).length}</React.Fragment>}</span>
                <span style={{ fontSize: 13, color: 'var(--mt)' }}>
                  {sx.warm ? '' : sx.fight ? t('dövüş') : sx.skill ? t('beceri') : sx.plyo ? t('pliometrik') : mult === 2 ? t('tek el kilo') : lower(eqLabel(itemLib?.eq))}
                </span>
              </div>

              {sx.fight ? (
                <React.Fragment>
                  <div className="num" style={{ fontSize: 20, lineHeight: 1.2 }}>{fightSetTxt(sx)}</div>
                  <div style={{ fontSize: 13, color: 'var(--mt)' }}>{fightZ(sx.z).d + ' · ' + t('Zor sete ve tonaja girmez, yorgunluğa girer.') + ' · ' + clock(sx.at)}</div>
                </React.Fragment>
              ) : sx.warm ? (
                <React.Fragment>
                  <div className="num" style={{ fontSize: 20, lineHeight: 1.2 }}>{sx.dur ? warmSetTxt(sx) : t('ISN')}</div>
                  <div style={{ fontSize: 13, color: 'var(--mt)' }}>{(sx.dur ? t('Antrenman öncesi ısınma') : t('Isınma seti')) + ' · ' + t('1RM, yorgunluk, zor set, tonaj ve gelişime girmez.') + ' · ' + clock(sx.at)}</div>
                </React.Fragment>
              ) : sx.skill ? (
                <React.Fragment>
                  <div className="num" style={{ fontSize: 20, lineHeight: 1.2 }}>{skillSetTxt(sx)}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                    <div className="cell"><span className="k">{t('KALİTE')}</span><span className="v" style={{ color: PX_SKILL_Q[sx.q || 0].c }}>{PX_SKILL_Q[sx.q || 0].k}</span></div>
                    <div className="cell"><span className="k">{t('SÜRE')}</span><span className="v">{Number(sx.hold) > 0 ? t('{n} sn', { n: fk(Number(sx.hold)) }) : '–'}</span></div>
                    <div className="cell"><span className="k">{t('YORGUNLUK')}</span><span className="v">{fk(Math.round(sx.reps * SKILL_W[(itemLib && itemLib.fat) || 1] * 100) / 100)}</span></div>
                    <div className="cell"><span className="k">{t('SAAT')}</span><span className="v">{clock(sx.at)}</span></div>
                  </div>
                </React.Fragment>
              ) : sx.plyo ? (
                <React.Fragment>
                  <div className="num" style={{ fontSize: 20, lineHeight: 1.2 }}>
                    {t('{n} temas', { n: sx.reps })}{Number(sx.kg) ? ` · +${fk(Number(sx.kg))} kg` : ''}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                    <div className="cell"><span className="k">{t('KALİTE')}</span><span className="v" style={{ color: PX_PLYO_Q[sx.q || 0].c }}>{PX_PLYO_Q[sx.q || 0].k}</span></div>
                    <div className="cell"><span className="k">{t('YOĞUNLUK')}</span><span className="v">{PLYO_INT[(itemLib && itemLib.int) || 2].split(' ')[0]}</span></div>
                    <div className="cell"><span className="k">{t('YORGUNLUK')}</span><span className="v">{fk(Math.round(sx.reps * PLYO_W[(itemLib && itemLib.int) || 2] * 100) / 100)}</span></div>
                    <div className="cell"><span className="k">{t('SAAT')}</span><span className="v">{clock(sx.at)}</span></div>
                  </div>
                </React.Fragment>
              ) : (
                (() => {
                  const sLvl = sx.lvl ?? 1;
                  const sSp = PX_SPEED[sLvl] || PX_SPEED[1];
                  const sRir = sx.rir ?? sSp.rir;
                  const sRom = sx.rom ?? 100;
                  const sE = setE1(sx);
                  const sOk = !!(sE && sE.ok);
                  const sE1 = sE ? (sOk ? '' : '≈') + fk(sE.v) + ' kg' : '—';
                  const noE1Reason = sOk ? '' : !sE ? t('kilo 0') : sRir > 4 ? t('RIR 4 üstü') : sx.reps + sRir > 12 ? t('tekrar + RIR 12 üstü') : t('ROM {p} altı', { p: pct(90) });
                  const sTon = num(Math.round(Number(sx.kg) * sx.reps * mult)) + ' kg';
                  return (
                    <React.Fragment>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
                        <span className="num" style={{ fontSize: 24, lineHeight: 1, color: 'var(--tx)' }}>{fk(Number(sx.kg))} × {sx.reps}</span>
                        <span style={{ fontSize: 13, color: 'var(--mt)', paddingBottom: 2 }}>{t('kg × tekrar')}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                        <div className="cell"><span className="k">{t('HIZ')}</span><span className="v" style={{ color: PX_SPEED_COLORS[sLvl] }}>{sSp.k}</span></div>
                        <div className="cell"><span className="k">{t('TONAJ')}</span><span className="v" style={{ color: 'var(--gold)' }}>{sTon}</span></div>
                        <div className="cell"><span className="k">RPE</span><span className="v">{rpeForSet(sx)}</span></div>
                        <div className="cell"><span className="k">1RM</span><span className="v" style={{ color: sOk ? 'var(--gold)' : 'var(--mt)' }}>{sE1}</span></div>
                        <div className="cell"><span className="k">ROM</span><span className="v" style={{ color: sRom < 100 ? 'var(--gold)' : 'var(--tx)' }}>{pct(sRom)}</span></div>
                        <div className="cell"><span className="k">{t('SAAT')}</span><span className="v">{clock(sx.at)}</span></div>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--mt)' }}>
                        {sSp.d}
                        {mult === 2 ? ' · ' + t('tonaj iki el') : ''}
                        {sE && !sOk ? ' · ' + t('1RM yaklaşık, gelişime girmez: {x}', { x: noE1Reason }) : !sE ? ' · ' + t('e1RM yok: {x}', { x: noE1Reason }) : ''}
                      </div>
                    </React.Fragment>
                  );
                })()
              )}

              {sx.tags && sx.tags.length ? (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {sx.tags.map((tag: string) => <span key={tag} className="chp" style={{ color: 'var(--gold)' }}>{t(tag)}</span>)}
                </div>
              ) : null}
              {sx.note ? <div style={{ fontSize: 13, color: 'var(--gold)' }}>{sx.note}</div> : null}

              <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
                <HoldButton
                  id="set-del"
                  className="px-fchip"
                  style={{ height: 48, color: 'var(--bad)' }}
                  onHold={() => {
                    const idxToDel = selIdx;
                    mutate((ns) => { ns.items[cur].sets.splice(idxToDel, 1); });
                    closeSel();
                  }}
                >
                  {t('Seti sil')}
                </HoldButton>
                {!sx.warm ? (
                  <button type="button" id="set-attr-edit" className="px-fchip" style={{ height: 48 }} onClick={() => { const i = selIdx; closeSel(); openAttr(i); }}>
                    {sx.tags && sx.tags.length ? t('Özelliği düzenle') : '+ ' + t('Özellik ekle')}
                  </button>
                ) : null}
              </div>

              <div style={{ display: 'flex' }}>
                <button type="button" className="bb" onClick={closeSel}>{t('KAPAT')}</button>
              </div>
            </div>
          </React.Fragment>
        ) : null}

        {rangeOpen && item ? <RangeWin it={item} reps={reps} fx={readFxSettings(st.settings)} onSave={(next: any) => saveRange(item, next)} onClose={() => setRangeOpen(false)} /> : null}
        {renderToast()}
        {renderFx()}
        {renderConfirmModal()}
        <div className={'fl ' + par(fxReady, 'flA', 'flB')} />
      </div>
    </div>
  );
};
