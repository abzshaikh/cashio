import { z } from 'zod';

export const categoryFormSchema = z.object({
  name: z.string().min(1, 'Category name is required').max(60),
});
export type CategoryFormValues = z.infer<typeof categoryFormSchema>;
export const defaultCategoryFormValues: CategoryFormValues = { name: '' };

export const subcategoryFormSchema = z.object({
  name: z.string().min(1, 'Subcategory name is required').max(60),
});
export type SubcategoryFormValues = z.infer<typeof subcategoryFormSchema>;
export const defaultSubcategoryFormValues: SubcategoryFormValues = { name: '' };
