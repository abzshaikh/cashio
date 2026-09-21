import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import RequestQuoteOutlinedIcon from '@mui/icons-material/RequestQuoteOutlined';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import PriceCheckOutlinedIcon from '@mui/icons-material/PriceCheckOutlined';
import CelebrationOutlinedIcon from '@mui/icons-material/CelebrationOutlined';
import { PageHeader } from '../../components/common/PageHeader';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { StatCard } from '../../components/common/StatCard';
import { CurrencyText } from '../../components/common/CurrencyText';
import { DebtCard } from '../../components/debts/DebtCard';
import { DebtFormDialog } from '../../components/debts/DebtFormDialog';
import { PaymentFormDialog } from '../../components/debts/PaymentFormDialog';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useConfirm } from '../../context/ConfirmDialogContext';
import {
  createDebt,
  createDebtPayment,
  deleteDebt,
  deleteDebtPayment,
  subscribeToDebtPayments,
  subscribeToDebts,
  updateDebt,
} from '../../services/debtService';
import { getDebtProgress } from '../../utils/debtCalculations';
import { parseDateOnly } from '../../utils/formatDate';
import { toMajorUnits } from '../../utils/money';
import type { DebtFormValues } from '../../schemas/debtSchemas';
import type { DebtPaymentFormValues } from '../../schemas/debtPaymentSchemas';
import type { Debt } from '../../types/debt';
import type { DebtPayment } from '../../types/debtPayment';

export function DebtsPage() {
  const { user, profile } = useAuth();
  const { success, error: notifyError } = useNotification();
  const confirm = useConfirm();

  const [debts, setDebts] = useState<Debt[] | null>(null);
  const [payments, setPayments] = useState<DebtPayment[] | null>(null);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [debtDialogOpen, setDebtDialogOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [paymentDebt, setPaymentDebt] = useState<Debt | null>(null);

  useEffect(() => {
    if (!user) return;
    setDebts(null);
    setPayments(null);
    setLoadError(null);

    const unsubscribeDebts = subscribeToDebts(
      user.uid,
      (data) => setDebts(data),
      (error) => setLoadError(error),
    );
    const unsubscribePayments = subscribeToDebtPayments(
      user.uid,
      (data) => setPayments(data),
      (error) => setLoadError(error),
    );
    return () => {
      unsubscribeDebts();
      unsubscribePayments();
    };
    // reloadKey lets the "Try again" button force a fresh subscription.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, reloadKey]);

  const totals = useMemo(() => {
    if (!debts) return { outstanding: 0, original: 0, paidOff: 0 };
    return debts.reduce(
      (acc, debt) => {
        const progress = getDebtProgress(debt, payments ?? []);
        return {
          outstanding: acc.outstanding + progress.outstandingAmount,
          original: acc.original + debt.originalAmount,
          paidOff: acc.paidOff + (progress.isPaidOff ? 1 : 0),
        };
      },
      { outstanding: 0, original: 0, paidOff: 0 },
    );
  }, [debts, payments]);

  const openCreateDialog = () => {
    setEditingDebt(null);
    setDebtDialogOpen(true);
  };

  const openEditDialog = (debt: Debt) => {
    setEditingDebt(debt);
    setDebtDialogOpen(true);
  };

  const closeDebtDialog = () => setDebtDialogOpen(false);

  const handleSubmitDebt = async (values: DebtFormValues) => {
    if (!user) return;
    if (editingDebt) {
      await updateDebt(editingDebt.id, values);
      success('Debt updated');
    } else {
      await createDebt(user.uid, values);
      success('Debt added');
    }
    setDebtDialogOpen(false);
  };

  const handleDeleteDebt = async (debt: Debt) => {
    if (!user) return;
    const confirmed = await confirm({
      title: 'Delete debt?',
      message: `This permanently deletes "${debt.lender}" and every payment recorded against it.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await deleteDebt(user.uid, debt.id);
      success('Debt deleted');
    } catch (error) {
      notifyError(error instanceof Error ? error.message : 'Failed to delete debt.');
    }
  };

  const handleSubmitPayment = async (values: DebtPaymentFormValues) => {
    if (!user || !paymentDebt) return;
    await createDebtPayment(user.uid, { ...values, debtId: paymentDebt.id });
    success('Payment recorded');
    setPaymentDebt(null);
  };

  const handleDeletePayment = async (payment: DebtPayment) => {
    const confirmed = await confirm({
      title: 'Delete payment?',
      message: "This removes it from the debt's progress. This cannot be undone.",
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await deleteDebtPayment(payment.id);
      success('Payment deleted');
    } catch (error) {
      notifyError(error instanceof Error ? error.message : 'Failed to delete payment.');
    }
  };

  const initialFormValues: DebtFormValues | undefined = editingDebt
    ? {
        lender: editingDebt.lender,
        category: editingDebt.category,
        originalAmount: toMajorUnits(editingDebt.originalAmount),
        interestRate: editingDebt.interestRate,
        minimumPayment: toMajorUnits(editingDebt.minimumPayment),
        paymentDueDay: editingDebt.paymentDueDay,
        startDate: editingDebt.startDate ? parseDateOnly(editingDebt.startDate) : new Date(),
        hasEndDate: editingDebt.endDate !== null,
        endDate: editingDebt.endDate ? parseDateOnly(editingDebt.endDate) : null,
        notes: editingDebt.notes,
      }
    : undefined;

  const currency = profile?.currency ?? 'INR';

  return (
    <Box>
      <PageHeader
        title="Debts"
        subtitle="Track what you owe and chip away at it, one payment at a time."
        actions={
          <Button variant="contained" startIcon={<AddOutlinedIcon />} onClick={openCreateDialog}>
            Add Debt
          </Button>
        }
      />

      {loadError && (
        <ErrorState description={loadError.message} onRetry={() => setReloadKey((k) => k + 1)} />
      )}

      {!loadError && (debts === null || payments === null) && <LoadingState message="Loading debts…" />}

      {!loadError && debts !== null && payments !== null && debts.length === 0 && (
        <EmptyState
          icon={<RequestQuoteOutlinedIcon fontSize="inherit" />}
          title="No debts tracked yet"
          description="Add a loan, a mortgage, or money borrowed from family, and track your payments toward paying it off."
          actionLabel="Add Debt"
          onAction={openCreateDialog}
        />
      )}

      {!loadError && debts !== null && payments !== null && debts.length > 0 && (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <StatCard
                label="Total outstanding"
                value={<CurrencyText amount={totals.outstanding} currency={currency} />}
                icon={AccountBalanceOutlinedIcon}
                color="warning"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <StatCard
                label="Total original amount"
                value={<CurrencyText amount={totals.original} currency={currency} />}
                icon={PriceCheckOutlinedIcon}
                color="primary"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <StatCard
                label="Debts paid off"
                value={`${totals.paidOff} / ${debts.length}`}
                icon={CelebrationOutlinedIcon}
                color="secondary"
              />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            {debts.map((debt) => (
              <Grid key={debt.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <DebtCard
                  debt={debt}
                  payments={payments}
                  currency={currency}
                  onEdit={openEditDialog}
                  onDelete={handleDeleteDebt}
                  onAddPayment={setPaymentDebt}
                  onDeletePayment={handleDeletePayment}
                />
              </Grid>
            ))}
          </Grid>
        </>
      )}

      <DebtFormDialog
        open={debtDialogOpen}
        mode={editingDebt ? 'edit' : 'create'}
        initialValues={initialFormValues}
        onClose={closeDebtDialog}
        onSubmit={handleSubmitDebt}
      />

      <PaymentFormDialog
        open={paymentDebt !== null}
        lenderName={paymentDebt?.lender ?? ''}
        onClose={() => setPaymentDebt(null)}
        onSubmit={handleSubmitPayment}
      />
    </Box>
  );
}
