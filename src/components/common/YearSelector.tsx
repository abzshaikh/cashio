import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ChevronLeftOutlinedIcon from '@mui/icons-material/ChevronLeftOutlined';
import ChevronRightOutlinedIcon from '@mui/icons-material/ChevronRightOutlined';

interface YearSelectorProps {
  /** Display label, e.g. "2026". */
  label: string;
  onPrevious: () => void;
  onNext: () => void;
  /** Disables the "Next year" button — used to stop navigation past the
   * current year. */
  nextDisabled: boolean;
}

/**
 * The year-scoped sibling of `MonthSelector.tsx` (paired with
 * `hooks/useYearNavigation.ts`) for Phase 23's Yearly Summary page — same
 * control and behavior, one calendar tier up.
 */
export function YearSelector({ label, onPrevious, onNext, nextDisabled }: YearSelectorProps) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <IconButton size="small" aria-label="Previous year" onClick={onPrevious}>
        <ChevronLeftOutlinedIcon />
      </IconButton>
      <Typography variant="subtitle1" sx={{ minWidth: 100, textAlign: 'center', fontWeight: 600 }}>
        {label}
      </Typography>
      <IconButton size="small" aria-label="Next year" onClick={onNext} disabled={nextDisabled}>
        <ChevronRightOutlinedIcon />
      </IconButton>
    </Stack>
  );
}
