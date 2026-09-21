import { z } from 'zod';
import { TAG_COLORS } from '../types/tag';

export const tagFormSchema = z.object({
  name: z.string().min(1, 'Tag name is required').max(30),
  color: z.enum(TAG_COLORS),
});
export type TagFormValues = z.infer<typeof tagFormSchema>;

export const defaultTagFormValues: TagFormValues = { name: '', color: 'default' };
