import { describe, expect, it } from 'vitest';
import { budgetFormSchema } from './budgetSchemas';

describe('budgetFormSchema', () => {
  const base = {
    name: 'Monthly essentials',
    period: 'monthly' as const,
    startDate: new Date('2026-02-01'),
    endDate: new Date('2026-02-28'),
    scope: 'overall' as const,
    overallAmount: 20000,
    items: [],
    warningThreshold: 80,
    overThreshold: 100,
  };

  it('accepts a valid overall-scope budget', () => {
    expect(budgetFormSchema.safeParse(base).success).toBe(true);
  });

  it('requires a name', () => {
    expect(budgetFormSchema.safeParse({ ...base, name: '' }).success).toBe(false);
  });

  it('requires the end date on or after the start date', () => {
    expect(
      budgetFormSchema.safeParse({
        ...base,
        startDate: new Date('2026-02-28'),
        endDate: new Date('2026-02-01'),
      }).success,
    ).toBe(false);
  });

  it('accepts the end date equal to the start date', () => {
    expect(
      budgetFormSchema.safeParse({ ...base, startDate: base.startDate, endDate: base.startDate })
        .success,
    ).toBe(true);
  });

  it('requires a positive overallAmount when scope is overall', () => {
    expect(budgetFormSchema.safeParse({ ...base, overallAmount: 0 }).success).toBe(false);
  });

  it('requires at least one item when scope is category', () => {
    expect(
      budgetFormSchema.safeParse({ ...base, scope: 'category', overallAmount: 0, items: [] })
        .success,
    ).toBe(false);
  });

  it('accepts a category-scope budget with items and no overallAmount', () => {
    expect(
      budgetFormSchema.safeParse({
        ...base,
        scope: 'category',
        overallAmount: 0,
        items: [{ categoryId: 'food', amount: 5000 }],
      }).success,
    ).toBe(true);
  });

  it('rejects an item with a non-positive amount', () => {
    expect(
      budgetFormSchema.safeParse({
        ...base,
        scope: 'category',
        items: [{ categoryId: 'food', amount: 0 }],
      }).success,
    ).toBe(false);
  });

  it('requires the warning threshold at or below the over threshold', () => {
    expect(
      budgetFormSchema.safeParse({ ...base, warningThreshold: 110, overThreshold: 100 }).success,
    ).toBe(false);
  });

  it('allows the warning threshold equal to the over threshold', () => {
    expect(
      budgetFormSchema.safeParse({ ...base, warningThreshold: 100, overThreshold: 100 }).success,
    ).toBe(true);
  });

  it('coerces numeric-string amounts and thresholds', () => {
    const result = budgetFormSchema.safeParse({
      ...base,
      overallAmount: '20000',
      warningThreshold: '80',
      overThreshold: '100',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.overallAmount).toBe(20000);
      expect(result.data.warningThreshold).toBe(80);
    }
  });
});
