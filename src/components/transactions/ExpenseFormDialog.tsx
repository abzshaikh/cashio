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
  expenseFormSchema,
  defaultExpenseFormValues,
  type ExpenseFormValues,
} from '../../schemas/expenseSchemas';
import { getSubcategoryOptionsFor, toCategoryOptions } from '../../utils/expenseCategoryLookup';
import { toTagOptions } from '../../utils/tagLookup';
import { paymentMethodOptions } from '../../config/paymentMethods';
import type { ExpenseCategoryRecord } from '../../types/category';
import type { Tag } from '../../types/tag';

interface ExpenseFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialValues?: ExpenseFormValues;
  accountOptions: FormSelectOption[];
  categories: ExpenseCategoryRecord[];
  tags: Tag[];
  onClose: () => void;
  onSubmit: (values: ExpenseFormValues) => Promise<void>;
}

export function ExpenseFormDialog({
  open,
  mode,
  initialValues,
  accountOptions,
  categories,
  tags,
  onClose,
  onSubmit,
}: ExpenseFormDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      {open && (
        <ExpenseFormFields
          mode={mode}
          initialValues={initialValues}
          accountOptions={accountOptions}
          categories={categories}
          tags={tags}
          onClose={onClose}
          onSubmit={onSubmit}
        />
      )}
    </Dialog>
  );
}

type ExpenseFormFieldsProps = Omit<ExpenseFormDialogProps, 'open'>;

function ExpenseFormFields({
  mode,
  initialValues,
  accountOptions,
  categories,
  tags,
  onClose,
  onSubmit,
}: ExpenseFormFieldsProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const categoryOptions = useMemo(() => toCategoryOptions(categories), [categories]);
  const tagOptions = useMemo(() => toTagOptions(tags), [tags]);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { isSubmitting },
  } = useForm<ExpenseFormValues>({
    // See the matching comment in AccountFormDialog.tsx — zod v4's
    // z.coerce.number() has an `unknown` input type that doesn't quite fit
    // a plain Resolver<ExpenseFormValues>. The coercion still happens
    // correctly at runtime.
    resolver: zodResolver(expenseFormSchema) as Resolver<ExpenseFormValues>,
    // Pick the first available category as the default for a brand new
    // entry — categories are now a live, per-user Firestore list (Phase
    // 6), so there's no fixed "other" slug to fall back to like Phase 5's
    // static enum used.
    defaultValues: initialValues ?? {
      ...defaultExpenseFormValues,
      category: categories[0]?.slug ?? '',
    },
  });

  const selectedCategory = useWatch({ control, name: 'category' });
  const subcategoryOptions = useMemo(
    () => getSubcategoryOptionsFor(categories, selectedCategory),
    [categories, selectedCategory],
  );

  const submit = async (values: ExpenseFormValues) => {
    setFormError(null);
    try {
      await onSubmit(values);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Something went wrong.');
    }
  };

  return (
    <>
      <DialogTitle>{mode === 'create' ? 'Add Expense' : 'Edit Expense'}</DialogTitle>
      <DialogContent>
        <Stack
          component="form"
          id="expense-form"
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
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormSelect
              name="category"
              control={control}
              label="Category"
              options={categoryOptions}
              // Switching category invalidates whatever subcategory was
              // selected under the previous one — reset it right in this
              // change handler (not a useEffect watching category, which
              // would just re-render a second time to undo a value that's
              // already wrong for one frame).
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
            placeholder="e.g. Restaurant XYZ"
          />
          <FormSelect
            name="paymentMethod"
            control={control}
            label="Payment method"
            options={paymentMethodOptions}
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
        <Button type="submit" form="expense-form" variant="contained" loading={isSubmitting}>
          {mode === 'create' ? 'Add Expense' : 'Save changes'}
        </Button>
      </DialogActions>
    </>
  );
}
