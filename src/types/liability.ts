/**
 * A manually-tracked liability (Phase 27, Net Worth) — the debt side of
 * `types/asset.ts`'s reasoning: for owed amounts no earlier phase already
 * tracks. `LIABILITY_TYPES` is deliberately narrower than it could be
 * (`loan`/`tax`/`other`, not a full re-take on `types/debt.ts`'s
 * `DEBT_CATEGORIES`) because Phase 17's `Debt` already comprehensively
 * covers structured, tracked-over-time loans — this collection is for
 * informal or one-off owed amounts (back taxes, an IOU) that don't need
 * that feature's full payment-schedule tracking, plus `loan` as an escape
 * hatch for a loan the user doesn't want to set up as a full `Debt`. Same
 * "add a type later without a schema migration" design as `Asset`.
 */
export const LIABILITY_TYPES = ['loan', 'tax', 'other'] as const;
export type LiabilityType = (typeof LIABILITY_TYPES)[number];

export interface Liability {
  id: string;
  userId: string;
  type: LiabilityType;
  label: string;
  value: number;
  /** ISO date string — when `value` was last known to be accurate. */
  asOf: string;
  createdAt: string;
  updatedAt: string;
}

export type NewLiabilityInput = Pick<Liability, 'type' | 'label' | 'value'> & { asOf: Date };
export type UpdatableLiabilityFields = NewLiabilityInput;
