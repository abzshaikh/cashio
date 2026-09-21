import { describe, expect, it } from 'vitest';
import { budgetTemplateToFormValues, budgetToTemplateInput } from './budgetTemplateCalculations';
import type { Budget } from '../types/budget';
import type { BudgetTemplate } from '../types/budgetTemplate';

// Phase 34: `BudgetTemplate`/`Budget` amounts are integer minor-unit
// values (paise) — `food: 20000` is ₹200, `overallAmount: 100000` is
// ₹1,000 — while the `BudgetFormValues`/`NewBudgetTemplateInput` these
// functions produce are decimal major-unit values, so every expectation
// below divides by 100.
const template: BudgetTemplate = {
  id: 't1',
  userId: 'user-1',
  name: 'Standard month',
  period: 'monthly',
  scope: 'category',
  overallAmount: 0,
  items: [{ categoryId: 'food', amount: 20000 }],
  warningThreshold: 80,
  overThreshold: 100,
  createdAt: '',
  updatedAt: '',
};

const budget: Budget = {
  id: 'b1',
  userId: 'user-1',
  name: 'Monthly essentials',
  period: 'monthly',
  startDate: '2026-02-01',
  endDate: '2026-02-28',
  scope: 'overall',
  overallAmount: 100000,
  items: [],
  warningThreshold: 75,
  overThreshold: 110,
  createdAt: '',
  updatedAt: '',
};

describe('budgetTemplateToFormValues', () => {
  it('carries the template shape over, converts minor units to major, and applies the supplied dates', () => {
    const start = new Date(2026, 5, 1);
    const end = new Date(2026, 5, 30);
    const values = budgetTemplateToFormValues(template, start, end);
    expect(values).toEqual({
      name: 'Standard month',
      period: 'monthly',
      startDate: start,
      endDate: end,
      scope: 'category',
      overallAmount: 0,
      items: [{ categoryId: 'food', amount: 200 }],
      warningThreshold: 80,
      overThreshold: 100,
    });
  });
});

describe('budgetToTemplateInput', () => {
  it('snapshots a budget shape under the given name, converts minor units to major, and drops its dates', () => {
    const input = budgetToTemplateInput(budget, 'My template');
    expect(input).toEqual({
      name: 'My template',
      period: 'monthly',
      scope: 'overall',
      overallAmount: 1000,
      items: [],
      warningThreshold: 75,
      overThreshold: 110,
    });
  });

  it('uses the name argument rather than the budget\'s own name', () => {
    const input = budgetToTemplateInput(budget, 'Renamed');
    expect(input.name).toBe('Renamed');
  });
});
