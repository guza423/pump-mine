import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { LogController } from './controller';

export function useLogStore() {
  const controller = useMemo(() => new LogController(), []);
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  useEffect(() => {
    let alive = true;
    void import('../cloud/runtime').then(({ accountRuntime }) => { if (alive) return controller.start(accountRuntime); }).catch(controller.initializationFailed);
    return () => { alive = false; controller.stop(); };
  }, [controller]);
  const apiRef = useRef(controller);
  return [state, apiRef] as const;
}
