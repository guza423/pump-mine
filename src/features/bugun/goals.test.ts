import { describe, expect, it } from 'vitest';
import {
  advanceSkillStage,
  readGoals,
  removeGoal,
  skillStats,
  sortGoals,
  upsertGoal
} from './goals';
import type { Goal, Session, Setting, SkillGoal } from '../../lib/store/types';

describe('goals model', () => {
  it('migrates legacy goal setting to goals array with perf type', () => {
    const settings: Setting[] = [
      {
        key: 'goal',
        value: {
          exId: 'duz-bench',
          name: 'Düz bench press',
          base: 80,
          target: 100,
          createdAt: 1000
        }
      }
    ];
    const goals = readGoals(settings);
    expect(goals).toHaveLength(1);
    expect(goals[0]).toEqual({
      id: 'goal',
      type: 'perf',
      exId: 'duz-bench',
      name: 'Düz bench press',
      base: 80,
      target: 100,
      createdAt: 1000
    });
  });

  it('skillStats counts only finished sessions with sets for that movement', () => {
    const goal: SkillGoal = {
      id: 'g1',
      type: 'skill',
      exId: 'kip-up',
      name: 'Kip-up',
      stage: 1,
      createdAt: 1
    };
    const sessions: Session[] = [
      {
        id: 's_empty',
        programId: null,
        programName: 'Plansiz',
        dayId: null,
        dayName: 'Kip-up',
        startedAt: 1000,
        endedAt: 2000,
        status: 'done',
        items: [{ id: 'i1', exId: 'kip-up', name: 'Kip-up', muscle: 'Karın', note: '', target: { sets: 5, repMin: 3, repMax: 3, kg: null, rpeMin: null, rpeMax: null, rest: 90 }, sets: [] }]
      },
      {
        id: 's_with_set',
        programId: null,
        programName: 'Plansiz',
        dayId: null,
        dayName: 'Kip-up',
        startedAt: 3000,
        endedAt: 5000,
        status: 'done',
        items: [
          {
            id: 'i2',
            exId: 'kip-up',
            name: 'Kip-up',
            muscle: 'Karın',
            note: '',
            target: { sets: 5, repMin: 3, repMax: 3, kg: null, rpeMin: null, rpeMax: null, rest: 90 },
            sets: [{ kg: 0, reps: 3, skill: true, q: 0, lvl: null, vl: 0, rpe: null, rir: 9, at: 4000 }]
          }
        ]
      }
    ];
    const st = skillStats(goal, sessions);
    expect(st.n).toBe(1);
    expect(st.last).toBe(3000);
  });

  it('sets doneAt when stage reaches 3 and sorts completed skill goals to the end', () => {
    const g1: SkillGoal = {
      id: 'g1',
      type: 'skill',
      exId: 'kip-up',
      name: 'Kip-up',
      stage: 2,
      createdAt: 10
    };
    const g2: Goal = {
      id: 'g2',
      type: 'perf',
      exId: 'squat',
      name: 'Squat',
      base: 100,
      target: 140,
      createdAt: 20
    };
    let list = upsertGoal([], g1, 100);
    list = upsertGoal(list, g2, 100);

    const advanced = advanceSkillStage(list, 'g1', 5555);
    const updatedSkill = advanced.find((g) => g.id === 'g1') as SkillGoal;
    expect(updatedSkill.stage).toBe(3);
    expect(updatedSkill.doneAt).toBe(5555);

    const sorted = sortGoals(advanced);
    expect(sorted.map((g) => g.id)).toEqual(['g2', 'g1']);

    const afterRemove = removeGoal(sorted, 'g1');
    expect(afterRemove.map((g) => g.id)).toEqual(['g2']);
  });
});
