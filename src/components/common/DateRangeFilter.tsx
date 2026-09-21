import Stack from '@mui/material/Stack';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select, { type SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { DATE_RANGE_PRESETS, DATE_RANGE_PRESET_LABELS, type DateRangePreset } from '../../utils/dateRangePresets';

export interface DateRangeFilterValue {
  preset: DateRangePreset;
  customStart: Date | null;
  customEnd: Date | null;
}

interface DateRangeFilterProps {
  value: DateRangeFilterValue;
  onChange: (value: DateRangeFilterValue) => void;
  label?: string;
}

/**
 * A reusable date-range picker: a preset dropdown (Phase 13's "date
 * filtering") plus, when "Custom range" is chosen, two date pickers.
 * Deliberately generic over how the caller uses the result — it just
 * reports the resolved `DateRangeFilterValue`; pass it through
 * `utils/dateRangePresets.ts`'s `getDateRangeForPreset` to get concrete
 * bounds, then `isWithinDateRange` to filter a list of dated records.
 */
export function DateRangeFilter({ value, onChange, label = 'Date range' }: DateRangeFilterProps) {
  const handlePresetChange = (event: SelectChangeEvent) => {
    onChange({ ...value, preset: event.target.value as DateRangePreset });
  };

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel id="date-range-preset-label">{label}</InputLabel>
        <Select
          labelId="date-range-preset-label"
          label={label}
          value={value.preset}
          onChange={handlePresetChange}
        >
          {DATE_RANGE_PRESETS.map((preset) => (
            <MenuItem key={preset} value={preset}>
              {DATE_RANGE_PRESET_LABELS[preset]}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {value.preset === 'custom' && (
        <>
          <DatePicker
            label="From"
            value={value.customStart}
            onChange={(date) => onChange({ ...value, customStart: date })}
            slotProps={{ textField: { size: 'small' } }}
          />
          <DatePicker
            label="To"
            value={value.customEnd}
            onChange={(date) => onChange({ ...value, customEnd: date })}
            slotProps={{ textField: { size: 'small' } }}
          />
        </>
      )}
    </Stack>
  );
}
