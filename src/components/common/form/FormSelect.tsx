import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormHelperText from '@mui/material/FormHelperText';

export interface FormSelectOption {
  value: string;
  label: string;
}

interface Props<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  options: FormSelectOption[];
  disabled?: boolean;
  /**
   * MUI's `Select` renders nothing for an empty-string value unless this
   * is set — needed for a select whose empty option is a real, meaningful
   * choice (e.g. `PreferencesSection`'s "No default"), not just the
   * unselected initial state every other `FormSelect` in this app relies
   * on (those always have a non-empty required value once populated, so
   * they've never needed this).
   */
  displayEmpty?: boolean;
  /**
   * Fires with the new value in the same change event as `field.onChange`
   * — for a dependent field that needs to react to this one (e.g.
   * resetting a subcategory select when its parent category changes).
   * Deliberately not a `useEffect` watching this field's value: doing the
   * reset there would be a second, separate render off the back of the
   * first, which is exactly the "setState in an effect" pattern to avoid
   * when the event that should trigger it is already known.
   */
  onValueChange?: (value: string) => void;
}

export function FormSelect<T extends FieldValues>({
  name,
  control,
  label,
  options,
  disabled,
  displayEmpty,
  onValueChange,
}: Props<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <FormControl fullWidth error={Boolean(fieldState.error)} disabled={disabled}>
          <InputLabel id={`${name}-label`} shrink={displayEmpty ? true : undefined}>
            {label}
          </InputLabel>
          <Select
            {...field}
            value={field.value ?? ''}
            labelId={`${name}-label`}
            label={label}
            displayEmpty={displayEmpty}
            onChange={(event) => {
              field.onChange(event);
              onValueChange?.(event.target.value);
            }}
          >
            {options.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
          {fieldState.error?.message && (
            <FormHelperText>{fieldState.error.message}</FormHelperText>
          )}
        </FormControl>
      )}
    />
  );
}
