import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ChevronLeftOutlinedIcon from '@mui/icons-material/ChevronLeftOutlined';
import ChevronRightOutlinedIcon from '@mui/icons-material/ChevronRightOutlined';

interface MonthSelectorProps {
  /** Display label, e.g. "February 2026". */
  label: string;
  onPrevious: () => void;
  onNext: () => void;
  /** Disables the "Next month" button — every consumer so far uses this to
   * stop navigation past the current month. */
  nextDisabled: boolean;
}

/**
 * The prev/next-month picker Phase 12's Reports page introduced, extracted
 * here (paired with `hooks/useMonthNavigation.ts`) so Phase 22's Monthly
 * Summary page shares the exact same control, behavior, and aria-labels
 * instead of re-implementing them — any future page that pages through
 * calendar months can reuse this too.
 */
export function MonthSelector({ label, onPrevious, onNext, nextDisabled }: MonthSelectorProps) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <IconButton size="small" aria-label="Previous month" onClick={onPrevious}>
        <ChevronLeftOutlinedIcon />
      </IconButton>
      <Typography variant="subtitle1" sx={{ minWidth: 160, textAlign: 'center', fontWeight: 600 }}>
        {label}
      </Typography>
      <IconButton size="small" aria-label="Next month" onClick={onNext} disabled={nextDisabled}>
        <ChevronRightOutlinedIcon />
      </IconButton>
    </Stack>
  );
}
