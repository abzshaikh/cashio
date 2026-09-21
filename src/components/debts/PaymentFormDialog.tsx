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
  debtPaymentFormSchema,
  defaultDebtPaymentFormValues,
  type DebtPaymentFormValues,
} from '../../schemas/debtPaymentSchemas';

interface PaymentFormDialogProps {
  open: boolean;
  /** Name of the lender this payment is for, shown in the dialog title. */
  lenderName: string;
  onClose: () => void;
  onSubmit: (values: DebtPaymentFormValues) => Promise<void>;
}

export function PaymentFormDialog({ open, lenderName, onClose, onSubmit }: PaymentFormDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      {open && <PaymentFormFields lenderName={lenderName} onClose={onClose} onSubmit={onSubmit} />}
    </Dialog>
  );
}

type PaymentFormFieldsProps = Omit<PaymentFormDialogProps, 'open'>;

function PaymentFormFields({ lenderName, onClose, onSubmit }: PaymentFormFieldsProps) {
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<DebtPaymentFormValues>({
    // See the matching comment in ExpenseFormDialog.tsx — zod v4's
    // z.coerce.number() has an `unknown` input type that doesn't quite fit
    // a plain Resolver<DebtPaymentFormValues>. The coercion still happens
    // correctly at runtime.
    resolver: zodResolver(debtPaymentFormSchema) as Resolver<DebtPaymentFormValues>,
    defaultValues: defaultDebtPaymentFormValues,
  });

  const submit = async (values: DebtPaymentFormValues) => {
    setFormError(null);
    try {
      await onSubmit(values);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Something went wrong.');
    }
  };

  return (
    <>
      <DialogTitle>Record a payment to &quot;{lenderName}&quot;</DialogTitle>
      <DialogContent>
        <Stack
          component="form"
          id="payment-form"
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
        <Button type="submit" form="payment-form" variant="contained" loading={isSubmitting}>
          Add
        </Button>
      </DialogActions>
    </>
  );
}
