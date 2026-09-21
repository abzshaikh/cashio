import { z } from 'zod';
import { moneyAmountSchema } from './moneySchemas';

/**
 * A transfer has no category/merchant/payment method — it's just money
 * moving between two of the user's own accounts (Rule 3/4). `fromAccountId`
 * and `toAccountId` must differ; `TransferFormDialog.tsx` also filters each
 * select's options to exclude the other's current selection, so this
 * `.refine` is mostly a defense-in-depth backstop (e.g. against a stale
 * `initialValues` prop).
 */
export const transferFormSchema = z
  .object({
    amount: moneyAmountSchema(),
    date: z.date({ error: 'Select a date' }),
    fromAccountId: z.string().min(1, 'Select a source account'),
    toAccountId: z.string().min(1, 'Select a destination account'),
    description: z.string().max(200),
    notes: z.string().max(500),
    tags: z.array(z.string().max(30)).max(10),
  })
  .refine(
    (data) =>
      data.fromAccountId === '' || data.toAccountId === '' || data.fromAccountId !== data.toAccountId,
    { message: 'Choose two different accounts', path: ['toAccountId'] },
  );
export type TransferFormValues = z.infer<typeof transferFormSchema>;

export const defaultTransferFormValues: TransferFormValues = {
  amount: 0,
  date: new Date(),
  fromAccountId: '',
  toAccountId: '',
  description: '',
  notes: '',
  tags: [],
};
