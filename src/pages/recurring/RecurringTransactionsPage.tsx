import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import PauseCircleOutlineOutlinedIcon from '@mui/icons-material/PauseCircleOutlineOutlined';
import PlayCircleOutlineOutlinedIcon from '@mui/icons-material/PlayCircleOutlineOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import AutorenewOutlinedIcon from '@mui/icons-material/AutorenewOutlined';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { DataTable, type DataTableColumn } from '../../components/common/DataTable';
import { CurrencyText } from '../../components/common/CurrencyText';
import { RecurringTransactionFormDialog } from '../../components/recurring/RecurringTransactionFormDialog';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useConfirm } from '../../context/ConfirmDialogContext';
import { useExpenseCategories } from '../../hooks/useExpenseCategories';
import { subscribeToAccounts } from '../../services/accountService';
import {
  createRecurringTransaction,
  deleteRecurringTransaction,
  setRecurringTransactionActive,
  subscribeToRecurringTransactions,
  updateRecurringTransaction,
} from '../../services/recurringTransactionService';
import { incomeCategoryMeta } from '../../config/incomeCategories';
import { recurringFrequencyMeta } from '../../config/recurringFrequencies';
import { getCategoryLabel, getSubcategoryLabel } from '../../utils/expenseCategoryLookup';
import { getBalanceEffect } from '../../utils/transactionBalance';
import { formatDate, parseDateOnly } from '../../utils/formatDate';
import { toMajorUnits } from '../../utils/money';
import type { RecurringTransactionFormValues } from '../../schemas/recurringTransactionSchemas';
import type { Account } from '../../types/account';
import type { RecurringTransaction } from '../../types/recurringTransaction';

export function RecurringTransactionsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { success, error: notifyError } = useNotification();
  const confirm = useConfirm();
  const { categories } = useExpenseCategories();

  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [rules, setRules] = useState<RecurringTransaction[] | null>(null);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RecurringTransaction | null>(null);

  useEffect(() => {
    if (!user) return;
    setAccounts(null);
    setRules(null);
    setLoadError(null);

    const unsubscribeAccounts = subscribeToAccounts(
      user.uid,
      (data) => setAccounts(data),
      (error) => setLoadError(error),
    );
    const unsubscribeRules = subscribeToRecurringTransactions(
      user.uid,
      (data) => setRules(data),
      (error) => setLoadError(error),
    );
    return () => {
      unsubscribeAccounts();
      unsubscribeRules();
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

  const openCreateDialog = () => {
    setEditingRule(null);
    setDialogOpen(true);
  };

  const openEditDialog = (rule: RecurringTransaction) => {
    setEditingRule(rule);
    setDialogOpen(true);
  };

  const closeDialog = () => setDialogOpen(false);

  const handleSubmit = async (values: RecurringTransactionFormValues) => {
    if (!user) return;
    if (editingRule) {
      await updateRecurringTransaction(editingRule.id, values, editingRule.lastGeneratedDate);
      success('Recurring rule updated');
    } else {
      await createRecurringTransaction(user.uid, values);
      success('Recurring rule added');
    }
    setDialogOpen(false);
  };

  const handleDelete = async (rule: RecurringTransaction) => {
    const confirmed = await confirm({
      title: 'Delete recurring rule?',
      message:
        'This stops future transactions from being generated. Transactions already created from it are not affected.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await deleteRecurringTransaction(rule.id);
      success('Recurring rule deleted');
    } catch (error) {
      notifyError(error instanceof Error ? error.message : 'Failed to delete recurring rule.');
    }
  };

  const handleToggleActive = async (rule: RecurringTransaction) => {
    try {
      await setRecurringTransactionActive(rule.id, !rule.isActive);
      success(rule.isActive ? 'Recurring rule paused' : 'Recurring rule resumed');
    } catch (error) {
      notifyError(error instanceof Error ? error.message : 'Failed to update recurring rule.');
    }
  };

  const initialFormValues: RecurringTransactionFormValues | undefined = editingRule
    ? {
        type: editingRule.type,
        amount: toMajorUnits(editingRule.amount),
        frequency: editingRule.frequency,
        startDate: parseDateOnly(editingRule.startDate),
        neverEnds: editingRule.endDate === null,
        endDate: editingRule.endDate ? parseDateOnly(editingRule.endDate) : null,
        accountId: editingRule.accountId,
        category: editingRule.category,
        subcategory: editingRule.type === 'expense' ? editingRule.subcategory : '',
        merchant: editingRule.type === 'expense' ? editingRule.merchant : '',
        paymentMethod: editingRule.type === 'expense' ? editingRule.paymentMethod : 'other',
        isSubscription: editingRule.type === 'expense' ? editingRule.isSubscription : false,
        source: editingRule.type === 'income' ? editingRule.source : '',
        description: editingRule.description,
        notes: editingRule.notes,
      }
    : undefined;

  const columns: DataTableColumn<RecurringTransaction>[] = [
    {
      id: 'type',
      header: 'Type',
      render: (row) => (
        <Chip
          label={row.type === 'income' ? 'Income' : 'Expense'}
          size="small"
          color={row.type === 'income' ? 'success' : 'error'}
          variant="outlined"
        />
      ),
    },
    {
      id: 'category',
      header: 'Category',
      render: (row) => {
        if (row.type === 'income') return incomeCategoryMeta[row.category]?.label ?? row.category;
        const label = `${getCategoryLabel(categories ?? [], row.category)}${
          row.subcategory
            ? ` → ${getSubcategoryLabel(categories ?? [], row.category, row.subcategory)}`
            : ''
        }`;
        if (!row.isSubscription) return label;
        return (
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            <span>{label}</span>
            <Chip label="Subscription" size="small" color="info" variant="outlined" />
          </Stack>
        );
      },
    },
    {
      id: 'account',
      header: 'Account',
      render: (row) => accountsById[row.accountId]?.name ?? '—',
    },
    {
      id: 'payee',
      header: 'Merchant / Source',
      render: (row) => (row.type === 'income' ? row.source : row.merchant) || '—',
    },
    {
      id: 'amount',
      header: 'Amount',
      align: 'right',
      accessor: (row) => row.amount,
      sortable: true,
      render: (row) => (
        <CurrencyText
          amount={getBalanceEffect(row.type, row.amount)}
          currency={accountsById[row.accountId]?.currency}
          signDisplay="exceptZero"
          colorBySign
          sx={{ fontWeight: 600 }}
        />
      ),
    },
    {
      id: 'frequency',
      header: 'Frequency',
      render: (row) => recurringFrequencyMeta[row.frequency]?.label ?? row.frequency,
    },
    {
      id: 'nextOccurrence',
      header: 'Next due',
      accessor: (row) => row.nextOccurrence,
      sortable: true,
      render: (row) =>
        row.isActive ? formatDate(row.nextOccurrence) : <Chip label="Paused" size="small" />,
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
          <Tooltip title={row.isActive ? 'Pause' : 'Resume'}>
            <IconButton
              size="small"
              aria-label={row.isActive ? 'Pause recurring rule' : 'Resume recurring rule'}
              onClick={() => handleToggleActive(row)}
            >
              {row.isActive ? (
                <PauseCircleOutlineOutlinedIcon fontSize="small" />
              ) : (
                <PlayCircleOutlineOutlinedIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
          <IconButton
            size="small"
            aria-label="Edit recurring rule"
            onClick={() => openEditDialog(row)}
          >
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            aria-label="Delete recurring rule"
            onClick={() => handleDelete(row)}
          >
            <DeleteOutlineOutlinedIcon fontSize="small" />
          </IconButton>
        </Stack>
      ),
    },
  ];

  const noAccountsYet = accounts !== null && accounts.length === 0;

  return (
    <Box>
      <PageHeader
        title="Recurring Transactions"
        subtitle="Automate income and expenses that repeat on a schedule — salary, rent, subscriptions, and more."
        actions={
          <Button
            variant="contained"
            startIcon={<AddOutlinedIcon />}
            onClick={openCreateDialog}
            disabled={noAccountsYet}
          >
            Add Recurring Rule
          </Button>
        }
      />

      {loadError && (
        <ErrorState description={loadError.message} onRetry={() => setReloadKey((k) => k + 1)} />
      )}

      {!loadError && noAccountsYet && (
        <EmptyState
          icon={<AccountBalanceWalletOutlinedIcon fontSize="inherit" />}
          title="Add an account first"
          description="A recurring rule needs an account to post its generated transactions to."
          actionLabel="Add Account"
          onAction={() => navigate('/accounts')}
        />
      )}

      {!loadError && !noAccountsYet && (
        <DataTable
          columns={columns}
          rows={rules ?? []}
          getRowId={(row) => row.id}
          loading={rules === null || accounts === null}
          emptyTitle="No recurring rules yet"
          emptyDescription="Add a rule for anything that repeats — salary, rent, a subscription — and matching transactions will be generated automatically when they're due."
        />
      )}

      {!loadError && !noAccountsYet && (rules?.length ?? 0) > 0 && (
        <Stack direction="row" spacing={1} sx={{ mt: 2, color: 'text.secondary' }}>
          <AutorenewOutlinedIcon fontSize="small" />
          <Box sx={{ fontSize: 'body2.fontSize' }}>
            Due transactions are generated automatically whenever you open the app — no need to
            visit this page for them to arrive.
          </Box>
        </Stack>
      )}

      <RecurringTransactionFormDialog
        open={dialogOpen}
        mode={editingRule ? 'edit' : 'create'}
        initialValues={initialFormValues}
        accountOptions={accountOptions}
        categories={categories ?? []}
        onClose={closeDialog}
        onSubmit={handleSubmit}
      />
    </Box>
  );
}
