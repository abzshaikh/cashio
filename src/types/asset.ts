/**
 * A manually-tracked asset (Phase 27, Net Worth) — for things Net Worth
 * needs to count that no earlier phase already tracks anywhere: property,
 * a vehicle, an outside investment, or anything else with a value worth
 * including. Deliberately NOT for cash/bank/savings/wallet balances —
 * those are already `Account`s (Phase 3) and Net Worth reads their
 * `currentBalance` directly (see `utils/netWorthCalculations.ts`) rather
 * than asking the user to re-enter them here.
 *
 * `type` is a fixed enum rather than a free-form string so the UI can show
 * a consistent icon/label per type (same convention every other
 * category-like field in this app follows), but the enum itself — plus
 * `label`/`value`/`asOf` being the only other fields — is deliberately
 * minimal: adding a new asset type later (e.g. "collectible") is just
 * adding one more value to `ASSET_TYPES` and its meta map, never a
 * schema migration, since every asset document already has the same
 * shape regardless of which type it is.
 */
export const ASSET_TYPES = ['property', 'vehicle', 'investment', 'other'] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

export interface Asset {
  id: string;
  userId: string;
  type: AssetType;
  label: string;
  value: number;
  /** ISO date string — when `value` was last known to be accurate. There's
   * no automatic revaluation; the user updates it (and `asOf`) by editing
   * the entry whenever the real value changes. */
  asOf: string;
  createdAt: string;
  updatedAt: string;
}

export type NewAssetInput = Pick<Asset, 'type' | 'label' | 'value'> & { asOf: Date };
export type UpdatableAssetFields = NewAssetInput;
