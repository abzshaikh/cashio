import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';

interface Props<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  options: string[];
  disabled?: boolean;
}

export function FormAutocomplete<T extends FieldValues>({
  name,
  control,
  label,
  options,
  disabled,
}: Props<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Autocomplete
          options={options}
          value={field.value || null}
          onChange={(_event, value) => field.onChange(value ?? '')}
          disabled={disabled}
          renderInput={(params) => (
            <TextField
              {...params}
              label={label}
              onBlur={field.onBlur}
              error={Boolean(fieldState.error)}
              helperText={fieldState.error?.message}
            />
          )}
        />
      )}
    />
  );
}
