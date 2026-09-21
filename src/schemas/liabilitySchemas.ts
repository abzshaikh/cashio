import { z } from 'zod';
import { LIABILITY_TYPES } from '../types/liability';
import { moneyAmountSchema } from './moneySchemas';

export const liabilityFormSchema = z.object({
  type: z.enum(LIABILITY_TYPES),
  label: z.string().min(1, 'Enter a label').max(120),
  value: moneyAmountSchema('Value'),
  asOf: z.date({ error: 'Select a date' }),
});
export type LiabilityFormValues = z.infer<typeof liabilityFormSchema>;

export const defaultLiabilityFormValues: LiabilityFormValues = {
  type: 'other',
  label: '',
  value: 0,
  asOf: new Date(),
};
