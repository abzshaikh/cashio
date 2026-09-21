import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
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
import SubscriptionsOutlinedIcon from '@mui/icons-material/SubscriptionsOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import EventRepeatOutlinedIcon from '@mui/icons-material/EventRepeatOutlined';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { StatCard } from '../../components/common/StatCard';
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
import { recurringFrequencyMeta } from '../../config/recurringFrequencies';
import { getCategoryLabel, getSubcategoryLabel } from '../../utils/expenseCategoryLookup';
import { getSubscriptionTotals, normalizeToMonthly } from '../../utils/subscriptionCalculations';
import { formatDate, parseDateOnly } from '../../utils/formatDate';
import { toMajorUnits } from '../../utils/money';
import type { RecurringTransactionFormValues } from '../../schemas/recurringTransactionSchemas';
import { defaultRecurringTransactionFormValues } from '../../schemas/recurringTransactionSchemas';
import type { Account } from '../../types/account';
import type { RecurringExpenseRule, RecurringTransaction } from '../../types/recurringTransaction';

/**
 * A specialized, expense-only view over the same `recurringTransactions`
 * collection `RecurringTransactionsPage` reads — not a duplicate collection
 * or service. Every mutation here (create/update/delete/pause) goes through
 * the exact same `recurringTransactionService` functions that page uses; the
 * only thing unique to this page is the `isSubscription` filter and the
 * cost-normalization totals from `subscriptionCalculations.ts`. See Phase
 * 14's PHASE_LOG.md section for why this design was chosen up front.
 */
export function SubscriptionsPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { success, error: notifyError } = useNotification();
  const confirm = useConfirm();
  const { categories } = useExpenseCategories();

  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [rules, setRules] = useState<RecurringTransaction[] | null>(null);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RecurringExpenseRule | null>(null);

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

  // The whole reason this page exists rather than just linking to a filtered
  // Recurring Transactions view: subscriptions are expense rules flagged
  // `isSubscription`, nothing more.
  const subscriptions = useMemo(
    () =>
      (rules ?? []).filter(
        (r): r is RecurringExpenseRule => r.type === 'expense' && r.isSubscription,
      ),
    [rules],
  );

  const totals = useMemo(() => getSubscriptionTotals(subscriptions), [subscriptions]);

  // Aggregate stat-card totals assume a single currency, same accepted
  // simplification `DashboardPage.tsx` makes for its own totals — a
  // multi-currency breakdown is future work, not a Phase 15 requirement.
  const currency = profile?.currency ?? 'INR';

  const openCreateDialog = () => {
    setEditingRule(null);
    setDialogOpen(true);
  };

  const openEditDialog = (rule: RecurringExpenseRule) => {
    setEditingRule(rule);
    setDialogOpen(true);
  };

  const closeDialog = () => setDialogOpen(false);

  const handleSubmit = async (values: RecurringTransactionFormValues) => {
    if (!user) return;
    if (editingRule) {
      await updateRecurringTransaction(editingRule.id, values, editingRule.lastGeneratedDate);
      success('Subscription updated');
    } else {
      await createRecurringTransaction(user.uid, values);
      success('Subscription added');
    }
    setDialogOpen(false);
  };

  const handleDelete = async (rule: RecurringExpenseRule) => {
    const confirmed = await confirm({
      title: 'Delete subscription?',
      message:
        'This stops future transactions from being generated. Transactions already created from it are not affected.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await deleteRecurringTransaction(rule.id);
      success('Subscription deleted');
    } catch (error) {
      notifyError(error instanceof Error ? error.message : 'Failed to delete subscription.');
    }
  };

  const handleToggleActive = async (rule: RecurringExpenseRule) => {
    try {
      await setRecurringTransactionActive(rule.id, !rule.isActive);
      success(rule.isActive ? 'Subscription paused' : 'Subscription resumed');
    } catch (error) {
      notifyError(error instanceof Error ? error.message : 'Failed to update subscription.');
    }
  };

  const initialFormValues: RecurringTransactionFormValues | undefined = editingRule
    ? {
        type: 'expense',
        amount: toMajorUnits(editingRule.amount),
        frequency: editingRule.frequency,
        startDate: parseDateOnly(editingRule.startDate),
        neverEnds: editingRule.endDate === null,
        endDate: editingRule.endDate ? parseDateOnly(editingRule.endDate) : null,
        accountId: editingRule.accountId,
        category: editingRule.category,
        subcategory: editingRule.subcategory,
        merchant: editingRule.merchant,
        paymentMethod: editingRule.paymentMethod,
        isSubscription: editingRule.isSubscription,
        source: '',
        description: editingRule.description,
        notes: editingRule.notes,
      }
    : {
        // Pre-fills "Add Subscription" as an expense flagged as a
        // subscription — the Type field is left editable (not locked) so a
        // user who picked the wrong page isn't stuck, but the sensible
        // defaults mean most people never need to touch it.
        ...defaultRecurringTransactionFormValues,
        type: 'expense',
        isSubscription: true,
        category: categories?.[0]?.slug ?? '',
      };

  const columns: DataTableColumn<RecurringExpenseRule>[] = [
    {
      id: 'merchant',
      header: 'Service',
      render: (row) => row.merchant || '—',
    },
    {
      id: 'category',
      header: 'Category',
      render: (row) => {
        const label = getCategoryLabel(categories ?? [], row.category);
        if (!row.subcategory) return label;
        return `${label} → ${getSubcategoryLabel(categories ?? [], row.category, row.subcategory)}`;
      },
    },
    {
      id: 'account',
      header: 'Account',
      render: (row) => accountsById[row.accountId]?.name ?? '—',
    },
    {
      id: 'frequency',
      header: 'Billing cycle',
      render: (row) => recurringFrequencyMeta[row.frequency]?.label ?? row.frequency,
    },
    {
      id: 'amount',
      header: 'Amount',
      align: 'right',
      accessor: (row) => row.amount,
      sortable: true,
      render: (row) => (
        <CurrencyText amount={row.amount} currency={accountsById[row.accountId]?.currency} />
      ),
    },
    {
      id: 'monthlyEquivalent',
      header: 'Monthly cost',
      align: 'right',
      accessor: (row) => normalizeToMonthly(row.amount, row.frequency),
      sortable: true,
      render: (row) => (
        <CurrencyText
          amount={normalizeToMonthly(row.amount, row.frequency)}
          currency={accountsById[row.accountId]?.currency}
          sx={{ color: 'text.secondary' }}
        />
      ),
    },
    {
      id: 'nextOccurrence',
      header: 'Next billing',
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
              aria-label={row.isActive ? 'Pause subscription' : 'Resume subscription'}
              onClick={() => handleToggleActive(row)}
            >
              {row.isActive ? (
                <PauseCircleOutlineOutlinedIcon fontSize="small" />
              ) : (
                <PlayCircleOutlineOutlinedIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
          <IconButton size="small" aria-label="Edit subscription" onClick={() => openEditDialog(row)}>
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" aria-label="Delete subscription" onClick={() => handleDelete(row)}>
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
        title="Subscriptions"
        subtitle="Every recurring expense you've flagged as a subscription, with what it's costing you."
        actions={
          <Button
            variant="contained"
            startIcon={<AddOutlinedIcon />}
            onClick={openCreateDialog}
            disabled={noAccountsYet}
          >
            Add Subscription
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
          description="A subscription needs an account to post its generated transactions to."
          actionLabel="Add Account"
          onAction={() => navigate('/accounts')}
        />
      )}

      {!loadError && !noAccountsYet && (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <StatCard
                label="Monthly cost"
                value={<CurrencyText amount={totals.monthlyTotal} currency={currency} />}
                icon={CalendarMonthOutlinedIcon}
                color="primary"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <StatCard
                label="Yearly cost"
                value={<CurrencyText amount={totals.yearlyTotal} currency={currency} />}
                icon={EventRepeatOutlinedIcon}
                color="secondary"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <StatCard
                label="Active subscriptions"
                value={totals.activeCount}
                icon={SubscriptionsOutlinedIcon}
                color="success"
              />
            </Grid>
          </Grid>

          <DataTable
            columns={columns}
            rows={subscriptions}
            getRowId={(row) => row.id}
            loading={rules === null || accounts === null}
            emptyTitle="No subscriptions yet"
            emptyDescription='Add one here, or flag any expense on the Recurring page as "This is a subscription" and it will show up here automatically.'
          />
        </>
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
