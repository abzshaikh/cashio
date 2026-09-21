import type { ReactNode } from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

interface Props<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  /** Usually a string, but any node is fine (e.g. a severity-colored dot
   * next to a label — see `PreferencesSection`'s notification toggles). */
  label: ReactNode;
  helperText?: string;
}

export function FormSwitch<T extends FieldValues>({ name, control, label, helperText }: Props<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <FormControlLabel
          control={
            <Switch
              checked={Boolean(field.value)}
              onChange={(event) => field.onChange(event.target.checked)}
            />
          }
          label={
            helperText ? (
              <Box>
                <Typography variant="body2" component="span">
                  {label}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  {helperText}
                </Typography>
              </Box>
            ) : (
              label
            )
          }
        />
      )}
    />
  );
}
