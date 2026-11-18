// @ts-nocheck
import React from 'react';
import { bestE1, isPlyo, isSkill, sessionStats } from './core';
import { dbMultiplier } from '../../lib/models/session';
import { fatigueAt, recoveryHours, sessionFatigue } from '../../lib/models/fatigue';
import { advanceSkillStage, matchesSkillGoal, readGoals } from '../bugun/goals';
import { useBack } from '../../app/back';
import { fk, hms, PX_SPEED_COLORS } from './pixelHelpers';
import { readFxSettings } from '../../lib/native/fx';
import { HoldButton } from '../../app/HoldButton';
import { num, t, upper } from '../../i18n';
import { exName } from '../../i18n/names';

interface Props {
  session: any;
  st: any;
  put: (kind: string, obj: any) => void;
  del: (kind: string, id: string) => void;
  openSheet: (type: string, props: any) => void;
  onDone: () => void;
}

export const PixelSummaryScreen: React.FC<Props> = ({ session, st, put, del, openSheet, onDone }) => {
  useBack(true, onDone);

  const ss = sessionStats(session);
  const all = st.sessions.some((x: any) => x.id === session.id)
    ? st.sessions.map((x: any) => (x.id === session.id ? session : x))
    : [session, ...st.sessions];
  const sf = sessionFatigue(session, { ...st, sessions: all });
  const endTs = session.endedAt || Date.now();
  const fzPost = fatigueAt(st, endTs, all);
  const recH = recoveryHours(fzPost.sum);
  const postScore = Math.round(sf.post ?? fzPost.score);
  const preScore = Math.round(sf.pre ?? 0);

  const fatC = postScore < 40 ? PX_SPEED_COLORS[0] : postScore < 70 ? PX_SPEED_COLORS[2] : PX_SPEED_COLORS[4];
  const fatLbl = postScore < 40 ? t('Yönetilebilir') : postScore < 70 ? t('Birikiyor') : t('Yüksek');
  const fatSegs = Array.from({ length: 25 }, (_, k) => {
    const threshold = (k + 0.5) * 4;
    const c = threshold <= postScore
      ? (threshold < 40 ? PX_SPEED_COLORS[0] : threshold < 70 ? PX_SPEED_COLORS[2] : PX_SPEED_COLORS[4])
      : 'var(--dim)';
    return { c };
  });

  const goals = readGoals(st.settings);
  const matchingSkillGoals = goals.filter(
    (g) => g.type === 'skill' && session.items.some((it: any) => it.sets.length > 0 && matchesSkillGoal(g, it))
  );
  const advanceGoal = (id: string) => {
    const next = advanceSkillStage(goals, id);
    put('settings', { key: 'goals', value: next });
    if (st.settings.some((x: any) => x.key === 'goal')) del('settings', 'goal');
  };

  const notes: string[] = [];
  session.items.forEach((it: any) => {
    if (it.memo) notes.push(exName(it) + ': ' + it.memo);
    it.sets.forEach((x: any, j: number) => {
      if (x.note || (x.tags && x.tags.length)) {
        notes.push(exName(it) + ' · ' + t('set {n}', { n: j + 1 }) + ': ' + [x.tags ? x.tags.map((tag: string) => t(tag)).join(', ') : '', x.note || ''].filter(Boolean).join(' · '));
      }
    });
  });

  const itemsWithSets = session.items.filter((it: any) => it.sets.length > 0);

  return (
    <div id="pixel-summary" className={'screen px night' + (readFxSettings(st.settings).motion ? ' px-motion' : '')} aria-label={t('Antrenman özeti')}>
      <div className="px-scr">
        <div style={{ height: 52, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2, padding: '0 3px', flex: '0 0 auto' }}>
          <span style={{ fontSize: 21, fontWeight: 700, letterSpacing: '.04em', lineHeight: 1.1, color: 'var(--gold)' }}>{t('İDMAN BİTTİ')}</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--mt)', letterSpacing: '.08em' }}>{upper(t('Plansız antrenman'))} · {t('ÖZET')}</span>
        </div>

        <div className="px-scroll" style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', marginTop: 8, padding: '4px 3px 8px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
            <div className="cell"><span className="k">{t('SÜRE')}</span><span className="v" style={{ color: 'var(--tx)' }}>{hms(Math.round(ss.dur / 1000))}</span></div>
            <div className="cell"><span className="k">{t('TONAJ')}</span><span className="v" style={{ color: 'var(--gold)' }}>{num(Math.round(ss.tonnage))} kg</span></div>
            <div className="cell"><span className="k">{t('HAREKET')}</span><span className="v" style={{ color: 'var(--tx)' }}>{itemsWithSets.length}</span></div>
            <div className="cell"><span className="k">{t('SET · ZOR SET')}</span><span className="v" style={{ color: 'var(--tx)' }}>{ss.sets.length} · {ss.hard.length}</span></div>
          </div>

          <div className="pxb" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span className="lbl">{t('YORGUNLUK')}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: fatC }}>{fatLbl}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
                <span className="num" style={{ fontSize: 40, lineHeight: 1, color: fatC }}>{postScore}</span>
                <span style={{ fontSize: 15, color: 'var(--mt)', paddingBottom: 2 }}>/ 100</span>
              </div>
              <span className="nm" style={{ fontSize: 14, color: 'var(--mt)' }}>{t('önce {a} → sonra {b}', { a: preScore, b: postScore })}</span>
            </div>
            <div className="zb">
              {fatSegs.map((z, idx) => <i key={idx} style={{ background: z.c }} />)}
              <span className="zm" style={{ left: '40%' }} />
              <span className="zm" style={{ left: '70%' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--mt)' }}>
              <span>0</span><span>40</span><span>70</span><span>100</span>
            </div>
            <div style={{ fontSize: 15, color: 'var(--tx)' }}>
              {t('Toparlanma:')} <span className="nm" style={{ fontSize: 17, color: 'var(--gold)' }}>{recH > 0 ? t('~{n} saat', { n: Math.round(recH) }) : t('hemen hazır')}</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--mt)', lineHeight: 1.35 }}>
              {t('Zor setler (RIR ≤ 4) × yakınlık × hareket maliyeti. Uyku ve önceki günler Dashboard’daki toplam skora eklenir.')}
            </div>
          </div>

          <span className="lbl" style={{ padding: '0 3px' }}>{t('HAREKETLER')}</span>
          {itemsWithSets.map((it: any) => {
            const mult = dbMultiplier(it.exId, it.name);
            const skill = isSkill(it.exId) || it.sets.some((z: any) => z.skill);
            const plyo = isPlyo(it.exId) || it.sets.some((z: any) => z.plyo);
            const ton = it.sets.reduce((a: number, x: any) => a + (x.plyo || x.skill ? 0 : (Number(x.kg) || 0) * x.reps * mult), 0);
            const best = bestE1(it.sets);
            const rightStat = skill
              ? t('{n} deneme', { n: it.sets.reduce((a: number, z: any) => a + z.reps, 0) })
              : plyo
                ? t('{n} temas', { n: it.sets.reduce((a: number, z: any) => a + z.reps, 0) })
                : num(Math.round(ton)) + ' kg';
            return (
              <div key={it.id} className="pxb" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--tx)' }}>{exName(it)}</span>
                <span style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 14, color: 'var(--mt)' }}>
                  <span>{t('{n} set', { n: it.sets.length })}</span>
                  <span>{rightStat}</span>
                </span>
                {!skill && !plyo ? (
                  <span style={{ fontSize: 14, color: 'var(--mt)' }}>
                    {t('en iyi e1RM:')} <span className="nm" style={{ fontSize: 16, color: 'var(--gold)' }}>{best ? fk(Math.round(best * 2) / 2) + ' kg' : '—'}</span>
                  </span>
                ) : null}
              </div>
            );
          })}

          {matchingSkillGoals.map((g) => {
            const cleanAttempts = session.items
              .filter((it: any) => matchesSkillGoal(g, it))
              .flatMap((it: any) => it.sets)
              .filter((z: any) => (z.q || 0) === 0)
              .reduce((a: number, z: any) => a + Number(z.reps || 0), 0);
            return (
              <div key={g.id} className="pxb" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ fontSize: 14 }}><strong>{exName({ exId: g.exId, name: g.name })}</strong> · <span className="nm">{t('{n} temiz deneme', { n: cleanAttempts })}</span></span>
                {g.stage < 3 ? (
                  <button type="button" className="px-fchip on" style={{ height: 36 }} onClick={() => advanceGoal(g.id)}>{t('Aşamayı ilerlet')}</button>
                ) : (
                  <span style={{ fontSize: 13, color: 'var(--ok)', fontWeight: 700 }}>{t('Öğrenildi ✓')}</span>
                )}
              </div>
            );
          })}

          {notes.length > 0 ? (
            <div className="pxb" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span className="lbl">{t('NOTLAR')}</span>
              {notes.map((line, i) => <span key={i} style={{ fontSize: 13, color: 'var(--mt)' }}>{line}</span>)}
            </div>
          ) : null}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
            <button type="button" id="save-tmpl" className="px-fchip on" style={{ height: 44, padding: '0 14px', fontSize: 14 }} onClick={() => openSheet('saveTemplate', { session })}>
              + {t('Plan olarak kaydet')}
            </button>
            <HoldButton id="sum-del" className="px-fchip" style={{ height: 48, color: 'var(--bad)' }} onHold={() => { del('sessions', session.id); onDone(); }}>{t('Kaydı sil')}</HoldButton>
          </div>
        </div>

        <div className="px-actions" style={{ marginTop: 10 }}>
          <button type="button" id="summary-done" className="go" onClick={onDone}>{t('TAMAM')}</button>
        </div>
      </div>
    </div>
  );
};
