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
  refundFormSchema,
  defaultRefundFormValues,
  type RefundFormValues,
} from '../../schemas/refundSchemas';
import { getSubcategoryOptionsFor, toCategoryOptions } from '../../utils/expenseCategoryLookup';
import { toTagOptions } from '../../utils/tagLookup';
import type { ExpenseCategoryRecord } from '../../types/category';
import type { Tag } from '../../types/tag';

interface RefundFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialValues?: RefundFormValues;
  accountOptions: FormSelectOption[];
  categories: ExpenseCategoryRecord[];
  tags: Tag[];
  onClose: () => void;
  onSubmit: (values: RefundFormValues) => Promise<void>;
}

export function RefundFormDialog({
  open,
  mode,
  initialValues,
  accountOptions,
  categories,
  tags,
  onClose,
  onSubmit,
}: RefundFormDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      {open && (
        <RefundFormFields
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

type RefundFormFieldsProps = Omit<RefundFormDialogProps, 'open'>;

function RefundFormFields({
  mode,
  initialValues,
  accountOptions,
  categories,
  tags,
  onClose,
  onSubmit,
}: RefundFormFieldsProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const categoryOptions = useMemo(() => toCategoryOptions(categories), [categories]);
  const tagOptions = useMemo(() => toTagOptions(tags), [tags]);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { isSubmitting },
  } = useForm<RefundFormValues>({
    // See the matching comment in ExpenseFormDialog.tsx — zod v4's
    // z.coerce.number() has an `unknown` input type that doesn't quite fit
    // a plain Resolver<RefundFormValues>. The coercion still happens
    // correctly at runtime.
    resolver: zodResolver(refundFormSchema) as Resolver<RefundFormValues>,
    // Same reasoning as ExpenseFormDialog.tsx: reuses the same live,
    // per-user category list, so default a new entry to the first one.
    defaultValues: initialValues ?? {
      ...defaultRefundFormValues,
      category: categories[0]?.slug ?? '',
    },
  });

  const selectedCategory = useWatch({ control, name: 'category' });
  const subcategoryOptions = useMemo(
    () => getSubcategoryOptionsFor(categories, selectedCategory),
    [categories, selectedCategory],
  );

  const submit = async (values: RefundFormValues) => {
    setFormError(null);
    try {
      await onSubmit(values);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Something went wrong.');
    }
  };

  return (
    <>
      <DialogTitle>{mode === 'create' ? 'Add Refund' : 'Edit Refund'}</DialogTitle>
      <DialogContent>
        <Stack
          component="form"
          id="refund-form"
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
          <FormTextField name="description" control={control} label="Description (optional)" />
          <FormTextField name="notes" control={control} label="Notes (optional)" multiline minRows={2} />
          <FormTagsInput name="tags" control={control} label="Tags (optional)" options={tagOptions} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button type="submit" form="refund-form" variant="contained" loading={isSubmitting}>
          {mode === 'create' ? 'Add Refund' : 'Save changes'}
        </Button>
      </DialogActions>
    </>
  );
}
