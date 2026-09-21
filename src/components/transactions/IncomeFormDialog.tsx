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
import { FormSwitch } from '../common/form/FormSwitch';
import { FormTagsInput } from '../common/form/FormTagsInput';
import {
  incomeFormSchema,
  defaultIncomeFormValues,
  type IncomeFormValues,
} from '../../schemas/incomeSchemas';
import { incomeCategoryOptions } from '../../config/incomeCategories';
import { toTagOptions } from '../../utils/tagLookup';
import type { Tag } from '../../types/tag';

interface IncomeFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialValues?: IncomeFormValues;
  accountOptions: FormSelectOption[];
  tags: Tag[];
  onClose: () => void;
  onSubmit: (values: IncomeFormValues) => Promise<void>;
}

export function IncomeFormDialog({
  open,
  mode,
  initialValues,
  accountOptions,
  tags,
  onClose,
  onSubmit,
}: IncomeFormDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      {open && (
        <IncomeFormFields
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

type IncomeFormFieldsProps = Omit<IncomeFormDialogProps, 'open'>;

function IncomeFormFields({
  mode,
  initialValues,
  accountOptions,
  tags,
  onClose,
  onSubmit,
}: IncomeFormFieldsProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const tagOptions = useMemo(() => toTagOptions(tags), [tags]);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<IncomeFormValues>({
    // See the matching comment in AccountFormDialog.tsx — zod v4's
    // z.coerce.number() has an `unknown` input type that doesn't quite fit
    // a plain Resolver<IncomeFormValues>. The coercion still happens
    // correctly at runtime.
    resolver: zodResolver(incomeFormSchema) as Resolver<IncomeFormValues>,
    defaultValues: initialValues ?? defaultIncomeFormValues,
  });

  const submit = async (values: IncomeFormValues) => {
    setFormError(null);
    try {
      await onSubmit(values);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Something went wrong.');
    }
  };

  return (
    <>
      <DialogTitle>{mode === 'create' ? 'Add Income' : 'Edit Income'}</DialogTitle>
      <DialogContent>
        <Stack
          component="form"
          id="income-form"
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
            name="category"
            control={control}
            label="Category"
            options={incomeCategoryOptions}
          />
          <FormTextField
            name="source"
            control={control}
            label="Source (optional)"
            placeholder="e.g. Acme Corp, a client's name, tenant name"
          />
          <FormTextField name="description" control={control} label="Description (optional)" />
          <FormTextField name="notes" control={control} label="Notes (optional)" multiline minRows={2} />
          <FormSwitch
            name="isRecurring"
            control={control}
            label="Recurring income"
            helperText='Just a label on this one entry — it does not create future entries by itself. To generate future occurrences automatically, set up a rule on the "Recurring" page instead.'
          />
          <FormTagsInput name="tags" control={control} label="Tags (optional)" options={tagOptions} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button type="submit" form="income-form" variant="contained" loading={isSubmitting}>
          {mode === 'create' ? 'Add Income' : 'Save changes'}
        </Button>
      </DialogActions>
    </>
  );
}
