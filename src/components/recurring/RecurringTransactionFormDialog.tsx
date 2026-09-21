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
import { FormSwitch } from '../common/form/FormSwitch';
import {
  recurringTransactionFormSchema,
  defaultRecurringTransactionFormValues,
  type RecurringTransactionFormValues,
} from '../../schemas/recurringTransactionSchemas';
import { recurringFrequencyOptions } from '../../config/recurringFrequencies';
import { incomeCategoryOptions } from '../../config/incomeCategories';
import { paymentMethodOptions } from '../../config/paymentMethods';
import { getSubcategoryOptionsFor, toCategoryOptions } from '../../utils/expenseCategoryLookup';
import type { ExpenseCategoryRecord } from '../../types/category';

const typeOptions: FormSelectOption[] = [
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
];

interface RecurringTransactionFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialValues?: RecurringTransactionFormValues;
  accountOptions: FormSelectOption[];
  categories: ExpenseCategoryRecord[];
  onClose: () => void;
  onSubmit: (values: RecurringTransactionFormValues) => Promise<void>;
}

export function RecurringTransactionFormDialog({
  open,
  mode,
  initialValues,
  accountOptions,
  categories,
  onClose,
  onSubmit,
}: RecurringTransactionFormDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      {open && (
        <RecurringTransactionFormFields
          mode={mode}
          initialValues={initialValues}
          accountOptions={accountOptions}
          categories={categories}
          onClose={onClose}
          onSubmit={onSubmit}
        />
      )}
    </Dialog>
  );
}

type RecurringTransactionFormFieldsProps = Omit<RecurringTransactionFormDialogProps, 'open'>;

function RecurringTransactionFormFields({
  mode,
  initialValues,
  accountOptions,
  categories,
  onClose,
  onSubmit,
}: RecurringTransactionFormFieldsProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const expenseCategoryOptions = useMemo(() => toCategoryOptions(categories), [categories]);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { isSubmitting },
  } = useForm<RecurringTransactionFormValues>({
    // See the matching comment in ExpenseFormDialog.tsx — zod v4's
    // z.coerce.number() has an `unknown` input type that doesn't quite fit
    // a plain Resolver<RecurringTransactionFormValues>. The coercion still
    // happens correctly at runtime.
    resolver: zodResolver(recurringTransactionFormSchema) as Resolver<RecurringTransactionFormValues>,
    defaultValues: initialValues ?? {
      ...defaultRecurringTransactionFormValues,
      category: categories[0]?.slug ?? '',
    },
  });

  const type = useWatch({ control, name: 'type' });
  const neverEnds = useWatch({ control, name: 'neverEnds' });
  const selectedCategory = useWatch({ control, name: 'category' });
  const subcategoryOptions = useMemo(
    () => getSubcategoryOptionsFor(categories, selectedCategory),
    [categories, selectedCategory],
  );

  const submit = async (values: RecurringTransactionFormValues) => {
    setFormError(null);
    try {
      // `endDate` only means something when `neverEnds` is false — clear it
      // here rather than trusting whatever a previously-checked "Custom
      // range"-style picker still holds, same defensive clearing
      // `budgetService.ts`'s `toFirestoreFields` does for a budget's unused
      // scope side.
      await onSubmit({ ...values, endDate: values.neverEnds ? null : values.endDate });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Something went wrong.');
    }
  };

  return (
    <>
      <DialogTitle>{mode === 'create' ? 'Add Recurring Rule' : 'Edit Recurring Rule'}</DialogTitle>
      <DialogContent>
        <Stack
          component="form"
          id="recurring-transaction-form"
          spacing={2.5}
          sx={{ mt: 0.5 }}
          onSubmit={handleSubmit(submit)}
          noValidate
        >
          {formError && <Alert severity="error">{formError}</Alert>}
          <FormSelect
            name="type"
            control={control}
            label="Type"
            options={typeOptions}
            disabled={mode === 'edit'}
            onValueChange={() => setValue('category', '')}
          />
          {mode === 'edit' && (
            <Alert severity="info" variant="outlined">
              A rule&apos;s type can&apos;t be changed once created — delete this rule and add a
              new one instead.
            </Alert>
          )}

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormTextField name="amount" control={control} label="Amount" type="number" autoFocus />
            <FormSelect
              name="frequency"
              control={control}
              label="Frequency"
              options={recurringFrequencyOptions}
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormDatePicker name="startDate" control={control} label="Start date" />
            {!neverEnds && <FormDatePicker name="endDate" control={control} label="End date" />}
          </Stack>
          <FormSwitch
            name="neverEnds"
            control={control}
            label="Repeats indefinitely"
            helperText="Turn off to set an end date after which this rule stops generating transactions."
          />

          <FormSelect name="accountId" control={control} label="Account" options={accountOptions} />

          {type === 'income' ? (
            <>
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
                placeholder="e.g. Acme Corp, a tenant's name"
              />
            </>
          ) : (
            <>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <FormSelect
                  name="category"
                  control={control}
                  label="Category"
                  options={expenseCategoryOptions}
                  onValueChange={() => setValue('subcategory', '')}
                />
                <FormSelect
                  name="subcategory"
                  control={control}
                  label="Subcategory (optional)"
                  options={subcategoryOptions}
                  disabled={subcategoryOptions.length === 0}
                />
              </Stack>
              <FormTextField
                name="merchant"
                control={control}
                label="Merchant (optional)"
                placeholder="e.g. Netflix, the landlord's name"
              />
              <FormSelect
                name="paymentMethod"
                control={control}
                label="Payment method"
                options={paymentMethodOptions}
              />
              <FormSwitch
                name="isSubscription"
                control={control}
                label="This is a subscription"
                helperText='Lists it on the "Subscriptions" page alongside your other recurring services — leave off for things like rent or a loan payment.'
              />
            </>
          )}

          <FormTextField name="description" control={control} label="Description (optional)" />
          <FormTextField name="notes" control={control} label="Notes (optional)" multiline minRows={2} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          type="submit"
          form="recurring-transaction-form"
          variant="contained"
          loading={isSubmitting}
        >
          {mode === 'create' ? 'Add Rule' : 'Save changes'}
        </Button>
      </DialogActions>
    </>
  );
}
