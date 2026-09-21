import { z } from 'zod';
import { moneyAmountSchema } from './moneySchemas';

export const debtPaymentFormSchema = z.object({
  amount: moneyAmountSchema(),
  date: z.date({ error: 'Select a date' }),
  note: z.string().max(200),
});
export type DebtPaymentFormValues = z.infer<typeof debtPaymentFormSchema>;

export const defaultDebtPaymentFormValues: DebtPaymentFormValues = {
  amount: 0,
  date: new Date(),
  note: '',
};
