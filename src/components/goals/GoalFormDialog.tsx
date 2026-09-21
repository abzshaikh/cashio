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
  savingsGoalFormSchema,
  defaultSavingsGoalFormValues,
  type SavingsGoalFormValues,
} from '../../schemas/savingsGoalSchemas';
import { savingsGoalCategoryOptions } from '../../config/savingsGoalCategories';

interface GoalFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialValues?: SavingsGoalFormValues;
  onClose: () => void;
  onSubmit: (values: SavingsGoalFormValues) => Promise<void>;
}

export function GoalFormDialog({
  open,
  mode,
  initialValues,
  onClose,
  onSubmit,
}: GoalFormDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      {open && (
        <GoalFormFields mode={mode} initialValues={initialValues} onClose={onClose} onSubmit={onSubmit} />
      )}
    </Dialog>
  );
}

type GoalFormFieldsProps = Omit<GoalFormDialogProps, 'open'>;

function GoalFormFields({ mode, initialValues, onClose, onSubmit }: GoalFormFieldsProps) {
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<SavingsGoalFormValues>({
    // See the matching comment in ExpenseFormDialog.tsx — zod v4's
    // z.coerce.number() has an `unknown` input type that doesn't quite fit
    // a plain Resolver<SavingsGoalFormValues>. The coercion still happens
    // correctly at runtime.
    resolver: zodResolver(savingsGoalFormSchema) as Resolver<SavingsGoalFormValues>,
    defaultValues: initialValues ?? defaultSavingsGoalFormValues,
  });

  const hasTargetDate = useWatch({ control, name: 'hasTargetDate' });

  const submit = async (values: SavingsGoalFormValues) => {
    setFormError(null);
    try {
      // `targetDate` only means something when `hasTargetDate` is true —
      // clear it here rather than trusting a stale picker value, same
      // defensive clearing `RecurringTransactionFormDialog` does for
      // `endDate` when its "Repeats indefinitely" switch is on.
      await onSubmit({ ...values, targetDate: values.hasTargetDate ? values.targetDate : null });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Something went wrong.');
    }
  };

  return (
    <>
      <DialogTitle>{mode === 'create' ? 'Add Savings Goal' : 'Edit Savings Goal'}</DialogTitle>
      <DialogContent>
        <Stack
          component="form"
          id="goal-form"
          spacing={2.5}
          sx={{ mt: 0.5 }}
          onSubmit={handleSubmit(submit)}
          noValidate
        >
          {formError && <Alert severity="error">{formError}</Alert>}
          <FormTextField name="name" control={control} label="Goal name" autoFocus />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormSelect
              name="category"
              control={control}
              label="Category"
              options={savingsGoalCategoryOptions}
            />
            <FormTextField
              name="targetAmount"
              control={control}
              label="Target amount"
              type="number"
            />
          </Stack>

          <FormSwitch
            name="hasTargetDate"
            control={control}
            label="Set a target date"
            helperText="Turn on to track how much time is left, and see this goal escalate as the date approaches."
          />
          {hasTargetDate && (
            <FormDatePicker name="targetDate" control={control} label="Target date" />
          )}

          <FormTextField name="notes" control={control} label="Notes (optional)" multiline minRows={2} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button type="submit" form="goal-form" variant="contained" loading={isSubmitting}>
          {mode === 'create' ? 'Add Goal' : 'Save changes'}
        </Button>
      </DialogActions>
    </>
  );
}
