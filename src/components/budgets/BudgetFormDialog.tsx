import { useMemo, useState } from 'react';
import { useFieldArray, useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import { FormTextField } from '../common/form/FormTextField';
import { FormSelect, type FormSelectOption } from '../common/form/FormSelect';
import { FormDatePicker } from '../common/form/FormDatePicker';
import {
  budgetFormSchema,
  defaultBudgetFormValues,
  type BudgetFormValues,
} from '../../schemas/budgetSchemas';
import { budgetPeriodOptions } from '../../config/budgetPeriods';
import { toCategoryOptions } from '../../utils/expenseCategoryLookup';
import type { ExpenseCategoryRecord } from '../../types/category';

const scopeOptions: FormSelectOption[] = [
  { value: 'overall', label: 'One overall amount' },
  { value: 'category', label: 'A limit per category' },
];

interface BudgetFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialValues?: BudgetFormValues;
  categories: ExpenseCategoryRecord[];
  onClose: () => void;
  onSubmit: (values: BudgetFormValues) => Promise<void>;
}

export function BudgetFormDialog({
  open,
  mode,
  initialValues,
  categories,
  onClose,
  onSubmit,
}: BudgetFormDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      {open && (
        <BudgetFormFields
          mode={mode}
          initialValues={initialValues}
          categories={categories}
          onClose={onClose}
          onSubmit={onSubmit}
        />
      )}
    </Dialog>
  );
}

type BudgetFormFieldsProps = Omit<BudgetFormDialogProps, 'open'>;

function BudgetFormFields({
  mode,
  initialValues,
  categories,
  onClose,
  onSubmit,
}: BudgetFormFieldsProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const categoryOptions = useMemo(() => toCategoryOptions(categories), [categories]);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<BudgetFormValues>({
    // See the matching comment in ExpenseFormDialog.tsx — zod v4's
    // z.coerce.number() has an `unknown` input type that doesn't quite fit
    // a plain Resolver<BudgetFormValues>. The coercion still happens
    // correctly at runtime.
    resolver: zodResolver(budgetFormSchema) as Resolver<BudgetFormValues>,
    defaultValues: initialValues ?? defaultBudgetFormValues,
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const scope = useWatch({ control, name: 'scope' });

  const submit = async (values: BudgetFormValues) => {
    setFormError(null);
    try {
      await onSubmit(values);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Something went wrong.');
    }
  };

  // react-hook-form reports an array-level error (e.g. "Add at least one
  // category") on `errors.items.root`/`errors.items.message` depending on
  // how the resolver attaches it — check both rather than guess which.
  const itemsError =
    (errors.items as { message?: string; root?: { message?: string } } | undefined)?.message ??
    (errors.items as { root?: { message?: string } } | undefined)?.root?.message;

  return (
    <>
      <DialogTitle>{mode === 'create' ? 'Add Budget' : 'Edit Budget'}</DialogTitle>
      <DialogContent>
        <Stack
          component="form"
          id="budget-form"
          spacing={2.5}
          sx={{ mt: 0.5 }}
          onSubmit={handleSubmit(submit)}
          noValidate
        >
          {formError && <Alert severity="error">{formError}</Alert>}
          <FormTextField name="name" control={control} label="Budget name" autoFocus />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormSelect name="period" control={control} label="Period" options={budgetPeriodOptions} />
            <FormSelect name="scope" control={control} label="Applies to" options={scopeOptions} />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormDatePicker name="startDate" control={control} label="Start date" />
            <FormDatePicker name="endDate" control={control} label="End date" />
          </Stack>

          {scope === 'overall' && (
            <FormTextField
              name="overallAmount"
              control={control}
              label="Budget amount"
              type="number"
            />
          )}

          {scope === 'category' && (
            <Stack spacing={1.5}>
              <Typography variant="subtitle2">Category limits</Typography>
              {fields.map((field, index) => (
                <Stack key={field.id} direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                  <FormSelect
                    name={`items.${index}.categoryId`}
                    control={control}
                    label="Category"
                    options={categoryOptions}
                  />
                  <FormTextField
                    name={`items.${index}.amount`}
                    control={control}
                    label="Amount"
                    type="number"
                  />
                  <IconButton
                    aria-label={`Remove category limit ${index + 1}`}
                    onClick={() => remove(index)}
                    sx={{ mt: 1 }}
                  >
                    <DeleteOutlineOutlinedIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
              {itemsError && (
                <Typography variant="caption" color="error">
                  {itemsError}
                </Typography>
              )}
              <Button
                startIcon={<AddOutlinedIcon />}
                onClick={() => append({ categoryId: categories[0]?.slug ?? '', amount: 0 })}
                sx={{ alignSelf: 'flex-start' }}
              >
                Add category
              </Button>
            </Stack>
          )}

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormTextField
              name="warningThreshold"
              control={control}
              label="Warn at (% spent)"
              type="number"
            />
            <FormTextField
              name="overThreshold"
              control={control}
              label="Over budget at (% spent)"
              type="number"
            />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button type="submit" form="budget-form" variant="contained" loading={isSubmitting}>
          {mode === 'create' ? 'Add Budget' : 'Save changes'}
        </Button>
      </DialogActions>
    </>
  );
}
