import { z } from 'zod';
import { PAYMENT_METHODS } from '../types/transaction';
import { moneyAmountSchema } from './moneySchemas';

export const expenseFormSchema = z.object({
  amount: moneyAmountSchema(),
  date: z.date({ error: 'Select a date' }),
  accountId: z.string().min(1, 'Select an account'),
  // A category slug from the user's own (Phase 6) Firestore-backed
  // category list, not a fixed enum — like `accountId` above, this schema
  // only checks it was actually selected; `ExpenseFormDialog`'s cascading
  // Category/Subcategory selects are what guarantee it's a real,
  // currently-existing slug (the same division of responsibility already
  // used for `accountId`, which isn't cross-checked against real accounts
  // here either).
  category: z.string().min(1, 'Select a category'),
  // Blank is valid for every category (required for one with no
  // subcategories at all, e.g. the default "Other"). Whether a non-blank
  // value actually belongs to the chosen category is enforced by the
  // dialog's cascading select, not here — see the `category` comment above.
  subcategory: z.string(),
  merchant: z.string().max(120),
  paymentMethod: z.enum(PAYMENT_METHODS),
  description: z.string().max(200),
  notes: z.string().max(500),
  tags: z.array(z.string().max(30)).max(10),
});
export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

export const defaultExpenseFormValues: ExpenseFormValues = {
  amount: 0,
  date: new Date(),
  accountId: '',
  category: '',
  subcategory: '',
  merchant: '',
  paymentMethod: 'cash',
  description: '',
  notes: '',
  tags: [],
};
