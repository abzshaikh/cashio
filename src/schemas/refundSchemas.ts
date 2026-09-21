import { z } from 'zod';
import { moneyAmountSchema } from './moneySchemas';

/**
 * Same shape as `expenseSchemas.ts`'s `expenseFormSchema` minus
 * `paymentMethod` — a refund reuses the expense category/subcategory
 * system (see `types/transaction.ts`'s `RefundTransaction` doc comment)
 * but there's no payment method involved in receiving money back.
 */
export const refundFormSchema = z.object({
  amount: moneyAmountSchema(),
  date: z.date({ error: 'Select a date' }),
  accountId: z.string().min(1, 'Select an account'),
  // Same division of responsibility as `expenseSchemas.ts`: this schema
  // only checks a category was selected, the dialog's cascading select
  // guarantees it's a real, currently-existing slug.
  category: z.string().min(1, 'Select a category'),
  subcategory: z.string(),
  merchant: z.string().max(120),
  description: z.string().max(200),
  notes: z.string().max(500),
  tags: z.array(z.string().max(30)).max(10),
});
export type RefundFormValues = z.infer<typeof refundFormSchema>;

export const defaultRefundFormValues: RefundFormValues = {
  amount: 0,
  date: new Date(),
  accountId: '',
  category: '',
  subcategory: '',
  merchant: '',
  description: '',
  notes: '',
  tags: [],
};
