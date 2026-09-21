import type { DocumentData } from 'firebase/firestore';
import { createUserScopedCollection } from './firestoreCollection';
import { toDate } from '../utils/formatDate';
import { slugify, uniqueSlug } from '../utils/slugify';
import { DEFAULT_EXPENSE_CATEGORIES } from '../config/defaultExpenseCategories';
import type { ExpenseCategoryRecord, ExpenseSubcategoryRecord } from '../types/category';

function mapCategoryDoc(id: string, data: DocumentData): ExpenseCategoryRecord {
  return {
    id,
    userId: data.userId,
    name: data.name ?? '',
    slug: data.slug ?? '',
    isDefault: Boolean(data.isDefault),
    subcategories: Array.isArray(data.subcategories) ? data.subcategories : [],
    createdAt: toDate(data.createdAt)?.toISOString() ?? '',
    updatedAt: toDate(data.updatedAt)?.toISOString() ?? '',
  };
}

// Not ordered server-side (no `orderByField` passed to `subscribeForUser`)
// — that would need its own `userId` + something composite index, same as
// `accounts`/`transactions` needed, for a list that's realistically only
// ever a dozen or so entries per user. Sorted client-side instead (see
// `sortCategories` below), which needs none.
const categoriesCollection = createUserScopedCollection<ExpenseCategoryRecord>(
  'expenseCategories',
  mapCategoryDoc,
);

/** Defaults first (in their spec-defined order), then custom categories by name. */
export function sortCategories(categories: ExpenseCategoryRecord[]): ExpenseCategoryRecord[] {
  const defaultOrder = DEFAULT_EXPENSE_CATEGORIES.map((c) => slugify(c.name));
  return [...categories].sort((a, b) => {
    const aIndex = defaultOrder.indexOf(a.slug);
    const bIndex = defaultOrder.indexOf(b.slug);
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return a.name.localeCompare(b.name);
  });
}

export function subscribeToExpenseCategories(
  userId: string,
  onData: (categories: ExpenseCategoryRecord[]) => void,
  onError: (error: Error) => void,
): () => void {
  return categoriesCollection.subscribeForUser(
    userId,
    (categories) => onData(sortCategories(categories)),
    onError,
  );
}

/**
 * Idempotently seeds whichever of the 9 default categories aren't already
 * present (matched by slug — so re-running this after a partial failure,
 * or for a user who already has some, only creates what's missing). Slugs
 * are computed with the exact same `slugify` rule the fixed Phase 5 enum's
 * values already were ('Food' -> 'food', 'Public Transport' ->
 * 'public_transport'), so every expense transaction recorded before this
 * phase keeps resolving to the right category with no migration.
 */
export async function ensureDefaultExpenseCategories(
  userId: string,
  existingSlugs: readonly string[],
): Promise<void> {
  const existing = new Set(existingSlugs);
  const missing = DEFAULT_EXPENSE_CATEGORIES.filter((c) => !existing.has(slugify(c.name)));
  await Promise.all(
    missing.map((defaultCategory) => {
      const subcategories: ExpenseSubcategoryRecord[] = defaultCategory.subcategories.map(
        (name) => ({ slug: slugify(name), name }),
      );
      return categoriesCollection.create(userId, {
        name: defaultCategory.name,
        slug: slugify(defaultCategory.name),
        isDefault: true,
        subcategories,
      });
    }),
  );
}

export function createExpenseCategory(
  userId: string,
  existingSlugs: readonly string[],
  name: string,
): Promise<string> {
  const slug = uniqueSlug(slugify(name), existingSlugs);
  return categoriesCollection.create(userId, { name, slug, isDefault: false, subcategories: [] });
}

/** `slug` is immutable once created (transactions reference it) — only the
 * display name can change, same pattern as accounts' `openingBalance`. */
export function renameExpenseCategory(id: string, name: string): Promise<void> {
  return categoriesCollection.update(id, { name });
}

export function deleteExpenseCategory(id: string): Promise<void> {
  return categoriesCollection.remove(id);
}

export function addExpenseSubcategory(
  category: ExpenseCategoryRecord,
  name: string,
): Promise<void> {
  const slug = uniqueSlug(
    slugify(name),
    category.subcategories.map((s) => s.slug),
  );
  const subcategories = [...category.subcategories, { slug, name }];
  return categoriesCollection.update(category.id, { subcategories });
}

export function renameExpenseSubcategory(
  category: ExpenseCategoryRecord,
  subcategorySlug: string,
  name: string,
): Promise<void> {
  const subcategories = category.subcategories.map((s) =>
    s.slug === subcategorySlug ? { ...s, name } : s,
  );
  return categoriesCollection.update(category.id, { subcategories });
}

export function removeExpenseSubcategory(
  category: ExpenseCategoryRecord,
  subcategorySlug: string,
): Promise<void> {
  const subcategories = category.subcategories.filter((s) => s.slug !== subcategorySlug);
  return categoriesCollection.update(category.id, { subcategories });
}
