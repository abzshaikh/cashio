import { z } from 'zod';
import { ASSET_TYPES } from '../types/asset';
import { moneyAmountSchema } from './moneySchemas';

export const assetFormSchema = z.object({
  type: z.enum(ASSET_TYPES),
  label: z.string().min(1, 'Enter a label').max(120),
  value: moneyAmountSchema('Value'),
  asOf: z.date({ error: 'Select a date' }),
});
export type AssetFormValues = z.infer<typeof assetFormSchema>;

export const defaultAssetFormValues: AssetFormValues = {
  type: 'other',
  label: '',
  value: 0,
  asOf: new Date(),
};
