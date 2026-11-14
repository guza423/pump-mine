import { useEffect, useRef, useState } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export function createBackStack() {
  const handlers: Array<() => void> = [];
  return {
    push(handler: () => void) {
      handlers.push(handler);
      return () => { const i = handlers.indexOf(handler); if (i >= 0) handlers.splice(i, 1); };
    },
    dispatch() { const last = handlers.at(-1); if (!last) return false; last(); return true; },
  };
}
export const backStack = createBackStack();

export function useBack(active: boolean, handler: () => void) {
  const latest = useRef(handler);
  latest.current = handler;
  useEffect(() => active ? backStack.push(() => latest.current()) : undefined, [active]);
}

export function createExitGuard(toast: () => void, exit: () => void, now = Date.now) {
  let deadline = 0;
  return {
    reset() { deadline = 0; },
    press() {
      const at = now();
      if (deadline && at < deadline) { deadline = 0; exit(); }
      else { deadline = at + 2000; toast(); }
    },
  };
}

export function useAndroidBack(tab: string, goToday: () => void) {
  const [toast, setToast] = useState(false);
  const latest = useRef({ tab, goToday });
  latest.current = { tab, goToday };
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let disposed = false;
    let remove: (() => void) | undefined;
    let timer: ReturnType<typeof setTimeout>;
    const guard = createExitGuard(() => {
      setToast(true); clearTimeout(timer); timer = setTimeout(() => setToast(false), 2000);
    }, () => { void App.exitApp().catch(() => {}); });
    void App.addListener('backButton', () => {
      if (backStack.dispatch()) { guard.reset(); setToast(false); return; }
      if (latest.current.tab !== 'bugun') { guard.reset(); setToast(false); latest.current.goToday(); }
      else guard.press();
    }).then(listener => {
      if (disposed) void listener.remove(); else remove = () => { void listener.remove(); };
    }).catch(() => {});
    return () => { disposed = true; remove?.(); clearTimeout(timer); };
  }, []);
  useEffect(() => { setToast(false); }, [tab]);
  return toast;
}
