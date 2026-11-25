// V32 · Unutulan antrenman bekçisi. Başlamış (hazır değil) bir antrenman açıkken uygulamadaki her dokunuş ve tuş
// "giriş" sayılır. Son girişten (dinlenme sürüyorsa dinlenme bitişinden) 10 dk sonra telefon bildirimi + titreşim
// ve uygulama içinde "Hâlâ orada mısın?"; 5 dk daha cevap yoksa antrenman son giriş saatinde bitirilir ve kayda
// `autoEnd` yazılır. Uygulama arka plandayken bildirimleri Android alarmı çıkarır; kayıt uygulama öne gelince
// (ya da açılınca) kapanır. Öne gelmek, 15 dk dolmadıysa cevap sayılır.
import { useEffect, useRef, useState } from 'react';
import { IDLE_ASK_MS, IDLE_END_MS, autoEnded, hasSets, idleFrom, idleState, lastActivity } from '../../lib/models/idle';
import { fatigueAt } from '../../lib/models/fatigue';
import { armIdle, focusResumedByApp, stopIdle } from '../../lib/native/restTimer';
import { pixelFx, readFxSettings } from '../../lib/native/fx';
import { clock, t } from '../../i18n';

const KEY = 'outmove.idle';
type Stored = { sid: string; at: number };

export function readLastInput(sid: string): number | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null') as Stored | null;
    return v && v.sid === sid && Number.isFinite(v.at) ? v.at : null;
  } catch { return null; }
}
function writeLastInput(sid: string, at: number) {
  try { localStorage.setItem(KEY, JSON.stringify({ sid, at })); } catch { /* yer yoksa son set saati yeter */ }
}
function clearLastInput() {
  try { localStorage.removeItem(KEY); } catch { /* yok */ }
}


/** Bitirilmiş oturum belgesi (FreePixelSession.finish ile aynı yorgunluk kaydı). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function closeIdleSession(st: any, s: any, lastInput: number | null, now: number) {
  const ns = autoEnded(s, lastInput, now);
  if (ns.status === 'done') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const all = [ns, ...st.sessions.filter((x: any) => x.id !== ns.id)];
    const pre = Math.round(fatigueAt(st, ns.startedAt - 1, all).score);
    const post = Math.round(fatigueAt(st, ns.endedAt, all).score);
    (ns as typeof ns & { fatigue: unknown }).fatigue = { v: 2, pre, post };
  }
  return ns;
}

export interface IdleAsk { sid: string; from: number; last: number }
export interface IdleNotice { kind: 'done' | 'ready'; last: number; id: string; n: number }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useIdleWatch(active: any, st: any, put: (kind: string, obj: any) => void, onEnded: (ns: any) => void) {
  const [ask, setAsk] = useState<IdleAsk | null>(null);
  const [notice, setNotice] = useState<IdleNotice | null>(null);
  const ref = useRef({ active, st, put, onEnded });
  ref.current = { active, st, put, onEnded };
  const armed = useRef<{ sid: string; from: number; sets: boolean } | null>(null);
  const cleaned = useRef(false);
  const lastWrite = useRef(0);
  const askedFor = useRef<string | null>(null);

  const arm = (s: { id: string }, from: number) => {
    const sets = hasSets(s as never);
    const a = armed.current;
    if (a && a.sid === s.id && a.sets === sets && Math.abs(a.from - from) < 20_000) return;
    armed.current = { sid: s.id, from, sets };
    const last = lastActivity(s as never, readLastInput(s.id));
    void armIdle({
      askAt: from + IDLE_ASK_MS,
      endAt: from + IDLE_ASK_MS + IDLE_END_MS,
      askTitle: t('Hâlâ orada mısın?'),
      askBody: t('10 dakikadır giriş yok. 5 dakika içinde dönmezsen antrenman kendiliğinden biter.'),
      endTitle: sets ? t('Antrenman kendiliğinden bitti') : t('Antrenman süresi durdu'),
      endBody: sets ? t('15 dakika giriş olmadı. Bitiş saati son girişin saati: {h}.', { h: clock(last) }) : t('Set kaydı yoktu; antrenman hazır bekliyor.'),
    });
  };
  const disarm = () => {
    if (!armed.current) return;
    armed.current = null;
    void stopIdle();
  };

  const finalize = (s: { id: string }, now: number) => {
    const { st: cur, put: p, onEnded: done } = ref.current;
    const li = readLastInput(s.id);
    const ns = closeIdleSession(cur, s, li, now);
    p('sessions', ns);
    clearLastInput();
    disarm();
    setAsk(null);
    askedFor.current = null;
    setNotice((prev) => ({ kind: ns.status === 'done' ? 'done' : 'ready', last: lastActivity(s as never, li), id: ns.id, n: (prev ? prev.n : 0) + 1 }));
    if (ns.status === 'done') done(ns);
  };

  const evaluate = (now = Date.now()) => {
    const s = ref.current.active;
    if (!s || s.ready || s.status !== 'active') { setAsk(null); askedFor.current = null; disarm(); return 'off'; }
    const li = readLastInput(s.id);
    const state = idleState(s, li, now);
    if (state === 'end') { finalize(s, now); return state; }
    if (state === 'ask') {
      if (askedFor.current !== s.id + ':' + idleFrom(s, li)) {
        askedFor.current = s.id + ':' + idleFrom(s, li);
        setAsk({ sid: s.id, from: idleFrom(s, li), last: lastActivity(s, li) });
        const fx = readFxSettings(ref.current.st.settings);
        pixelFx.unlock(fx);
        pixelFx.chime(fx);
        pixelFx.buzz({ ...fx, haptic: true }, [500, 200, 500, 200, 500]);
      }
    }
    arm(s, idleFrom(s, li));
    return state;
  };

  // Giriş: dokunuş ya da tuş. Kayıt en çok 5 sn'de bir; bildirim alarmı ancak 20 sn'den fazla kayınca yeniden kurulur.
  const touch = (now = Date.now(), force = false) => {
    const s = ref.current.active;
    if (!s || s.ready || s.status !== 'active') return;
    if (!force && now - lastWrite.current < 5000) return;
    lastWrite.current = now;
    writeLastInput(s.id, now);
    arm(s, idleFrom(s, now));
  };

  useEffect(() => {
    const onInput = () => touch();
    // Öne gelince önce durum değerlendirilir (15 dk dolduysa biter); dolmadıysa bu bir cevaptır.
    // Dinlenme sayacının arka planda biten durumu önce temizlesin diye kısa bir gecikme.
    let resumeT: ReturnType<typeof setTimeout> | null = null;
    const onVis = () => {
      if (document.visibilityState !== 'visible') return;
      if (resumeT) clearTimeout(resumeT);
      resumeT = setTimeout(() => {
        const state = evaluate();
        // V37: 2 dk kuralıyla kendiliğinden açılış cevap sayılmaz (yoksa unutulan idman hiç bitmezdi).
        if (state === 'ok' || state === 'ask') void focusResumedByApp().then((auto) => { if (!auto) touch(Date.now(), true); });
      }, 1200);
    };
    window.addEventListener('pointerdown', onInput, true);
    window.addEventListener('keydown', onInput, true);
    document.addEventListener('visibilitychange', onVis);
    const iv = setInterval(() => evaluate(), 15_000);
    return () => {
      window.removeEventListener('pointerdown', onInput, true);
      window.removeEventListener('keydown', onInput, true);
      document.removeEventListener('visibilitychange', onVis);
      clearInterval(iv);
      if (resumeT) clearTimeout(resumeT);
    };
  }, []);

  // Oturum değişince (set, dinlenme, başlama, bitiş) yeniden değerlendir; açılışta bekleyen 15 dk burada kapanır.
  const sig = active ? `${active.id}|${active.status}|${active.ready ? 1 : 0}|${active.startedAt}|${active.rest ? active.rest.start : 0}|${active.items.reduce((a: number, it: { sets: unknown[] }) => a + it.sets.length, 0)}` : '';
  useEffect(() => {
    if (!active) {
      setAsk(null); askedFor.current = null;
      // Başka cihazda ya da önceki açılışta kurulmuş eski alarm kalmasın (bir kez).
      if (armed.current || !cleaned.current) { cleaned.current = true; armed.current = null; void stopIdle(); }
      return;
    }
    evaluate();
  }, [sig]);

  const stay = () => {
    setAsk(null);
    touch(Date.now(), true);
  };
  const endNow = () => {
    const s = ref.current.active;
    const a = ask;
    setAsk(null);
    if (!s || !a) return;
    // "Bitir": antrenman pencere açılmadan önceki son girişte bitmişti; bitiş saati odur (pencereye dokunmak
    // giriş sayılsa da). Kendiliğinden bitirme işareti yazılmaz: kullanıcı kendisi bitirdi.
    const { st: cur, put: p, onEnded: done } = ref.current;
    const ns = closeIdleSession(cur, s, a.last, Date.now());
    if (ns.status === 'done') delete (ns as { autoEnd?: unknown }).autoEnd;
    p('sessions', ns);
    clearLastInput();
    disarm();
    askedFor.current = null;
    if (ns.status === 'done') done(ns);
  };
  return { ask, stay, endNow, notice, clearNotice: () => setNotice(null) };
}
