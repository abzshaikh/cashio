import { useMemo, useState } from 'react';
import { getYearRange } from '../utils/reportCalculations';

/**
 * The year-scoped sibling of `useMonthNavigation.ts`: "page through
 * calendar years, never past the current one" state for Phase 23's Yearly
 * Summary page. Same shape and the same guard as its monthly counterpart,
 * just one calendar tier up.
 */
export function useYearNavigation() {
  const [yearOffset, setYearOffset] = useState(0);

  const selectedYear = useMemo(() => new Date().getFullYear() + yearOffset, [yearOffset]);

  const { start: yearStart, end: yearEnd } = useMemo(
    () => getYearRange(selectedYear),
    [selectedYear],
  );

  const yearLabel = useMemo(() => String(selectedYear), [selectedYear]);

  const goToPreviousYear = () => setYearOffset((offset) => offset - 1);
  // Mirrors `useMonthNavigation`'s guard: never navigate into a future year.
  const goToNextYear = () => setYearOffset((offset) => Math.min(offset + 1, 0));
  const isAtCurrentYear = yearOffset >= 0;

  return {
    selectedYear,
    yearStart,
    yearEnd,
    yearLabel,
    goToPreviousYear,
    goToNextYear,
    isAtCurrentYear,
  };
}
