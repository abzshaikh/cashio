import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import { FormTextField } from '../common/form/FormTextField';
import {
  categoryFormSchema,
  defaultCategoryFormValues,
  type CategoryFormValues,
} from '../../schemas/categorySchemas';

interface CategoryFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialValues?: CategoryFormValues;
  onClose: () => void;
  onSubmit: (values: CategoryFormValues) => Promise<void>;
}

export function CategoryFormDialog({
  open,
  mode,
  initialValues,
  onClose,
  onSubmit,
}: CategoryFormDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      {open && (
        <CategoryFormFields
          mode={mode}
          initialValues={initialValues}
          onClose={onClose}
          onSubmit={onSubmit}
        />
      )}
    </Dialog>
  );
}

type CategoryFormFieldsProps = Omit<CategoryFormDialogProps, 'open'>;

function CategoryFormFields({ mode, initialValues, onClose, onSubmit }: CategoryFormFieldsProps) {
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: initialValues ?? defaultCategoryFormValues,
  });

  const submit = async (values: CategoryFormValues) => {
    setFormError(null);
    try {
      await onSubmit(values);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Something went wrong.');
    }
  };

  return (
    <>
      <DialogTitle>{mode === 'create' ? 'Add Category' : 'Rename Category'}</DialogTitle>
      <DialogContent>
        <Stack
          component="form"
          id="category-form"
          spacing={2.5}
          sx={{ mt: 0.5 }}
          onSubmit={handleSubmit(submit)}
          noValidate
        >
          {formError && <Alert severity="error">{formError}</Alert>}
          <FormTextField
            name="name"
            control={control}
            label="Category name"
            placeholder="e.g. Pet Care"
            autoFocus
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button type="submit" form="category-form" variant="contained" loading={isSubmitting}>
          {mode === 'create' ? 'Add Category' : 'Save changes'}
        </Button>
      </DialogActions>
    </>
  );
}
