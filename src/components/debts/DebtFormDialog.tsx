import { useState } from 'react';
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
import { FormSelect } from '../common/form/FormSelect';
import { FormDatePicker } from '../common/form/FormDatePicker';
import { FormSwitch } from '../common/form/FormSwitch';
import {
  debtFormSchema,
  defaultDebtFormValues,
  type DebtFormValues,
} from '../../schemas/debtSchemas';
import { debtCategoryOptions } from '../../config/debtCategories';

interface DebtFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialValues?: DebtFormValues;
  onClose: () => void;
  onSubmit: (values: DebtFormValues) => Promise<void>;
}

export function DebtFormDialog({ open, mode, initialValues, onClose, onSubmit }: DebtFormDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      {open && (
        <DebtFormFields mode={mode} initialValues={initialValues} onClose={onClose} onSubmit={onSubmit} />
      )}
    </Dialog>
  );
}

type DebtFormFieldsProps = Omit<DebtFormDialogProps, 'open'>;

function DebtFormFields({ mode, initialValues, onClose, onSubmit }: DebtFormFieldsProps) {
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<DebtFormValues>({
    // See the matching comment in ExpenseFormDialog.tsx — zod v4's
    // z.coerce.number() has an `unknown` input type that doesn't quite fit
    // a plain Resolver<DebtFormValues>. The coercion still happens
    // correctly at runtime.
    resolver: zodResolver(debtFormSchema) as Resolver<DebtFormValues>,
    defaultValues: initialValues ?? defaultDebtFormValues,
  });

  const hasEndDate = useWatch({ control, name: 'hasEndDate' });

  const submit = async (values: DebtFormValues) => {
    setFormError(null);
    try {
      // `endDate` only means something when `hasEndDate` is true — clear it
      // here rather than trusting a stale picker value, same defensive
      // clearing `GoalFormDialog` does for `targetDate`.
      await onSubmit({ ...values, endDate: values.hasEndDate ? values.endDate : null });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Something went wrong.');
    }
  };

  return (
    <>
      <DialogTitle>{mode === 'create' ? 'Add Debt' : 'Edit Debt'}</DialogTitle>
      <DialogContent>
        <Stack
          component="form"
          id="debt-form"
          spacing={2.5}
          sx={{ mt: 0.5 }}
          onSubmit={handleSubmit(submit)}
          noValidate
        >
          {formError && <Alert severity="error">{formError}</Alert>}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormTextField name="lender" control={control} label="Lender" autoFocus />
            <FormSelect
              name="category"
              control={control}
              label="Category"
              options={debtCategoryOptions}
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormTextField
              name="originalAmount"
              control={control}
              label="Original amount"
              type="number"
            />
            <FormTextField
              name="interestRate"
              control={control}
              label="Interest rate (% APR)"
              type="number"
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormTextField
              name="minimumPayment"
              control={control}
              label="Minimum payment"
              type="number"
            />
            <FormTextField
              name="paymentDueDay"
              control={control}
              label="Payment due day (1–31)"
              type="number"
            />
          </Stack>

          <FormDatePicker name="startDate" control={control} label="Start date" />

          <FormSwitch
            name="hasEndDate"
            control={control}
            label="Set a target payoff date"
            helperText="Turn on to track how much time is left to pay this off."
          />
          {hasEndDate && (
            <FormDatePicker name="endDate" control={control} label="Target payoff date" />
          )}

          <FormTextField name="notes" control={control} label="Notes (optional)" multiline minRows={2} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button type="submit" form="debt-form" variant="contained" loading={isSubmitting}>
          {mode === 'create' ? 'Add Debt' : 'Save changes'}
        </Button>
      </DialogActions>
    </>
  );
}
