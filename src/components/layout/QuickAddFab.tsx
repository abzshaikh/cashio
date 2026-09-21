import { useMemo, useState } from 'react';
import Fab from '@mui/material/Fab';
import Tooltip from '@mui/material/Tooltip';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import { QuickAddTransactionDialog } from '../transactions/QuickAddTransactionDialog';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useNotification } from '../../context/NotificationContext';
import { useAccounts } from '../../hooks/useAccounts';
import { useExpenseCategories } from '../../hooks/useExpenseCategories';
import { createExpenseTransaction, createIncomeTransaction } from '../../services/transactionService';
import type { ExpenseFormValues } from '../../schemas/expenseSchemas';
import type { IncomeFormValues } from '../../schemas/incomeSchemas';

/**
 * Phase 38: a global "+" entry point, mounted once in `AppLayout` (self-
 * contained — like `NotificationBell` in `Topbar`, it subscribes to
 * everything it needs itself rather than expecting a host page to wire it
 * up), so a new Income/Expense can be logged from any page — Dashboard,
 * Budgets, Reports, wherever — not just from `TransactionsPage`'s own
 * "Add" menu. Deliberately shows on `TransactionsPage` too rather than
 * hiding there: a persistent, always-in-the-same-place entry point is the
 * point, and one more button in the corner of a page that already has an
 * "Add" menu is a small, acceptable overlap.
 *
 * Reuses `createExpenseTransaction`/`createIncomeTransaction` (Phase 7)
 * directly — a quick-added transaction is written exactly like a fully
 * detailed one, just with blank/default values for the fields the quick
 * form skips (see `QuickAddTransactionDialog`'s own doc comment), so it
 * needs no new Firestore rules and shows up identically everywhere a
 * transaction is listed, reported on, or budgeted against. A failed write
 * surfaces inline inside the dialog itself (its own `formError` state,
 * since the exception propagates back up through `onSubmit`) rather than a
 * toast — the same convention every other transaction dialog follows (see
 * `ExpenseFormDialog`); a successful one gets the usual success toast,
 * matching `TransactionsPage`'s own "Expense added"/"Income added".
 */
export function QuickAddFab() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const { success } = useNotification();
  const { accounts } = useAccounts();
  const { categories } = useExpenseCategories();
  const [open, setOpen] = useState(false);

  const accountOptions = useMemo(
    () => (accounts ?? []).map((account) => ({ value: account.id, label: account.name })),
    [accounts],
  );

  if (!user) return null;

  const handleSubmitExpense = async (values: ExpenseFormValues) => {
    await createExpenseTransaction(user.uid, values);
    success('Expense added');
    setOpen(false);
  };

  const handleSubmitIncome = async (values: IncomeFormValues) => {
    await createIncomeTransaction(user.uid, values);
    success('Income added');
    setOpen(false);
  };

  return (
    <>
      <Tooltip title="Quick add transaction">
        <Fab
          color="primary"
          aria-label="Quick add transaction"
          onClick={() => setOpen(true)}
          sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: (theme) => theme.zIndex.speedDial }}
        >
          <AddOutlinedIcon />
        </Fab>
      </Tooltip>
      <QuickAddTransactionDialog
        open={open}
        accountOptions={accountOptions}
        expenseCategories={categories ?? []}
        defaultAccountId={settings.defaultAccountId}
        defaultExpenseCategoryId={settings.defaultCategoryId}
        onClose={() => setOpen(false)}
        onSubmitExpense={handleSubmitExpense}
        onSubmitIncome={handleSubmitIncome}
      />
    </>
  );
}
