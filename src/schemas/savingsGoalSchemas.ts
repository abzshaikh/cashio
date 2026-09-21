import { z } from 'zod';
import { SAVINGS_GOAL_CATEGORIES } from '../types/savingsGoal';
import { moneyAmountSchema } from './moneySchemas';

/**
 * `hasTargetDate` is a plain UI toggle, not stored on the goal itself — same
 * pattern `RecurringTransactionFormDialog`'s `neverEnds` switch uses for an
 * optional end date. When false, `targetDate` is ignored and cleared to
 * `null` before the service call.
 */
export const savingsGoalFormSchema = z
  .object({
    name: z.string().min(1, 'Enter a goal name').max(120),
    category: z.enum(SAVINGS_GOAL_CATEGORIES),
    targetAmount: moneyAmountSchema(),
    hasTargetDate: z.boolean(),
    targetDate: z.date().nullable(),
    notes: z.string().max(500),
  })
  .refine((data) => !data.hasTargetDate || data.targetDate !== null, {
    message: 'Select a target date, or turn off "Set a target date"',
    path: ['targetDate'],
  });
export type SavingsGoalFormValues = z.infer<typeof savingsGoalFormSchema>;

export const defaultSavingsGoalFormValues: SavingsGoalFormValues = {
  name: '',
  category: 'other',
  targetAmount: 0,
  hasTargetDate: false,
  targetDate: null,
  notes: '',
};
