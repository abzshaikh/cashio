/**
 * Turns a display name into the lowercase, underscore-separated identifier
 * this app has used since Phase 5's fixed category enum (e.g. "Personal
 * Care" -> "personal_care", "Public Transport" -> "public_transport").
 * Phase 6 reuses the exact same rule when seeding the default categories,
 * so a slug computed from a default's name matches the value already
 * stored on any transaction recorded before this phase — no migration
 * needed.
 */
export function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Returns `base` if it doesn't collide with anything in `existingSlugs`,
 * otherwise appends `_2`, `_3`, … until it finds one that doesn't. Used so
 * a user-created category/subcategory always gets a stable, unique slug
 * even if its name slugifies to something that already exists (two
 * categories both named "Other", say).
 */
export function uniqueSlug(base: string, existingSlugs: readonly string[]): string {
  const taken = new Set(existingSlugs);
  const safeBase = base || 'category';
  if (!taken.has(safeBase)) return safeBase;
  let counter = 2;
  while (taken.has(`${safeBase}_${counter}`)) {
    counter += 1;
  }
  return `${safeBase}_${counter}`;
}
