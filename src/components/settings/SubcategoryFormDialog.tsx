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
  subcategoryFormSchema,
  defaultSubcategoryFormValues,
  type SubcategoryFormValues,
} from '../../schemas/categorySchemas';

interface SubcategoryFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  categoryName: string;
  initialValues?: SubcategoryFormValues;
  onClose: () => void;
  onSubmit: (values: SubcategoryFormValues) => Promise<void>;
}

export function SubcategoryFormDialog({
  open,
  mode,
  categoryName,
  initialValues,
  onClose,
  onSubmit,
}: SubcategoryFormDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      {open && (
        <SubcategoryFormFields
          mode={mode}
          categoryName={categoryName}
          initialValues={initialValues}
          onClose={onClose}
          onSubmit={onSubmit}
        />
      )}
    </Dialog>
  );
}

type SubcategoryFormFieldsProps = Omit<SubcategoryFormDialogProps, 'open'>;

function SubcategoryFormFields({
  mode,
  categoryName,
  initialValues,
  onClose,
  onSubmit,
}: SubcategoryFormFieldsProps) {
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<SubcategoryFormValues>({
    resolver: zodResolver(subcategoryFormSchema),
    defaultValues: initialValues ?? defaultSubcategoryFormValues,
  });

  const submit = async (values: SubcategoryFormValues) => {
    setFormError(null);
    try {
      await onSubmit(values);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Something went wrong.');
    }
  };

  return (
    <>
      <DialogTitle>
        {mode === 'create' ? `Add Subcategory to ${categoryName}` : 'Rename Subcategory'}
      </DialogTitle>
      <DialogContent>
        <Stack
          component="form"
          id="subcategory-form"
          spacing={2.5}
          sx={{ mt: 0.5 }}
          onSubmit={handleSubmit(submit)}
          noValidate
        >
          {formError && <Alert severity="error">{formError}</Alert>}
          <FormTextField
            name="name"
            control={control}
            label="Subcategory name"
            placeholder="e.g. Vet Visits"
            autoFocus
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button type="submit" form="subcategory-form" variant="contained" loading={isSubmitting}>
          {mode === 'create' ? 'Add Subcategory' : 'Save changes'}
        </Button>
      </DialogActions>
    </>
  );
}
