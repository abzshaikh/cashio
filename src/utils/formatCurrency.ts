/**
 * Centralized currency formatting. As of Phase 34, every monetary value
 * throughout the app's domain model is stored and computed as an integer
 * number of **minor units** (paise, not rupees — see `utils/money.ts`'s
 * module doc comment for the full rationale) — this is the one place that
 * converts back to a decimal major-unit value for display; values are only
 * ever formatted here, never persisted as formatted strings. Every existing
 * call site (e.g. `CurrencyText`, which just forwards its `amount` prop
 * straight to this function) needed no change for this phase — they already
 * just pass through whatever a domain field holds, and that field's
 * *meaning* is what changed, transparently, right here.
 */
import { toMajorUnits } from './money';

export const DEFAULT_CURRENCY = 'INR';
export const DEFAULT_LOCALE = 'en-IN';

export interface FormatCurrencyOptions {
  currency?: string;
  locale?: string;
  /** Show +/- sign explicitly. Useful for transaction lists. */
  signDisplay?: 'auto' | 'always' | 'never' | 'exceptZero';
  /** Omit fractional digits when the value is a whole number. */
  compactFraction?: boolean;
}

/** `amount` is an integer minor-unit value (e.g. `125050` for ₹1,250.50) —
 * see this module's doc comment. */
export function formatCurrency(
  amount: number,
  options: FormatCurrencyOptions = {},
): string {
  const {
    currency = DEFAULT_CURRENCY,
    locale = DEFAULT_LOCALE,
    signDisplay = 'auto',
    compactFraction = true,
  } = options;

  if (!Number.isFinite(amount)) return '—';

  const majorAmount = toMajorUnits(amount);
  const hasFraction = !Number.isInteger(majorAmount);

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    signDisplay,
    minimumFractionDigits: compactFraction && !hasFraction ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(majorAmount);
}

/** Formats a plain number with locale-aware grouping (no currency symbol). */
export function formatNumber(value: number, locale = DEFAULT_LOCALE): string {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(locale).format(value);
}

/** Formats a ratio (0–1 or beyond) as a percentage string, e.g. 78.1%. */
export function formatPercent(ratio: number, fractionDigits = 1): string {
  if (!Number.isFinite(ratio)) return '—';
  return `${(ratio * 100).toFixed(fractionDigits)}%`;
}
