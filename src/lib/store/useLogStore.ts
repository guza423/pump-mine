import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { LogController } from './controller';
import type { Program } from './types';

export function useLogStore(initialProgram: () => Program) {
  const controller = useMemo(() => new LogController(initialProgram), []);
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  useEffect(() => {
    let alive = true;
    void import('../cloud/runtime').then(({ accountRuntime }) => { if (alive) return controller.start(accountRuntime); }).catch(controller.initializationFailed);
    return () => { alive = false; controller.stop(); };
  }, [controller]);
  const apiRef = useRef(controller);
  return [state, apiRef] as const;
}
