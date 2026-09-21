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
import {
  accountFormSchema,
  defaultAccountFormValues,
  type AccountFormValues,
  type AccountSubmitValues,
} from '../../schemas/accountSchemas';
import { accountTypeOptions, accountStatusOptions } from '../../config/accountTypes';
import { currencyOptions } from '../../config/currencies';

const currencySelectOptions = currencyOptions.map((c) => ({
  value: c.code,
  label: `${c.symbol} ${c.code}`,
}));

interface AccountFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialValues?: AccountFormValues;
  defaultCurrency?: string;
  onClose: () => void;
  onSubmit: (values: AccountSubmitValues) => Promise<void>;
}

export function AccountFormDialog({
  open,
  mode,
  initialValues,
  defaultCurrency,
  onClose,
  onSubmit,
}: AccountFormDialogProps) {
  // The form fields are only mounted while the dialog is open, and unmount
  // (rather than reset) when it closes. That means each time it opens —
  // whether for a fresh "create" or to edit a (possibly different) account —
  // useForm below picks up fresh defaultValues on its own, with no reset()
  // effect needed to keep it in sync.
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      {open && (
        <AccountFormFields
          mode={mode}
          initialValues={initialValues}
          defaultCurrency={defaultCurrency}
          onClose={onClose}
          onSubmit={onSubmit}
        />
      )}
    </Dialog>
  );
}

type AccountFormFieldsProps = Omit<AccountFormDialogProps, 'open'>;

function AccountFormFields({
  mode,
  initialValues,
  defaultCurrency,
  onClose,
  onSubmit,
}: AccountFormFieldsProps) {
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<AccountFormValues>({
    // zod v4's z.coerce.number() has an `unknown` input type but a `number`
    // output type, which makes zodResolver's inferred type not quite match
    // a plain `Resolver<AccountFormValues>` (the number-only, post-coercion
    // shape every other form field/component in this app is written
    // against). The coercion still happens correctly at runtime; this cast
    // just aligns the compile-time type with that reality instead of
    // threading RHF's separate input/output generics through FormTextField
    // and FormSelect everywhere.
    resolver: zodResolver(accountFormSchema) as Resolver<AccountFormValues>,
    defaultValues: initialValues ?? {
      ...defaultAccountFormValues,
      currency: defaultCurrency ?? defaultAccountFormValues.currency,
    },
  });

  const type = useWatch({ control, name: 'type' });
  const isCreditCard = type === 'credit_card';

  const submit = async (values: AccountFormValues) => {
    setFormError(null);
    try {
      // The credit-card-only fields only mean something for a credit_card
      // account — clear them to null for every other type rather than
      // trusting whatever the (hidden) fields still hold, same defensive
      // clearing GoalFormDialog/DebtFormDialog do for their own optional
      // fields.
      await onSubmit({
        ...values,
        creditLimit: isCreditCard ? values.creditLimit : null,
        statementDay: isCreditCard ? values.statementDay : null,
        paymentDueDay: isCreditCard ? values.paymentDueDay : null,
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Something went wrong.');
    }
  };

  return (
    <>
      <DialogTitle>{mode === 'create' ? 'Add Account' : 'Edit Account'}</DialogTitle>
      <DialogContent>
        <Stack component="form" id="account-form" spacing={2.5} sx={{ mt: 0.5 }} onSubmit={handleSubmit(submit)} noValidate>
          {formError && <Alert severity="error">{formError}</Alert>}
          <FormTextField name="name" control={control} label="Account name" autoFocus />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormSelect name="type" control={control} label="Account type" options={accountTypeOptions} />
            <FormSelect
              name="status"
              control={control}
              label="Status"
              options={accountStatusOptions}
            />
          </Stack>
          <FormTextField name="institution" control={control} label="Institution (optional)" />
          <FormTextField
            name="accountNumber"
            control={control}
            label="Account number / identifier (optional)"
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormTextField
              name="openingBalance"
              control={control}
              label="Opening balance"
              type="number"
              disabled={mode === 'edit'}
              helperText={mode === 'edit' ? 'Fixed once the account is created' : undefined}
            />
            <FormSelect
              name="currency"
              control={control}
              label="Currency"
              options={currencySelectOptions}
            />
          </Stack>
          {isCreditCard && (
            <>
              <FormTextField
                name="creditLimit"
                control={control}
                label="Credit limit"
                type="number"
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <FormTextField
                  name="statementDay"
                  control={control}
                  label="Statement day (1–31)"
                  type="number"
                />
                <FormTextField
                  name="paymentDueDay"
                  control={control}
                  label="Payment due day (1–31)"
                  type="number"
                />
              </Stack>
            </>
          )}
          <FormTextField name="notes" control={control} label="Notes (optional)" multiline minRows={2} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button type="submit" form="account-form" variant="contained" loading={isSubmitting}>
          {mode === 'create' ? 'Add Account' : 'Save changes'}
        </Button>
      </DialogActions>
    </>
  );
}
