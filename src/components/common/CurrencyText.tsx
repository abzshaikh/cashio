import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';
import { formatCurrency, type FormatCurrencyOptions } from '../../utils/formatCurrency';

interface CurrencyTextProps extends FormatCurrencyOptions {
  amount: number;
  /** Colors the text green/red based on sign. Off by default. */
  colorBySign?: boolean;
  component?: 'span' | 'div';
  sx?: SxProps<Theme>;
}

export function CurrencyText({
  amount,
  colorBySign = false,
  component = 'span',
  sx,
  ...formatOptions
}: CurrencyTextProps) {
  const color = colorBySign
    ? amount > 0
      ? 'success.main'
      : amount < 0
        ? 'error.main'
        : 'text.primary'
    : undefined;

  return (
    <Box component={component} sx={{ color, fontVariantNumeric: 'tabular-nums', ...sx }}>
      {formatCurrency(amount, formatOptions)}
    </Box>
  );
}
