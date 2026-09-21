import { useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import { FormTextField } from '../common/form/FormTextField';
import { FormSelect } from '../common/form/FormSelect';
import { FormDatePicker } from '../common/form/FormDatePicker';
import {
  liabilityFormSchema,
  defaultLiabilityFormValues,
  type LiabilityFormValues,
} from '../../schemas/liabilitySchemas';
import { liabilityTypeOptions } from '../../config/liabilityTypes';

interface LiabilityFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialValues?: LiabilityFormValues;
  onClose: () => void;
  onSubmit: (values: LiabilityFormValues) => Promise<void>;
}

/** Adds/edits a manually-tracked liability — the debt-side mirror of
 * `AssetFormDialog`, same shape. */
export function LiabilityFormDialog({
  open,
  mode,
  initialValues,
  onClose,
  onSubmit,
}: LiabilityFormDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      {open && (
        <LiabilityFormFields mode={mode} initialValues={initialValues} onClose={onClose} onSubmit={onSubmit} />
      )}
    </Dialog>
  );
}

type LiabilityFormFieldsProps = Omit<LiabilityFormDialogProps, 'open'>;

function LiabilityFormFields({ mode, initialValues, onClose, onSubmit }: LiabilityFormFieldsProps) {
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LiabilityFormValues>({
    resolver: zodResolver(liabilityFormSchema) as Resolver<LiabilityFormValues>,
    defaultValues: initialValues ?? defaultLiabilityFormValues,
  });

  const submit = async (values: LiabilityFormValues) => {
    setFormError(null);
    try {
      await onSubmit(values);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Something went wrong.');
    }
  };

  return (
    <>
      <DialogTitle>{mode === 'create' ? 'Add Liability' : 'Edit Liability'}</DialogTitle>
      <DialogContent>
        <Stack
          component="form"
          id="liability-form"
          spacing={2.5}
          sx={{ mt: 0.5 }}
          onSubmit={handleSubmit(submit)}
          noValidate
        >
          {formError && <Alert severity="error">{formError}</Alert>}
          <FormSelect name="type" control={control} label="Type" options={liabilityTypeOptions} />
          <FormTextField name="label" control={control} label="Label" placeholder="e.g. Back taxes" autoFocus />
          <FormTextField name="value" control={control} label="Amount owed" type="number" />
          <FormDatePicker name="asOf" control={control} label="As of" />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button type="submit" form="liability-form" variant="contained" loading={isSubmitting}>
          {mode === 'create' ? 'Add Liability' : 'Save changes'}
        </Button>
      </DialogActions>
    </>
  );
}
