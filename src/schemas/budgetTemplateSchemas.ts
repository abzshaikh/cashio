import { z } from 'zod';

/**
 * `SaveAsTemplateDialog` only ever collects a name — everything else a
 * template needs (`period`/`scope`/`items`/thresholds) comes from the
 * source budget via `budgetToTemplateInput`, not from user input.
 */
export const saveAsTemplateFormSchema = z.object({
  name: z.string().min(1, 'Enter a template name').max(120),
});
export type SaveAsTemplateFormValues = z.infer<typeof saveAsTemplateFormSchema>;
