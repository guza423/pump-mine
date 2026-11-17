export interface ProgramItem {
  id: string;
  exId: string | null;
  name: string;
  muscle: string;
  sets: number;
  repMin: number;
  repMax: number;
  kg: number | null;
  rpeMin: number | null;
  rpeMax: number | null;
  rest: number;
  note: string;
}

export interface ProgramDay {
  id: string;
  name: string;
  weekday?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | null;
  weekdays?: number[];
  dates?: string[];
  skip?: string[];
  items: ProgramItem[];
}

export interface Program {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  days: ProgramDay[];
}

export interface RecordedSet {
  kg: number;
  reps: number;
  lvl: 0 | 1 | 2 | 3 | 4 | null;
  vl: number;
  rpe: number | null;
  rir: number;
  rirEst?: number;
  rom?: number;
  plyo?: boolean;
  skill?: boolean;
  hold?: number;
  q?: 0 | 1 | 2;
  at: number;
  note?: string;
  tags?: string[];
}

export interface FxSettings {
  sound: boolean;
  haptic: boolean;
}

export type PerfGoal = {
  id: string;
  type: 'perf';
  exId: string;
  name: string;
  base: number;
  target: number;
  createdAt: number;
};

export type SkillGoal = {
  id: string;
  type: 'skill';
  exId: string | null;
  name: string;
  stage: 0 | 1 | 2 | 3;
  due?: string;
  createdAt: number;
  doneAt?: number;
};

export type Goal = PerfGoal | SkillGoal;

export interface SessionItem {
  id: string;
  exId: string | null;
  name: string;
  muscle: string;
  note: string;
  srcId?: string | null;
  memo?: string;
  target: Omit<ProgramItem, 'id' | 'exId' | 'name' | 'muscle' | 'note'>;
  sets: RecordedSet[];
}

export interface SessionRest {
  start: number;
  total: number;
  exId: string | null;
  setNo: number;
}

export interface Session {
  id: string;
  programId: string | null;
  programName: string;
  dayId: string | null;
  dayName: string;
  startedAt: number;
  endedAt: number | null;
  status: 'active' | 'done';
  ready?: boolean;
  fatigue?: { v: 2; pre: number; post: number | null };
  rest?: SessionRest;
  items: SessionItem[];
}

export interface Exercise {
  id: string;
  name: string;
  muscle: string;
  createdAt: number;
  pending: true;
  fat?: 1 | 2 | 3;
  prof?: 'alt' | 'ust' | 'dengeli' | 'a' | 'u' | 'o' | 'd';
  sec?: string[];
  bio?: 'bench' | 'rdl' | 'yanaacis';
}

export interface Checkin {
  id: `c_${string}`;
  sleep: number;
  at: number;
}

export interface Setting {
  key: string;
  value: unknown;
}

export interface BackupData {
  programs: Program[];
  sessions: Session[];
  exercises: Exercise[];
  checkins: Checkin[];
  settings: Setting[];
}

export interface PerformanceBackup {
  format: 'performance-backup';
  version: 2;
  exportedAt: string;
  data: BackupData;
}
