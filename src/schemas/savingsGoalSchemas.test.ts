import { describe, expect, it } from 'vitest';
import { savingsGoalFormSchema } from './savingsGoalSchemas';

describe('savingsGoalFormSchema', () => {
  const base = {
    name: 'Emergency Fund',
    category: 'emergency_fund' as const,
    targetAmount: 100000,
    hasTargetDate: false,
    targetDate: null,
    notes: '',
  };

  it('accepts a valid goal with no target date', () => {
    expect(savingsGoalFormSchema.safeParse(base).success).toBe(true);
  });

  it('accepts a valid goal with a target date', () => {
    const withDate = { ...base, hasTargetDate: true, targetDate: new Date('2027-01-01') };
    expect(savingsGoalFormSchema.safeParse(withDate).success).toBe(true);
  });

  it('requires a name', () => {
    expect(savingsGoalFormSchema.safeParse({ ...base, name: '' }).success).toBe(false);
  });

  it('requires a positive target amount', () => {
    expect(savingsGoalFormSchema.safeParse({ ...base, targetAmount: 0 }).success).toBe(false);
    expect(savingsGoalFormSchema.safeParse({ ...base, targetAmount: -500 }).success).toBe(false);
  });

  it('coerces a numeric-string target amount', () => {
    const result = savingsGoalFormSchema.safeParse({ ...base, targetAmount: '5000' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.targetAmount).toBe(5000);
    }
  });

  it('rejects an unknown category', () => {
    expect(
      savingsGoalFormSchema.safeParse({ ...base, category: 'lottery_winnings' }).success,
    ).toBe(false);
  });

  it('requires a target date when "set a target date" is on', () => {
    expect(
      savingsGoalFormSchema.safeParse({ ...base, hasTargetDate: true, targetDate: null }).success,
    ).toBe(false);
  });

  it('ignores a missing target date when "set a target date" is off', () => {
    expect(
      savingsGoalFormSchema.safeParse({ ...base, hasTargetDate: false, targetDate: null }).success,
    ).toBe(true);
  });
});
