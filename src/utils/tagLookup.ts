import type { Tag, TagColor } from '../types/tag';

/**
 * Pure helpers for resolving a transaction's stored tag slugs against the
 * live tag list — same reasoning as `expenseCategoryLookup.ts`: the slug is
 * what's actually stored (stable, never changes), while the name/color a
 * user sees for it can change at any time by editing the tag in
 * `TagsSection`, so every display site looks them up live rather than
 * trusting a value captured at the time the transaction was recorded.
 */

export interface TagOption {
  value: string;
  label: string;
  color: TagColor;
}

/** Shaped to drop straight into `FormTagsInput`'s `options` prop (its
 * `FormTagOption` is structurally identical) without that shared,
 * low-level form component needing to import anything from `services/` or
 * know how a tag's options are actually produced. */
export function toTagOptions(tags: Tag[]): TagOption[] {
  return tags.map((t) => ({ value: t.slug, label: t.name, color: t.color }));
}

/** Falls back to the raw slug when the tag can't be found — e.g. it was
 * deleted after the transaction was tagged (the same known limitation
 * already accepted for a deleted expense category, see
 * `getCategoryLabel`). */
export function getTagLabel(tags: Tag[], slug: string): string {
  return tags.find((t) => t.slug === slug)?.name ?? slug;
}

/** Falls back to 'default' (a plain, uncolored chip) for an unknown slug —
 * same reasoning as `getTagLabel`. */
export function getTagColor(tags: Tag[], slug: string): TagColor {
  return tags.find((t) => t.slug === slug)?.color ?? 'default';
}
