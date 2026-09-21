import { z } from 'zod';
import { ACCOUNT_STATUSES, ACCOUNT_TYPES } from '../types/account';

/**
 * `creditLimit`/`statementDay`/`paymentDueDay` (Phase 18) are always
 * present in the RHF-managed form state — `AccountFormDialog` only shows
 * their fields when `type` is `credit_card`, but keeping them as plain
 * (never-null) coerced numbers avoids the awkwardness of `z.coerce.number()`
 * turning a `null` input into `0` anyway. The `refine` below only requires
 * a real credit limit when `type` is `credit_card`; `statementDay`/
 * `paymentDueDay` need no such conditional check since their default (`1`)
 * already satisfies the unconditional 1–31 range check whether or not the
 * fields are shown. `AccountFormDialog`'s own `submit` handler is what
 * actually clears all three to `null` before calling `onSubmit` when the
 * account isn't a credit card — see `AccountSubmitValues` below.
 */
export const accountFormSchema = z
  .object({
    name: z.string().min(1, 'Account name is required').max(80),
    type: z.enum(ACCOUNT_TYPES),
    institution: z.string().max(80),
    accountNumber: z.string().max(60),
    openingBalance: z.coerce
      .number({ error: 'Enter a valid amount' })
      .finite('Enter a valid amount'),
    currency: z.string().min(1, 'Currency is required'),
    status: z.enum(ACCOUNT_STATUSES),
    notes: z.string().max(500),
    creditLimit: z.coerce
      .number({ error: 'Enter a valid amount' })
      .nonnegative('Amount cannot be negative'),
    statementDay: z.coerce
      .number({ error: 'Enter a day of the month' })
      .int('Enter a whole number')
      .min(1, 'Must be between 1 and 31')
      .max(31, 'Must be between 1 and 31'),
    paymentDueDay: z.coerce
      .number({ error: 'Enter a day of the month' })
      .int('Enter a whole number')
      .min(1, 'Must be between 1 and 31')
      .max(31, 'Must be between 1 and 31'),
  })
  .refine((data) => data.type !== 'credit_card' || data.creditLimit > 0, {
    message: 'Enter a credit limit greater than zero',
    path: ['creditLimit'],
  });
export type AccountFormValues = z.infer<typeof accountFormSchema>;

/**
 * What `AccountFormDialog` actually hands to `onSubmit`: identical to
 * `AccountFormValues` except the three credit-card-only fields become
 * `number | null`, cleared to `null` for any non-`credit_card` account —
 * the same "UI-only conditional field, cleared at submit time" pattern
 * `hasTargetDate`/`hasEndDate` use elsewhere, just keyed off `type` itself
 * rather than a separate boolean toggle.
 */
export type AccountSubmitValues = Omit<
  AccountFormValues,
  'creditLimit' | 'statementDay' | 'paymentDueDay'
> & {
  creditLimit: number | null;
  statementDay: number | null;
  paymentDueDay: number | null;
};

export const defaultAccountFormValues: AccountFormValues = {
  name: '',
  type: 'bank',
  institution: '',
  accountNumber: '',
  openingBalance: 0,
  currency: 'INR',
  status: 'active',
  notes: '',
  creditLimit: 0,
  statementDay: 1,
  paymentDueDay: 1,
};
