import { useMemo, useState } from 'react';
import { useForm, useWatch, type Resolver } from 'react-hook-form';
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
  transferFormSchema,
  defaultTransferFormValues,
  type TransferFormValues,
} from '../../schemas/transferSchemas';
import { toTagOptions } from '../../utils/tagLookup';
import type { Tag } from '../../types/tag';

interface TransferFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialValues?: TransferFormValues;
  accountOptions: FormSelectOption[];
  tags: Tag[];
  onClose: () => void;
  onSubmit: (values: TransferFormValues) => Promise<void>;
}

export function TransferFormDialog({
  open,
  mode,
  initialValues,
  accountOptions,
  tags,
  onClose,
  onSubmit,
}: TransferFormDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      {open && (
        <TransferFormFields
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

type TransferFormFieldsProps = Omit<TransferFormDialogProps, 'open'>;

function TransferFormFields({
  mode,
  initialValues,
  accountOptions,
  tags,
  onClose,
  onSubmit,
}: TransferFormFieldsProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const tagOptions = useMemo(() => toTagOptions(tags), [tags]);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<TransferFormValues>({
    // See the matching comment in ExpenseFormDialog.tsx — zod v4's
    // z.coerce.number() has an `unknown` input type that doesn't quite fit
    // a plain Resolver<TransferFormValues>. The coercion still happens
    // correctly at runtime.
    resolver: zodResolver(transferFormSchema) as Resolver<TransferFormValues>,
    defaultValues: initialValues ?? defaultTransferFormValues,
  });

  const fromAccountId = useWatch({ control, name: 'fromAccountId' });
  const toAccountId = useWatch({ control, name: 'toAccountId' });

  // Each side excludes whatever the other side currently has selected, so
  // the user can't even pick the same account for both — a friendlier,
  // earlier backstop than waiting for the schema's `.refine` to reject it
  // on submit.
  const fromAccountOptions = useMemo(
    () => accountOptions.filter((option) => option.value !== toAccountId),
    [accountOptions, toAccountId],
  );
  const toAccountOptions = useMemo(
    () => accountOptions.filter((option) => option.value !== fromAccountId),
    [accountOptions, fromAccountId],
  );

  const submit = async (values: TransferFormValues) => {
    setFormError(null);
    try {
      await onSubmit(values);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Something went wrong.');
    }
  };

  return (
    <>
      <DialogTitle>{mode === 'create' ? 'Add Transfer' : 'Edit Transfer'}</DialogTitle>
      <DialogContent>
        <Stack
          component="form"
          id="transfer-form"
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
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormSelect
              name="fromAccountId"
              control={control}
              label="From Account"
              options={fromAccountOptions}
            />
            <FormSelect
              name="toAccountId"
              control={control}
              label="To Account"
              options={toAccountOptions}
            />
          </Stack>
          <FormTextField name="description" control={control} label="Description (optional)" />
          <FormTextField name="notes" control={control} label="Notes (optional)" multiline minRows={2} />
          <FormTagsInput name="tags" control={control} label="Tags (optional)" options={tagOptions} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button type="submit" form="transfer-form" variant="contained" loading={isSubmitting}>
          {mode === 'create' ? 'Add Transfer' : 'Save changes'}
        </Button>
      </DialogActions>
    </>
  );
}
