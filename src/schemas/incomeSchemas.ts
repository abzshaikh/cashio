import { z } from 'zod';
import { INCOME_CATEGORIES } from '../types/transaction';
import { moneyAmountSchema } from './moneySchemas';

export const incomeFormSchema = z.object({
  amount: moneyAmountSchema(),
  date: z.date({ error: 'Select a date' }),
  accountId: z.string().min(1, 'Select an account'),
  category: z.enum(INCOME_CATEGORIES),
  source: z.string().max(120),
  description: z.string().max(200),
  notes: z.string().max(500),
  isRecurring: z.boolean(),
  tags: z.array(z.string().max(30)).max(10),
});
export type IncomeFormValues = z.infer<typeof incomeFormSchema>;

export const defaultIncomeFormValues: IncomeFormValues = {
  amount: 0,
  date: new Date(),
  accountId: '',
  category: 'salary',
  source: '',
  description: '',
  notes: '',
  isRecurring: false,
  tags: [],
};
