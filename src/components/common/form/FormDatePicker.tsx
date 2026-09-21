import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

interface Props<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  disabled?: boolean;
}

export function FormDatePicker<T extends FieldValues>({
  name,
  control,
  label,
  disabled,
}: Props<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <DatePicker
          label={label}
          value={field.value ?? null}
          onChange={field.onChange}
          disabled={disabled}
          slotProps={{
            textField: {
              fullWidth: true,
              error: Boolean(fieldState.error),
              helperText: fieldState.error?.message,
              onBlur: field.onBlur,
            },
          }}
        />
      )}
    />
  );
}
