import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import CreditCardOutlinedIcon from '@mui/icons-material/CreditCardOutlined';
import CreditScoreOutlinedIcon from '@mui/icons-material/CreditScoreOutlined';
import { PageHeader } from '../../components/common/PageHeader';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { StatCard } from '../../components/common/StatCard';
import { CurrencyText } from '../../components/common/CurrencyText';
import { AccountCard } from '../../components/accounts/AccountCard';
import { AccountFormDialog } from '../../components/accounts/AccountFormDialog';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useConfirm } from '../../context/ConfirmDialogContext';
import {
  createAccount,
  deleteAccount,
  subscribeToAccounts,
  updateAccount,
} from '../../services/accountService';
import { sumBalancesByCurrency } from '../../utils/accountFormatting';
import { getCreditCardProgress } from '../../utils/creditCardCalculations';
import { toMajorUnits } from '../../utils/money';
import type { AccountFormValues, AccountSubmitValues } from '../../schemas/accountSchemas';
import type { Account } from '../../types/account';

export function AccountsPage() {
  const { user, profile } = useAuth();
  const { success, error: notifyError } = useNotification();
  const confirm = useConfirm();

  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  useEffect(() => {
    if (!user) return;
    setAccounts(null);
    setLoadError(null);
    const unsubscribe = subscribeToAccounts(
      user.uid,
      (data) => setAccounts(data),
      (error) => setLoadError(error),
    );
    return unsubscribe;
    // reloadKey lets the "Try again" button force a fresh subscription.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, reloadKey]);

  const totalsByCurrency = useMemo(
    () => sumBalancesByCurrency(accounts ?? []),
    [accounts],
  );

  // Credit cards already contribute their (negative-when-owing) balance to
  // totalsByCurrency above like any other account; these are an additional,
  // clarifying view specifically for card debt/available credit, only
  // shown when at least one credit card has a credit limit set.
  const creditCardTotals = useMemo(() => {
    const cards = (accounts ?? []).filter(
      (account) => account.type === 'credit_card' && account.creditLimit,
    );
    return cards.reduce(
      (acc, account) => {
        const progress = getCreditCardProgress(account);
        return {
          debt: acc.debt + progress.debt,
          available: acc.available + progress.availableCredit,
          count: acc.count + 1,
        };
      },
      { debt: 0, available: 0, count: 0 },
    );
  }, [accounts]);

  const openCreateDialog = () => {
    setEditingAccount(null);
    setDialogOpen(true);
  };

  const openEditDialog = (account: Account) => {
    setEditingAccount(account);
    setDialogOpen(true);
  };

  const closeDialog = () => setDialogOpen(false);

  const handleSubmit = async (values: AccountSubmitValues) => {
    if (!user) return;
    if (editingAccount) {
      await updateAccount(editingAccount.id, {
        name: values.name,
        type: values.type,
        institution: values.institution,
        accountNumber: values.accountNumber,
        currency: values.currency,
        status: values.status,
        notes: values.notes,
        creditLimit: values.creditLimit,
        statementDay: values.statementDay,
        paymentDueDay: values.paymentDueDay,
      });
      success('Account updated');
    } else {
      await createAccount(user.uid, {
        name: values.name,
        type: values.type,
        institution: values.institution,
        accountNumber: values.accountNumber,
        openingBalance: values.openingBalance,
        currency: values.currency,
        status: values.status,
        notes: values.notes,
        creditLimit: values.creditLimit,
        statementDay: values.statementDay,
        paymentDueDay: values.paymentDueDay,
      });
      success('Account added');
    }
    setDialogOpen(false);
  };

  const handleDelete = async (account: Account) => {
    const confirmed = await confirm({
      title: 'Delete account?',
      message: `This permanently deletes "${account.name}". This does not delete any transactions already recorded against it.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await deleteAccount(account.id);
      success('Account deleted');
    } catch (error) {
      notifyError(error instanceof Error ? error.message : 'Failed to delete account.');
    }
  };

  const initialFormValues: AccountFormValues | undefined = editingAccount
    ? {
        name: editingAccount.name,
        type: editingAccount.type,
        institution: editingAccount.institution,
        accountNumber: editingAccount.accountNumber,
        openingBalance: toMajorUnits(editingAccount.openingBalance),
        currency: editingAccount.currency,
        status: editingAccount.status,
        notes: editingAccount.notes,
        creditLimit:
          editingAccount.creditLimit == null ? 0 : toMajorUnits(editingAccount.creditLimit),
        statementDay: editingAccount.statementDay ?? 1,
        paymentDueDay: editingAccount.paymentDueDay ?? 1,
      }
    : undefined;

  const currency = profile?.currency ?? 'INR';

  return (
    <Box>
      <PageHeader
        title="Accounts"
        subtitle="Bank accounts, cash, credit cards and more."
        actions={
          <Button variant="contained" startIcon={<AddOutlinedIcon />} onClick={openCreateDialog}>
            Add Account
          </Button>
        }
      />

      {Object.keys(totalsByCurrency).length > 0 && (
        <Grid container spacing={2} sx={{ mb: creditCardTotals.count > 0 ? 2 : 3 }}>
          {Object.entries(totalsByCurrency).map(([balanceCurrency, total]) => (
            <Grid key={balanceCurrency} size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard
                label={`Total balance (${balanceCurrency})`}
                value={<CurrencyText amount={total} currency={balanceCurrency} />}
                icon={AccountBalanceWalletOutlinedIcon}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {creditCardTotals.count > 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <StatCard
              label="Total credit card debt"
              value={<CurrencyText amount={creditCardTotals.debt} currency={currency} />}
              icon={CreditCardOutlinedIcon}
              color="warning"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <StatCard
              label="Total available credit"
              value={<CurrencyText amount={creditCardTotals.available} currency={currency} />}
              icon={CreditScoreOutlinedIcon}
              color="primary"
            />
          </Grid>
        </Grid>
      )}

      {loadError && <ErrorState description={loadError.message} onRetry={() => setReloadKey((k) => k + 1)} />}

      {!loadError && accounts === null && <LoadingState message="Loading accounts…" />}

      {!loadError && accounts !== null && accounts.length === 0 && (
        <EmptyState
          icon={<AccountBalanceWalletOutlinedIcon fontSize="inherit" />}
          title="No accounts yet"
          description="Add your first bank account, cash wallet, or credit card to start tracking balances."
          actionLabel="Add Account"
          onAction={openCreateDialog}
        />
      )}

      {!loadError && accounts !== null && accounts.length > 0 && (
        <Grid container spacing={2}>
          {accounts.map((account) => (
            <Grid key={account.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <AccountCard account={account} onEdit={openEditDialog} onDelete={handleDelete} />
            </Grid>
          ))}
        </Grid>
      )}

      <AccountFormDialog
        open={dialogOpen}
        mode={editingAccount ? 'edit' : 'create'}
        initialValues={initialFormValues}
        defaultCurrency={profile?.currency}
        onClose={closeDialog}
        onSubmit={handleSubmit}
      />
    </Box>
  );
}
