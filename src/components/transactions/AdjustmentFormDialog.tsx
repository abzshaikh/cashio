import { useMemo, useState } from 'react';
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
import { FormSelect, type FormSelectOption } from '../common/form/FormSelect';
import { FormDatePicker } from '../common/form/FormDatePicker';
import { FormTagsInput } from '../common/form/FormTagsInput';
import {
  adjustmentFormSchema,
  defaultAdjustmentFormValues,
  type AdjustmentFormValues,
} from '../../schemas/adjustmentSchemas';
import { toTagOptions } from '../../utils/tagLookup';
import type { Tag } from '../../types/tag';

const directionOptions: FormSelectOption[] = [
  { value: 'increase', label: 'Increase balance' },
  { value: 'decrease', label: 'Decrease balance' },
];

interface AdjustmentFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialValues?: AdjustmentFormValues;
  accountOptions: FormSelectOption[];
  tags: Tag[];
  onClose: () => void;
  onSubmit: (values: AdjustmentFormValues) => Promise<void>;
}

export function AdjustmentFormDialog({
  open,
  mode,
  initialValues,
  accountOptions,
  tags,
  onClose,
  onSubmit,
}: AdjustmentFormDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      {open && (
        <AdjustmentFormFields
          mode={mode}
          initialValues={initialValues}
          accountOptions={accountOptions}
          tags={tags}
          onClose={onClose}
          onSubmit={onSubmit}
        />
      )}
    </Dialog>
  );
}

type AdjustmentFormFieldsProps = Omit<AdjustmentFormDialogProps, 'open'>;

function AdjustmentFormFields({
  mode,
  initialValues,
  accountOptions,
  tags,
  onClose,
  onSubmit,
}: AdjustmentFormFieldsProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const tagOptions = useMemo(() => toTagOptions(tags), [tags]);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<AdjustmentFormValues>({
    // See the matching comment in AccountFormDialog.tsx — zod v4's
    // z.coerce.number() has an `unknown` input type that doesn't quite fit
    // a plain Resolver<AdjustmentFormValues>. The coercion still happens
    // correctly at runtime.
    resolver: zodResolver(adjustmentFormSchema) as Resolver<AdjustmentFormValues>,
    defaultValues: initialValues ?? defaultAdjustmentFormValues,
  });

  const submit = async (values: AdjustmentFormValues) => {
    setFormError(null);
    try {
      await onSubmit(values);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Something went wrong.');
    }
  };

  return (
    <>
      <DialogTitle>{mode === 'create' ? 'Add Adjustment' : 'Edit Adjustment'}</DialogTitle>
      <DialogContent>
        <Stack
          component="form"
          id="adjustment-form"
          spacing={2.5}
          sx={{ mt: 0.5 }}
          onSubmit={handleSubmit(submit)}
          noValidate
        >
          {formError && <Alert severity="error">{formError}</Alert>}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormTextField
              name="amount"
              control={control}
              label="Amount"
              type="number"
              autoFocus
            />
            <FormDatePicker name="date" control={control} label="Date" />
          </Stack>
          <FormSelect name="accountId" control={control} label="Account" options={accountOptions} />
          <FormSelect
            name="direction"
            control={control}
            label="Direction"
            options={directionOptions}
          />
          <FormTextField
            name="reason"
            control={control}
            label="Reason"
            placeholder="e.g. Reconciled cash count, corrected a bank error"
          />
          <FormTextField name="description" control={control} label="Description (optional)" />
          <FormTextField name="notes" control={control} label="Notes (optional)" multiline minRows={2} />
          <FormTagsInput name="tags" control={control} label="Tags (optional)" options={tagOptions} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button type="submit" form="adjustment-form" variant="contained" loading={isSubmitting}>
          {mode === 'create' ? 'Add Adjustment' : 'Save changes'}
        </Button>
      </DialogActions>
    </>
  );
}
