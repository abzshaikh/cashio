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
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import { FormTextField } from '../common/form/FormTextField';
import { FormSelect, type FormSelectOption } from '../common/form/FormSelect';
import { FormDatePicker } from '../common/form/FormDatePicker';
import {
  quickAddFormSchema,
  defaultQuickAddFormValues,
  type QuickAddFormValues,
} from '../../schemas/quickAddSchemas';
import { toCategoryOptions } from '../../utils/expenseCategoryLookup';
import { incomeCategoryOptions } from '../../config/incomeCategories';
import { resolveLiveDefaultId } from '../../utils/userSettingsDefaults';
import type { ExpenseFormValues } from '../../schemas/expenseSchemas';
import type { IncomeFormValues } from '../../schemas/incomeSchemas';
import type { IncomeCategory } from '../../types/transaction';
import type { ExpenseCategoryRecord } from '../../types/category';

interface QuickAddTransactionDialogProps {
  open: boolean;
  accountOptions: FormSelectOption[];
  expenseCategories: ExpenseCategoryRecord[];
  /** Phase 36 settings — pre-fill, but only ever for Expense (Income has
   * its own fixed category enum, not a Phase 6 expense-category slug —
   * same reasoning `TransactionsPage`'s own pre-fill already follows). */
  defaultAccountId: string | null;
  defaultExpenseCategoryId: string | null;
  onClose: () => void;
  onSubmitExpense: (values: ExpenseFormValues) => Promise<void>;
  onSubmitIncome: (values: IncomeFormValues) => Promise<void>;
}

export function QuickAddTransactionDialog({
  open,
  accountOptions,
  expenseCategories,
  defaultAccountId,
  defaultExpenseCategoryId,
  onClose,
  onSubmitExpense,
  onSubmitIncome,
}: QuickAddTransactionDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      {open && (
        <QuickAddFormFields
          accountOptions={accountOptions}
          expenseCategories={expenseCategories}
          defaultAccountId={defaultAccountId}
          defaultExpenseCategoryId={defaultExpenseCategoryId}
          onClose={onClose}
          onSubmitExpense={onSubmitExpense}
          onSubmitIncome={onSubmitIncome}
        />
      )}
    </Dialog>
  );
}

type QuickAddFormFieldsProps = Omit<QuickAddTransactionDialogProps, 'open'>;

function QuickAddFormFields({
  accountOptions,
  expenseCategories,
  defaultAccountId,
  defaultExpenseCategoryId,
  onClose,
  onSubmitExpense,
  onSubmitIncome,
}: QuickAddFormFieldsProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const expenseCategoryOptions = useMemo(() => toCategoryOptions(expenseCategories), [expenseCategories]);
  const firstExpenseCategory = expenseCategories[0]?.slug ?? '';

  // `defaultAccountId`/`defaultExpenseCategoryId` come straight from Settings
  // and can point at an account or category the user has since deleted —
  // see `resolveLiveDefaultId`'s doc comment. Falling back to blank/the
  // first category here (same fallback `defaultValues` already used for a
  // genuinely unset default) keeps a stale setting from pre-filling this
  // form with a choice that isn't actually selectable anymore.
  const liveDefaultAccountId = useMemo(
    () => resolveLiveDefaultId(defaultAccountId, new Set(accountOptions.map((option) => option.value))),
    [defaultAccountId, accountOptions],
  );
  const liveDefaultExpenseCategoryId = useMemo(
    () => resolveLiveDefaultId(defaultExpenseCategoryId, new Set(expenseCategories.map((c) => c.slug))),
    [defaultExpenseCategoryId, expenseCategories],
  );

  const {
    control,
    handleSubmit,
    setValue,
    formState: { isSubmitting },
  } = useForm<QuickAddFormValues>({
    // See the matching comment in BudgetFormDialog.tsx/ExpenseFormDialog.tsx
    // — zod v4's z.coerce.number() has an `unknown` input type that doesn't
    // quite fit a plain Resolver<QuickAddFormValues>. The coercion still
    // happens correctly at runtime.
    resolver: zodResolver(quickAddFormSchema) as Resolver<QuickAddFormValues>,
    defaultValues: {
      ...defaultQuickAddFormValues,
      accountId: liveDefaultAccountId ?? '',
      category: liveDefaultExpenseCategoryId ?? firstExpenseCategory,
    },
  });

  const type = useWatch({ control, name: 'type' });
  const categoryOptions = type === 'expense' ? expenseCategoryOptions : incomeCategoryOptions;

  // Switching type invalidates whatever category was selected under the
  // other one (an expense-category slug means nothing as an income
  // category and vice versa) — reset it right in this change handler, the
  // same "handle it where the causing event fires, not in a useEffect
  // watching the field" pattern `ExpenseFormDialog`'s own category/
  // subcategory reset already uses.
  const handleTypeChange = (_: unknown, next: 'expense' | 'income' | null) => {
    if (!next) return;
    setValue('type', next);
    setValue('category', next === 'expense' ? (liveDefaultExpenseCategoryId ?? firstExpenseCategory) : 'salary');
  };

  const submit = async (values: QuickAddFormValues) => {
    setFormError(null);
    try {
      if (values.type === 'expense') {
        await onSubmitExpense({
          amount: values.amount,
          date: values.date,
          accountId: values.accountId,
          category: values.category,
          subcategory: '',
          merchant: '',
          paymentMethod: 'cash',
          description: values.description,
          notes: '',
          tags: [],
        });
      } else {
        await onSubmitIncome({
          amount: values.amount,
          date: values.date,
          accountId: values.accountId,
          category: values.category as IncomeCategory,
          source: '',
          description: values.description,
          notes: '',
          isRecurring: false,
          tags: [],
        });
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Something went wrong.');
    }
  };

  return (
    <>
      <DialogTitle>Quick Add</DialogTitle>
      <DialogContent>
        <Stack
          component="form"
          id="quick-add-form"
          spacing={2.5}
          sx={{ mt: 0.5 }}
          onSubmit={handleSubmit(submit)}
          noValidate
        >
          {formError && <Alert severity="error">{formError}</Alert>}
          <ToggleButtonGroup value={type} exclusive fullWidth onChange={handleTypeChange}>
            <ToggleButton value="expense">Expense</ToggleButton>
            <ToggleButton value="income">Income</ToggleButton>
          </ToggleButtonGroup>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormTextField name="amount" control={control} label="Amount" type="number" autoFocus />
            <FormDatePicker name="date" control={control} label="Date" />
          </Stack>
          <FormSelect name="accountId" control={control} label="Account" options={accountOptions} />
          <FormSelect
            name="category"
            control={control}
            label={type === 'expense' ? 'Category' : 'Income category'}
            options={categoryOptions}
          />
          <FormTextField name="description" control={control} label="Description (optional)" />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button type="submit" form="quick-add-form" variant="contained" loading={isSubmitting}>
          Add
        </Button>
      </DialogActions>
    </>
  );
}
