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
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6 | null;
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
  lvl: 0 | 1 | 2 | 3 | 4;
  vl: number;
  rpe: number;
  rir: number;
  rirEst: number;
  at: number;
}

export interface SessionItem {
  id: string;
  exId: string | null;
  name: string;
  muscle: string;
  note: string;
  target: Omit<ProgramItem, 'id' | 'exId' | 'name' | 'muscle' | 'note'>;
  sets: RecordedSet[];
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
  items: SessionItem[];
}

export interface Exercise {
  id: string;
  name: string;
  muscle: string;
  createdAt: number;
  pending: true;
}

export interface BackupData {
  programs: Program[];
  sessions: Session[];
  exercises: Exercise[];
}

export interface PerformanceBackup {
  format: 'performance-backup';
  version: 1;
  exportedAt: string;
  data: BackupData;
}
