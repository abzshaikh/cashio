import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import TextField, { type TextFieldProps } from '@mui/material/TextField';

type Props<T extends FieldValues> = {
  name: Path<T>;
  control: Control<T>;
  label: string;
} & Omit<TextFieldProps, 'name' | 'defaultValue'>;

export function FormTextField<T extends FieldValues>({
  name,
  control,
  label,
  ...rest
}: Props<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <TextField
          {...field}
          {...rest}
          value={field.value ?? ''}
          label={label}
          fullWidth
          error={Boolean(fieldState.error)}
          helperText={fieldState.error?.message ?? rest.helperText}
        />
      )}
    />
  );
}
