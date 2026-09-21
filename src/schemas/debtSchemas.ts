import { z } from 'zod';
import { DEBT_CATEGORIES } from '../types/debt';
import { moneyAmountSchema } from './moneySchemas';

/**
 * `hasEndDate` is a plain UI toggle, not stored on the debt itself — same
 * `hasTargetDate`/`neverEnds`-style pattern `savingsGoalFormSchema` and
 * `recurringTransactionFormSchema` already use for their own optional
 * dates. When false, `endDate` is ignored and cleared to `null` before the
 * service call.
 */
export const debtFormSchema = z
  .object({
    lender: z.string().min(1, 'Enter a lender name').max(120),
    category: z.enum(DEBT_CATEGORIES),
    originalAmount: moneyAmountSchema(),
    interestRate: z.coerce
      .number({ error: 'Enter a valid rate' })
      .min(0, 'Rate cannot be negative')
      .max(100, 'Enter a realistic rate'),
    minimumPayment: z.coerce
      .number({ error: 'Enter a valid amount' })
      .nonnegative('Amount cannot be negative'),
    paymentDueDay: z.coerce
      .number({ error: 'Enter a day of the month' })
      .int('Enter a whole number')
      .min(1, 'Must be between 1 and 31')
      .max(31, 'Must be between 1 and 31'),
    startDate: z.date({ error: 'Select a start date' }),
    hasEndDate: z.boolean(),
    endDate: z.date().nullable(),
    notes: z.string().max(500),
  })
  .refine((data) => !data.hasEndDate || data.endDate !== null, {
    message: 'Select a target payoff date, or turn off "Set a target payoff date"',
    path: ['endDate'],
  })
  .refine((data) => !data.hasEndDate || !data.endDate || data.endDate >= data.startDate, {
    message: 'Target payoff date must be on or after the start date',
    path: ['endDate'],
  });
export type DebtFormValues = z.infer<typeof debtFormSchema>;

export const defaultDebtFormValues: DebtFormValues = {
  lender: '',
  category: 'other',
  originalAmount: 0,
  interestRate: 0,
  minimumPayment: 0,
  paymentDueDay: 1,
  startDate: new Date(),
  hasEndDate: false,
  endDate: null,
  notes: '',
};
