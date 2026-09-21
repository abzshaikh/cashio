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
import { assetFormSchema, defaultAssetFormValues, type AssetFormValues } from '../../schemas/assetSchemas';
import { assetTypeOptions } from '../../config/assetTypes';

interface AssetFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialValues?: AssetFormValues;
  onClose: () => void;
  onSubmit: (values: AssetFormValues) => Promise<void>;
}

/** Adds/edits a manually-tracked asset — same shape as `GoalFormDialog`,
 * just three fields (type, label, value) plus an `asOf` date. */
export function AssetFormDialog({ open, mode, initialValues, onClose, onSubmit }: AssetFormDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      {open && (
        <AssetFormFields mode={mode} initialValues={initialValues} onClose={onClose} onSubmit={onSubmit} />
      )}
    </Dialog>
  );
}

type AssetFormFieldsProps = Omit<AssetFormDialogProps, 'open'>;

function AssetFormFields({ mode, initialValues, onClose, onSubmit }: AssetFormFieldsProps) {
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<AssetFormValues>({
    // See the matching comment in BudgetFormDialog.tsx — zod v4's
    // z.coerce.number() input type doesn't quite fit a plain Resolver.
    resolver: zodResolver(assetFormSchema) as Resolver<AssetFormValues>,
    defaultValues: initialValues ?? defaultAssetFormValues,
  });

  const submit = async (values: AssetFormValues) => {
    setFormError(null);
    try {
      await onSubmit(values);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Something went wrong.');
    }
  };

  return (
    <>
      <DialogTitle>{mode === 'create' ? 'Add Asset' : 'Edit Asset'}</DialogTitle>
      <DialogContent>
        <Stack
          component="form"
          id="asset-form"
          spacing={2.5}
          sx={{ mt: 0.5 }}
          onSubmit={handleSubmit(submit)}
          noValidate
        >
          {formError && <Alert severity="error">{formError}</Alert>}
          <FormSelect name="type" control={control} label="Type" options={assetTypeOptions} />
          <FormTextField name="label" control={control} label="Label" placeholder="e.g. Family home" autoFocus />
          <FormTextField name="value" control={control} label="Current value" type="number" />
          <FormDatePicker name="asOf" control={control} label="As of" />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button type="submit" form="asset-form" variant="contained" loading={isSubmitting}>
          {mode === 'create' ? 'Add Asset' : 'Save changes'}
        </Button>
      </DialogActions>
    </>
  );
}
