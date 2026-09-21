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
import { FormDatePicker } from '../common/form/FormDatePicker';
import {
  goalContributionFormSchema,
  defaultGoalContributionFormValues,
  type GoalContributionFormValues,
} from '../../schemas/goalContributionSchemas';

interface ContributionFormDialogProps {
  open: boolean;
  /** Name of the goal this contribution is for, shown in the dialog title. */
  goalName: string;
  onClose: () => void;
  onSubmit: (values: GoalContributionFormValues) => Promise<void>;
}

export function ContributionFormDialog({
  open,
  goalName,
  onClose,
  onSubmit,
}: ContributionFormDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      {open && <ContributionFormFields goalName={goalName} onClose={onClose} onSubmit={onSubmit} />}
    </Dialog>
  );
}

type ContributionFormFieldsProps = Omit<ContributionFormDialogProps, 'open'>;

function ContributionFormFields({ goalName, onClose, onSubmit }: ContributionFormFieldsProps) {
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<GoalContributionFormValues>({
    // See the matching comment in ExpenseFormDialog.tsx — zod v4's
    // z.coerce.number() has an `unknown` input type that doesn't quite fit
    // a plain Resolver<GoalContributionFormValues>. The coercion still
    // happens correctly at runtime.
    resolver: zodResolver(goalContributionFormSchema) as Resolver<GoalContributionFormValues>,
    defaultValues: defaultGoalContributionFormValues,
  });

  const submit = async (values: GoalContributionFormValues) => {
    setFormError(null);
    try {
      await onSubmit(values);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Something went wrong.');
    }
  };

  return (
    <>
      <DialogTitle>Add money to &quot;{goalName}&quot;</DialogTitle>
      <DialogContent>
        <Stack
          component="form"
          id="contribution-form"
          spacing={2.5}
          sx={{ mt: 0.5 }}
          onSubmit={handleSubmit(submit)}
          noValidate
        >
          {formError && <Alert severity="error">{formError}</Alert>}
          <FormTextField name="amount" control={control} label="Amount" type="number" autoFocus />
          <FormDatePicker name="date" control={control} label="Date" />
          <FormTextField name="note" control={control} label="Note (optional)" />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button type="submit" form="contribution-form" variant="contained" loading={isSubmitting}>
          Add
        </Button>
      </DialogActions>
    </>
  );
}
