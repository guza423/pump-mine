import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, seedInitialProgram } from './database';
import type { Checkin, Exercise, Program, Session, Setting } from './types';

type Kind = 'programs' | 'sessions' | 'custom' | 'checkins' | 'settings';
type StoredValue = Program | Session | Exercise | Checkin | Setting;

const tableFor = (kind: Kind) => (kind === 'custom' ? db.exercises : db[kind]);

export function useLogStore(initialProgram: () => Program) {
  const [error, setError] = useState<string | null>(null);
  const seed = useRef<Program | null>(null);
  if (!seed.current) seed.current = initialProgram();

  useEffect(() => {
    void seedInitialProgram(seed.current!).catch(() => setError('write'));
  }, []);

  const programs = useLiveQuery(
    () => db.programs.orderBy('updatedAt').reverse().toArray(),
    [],
  );
  const sessions = useLiveQuery(
    () => db.sessions.orderBy('startedAt').reverse().limit(200).toArray(),
    [],
  );
  const custom = useLiveQuery(
    () => db.exercises.orderBy('name').toArray(),
    [],
  );
  const checkins = useLiveQuery(() => db.checkins.orderBy('at').reverse().limit(30).toArray(), []);
  const settings = useLiveQuery(() => db.settings.toArray(), []);

  const apiRef = useRef({
    put: async (kind: Kind, value: StoredValue) => {
      try {
        await tableFor(kind).put(value as never);
        setError(null);
      } catch {
        setError('write');
      }
    },
    del: async (kind: Kind, id: string) => {
      try {
        await tableFor(kind).delete(id as never);
        setError(null);
      } catch {
        setError('write');
      }
    },
  });

  const state = useMemo(() => {
    const loaded = {
      programs: programs !== undefined,
      sessions: sessions !== undefined,
      custom: custom !== undefined,
      checkins: checkins !== undefined,
      settings: settings !== undefined,
    };
    return {
      status: Object.values(loaded).every(Boolean) ? 'db' : 'loading',
      programs: programs ?? [],
      sessions: sessions ?? [],
      custom: custom ?? [],
      checkins: checkins ?? [],
      settings: settings ?? [],
      loaded,
      error,
    };
  }, [programs, sessions, custom, checkins, settings, error]);

  return [state, apiRef] as const;
}
