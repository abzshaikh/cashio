import { describe, expect, it } from 'vitest';
import { goalContributionFormSchema } from './goalContributionSchemas';

describe('goalContributionFormSchema', () => {
  const base = {
    amount: 5000,
    date: new Date('2026-03-01'),
    note: '',
  };

  it('accepts a valid contribution', () => {
    expect(goalContributionFormSchema.safeParse(base).success).toBe(true);
  });

  it('requires a positive amount', () => {
    expect(goalContributionFormSchema.safeParse({ ...base, amount: 0 }).success).toBe(false);
    expect(goalContributionFormSchema.safeParse({ ...base, amount: -100 }).success).toBe(false);
  });

  it('coerces a numeric-string amount', () => {
    const result = goalContributionFormSchema.safeParse({ ...base, amount: '250' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(250);
    }
  });

  it('requires a real date', () => {
    expect(goalContributionFormSchema.safeParse({ ...base, date: null }).success).toBe(false);
  });

  it('accepts an optional note within the length limit', () => {
    expect(goalContributionFormSchema.safeParse({ ...base, note: 'Birthday money' }).success).toBe(
      true,
    );
  });

  it('rejects a note over the length limit', () => {
    expect(
      goalContributionFormSchema.safeParse({ ...base, note: 'x'.repeat(201) }).success,
    ).toBe(false);
  });
});
