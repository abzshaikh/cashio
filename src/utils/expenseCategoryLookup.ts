import type { FormSelectOption } from '../components/common/form/FormSelect';
import type { ExpenseCategoryRecord } from '../types/category';

/**
 * Pure helpers for turning a live list of a user's `ExpenseCategoryRecord`s
 * into display labels and `FormSelect` options. Replaces the static
 * `expenseCategoryMeta`/`EXPENSE_SUBCATEGORIES` lookups Phase 5 used —
 * those worked against a fixed enum; categories are now per-user Firestore
 * data, so every lookup takes the current list as a parameter instead of
 * importing a constant.
 */

export function toCategoryOptions(categories: ExpenseCategoryRecord[]): FormSelectOption[] {
  return categories.map((c) => ({ value: c.slug, label: c.name }));
}

export function getSubcategoryOptionsFor(
  categories: ExpenseCategoryRecord[],
  categorySlug: string,
): FormSelectOption[] {
  const category = categories.find((c) => c.slug === categorySlug);
  if (!category) return [];
  return category.subcategories.map((s) => ({ value: s.slug, label: s.name }));
}

/**
 * Falls back to the raw slug when the category can't be found — e.g. it
 * was deleted after the transaction was recorded (the same known
 * limitation already accepted for a deleted account on a transaction, see
 * PHASE_LOG.md's Phase 4/5 notes).
 */
export function getCategoryLabel(categories: ExpenseCategoryRecord[], categorySlug: string): string {
  return categories.find((c) => c.slug === categorySlug)?.name ?? categorySlug;
}

export function getSubcategoryLabel(
  categories: ExpenseCategoryRecord[],
  categorySlug: string,
  subcategorySlug: string,
): string {
  const category = categories.find((c) => c.slug === categorySlug);
  const subcategory = category?.subcategories.find((s) => s.slug === subcategorySlug);
  return subcategory?.name ?? subcategorySlug;
}
