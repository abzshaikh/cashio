import { z } from 'zod';
import { ADJUSTMENT_DIRECTIONS } from '../types/transaction';
import { moneyAmountSchema } from './moneySchemas';

/**
 * An adjustment has no category/merchant/payment method — it's a manual
 * balance correction, not a purchase or income event. `reason` is
 * required (unlike every other type's optional `notes`) since an
 * adjustment with no explanation defeats the point of it being its own
 * transaction type — see `types/transaction.ts`'s `AdjustmentTransaction`
 * doc comment.
 */
export const adjustmentFormSchema = z.object({
  amount: moneyAmountSchema(),
  date: z.date({ error: 'Select a date' }),
  accountId: z.string().min(1, 'Select an account'),
  direction: z.enum(ADJUSTMENT_DIRECTIONS),
  reason: z.string().min(1, 'Enter a reason for this adjustment').max(200),
  description: z.string().max(200),
  notes: z.string().max(500),
  tags: z.array(z.string().max(30)).max(10),
});
export type AdjustmentFormValues = z.infer<typeof adjustmentFormSchema>;

export const defaultAdjustmentFormValues: AdjustmentFormValues = {
  amount: 0,
  date: new Date(),
  accountId: '',
  direction: 'increase',
  reason: '',
  description: '',
  notes: '',
  tags: [],
};
