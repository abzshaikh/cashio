/**
 * Phase 34 (Money precision): the conversion boundary between how a human
 * types/reads a currency amount (decimal major units — "1250.50" rupees)
 * and how this app stores and computes with one everywhere else (integer
 * minor units — "125050" paise). Every monetary field in the domain model
 * (`Transaction.amount`, `Account.currentBalance`, `Budget.overallAmount`,
 * `SavingsGoal.targetAmount`, `Debt.originalAmount`, `Asset.value`, etc.) —
 * and therefore every calculation in `transactionAggregation.ts`,
 * `budgetCalculations.ts`, `dashboardCalculations.ts`, and every other
 * `utils/*Calculations.ts` module — now holds an **integer number of minor
 * units**, never a decimal major-unit float. That's the entire point of
 * this phase: JS floating-point arithmetic on decimal money values (e.g.
 * `0.1 + 0.2 !== 0.3`) can silently drift after enough additions, which
 * matters when this app sums hundreds of transactions for a yearly total.
 * Integers under normal money magnitudes never have that problem.
 *
 * The only two places a decimal major-unit number is allowed to exist are
 * exactly the two edges a human touches:
 *   1. A form's amount field, and the `NewXInput`/`UpdatableXFields` shape
 *      the service layer accepts from it (per each type's own doc comment,
 *      "the shape the service layer accepts... as the form produces") —
 *      `toMinorUnits` converts it once, at the single write choke point
 *      inside each service file, before it's stored or used in balance math.
 *   2. Rendering a stored amount back into a form for editing (an
 *      `initialValues`/`defaultValues` mapping needs `toMajorUnits` so the
 *      field shows "1250.50", not "125050") and formatting a stored amount
 *      for display (`formatCurrency.ts` does this internally, so no other
 *      display call site needs to convert manually).
 *
 * This module holds no currency-specific rounding (e.g. no support for a
 * currency with 0 or 3 decimal minor-unit places) — like every other
 * single-currency simplification already accepted elsewhere in this app
 * (`accountFormatting.ts`'s `sumBalancesByCurrency`, `netWorthCalculations.ts`),
 * 2 decimal places (cents/paise) is assumed throughout.
 */

const MINOR_UNITS_PER_MAJOR_UNIT = 100;

/**
 * Converts a decimal major-unit amount (e.g. `1250.5`, as typed into a form)
 * into an integer minor-unit amount (e.g. `125050`) for storage/computation.
 * Rounds to the nearest integer minor unit rather than truncating, so a
 * value like `19.999` (a float artifact, or a user typing one extra digit)
 * lands on the nearest cent/paise instead of silently discarding it — and
 * so that `19.1 * 100` (which is `1909.9999999999998` in IEEE754) resolves
 * to the intended `1910`, not `1909`.
 */
export function toMinorUnits(majorAmount: number): number {
  if (!Number.isFinite(majorAmount)) return 0;
  const scaled = majorAmount * MINOR_UNITS_PER_MAJOR_UNIT;
  // `majorAmount * 100` can land just below the true value due to IEEE754
  // representation error — e.g. `1.005 * 100 === 100.49999999999999`,
  // which `Math.round` alone would send to 100 instead of the correct 101.
  // Nudging by a tiny relative epsilon before rounding pushes a value that
  // was only *supposed* to sit exactly on a .5 boundary back onto the
  // correct side of it, without being large enough to affect any value
  // that genuinely wasn't near that boundary.
  const nudge = Math.sign(scaled) * Math.abs(scaled) * Number.EPSILON * 4;
  return Math.round(scaled + nudge);
}

/**
 * Converts an integer minor-unit amount (e.g. `125050`, as stored/computed
 * throughout the app) back into a decimal major-unit amount (e.g. `1250.5`)
 * for display or for populating a form field a human will edit as a
 * decimal. This is the exact inverse of `toMinorUnits` for any value that
 * actually came from it — `toMinorUnits` always produces a value evenly
 * divisible by 100, so this division never itself introduces rounding
 * error worth guarding against.
 */
export function toMajorUnits(minorAmount: number): number {
  if (!Number.isFinite(minorAmount)) return 0;
  return minorAmount / MINOR_UNITS_PER_MAJOR_UNIT;
}
