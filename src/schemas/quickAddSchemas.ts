import { z } from 'zod';
import { moneyAmountSchema } from './moneySchemas';

/**
 * Phase 38: the "quick add" flow deliberately supports only the two most
 * common transaction types — Income and Expense — not Refund/Adjustment/
 * Transfer (those stay behind `TransactionsPage`'s full "Add" menu).
 * `category` is a plain string rather than a typed enum/union here for the
 * same reason `expenseFormSchema`'s own `category` field is: its valid
 * values depend on which `type` is selected (a Phase 6 expense-category
 * slug for Expense, one of the fixed `IncomeCategory` values for Income),
 * so `QuickAddTransactionDialog`'s type-dependent category `FormSelect` is
 * what actually constrains it, not this schema — matching the existing
 * division of responsibility `expenseFormSchema`'s own comment describes.
 *
 * Every field omitted here relative to the full Expense/Income schemas
 * (subcategory, merchant, payment method, notes, tags, source, isRecurring)
 * is optional/blankable on those schemas too — `QuickAddTransactionDialog`
 * fills them with the same blank defaults `defaultExpenseFormValues`/
 * `defaultIncomeFormValues` already use, so a quick-added transaction is a
 * completely ordinary one that just skipped filling in optional detail.
 */
export const quickAddFormSchema = z.object({
  type: z.enum(['expense', 'income']),
  amount: moneyAmountSchema(),
  date: z.date({ error: 'Select a date' }),
  accountId: z.string().min(1, 'Select an account'),
  category: z.string().min(1, 'Select a category'),
  description: z.string().max(200),
});
export type QuickAddFormValues = z.infer<typeof quickAddFormSchema>;

export const defaultQuickAddFormValues: QuickAddFormValues = {
  type: 'expense',
  amount: 0,
  date: new Date(),
  accountId: '',
  category: '',
  description: '',
};
