import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import ArrowDropDownOutlinedIcon from '@mui/icons-material/ArrowDropDownOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { DataTable, type DataTableColumn } from '../../components/common/DataTable';
import { CurrencyText } from '../../components/common/CurrencyText';
import { DateRangeFilter, type DateRangeFilterValue } from '../../components/common/DateRangeFilter';
import { IncomeFormDialog } from '../../components/transactions/IncomeFormDialog';
import { ExpenseFormDialog } from '../../components/transactions/ExpenseFormDialog';
import { RefundFormDialog } from '../../components/transactions/RefundFormDialog';
import { AdjustmentFormDialog } from '../../components/transactions/AdjustmentFormDialog';
import { TransferFormDialog } from '../../components/transactions/TransferFormDialog';
import { TransactionFilters } from '../../components/transactions/TransactionFilters';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useConfirm } from '../../context/ConfirmDialogContext';
import { useSettings } from '../../context/SettingsContext';
import { useExpenseCategories } from '../../hooks/useExpenseCategories';
import { useTags } from '../../hooks/useTags';
import { subscribeToAccounts } from '../../services/accountService';
import {
  createAdjustmentTransaction,
  createExpenseTransaction,
  createIncomeTransaction,
  createRefundTransaction,
  createTransferTransaction,
  deleteTransaction,
  subscribeToTransactions,
  updateAdjustmentTransaction,
  updateExpenseTransaction,
  updateIncomeTransaction,
  updateRefundTransaction,
  updateTransferTransaction,
} from '../../services/transactionService';
import { incomeCategoryMeta } from '../../config/incomeCategories';
import { TRANSACTION_TYPE_CHIP_META } from '../../config/transactionTypeMeta';
import { getCategoryLabel, getSubcategoryLabel } from '../../utils/expenseCategoryLookup';
import { getTagColor, getTagLabel } from '../../utils/tagLookup';
import { getBalanceEffect } from '../../utils/transactionBalance';
import { toMajorUnits } from '../../utils/money';
import { formatDate, parseDateOnly, toDateOnlyString } from '../../utils/formatDate';
import { downloadTextFile } from '../../utils/downloadFile';
import { transactionsToCsv } from '../../utils/transactionCsvExport';
import { getDateRangeForPreset, isWithinDateRange } from '../../utils/dateRangePresets';
import {
  defaultTransactionFilters,
  filterTransactions,
  type TransactionFilters as TransactionFiltersValue,
} from '../../utils/transactionSearch';
import { defaultIncomeFormValues, type IncomeFormValues } from '../../schemas/incomeSchemas';
import { defaultExpenseFormValues, type ExpenseFormValues } from '../../schemas/expenseSchemas';
import { resolveLiveDefaultId } from '../../utils/userSettingsDefaults';
import type { RefundFormValues } from '../../schemas/refundSchemas';
import type { AdjustmentFormValues } from '../../schemas/adjustmentSchemas';
import type { TransferFormValues } from '../../schemas/transferSchemas';
import type { Account } from '../../types/account';
import type { Transaction, TransactionType } from '../../types/transaction';

type ActiveDialog = TransactionType | null;

const TYPE_CHIP_META = TRANSACTION_TYPE_CHIP_META;

export function TransactionsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { success, error: notifyError } = useNotification();
  const confirm = useConfirm();

  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const { categories } = useExpenseCategories();
  const { tags } = useTags();
  const { settings } = useSettings();

  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [addMenuAnchor, setAddMenuAnchor] = useState<HTMLElement | null>(null);

  // Defaults to "All time" so this new filter never hides transactions a
  // user could already see before Phase 13 added it.
  const [dateFilter, setDateFilter] = useState<DateRangeFilterValue>({
    preset: 'allTime',
    customStart: null,
    customEnd: null,
  });

  // Phase 20's search/filter bar, layered on top of the date range above —
  // same "defaults to showing everything" reasoning as `dateFilter`.
  const [searchFilters, setSearchFilters] = useState<TransactionFiltersValue>(defaultTransactionFilters);

  useEffect(() => {
    if (!user) return;
    setAccounts(null);
    setTransactions(null);
    setLoadError(null);

    const unsubscribeAccounts = subscribeToAccounts(
      user.uid,
      (data) => setAccounts(data),
      (error) => setLoadError(error),
    );
    const unsubscribeTransactions = subscribeToTransactions(
      user.uid,
      (data) => setTransactions(data),
      (error) => setLoadError(error),
    );
    return () => {
      unsubscribeAccounts();
      unsubscribeTransactions();
    };
    // reloadKey lets the "Try again" button force a fresh subscription.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, reloadKey]);

  const accountsById = useMemo(
    () => Object.fromEntries((accounts ?? []).map((a) => [a.id, a])),
    [accounts],
  );

  const accountOptions = useMemo(
    () => (accounts ?? []).map((a) => ({ value: a.id, label: a.name })),
    [accounts],
  );

  const dateFilteredTransactions = useMemo(() => {
    if (!transactions) return transactions;
    const range = getDateRangeForPreset(dateFilter.preset, new Date(), {
      start: dateFilter.customStart,
      end: dateFilter.customEnd,
    });
    return transactions.filter((t) => isWithinDateRange(t.date, range));
  }, [transactions, dateFilter]);

  // Phase 20: search/type/account/amount filters apply on top of the date
  // range above, entirely client-side over what's already been subscribed.
  const visibleTransactions = useMemo(() => {
    if (!dateFilteredTransactions) return dateFilteredTransactions;
    return filterTransactions(dateFilteredTransactions, searchFilters, {
      accountsById,
      categories: categories ?? [],
      tags: tags ?? [],
    });
  }, [dateFilteredTransactions, searchFilters, accountsById, categories, tags]);

  const openAddMenu = (event: MouseEvent<HTMLElement>) => setAddMenuAnchor(event.currentTarget);
  const closeAddMenu = () => setAddMenuAnchor(null);

  const openCreateIncome = () => {
    closeAddMenu();
    setEditingTransaction(null);
    setActiveDialog('income');
  };

  const openCreateExpense = () => {
    closeAddMenu();
    setEditingTransaction(null);
    setActiveDialog('expense');
  };

  const openCreateRefund = () => {
    closeAddMenu();
    setEditingTransaction(null);
    setActiveDialog('refund');
  };

  const openCreateAdjustment = () => {
    closeAddMenu();
    setEditingTransaction(null);
    setActiveDialog('adjustment');
  };

  const openCreateTransfer = () => {
    closeAddMenu();
    setEditingTransaction(null);
    setActiveDialog('transfer');
  };

  const openEditDialog = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setActiveDialog(transaction.type);
  };

  const closeDialog = () => setActiveDialog(null);

  const handleIncomeSubmit = async (values: IncomeFormValues) => {
    if (!user) return;
    if (editingTransaction && editingTransaction.type === 'income') {
      await updateIncomeTransaction(editingTransaction.id, user.uid, values);
      success('Income updated');
    } else {
      await createIncomeTransaction(user.uid, values);
      success('Income added');
    }
    setActiveDialog(null);
  };

  const handleExpenseSubmit = async (values: ExpenseFormValues) => {
    if (!user) return;
    if (editingTransaction && editingTransaction.type === 'expense') {
      await updateExpenseTransaction(editingTransaction.id, user.uid, values);
      success('Expense updated');
    } else {
      await createExpenseTransaction(user.uid, values);
      success('Expense added');
    }
    setActiveDialog(null);
  };

  const handleRefundSubmit = async (values: RefundFormValues) => {
    if (!user) return;
    if (editingTransaction && editingTransaction.type === 'refund') {
      await updateRefundTransaction(editingTransaction.id, user.uid, values);
      success('Refund updated');
    } else {
      await createRefundTransaction(user.uid, values);
      success('Refund added');
    }
    setActiveDialog(null);
  };

  const handleAdjustmentSubmit = async (values: AdjustmentFormValues) => {
    if (!user) return;
    if (editingTransaction && editingTransaction.type === 'adjustment') {
      await updateAdjustmentTransaction(editingTransaction.id, user.uid, values);
      success('Adjustment updated');
    } else {
      await createAdjustmentTransaction(user.uid, values);
      success('Adjustment added');
    }
    setActiveDialog(null);
  };

  const handleTransferSubmit = async (values: TransferFormValues) => {
    if (!user) return;
    if (editingTransaction && editingTransaction.type === 'transfer') {
      await updateTransferTransaction(editingTransaction.id, user.uid, values);
      success('Transfer updated');
    } else {
      await createTransferTransaction(user.uid, values);
      success('Transfer added');
    }
    setActiveDialog(null);
  };

  const handleDelete = async (transaction: Transaction) => {
    const message =
      transaction.type === 'transfer'
        ? `This permanently deletes this transfer and reverses its effect on both ${
            accountsById[transaction.fromAccountId]?.name ?? 'the source account'
          } and ${accountsById[transaction.toAccountId]?.name ?? 'the destination account'}.`
        : `This permanently deletes this ${transaction.type} entry and reverses its effect on ${
            accountsById[transaction.accountId]?.name ?? 'its account'
          }'s balance.`;
    const confirmed = await confirm({
      title: 'Delete transaction?',
      message,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!confirmed || !user) return;
    try {
      await deleteTransaction(transaction.id, user.uid);
      success('Transaction deleted');
    } catch (error) {
      notifyError(error instanceof Error ? error.message : 'Failed to delete transaction.');
    }
  };

  // Exports exactly what's currently visible (after the date range and
  // search/type/account/amount filters above) rather than the full
  // ledger — what a user sees on screen is what they get in the file.
  const handleExportCsv = () => {
    const csv = transactionsToCsv(visibleTransactions ?? [], {
      accountsById,
      categories: categories ?? [],
      tags: tags ?? [],
    });
    const today = toDateOnlyString(new Date());
    downloadTextFile(`transactions-${today}.csv`, csv);
    success(`Exported ${(visibleTransactions ?? []).length} transaction${(visibleTransactions ?? []).length === 1 ? '' : 's'}`);
  };

  // Phase 36: a brand-new Income/Expense starts from the user's saved
  // default account (both) and default category (Expense only — Income
  // has its own fixed category enum, not a Phase 6 expense-category slug)
  // rather than a blank field, when the user has set one. Only applies to
  // *creating* a new transaction — `editingTransaction`'s own values
  // always win, same precedence `BudgetsPage`'s create-dialog defaults use.
  //
  // `settings.defaultAccountId`/`defaultCategoryId` can point at an account
  // or category deleted since they were set — see `resolveLiveDefaultId`'s
  // doc comment — so both are checked against the live `accounts`/
  // `categories` lists before being used to pre-fill anything.
  const liveDefaultAccountId = resolveLiveDefaultId(
    settings.defaultAccountId,
    new Set((accounts ?? []).map((account) => account.id)),
  );
  const liveDefaultCategoryId = resolveLiveDefaultId(
    settings.defaultCategoryId,
    new Set((categories ?? []).map((category) => category.slug)),
  );

  const incomeInitialValues: IncomeFormValues | undefined =
    editingTransaction && editingTransaction.type === 'income'
      ? {
          amount: toMajorUnits(editingTransaction.amount),
          date: parseDateOnly(editingTransaction.date),
          accountId: editingTransaction.accountId,
          category: editingTransaction.category,
          source: editingTransaction.source,
          description: editingTransaction.description,
          notes: editingTransaction.notes,
          isRecurring: editingTransaction.isRecurring,
          tags: editingTransaction.tags,
        }
      : liveDefaultAccountId
        ? { ...defaultIncomeFormValues, accountId: liveDefaultAccountId }
        : undefined;

  const expenseInitialValues: ExpenseFormValues | undefined =
    editingTransaction && editingTransaction.type === 'expense'
      ? {
          amount: toMajorUnits(editingTransaction.amount),
          date: parseDateOnly(editingTransaction.date),
          accountId: editingTransaction.accountId,
          category: editingTransaction.category,
          subcategory: editingTransaction.subcategory,
          merchant: editingTransaction.merchant,
          paymentMethod: editingTransaction.paymentMethod,
          description: editingTransaction.description,
          notes: editingTransaction.notes,
          tags: editingTransaction.tags,
        }
      : liveDefaultAccountId || liveDefaultCategoryId
        ? {
            ...defaultExpenseFormValues,
            accountId: liveDefaultAccountId ?? '',
            category: liveDefaultCategoryId ?? '',
          }
        : undefined;

  const refundInitialValues: RefundFormValues | undefined =
    editingTransaction && editingTransaction.type === 'refund'
      ? {
          amount: toMajorUnits(editingTransaction.amount),
          date: parseDateOnly(editingTransaction.date),
          accountId: editingTransaction.accountId,
          category: editingTransaction.category,
          subcategory: editingTransaction.subcategory,
          merchant: editingTransaction.merchant,
          description: editingTransaction.description,
          notes: editingTransaction.notes,
          tags: editingTransaction.tags,
        }
      : undefined;

  const adjustmentInitialValues: AdjustmentFormValues | undefined =
    editingTransaction && editingTransaction.type === 'adjustment'
      ? {
          amount: toMajorUnits(editingTransaction.amount),
          date: parseDateOnly(editingTransaction.date),
          accountId: editingTransaction.accountId,
          direction: editingTransaction.direction,
          reason: editingTransaction.reason,
          description: editingTransaction.description,
          notes: editingTransaction.notes,
          tags: editingTransaction.tags,
        }
      : undefined;

  const transferInitialValues: TransferFormValues | undefined =
    editingTransaction && editingTransaction.type === 'transfer'
      ? {
          amount: toMajorUnits(editingTransaction.amount),
          date: parseDateOnly(editingTransaction.date),
          fromAccountId: editingTransaction.fromAccountId,
          toAccountId: editingTransaction.toAccountId,
          description: editingTransaction.description,
          notes: editingTransaction.notes,
          tags: editingTransaction.tags,
        }
      : undefined;

  const columns: DataTableColumn<Transaction>[] = [
    {
      id: 'date',
      header: 'Date',
      accessor: (row) => row.date,
      render: (row) => formatDate(row.date),
      sortable: true,
    },
    {
      id: 'type',
      header: 'Type',
      render: (row) => (
        <Chip
          label={TYPE_CHIP_META[row.type].label}
          size="small"
          color={TYPE_CHIP_META[row.type].color}
          variant="outlined"
        />
      ),
    },
    {
      id: 'category',
      header: 'Category',
      render: (row) => {
        if (row.type === 'income') return incomeCategoryMeta[row.category]?.label ?? row.category;
        if (row.type === 'adjustment') return row.reason;
        // A transfer has no category — it's just money moving between two
        // of the user's own accounts (Rule 3/4).
        if (row.type === 'transfer') return '—';
        return `${getCategoryLabel(categories ?? [], row.category)}${
          row.subcategory
            ? ` → ${getSubcategoryLabel(categories ?? [], row.category, row.subcategory)}`
            : ''
        }`;
      },
    },
    {
      id: 'account',
      header: 'Account',
      render: (row) => {
        if (row.type === 'transfer') {
          const fromName = accountsById[row.fromAccountId]?.name ?? '—';
          const toName = accountsById[row.toAccountId]?.name ?? '—';
          return `${fromName} → ${toName}`;
        }
        return accountsById[row.accountId]?.name ?? '—';
      },
    },
    {
      id: 'payee',
      header: 'Merchant / Source',
      render: (row) => {
        if (row.type === 'income') return row.source || '—';
        if (row.type === 'adjustment') return '—';
        return row.merchant || '—';
      },
    },
    {
      id: 'amount',
      header: 'Amount',
      align: 'right',
      accessor: (row) => row.amount,
      sortable: true,
      render: (row) => {
        // A transfer isn't income or an expense (Rule 3/4) — it never has
        // a signed balance effect for `getBalanceEffect` to compute, so
        // just show the plain moved amount with no +/- sign or color.
        if (row.type === 'transfer') {
          return (
            <CurrencyText
              amount={row.amount}
              currency={accountsById[row.fromAccountId]?.currency}
              signDisplay="never"
              sx={{ fontWeight: 600 }}
            />
          );
        }
        return (
          <CurrencyText
            amount={getBalanceEffect(
              row.type,
              row.amount,
              row.type === 'adjustment' ? row.direction : undefined,
            )}
            currency={accountsById[row.accountId]?.currency}
            signDisplay="exceptZero"
            colorBySign
            sx={{ fontWeight: 600 }}
          />
        );
      },
    },
    {
      id: 'tags',
      header: 'Tags',
      render: (row) =>
        row.tags.length === 0 ? (
          '—'
        ) : (
          <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
            {row.tags.map((slug) => (
              <Chip
                key={slug}
                label={getTagLabel(tags ?? [], slug)}
                size="small"
                color={getTagColor(tags ?? [], slug)}
              />
            ))}
          </Stack>
        ),
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
          <IconButton
            size="small"
            aria-label={`Edit transaction on ${formatDate(row.date)}`}
            onClick={() => openEditDialog(row)}
          >
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            aria-label={`Delete transaction on ${formatDate(row.date)}`}
            onClick={() => handleDelete(row)}
          >
            <DeleteOutlineOutlinedIcon fontSize="small" />
          </IconButton>
        </Stack>
      ),
    },
  ];

  const noAccountsYet = accounts !== null && accounts.length === 0;
  // A transfer needs two distinct accounts to move money between.
  const canTransfer = (accounts?.length ?? 0) >= 2;

  return (
    <Box>
      <PageHeader
        title="Transactions"
        subtitle="Track income, expenses, and transfers between your accounts."
        actions={
          <>
            <Button
              variant="outlined"
              startIcon={<FileDownloadOutlinedIcon />}
              onClick={handleExportCsv}
              disabled={noAccountsYet || (visibleTransactions?.length ?? 0) === 0}
            >
              Export CSV
            </Button>
            <Button
              variant="outlined"
              startIcon={<UploadFileOutlinedIcon />}
              onClick={() => navigate('/import')}
              disabled={noAccountsYet}
            >
              Import CSV
            </Button>
            <Button
              variant="contained"
              startIcon={<AddOutlinedIcon />}
              endIcon={<ArrowDropDownOutlinedIcon />}
              onClick={openAddMenu}
              disabled={noAccountsYet}
            >
              Add Transaction
            </Button>
            <Menu anchorEl={addMenuAnchor} open={Boolean(addMenuAnchor)} onClose={closeAddMenu}>
              <MenuItem onClick={openCreateIncome}>Add Income</MenuItem>
              <MenuItem onClick={openCreateExpense}>Add Expense</MenuItem>
              <MenuItem onClick={openCreateRefund}>Add Refund</MenuItem>
              <MenuItem onClick={openCreateAdjustment}>Add Adjustment</MenuItem>
              <MenuItem onClick={openCreateTransfer} disabled={!canTransfer}>
                Add Transfer
              </MenuItem>
            </Menu>
          </>
        }
      />

      {loadError && (
        <ErrorState description={loadError.message} onRetry={() => setReloadKey((k) => k + 1)} />
      )}

      {!loadError && noAccountsYet && (
        <EmptyState
          icon={<AccountBalanceWalletOutlinedIcon fontSize="inherit" />}
          title="Add an account first"
          description="Transactions need an account to belong to — add a bank account, cash wallet, or credit card before recording income or expenses."
          actionLabel="Add Account"
          onAction={() => navigate('/accounts')}
        />
      )}

      {!loadError && !noAccountsYet && (
        <Box sx={{ mb: 2 }}>
          <Stack spacing={1.5}>
            <DateRangeFilter value={dateFilter} onChange={setDateFilter} />
            <TransactionFilters
              value={searchFilters}
              onChange={setSearchFilters}
              accountOptions={accountOptions}
              resultCount={visibleTransactions?.length ?? 0}
            />
          </Stack>
        </Box>
      )}

      {!loadError && !noAccountsYet && (
        <DataTable
          columns={columns}
          rows={visibleTransactions ?? []}
          getRowId={(row) => row.id}
          loading={transactions === null || accounts === null}
          emptyTitle={
            !transactions || transactions.length === 0
              ? 'No transactions yet'
              : dateFilteredTransactions && dateFilteredTransactions.length === 0
                ? 'No transactions in this range'
                : 'No transactions match your filters'
          }
          emptyDescription={
            !transactions || transactions.length === 0
              ? 'Add your first income or expense entry to start building your ledger.'
              : dateFilteredTransactions && dateFilteredTransactions.length === 0
                ? 'Try a wider date range, or switch back to "All time".'
                : 'Try a different search term, or clear the filters above.'
          }
        />
      )}

      <IncomeFormDialog
        open={activeDialog === 'income'}
        mode={editingTransaction?.type === 'income' ? 'edit' : 'create'}
        initialValues={incomeInitialValues}
        accountOptions={accountOptions}
        tags={tags ?? []}
        onClose={closeDialog}
        onSubmit={handleIncomeSubmit}
      />
      <ExpenseFormDialog
        open={activeDialog === 'expense'}
        mode={editingTransaction?.type === 'expense' ? 'edit' : 'create'}
        initialValues={expenseInitialValues}
        accountOptions={accountOptions}
        categories={categories ?? []}
        tags={tags ?? []}
        onClose={closeDialog}
        onSubmit={handleExpenseSubmit}
      />
      <RefundFormDialog
        open={activeDialog === 'refund'}
        mode={editingTransaction?.type === 'refund' ? 'edit' : 'create'}
        initialValues={refundInitialValues}
        accountOptions={accountOptions}
        categories={categories ?? []}
        tags={tags ?? []}
        onClose={closeDialog}
        onSubmit={handleRefundSubmit}
      />
      <AdjustmentFormDialog
        open={activeDialog === 'adjustment'}
        mode={editingTransaction?.type === 'adjustment' ? 'edit' : 'create'}
        initialValues={adjustmentInitialValues}
        accountOptions={accountOptions}
        tags={tags ?? []}
        onClose={closeDialog}
        onSubmit={handleAdjustmentSubmit}
      />
      <TransferFormDialog
        open={activeDialog === 'transfer'}
        mode={editingTransaction?.type === 'transfer' ? 'edit' : 'create'}
        initialValues={transferInitialValues}
        accountOptions={accountOptions}
        tags={tags ?? []}
        onClose={closeDialog}
        onSubmit={handleTransferSubmit}
      />
    </Box>
  );
}
