import { describe, expect, it } from 'vitest';
import {
  getDaysRemaining,
  getGoalContributionsTotal,
  getGoalProgress,
  getGoalStatus,
} from './goalCalculations';
import type { GoalContribution } from '../types/goalContribution';
import type { SavingsGoal } from '../types/savingsGoal';

function makeContribution(overrides: Partial<GoalContribution> = {}): GoalContribution {
  return {
    id: 'c1',
    userId: 'user-1',
    goalId: 'goal-1',
    amount: 100,
    date: '2026-01-01',
    note: '',
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

function makeGoal(overrides: Partial<SavingsGoal> = {}): Pick<SavingsGoal, 'id' | 'targetAmount' | 'targetDate'> {
  return {
    id: 'goal-1',
    targetAmount: 1000,
    targetDate: null,
    ...overrides,
  };
}

describe('getGoalContributionsTotal', () => {
  it('sums only contributions belonging to the given goal', () => {
    const contributions = [
      makeContribution({ id: 'c1', goalId: 'goal-1', amount: 100 }),
      makeContribution({ id: 'c2', goalId: 'goal-1', amount: 250 }),
      makeContribution({ id: 'c3', goalId: 'goal-2', amount: 500 }),
    ];
    expect(getGoalContributionsTotal('goal-1', contributions)).toBe(350);
    expect(getGoalContributionsTotal('goal-2', contributions)).toBe(500);
  });

  it('returns 0 for a goal with no contributions', () => {
    expect(getGoalContributionsTotal('goal-1', [])).toBe(0);
  });
});

describe('getDaysRemaining', () => {
  const asOf = new Date(2026, 5, 15); // 15 June 2026

  it('returns null when there is no target date', () => {
    expect(getDaysRemaining(null, asOf)).toBeNull();
  });

  it('returns 0 for a target date that is today', () => {
    expect(getDaysRemaining('2026-06-15', asOf)).toBe(0);
  });

  it('returns a positive count for a future target date', () => {
    expect(getDaysRemaining('2026-06-25', asOf)).toBe(10);
  });

  it('returns a negative count for a past target date', () => {
    expect(getDaysRemaining('2026-06-05', asOf)).toBe(-10);
  });

  it('ignores time-of-day when comparing dates', () => {
    const asOfWithTime = new Date(2026, 5, 15, 23, 45);
    expect(getDaysRemaining('2026-06-16', asOfWithTime)).toBe(1);
  });
});

describe('getGoalStatus', () => {
  it('is always safe once completed, regardless of the deadline', () => {
    expect(getGoalStatus(true, -5)).toBe('safe');
    expect(getGoalStatus(true, 0)).toBe('safe');
    expect(getGoalStatus(true, null)).toBe('safe');
  });

  it('is safe for an incomplete goal with no target date', () => {
    expect(getGoalStatus(false, null)).toBe('safe');
  });

  it('is over once the target date has passed without completing', () => {
    expect(getGoalStatus(false, -1)).toBe('over');
  });

  it('is nearLimit inside the last 30 days', () => {
    expect(getGoalStatus(false, 30)).toBe('nearLimit');
    expect(getGoalStatus(false, 0)).toBe('nearLimit');
  });

  it('is warning between 31 and 90 days out', () => {
    expect(getGoalStatus(false, 31)).toBe('warning');
    expect(getGoalStatus(false, 90)).toBe('warning');
  });

  it('is safe beyond 90 days out', () => {
    expect(getGoalStatus(false, 91)).toBe('safe');
  });
});

describe('getGoalProgress', () => {
  it('combines current amount, percent complete, completion, and status', () => {
    const goal = makeGoal({ targetAmount: 1000, targetDate: null });
    const contributions = [makeContribution({ amount: 400 })];
    const progress = getGoalProgress(goal, contributions);
    expect(progress.currentAmount).toBe(400);
    expect(progress.percentComplete).toBeCloseTo(0.4, 5);
    expect(progress.isCompleted).toBe(false);
    expect(progress.status).toBe('safe');
  });

  it('marks a goal completed once contributions reach the target', () => {
    const goal = makeGoal({ targetAmount: 500 });
    const contributions = [makeContribution({ amount: 500 })];
    const progress = getGoalProgress(goal, contributions);
    expect(progress.isCompleted).toBe(true);
    expect(progress.status).toBe('safe');
  });

  it('allows percentComplete to exceed 1 when over-saved', () => {
    const goal = makeGoal({ targetAmount: 500 });
    const contributions = [makeContribution({ amount: 600 })];
    const progress = getGoalProgress(goal, contributions);
    expect(progress.percentComplete).toBeCloseTo(1.2, 5);
    expect(progress.isCompleted).toBe(true);
  });

  it('treats a zero-target goal with any savings as complete', () => {
    const goal = makeGoal({ targetAmount: 0 });
    const contributions = [makeContribution({ amount: 50 })];
    const progress = getGoalProgress(goal, contributions);
    expect(progress.percentComplete).toBe(1);
    // targetAmount of 0 is a degenerate case (no real goal was set), so it's
    // deliberately never reported as "completed" — see isCompleted's `&&
    // goal.targetAmount > 0` guard.
    expect(progress.isCompleted).toBe(false);
  });

  it('surfaces daysRemaining and an escalated status for an approaching deadline', () => {
    const asOf = new Date(2026, 0, 1);
    const goal = makeGoal({ targetAmount: 1000, targetDate: '2026-01-10' });
    const progress = getGoalProgress(goal, [makeContribution({ amount: 100 })], asOf);
    expect(progress.daysRemaining).toBe(9);
    expect(progress.status).toBe('nearLimit');
  });
});
