import type { ChangeEvent } from 'react';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select, { type SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import ListItemText from '@mui/material/ListItemText';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import ClearOutlinedIcon from '@mui/icons-material/ClearOutlined';
import { TRANSACTION_TYPES, type TransactionType } from '../../types/transaction';
import { TRANSACTION_TYPE_CHIP_META } from '../../config/transactionTypeMeta';
import {
  defaultTransactionFilters,
  hasActiveTransactionFilters,
  type TransactionFilters as TransactionFiltersValue,
} from '../../utils/transactionSearch';
import { toMajorUnits, toMinorUnits } from '../../utils/money';

interface AccountOption {
  value: string;
  label: string;
}

interface TransactionFiltersProps {
  value: TransactionFiltersValue;
  onChange: (value: TransactionFiltersValue) => void;
  accountOptions: AccountOption[];
  /** How many transactions match, after these filters (and the date range
   * above them) are applied — shown next to "Clear filters" so it's clear
   * a filter is narrowing the list, not that the ledger is actually empty. */
  resultCount: number;
}

/**
 * Phase 20's search/filter bar, sitting below Phase 13's `DateRangeFilter`
 * on the Transactions page. Deliberately plain controlled `Select`s rather
 * than the RHF-`Controller`-based `FormSelect` — this isn't a form being
 * submitted, it's live filter state updated on every keystroke/selection,
 * the same reasoning `DateRangeFilter` already follows for its own preset
 * dropdown.
 */
export function TransactionFilters({ value, onChange, accountOptions, resultCount }: TransactionFiltersProps) {
  const handleQueryChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...value, query: event.target.value });
  };

  const handleTypesChange = (event: SelectChangeEvent<TransactionType[]>) => {
    const next = event.target.value;
    onChange({ ...value, types: typeof next === 'string' ? (next.split(',') as TransactionType[]) : next });
  };

  const handleAccountsChange = (event: SelectChangeEvent<string[]>) => {
    const next = event.target.value;
    onChange({ ...value, accountIds: typeof next === 'string' ? next.split(',') : next });
  };

  // Phase 34: `filters.minAmount`/`maxAmount` are compared directly against
  // `transaction.amount` in `transactionSearch.ts`, which is an integer
  // minor-unit value — so the decimal major-unit amount typed into these
  // fields converts to minor units right here, the same "convert once, at
  // the form-input boundary" pattern every amount-entry form in this app
  // follows, keeping the filter state in the same unit as what it's
  // compared against.
  const handleMinAmountChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    onChange({ ...value, minAmount: raw === '' ? null : toMinorUnits(Number(raw)) });
  };

  const handleMaxAmountChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    onChange({ ...value, maxAmount: raw === '' ? null : toMinorUnits(Number(raw)) });
  };

  const clearFilters = () => onChange(defaultTransactionFilters);

  const isActive = hasActiveTransactionFilters(value);

  return (
    <Stack spacing={1}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
        <TextField
          size="small"
          placeholder="Search merchant, source, reason, notes…"
          value={value.query}
          onChange={handleQueryChange}
          sx={{ minWidth: { sm: 260 }, flex: { sm: 1 } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchOutlinedIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="transaction-type-filter-label">Type</InputLabel>
          <Select
            labelId="transaction-type-filter-label"
            label="Type"
            multiple
            value={value.types}
            onChange={handleTypesChange}
            renderValue={(selected) =>
              selected.length === 0 ? 'All types' : `${selected.length} selected`
            }
          >
            {TRANSACTION_TYPES.map((type) => (
              <MenuItem key={type} value={type}>
                <Checkbox size="small" checked={value.types.includes(type)} />
                <ListItemText primary={TRANSACTION_TYPE_CHIP_META[type].label} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="transaction-account-filter-label">Account</InputLabel>
          <Select
            labelId="transaction-account-filter-label"
            label="Account"
            multiple
            value={value.accountIds}
            onChange={handleAccountsChange}
            renderValue={(selected) =>
              selected.length === 0 ? 'All accounts' : `${selected.length} selected`
            }
          >
            {accountOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                <Checkbox size="small" checked={value.accountIds.includes(option.value)} />
                <ListItemText primary={option.label} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          size="small"
          label="Min amount"
          type="number"
          // Displayed value converts back to major units — see the Phase 34
          // comment on `handleMinAmountChange` for why the stored filter
          // value itself is minor units.
          value={value.minAmount === null ? '' : toMajorUnits(value.minAmount)}
          onChange={handleMinAmountChange}
          sx={{ width: { sm: 130 } }}
        />
        <TextField
          size="small"
          label="Max amount"
          type="number"
          value={value.maxAmount === null ? '' : toMajorUnits(value.maxAmount)}
          onChange={handleMaxAmountChange}
          sx={{ width: { sm: 130 } }}
        />
      </Stack>

      {isActive && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            size="small"
            label={`${resultCount} matching transaction${resultCount === 1 ? '' : 's'}`}
            variant="outlined"
          />
          <Button size="small" startIcon={<ClearOutlinedIcon fontSize="small" />} onClick={clearFilters}>
            Clear filters
          </Button>
        </Box>
      )}

      {!isActive && (
        <Typography variant="caption" color="text.secondary">
          Search by merchant, income source, adjustment reason, notes, category, or account — or filter by
          type, account, and amount.
        </Typography>
      )}
    </Stack>
  );
}
