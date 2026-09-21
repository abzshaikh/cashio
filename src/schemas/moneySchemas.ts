import { z } from 'zod';
import { toMinorUnits } from '../utils/money';

/**
 * A decimal major-unit money field shared by every form that captures an
 * amount or value (transactions, budgets, goals, debts, receipts, assets,
 * liabilities) — every one of those forms previously repeated the same
 * `z.coerce.number().positive().finite()` chain independently.
 *
 * Beyond that baseline, this also rejects an amount that's positive but
 * still rounds to 0 minor units once `toMinorUnits` converts it for storage
 * (e.g. "0.004" rounds to 0 paise). Every service that accepts one of these
 * fields converts it with `toMinorUnits` before writing it to Firestore,
 * and `firestore.rules` requires that stored integer be `> 0` — so without
 * this check, a technically-positive-but-too-small amount would pass this
 * schema only to be rejected by Firestore with an opaque
 * "Missing or insufficient permissions" error instead of a clear message
 * here, at the moment the user can still fix it.
 *
 * `noun` lets a field describe itself as "Amount" (the common case) or
 * "Value" (assets/liabilities) in its own error messages, matching what
 * each form already said before this was extracted.
 */
export function moneyAmountSchema(noun: 'Amount' | 'Value' = 'Amount') {
  return z.coerce
    .number({ error: 'Enter a valid amount' })
    .positive(`${noun} must be greater than zero`)
    .finite('Enter a valid amount')
    .refine((value) => toMinorUnits(value) > 0, {
      message: `${noun} is too small to record — enter at least 0.01`,
    });
}
