// Basılı tutunca çalışan düğme: silmeler 1 sn, bitirmeler 0,5 sn.
// Basılıyken düğmenin içi soldan sağa dolar; erken bırakılırsa iptal olur ve "basılı tut" ipucu yanıp söner.
// Klavye / ekran okuyucu ile etkinleştirme (click.detail === 0) basılı tutmadan çalışır.
import React, { useEffect, useRef, useState } from 'react';

type Props = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> & {
  ms?: number;
  onHold: () => void;
  hint?: string | null;
  tone?: 'danger' | 'go';
};

export function HoldButton({ ms = 1000, onHold, hint = 'basılı tut', tone = 'danger', className, style, children, disabled, ...rest }: Props) {
  const [on, setOn] = useState(false);
  const [nudge, setNudge] = useState(false);
  const t = useRef(0);
  const nt = useRef(0);
  const t0 = useRef(0);
  const fired = useRef(false);
  useEffect(() => () => { clearTimeout(t.current); clearTimeout(nt.current); }, []);

  const buzz = (p: number | number[]) => { try { if (navigator.vibrate) navigator.vibrate(p); } catch { /* yok say */ } };
  const start = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled || e.button !== 0) return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* yok say */ }
    fired.current = false;
    t0.current = Date.now();
    setOn(true);
    setNudge(false);
    buzz(8);
    clearTimeout(t.current);
    t.current = window.setTimeout(() => {
      t.current = 0;
      fired.current = true;
      setOn(false);
      buzz([20, 40, 30]);
      onHold();
    }, ms);
  };
  const stop = () => {
    if (!t.current) return;
    clearTimeout(t.current);
    t.current = 0;
    setOn(false);
    if (!fired.current) {
      setNudge(true);
      clearTimeout(nt.current);
      nt.current = window.setTimeout(() => setNudge(false), 900);
    }
  };
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled}
      className={(className ? className + ' ' : '') + 'px-hold ' + tone + (on ? ' on' : '') + (nudge ? ' nudge' : '')}
      style={{ ...style, ['--hold' as string]: ms + 'ms' }}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerCancel={stop}
      onLostPointerCapture={stop}
      onContextMenu={(e) => e.preventDefault()}
      onClick={(e) => { if (e.detail === 0 && !disabled) onHold(); }}
    >
      <span className="px-hold-fill" aria-hidden="true" />
      <span className="px-hold-lbl">
        <span className="px-hold-t">{children}</span>
        {hint ? <small className="px-hold-hint" aria-hidden="true">{hint}</small> : null}
      </span>
    </button>
  );
}
