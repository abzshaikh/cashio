import { z } from 'zod';
import { moneyAmountSchema } from './moneySchemas';

export const goalContributionFormSchema = z.object({
  amount: moneyAmountSchema(),
  date: z.date({ error: 'Select a date' }),
  note: z.string().max(200),
});
export type GoalContributionFormValues = z.infer<typeof goalContributionFormSchema>;

export const defaultGoalContributionFormValues: GoalContributionFormValues = {
  amount: 0,
  date: new Date(),
  note: '',
};
