import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import { FormTextField } from '../common/form/FormTextField';
import { tagFormSchema, defaultTagFormValues, type TagFormValues } from '../../schemas/tagSchemas';
import { TAG_COLORS } from '../../types/tag';

const COLOR_LABELS: Record<(typeof TAG_COLORS)[number], string> = {
  default: 'Gray',
  primary: 'Blue',
  secondary: 'Purple',
  success: 'Green',
  error: 'Red',
  warning: 'Orange',
  info: 'Teal',
};

interface TagFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialValues?: TagFormValues;
  onClose: () => void;
  onSubmit: (values: TagFormValues) => Promise<void>;
}

export function TagFormDialog({ open, mode, initialValues, onClose, onSubmit }: TagFormDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      {open && (
        <TagFormFields mode={mode} initialValues={initialValues} onClose={onClose} onSubmit={onSubmit} />
      )}
    </Dialog>
  );
}

type TagFormFieldsProps = Omit<TagFormDialogProps, 'open'>;

function TagFormFields({ mode, initialValues, onClose, onSubmit }: TagFormFieldsProps) {
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<TagFormValues>({
    resolver: zodResolver(tagFormSchema),
    defaultValues: initialValues ?? defaultTagFormValues,
  });

  const submit = async (values: TagFormValues) => {
    setFormError(null);
    try {
      await onSubmit(values);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Something went wrong.');
    }
  };

  return (
    <>
      <DialogTitle>{mode === 'create' ? 'Add Tag' : 'Edit Tag'}</DialogTitle>
      <DialogContent>
        <Stack
          component="form"
          id="tag-form"
          spacing={2.5}
          sx={{ mt: 0.5 }}
          onSubmit={handleSubmit(submit)}
          noValidate
        >
          {formError && <Alert severity="error">{formError}</Alert>}
          <FormTextField
            name="name"
            control={control}
            label="Tag name"
            placeholder="e.g. Vacation"
            autoFocus
          />
          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary">
              Color
            </Typography>
            <Controller
              name="color"
              control={control}
              render={({ field }) => (
                <Stack
                  direction="row"
                  spacing={1}
                  role="radiogroup"
                  aria-label="Color"
                  sx={{ flexWrap: 'wrap', gap: 1 }}
                >
                  {TAG_COLORS.map((color) => (
                    <Chip
                      key={color}
                      label={COLOR_LABELS[color]}
                      size="small"
                      color={color}
                      variant={field.value === color ? 'filled' : 'outlined'}
                      onClick={() => field.onChange(color)}
                      role="radio"
                      aria-checked={field.value === color}
                    />
                  ))}
                </Stack>
              )}
            />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button type="submit" form="tag-form" variant="contained" loading={isSubmitting}>
          {mode === 'create' ? 'Add Tag' : 'Save changes'}
        </Button>
      </DialogActions>
    </>
  );
}
