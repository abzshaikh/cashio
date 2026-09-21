import { useMemo, useState } from 'react';
import { getMonthRange } from '../utils/reportCalculations';

/**
 * The "page through calendar months, never past the current one" state
 * Phase 12's Reports page introduced (`monthOffset` relative to today).
 * Extracted here so Phase 22's Monthly Summary page can share the exact
 * same behavior instead of re-deriving it — any future page that needs to
 * walk a single selected month backward/forward can reuse this too.
 */
export function useMonthNavigation() {
  const [monthOffset, setMonthOffset] = useState(0);

  const selectedMonthDate = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  }, [monthOffset]);

  const { start: monthStart, end: monthEnd } = useMemo(
    () => getMonthRange(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth()),
    [selectedMonthDate],
  );

  const monthLabel = useMemo(
    () => selectedMonthDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
    [selectedMonthDate],
  );

  const goToPreviousMonth = () => setMonthOffset((offset) => offset - 1);
  // Mirrors the Reports page's original guard: never navigate into a future
  // month.
  const goToNextMonth = () => setMonthOffset((offset) => Math.min(offset + 1, 0));
  const isAtCurrentMonth = monthOffset >= 0;

  return {
    selectedMonthDate,
    monthStart,
    monthEnd,
    monthLabel,
    goToPreviousMonth,
    goToNextMonth,
    isAtCurrentMonth,
  };
}
