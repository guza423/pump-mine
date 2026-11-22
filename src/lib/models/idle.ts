// V32 · Unutulan antrenman: başlamış bir antrenmanda 10 dk hiç giriş yoksa "Hâlâ orada mısın?" bildirimi ve
// titreşim; ardından 5 dk içinde cevap gelmezse antrenman kendiliğinden biter ve kayıtta bu belirtilir.
// Saf işlevler; zamanlayıcı ve bildirim `src/features/antrenman/idleWatch.ts`.

export const IDLE_ASK_MS = 10 * 60_000;
export const IDLE_END_MS = 5 * 60_000;

type IdleSet = { at?: number };
type IdleSession = {
  id: string;
  status: string;
  ready?: boolean;
  startedAt: number;
  rest?: { start: number; total: number } | null;
  items: Array<{ sets: IdleSet[] }>;
};

/** Son gerçek etkinlik: başlangıç, son set ya da ekrana son dokunuş. Bitiş saati olarak bu yazılır. */
export function lastActivity(s: IdleSession, lastInput?: number | null): number {
  let last = Number(s.startedAt) || 0;
  for (const it of s.items || []) for (const x of it.sets || []) if (Number(x.at) > last) last = Number(x.at);
  if (lastInput && lastInput > last) last = lastInput;
  return last;
}

/** Bekleme sayacının başladığı an: dinlenme sayacı sürerken kullanıcı beklemekte haklıdır, sayaç dinlenme bitince başlar. */
export function idleFrom(s: IdleSession, lastInput?: number | null): number {
  const last = lastActivity(s, lastInput);
  const r = s.rest;
  return r ? Math.max(last, Number(r.start) + Number(r.total) * 1000) : last;
}

export type IdleState = 'off' | 'ok' | 'ask' | 'end';

export function idleState(s: IdleSession | null | undefined, lastInput: number | null | undefined, now: number): IdleState {
  if (!s || s.status !== 'active' || s.ready) return 'off';
  const idle = now - idleFrom(s, lastInput);
  if (idle >= IDLE_ASK_MS + IDLE_END_MS) return 'end';
  if (idle >= IDLE_ASK_MS) return 'ask';
  return 'ok';
}

export const hasSets = (s: IdleSession) => (s.items || []).some((it) => (it.sets || []).length > 0);

/** Kendiliğinden bitirme. Set yoksa kayıt açılmaz: oturum "hazır" durumuna döner (süre durur, seçilen hareketler kalır). */
export function autoEnded<T extends IdleSession>(s: T, lastInput: number | null | undefined, now: number): T & { autoEnd?: { at: number; last: number } } {
  const ns = JSON.parse(JSON.stringify(s));
  delete ns.rest;
  if (!hasSets(s)) {
    ns.ready = true;
    ns.startedAt = now;
    return ns;
  }
  const last = lastActivity(s, lastInput);
  ns.status = 'done';
  ns.endedAt = last;
  delete ns.ready;
  ns.autoEnd = { at: now, last };
  return ns;
}
