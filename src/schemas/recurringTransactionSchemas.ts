import { z } from 'zod';
import { RECURRING_FREQUENCIES, RECURRING_TRANSACTION_TYPES } from '../types/recurringTransaction';
import { PAYMENT_METHODS } from '../types/transaction';
import { moneyAmountSchema } from './moneySchemas';

/**
 * One flat schema for both recurring types, same reasoning
 * `NewRecurringTransactionInput`'s doc comment gives: the shared fields
 * (amount/frequency/dates/account/description/notes) dominate the form, so
 * a single dialog with a "Type" switch is more proportionate than two
 * near-duplicate dialogs. `category`/`subcategory`/`merchant`/
 * `paymentMethod`/`source` are validated loosely here (like
 * `expenseSchemas.ts`'s `category`) — the dialog's cascading selects are
 * what guarantee a value that actually belongs to the chosen `type`.
 *
 * `neverEnds` is a plain UI toggle, not stored on the rule itself — when
 * true, `endDate` is ignored (and cleared to `null` before the service call,
 * see `RecurringTransactionFormDialog`). When false, a real `endDate` on or
 * after `startDate` is required.
 */
export const recurringTransactionFormSchema = z
  .object({
    type: z.enum(RECURRING_TRANSACTION_TYPES),
    amount: moneyAmountSchema(),
    frequency: z.enum(RECURRING_FREQUENCIES),
    startDate: z.date({ error: 'Select a start date' }),
    neverEnds: z.boolean(),
    endDate: z.date().nullable(),
    accountId: z.string().min(1, 'Select an account'),
    category: z.string().min(1, 'Select a category'),
    subcategory: z.string(),
    merchant: z.string().max(120),
    paymentMethod: z.enum(PAYMENT_METHODS),
    isSubscription: z.boolean(),
    source: z.string().max(120),
    description: z.string().max(200),
    notes: z.string().max(500),
  })
  .refine((data) => data.neverEnds || data.endDate !== null, {
    message: 'Select an end date, or turn off "Ends on a date"',
    path: ['endDate'],
  })
  .refine((data) => data.neverEnds || !data.endDate || data.endDate >= data.startDate, {
    message: 'End date must be on or after the start date',
    path: ['endDate'],
  });
export type RecurringTransactionFormValues = z.infer<typeof recurringTransactionFormSchema>;

export const defaultRecurringTransactionFormValues: RecurringTransactionFormValues = {
  type: 'expense',
  amount: 0,
  frequency: 'monthly',
  startDate: new Date(),
  neverEnds: true,
  endDate: null,
  accountId: '',
  category: '',
  subcategory: '',
  merchant: '',
  paymentMethod: 'other',
  isSubscription: false,
  source: '',
  description: '',
  notes: '',
};
