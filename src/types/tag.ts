/**
 * Phase 21 formalizes the tag system `FormTagsInput` foreshadowed since
 * Phase 8 ("no fixed option list and no separate tags collection — Phase
 * 21 formalizes a real tag system... this is the seed of it, not a preview
 * of it"). Follows the exact same `slug`/`name` split Phase 6's
 * `ExpenseCategoryRecord` already established: `slug` is the stable
 * identifier a transaction's `tags: string[]` array actually stores
 * (unchanged field, unchanged shape — only what its entries mean changes,
 * from arbitrary freeSolo text to a real tag's slug), `name` is the
 * editable display label. Renaming a tag is free (every transaction that
 * references its slug picks up the new name automatically via
 * `utils/tagLookup.ts`'s live lookup); deleting one leaves existing
 * transactions holding a slug that no longer resolves to a tag record —
 * the same accepted "shows as plain text" limitation Phase 6 documented
 * for a deleted expense category.
 */
export interface Tag {
  id: string;
  userId: string;
  /** Stable identifier stored in a transaction's `tags` array — immutable
   * once created. */
  slug: string;
  /** Editable display label. */
  name: string;
  color: TagColor;
  createdAt: string;
  updatedAt: string;
}

/**
 * A fixed palette of MUI's own theme colors (not arbitrary hex) — the same
 * reasoning `TRANSACTION_TYPE_CHIP_META` already follows: these stay
 * legible and on-brand in both light and dark mode for free, where a
 * user-picked hex value would need its own contrast handling per theme
 * (the exact problem Phase 18's `palette.status` extension solved for
 * credit-card status chips, not worth reopening here for tags).
 */
export const TAG_COLORS = ['default', 'primary', 'secondary', 'success', 'error', 'warning', 'info'] as const;
export type TagColor = (typeof TAG_COLORS)[number];

export interface NewTagInput {
  name: string;
  color: TagColor;
}

export interface UpdatableTagFields {
  name: string;
  color: TagColor;
}
