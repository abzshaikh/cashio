import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import ReceiptOutlinedIcon from '@mui/icons-material/ReceiptOutlined';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import PaidOutlinedIcon from '@mui/icons-material/PaidOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import { PageHeader } from '../../components/common/PageHeader';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { StatCard } from '../../components/common/StatCard';
import { CurrencyText } from '../../components/common/CurrencyText';
import { ReceiptCard } from '../../components/receipts/ReceiptCard';
import { ReceiptFormDialog } from '../../components/receipts/ReceiptFormDialog';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useConfirm } from '../../context/ConfirmDialogContext';
import { useTransactions } from '../../hooks/useTransactions';
import {
  createReceiptWithFile,
  deleteReceipt,
  subscribeToReceipts,
  updateReceipt,
} from '../../services/receiptService';
import { parseDateOnly } from '../../utils/formatDate';
import { toMajorUnits } from '../../utils/money';
import type { ReceiptFormValues } from '../../schemas/receiptSchemas';
import type { Receipt } from '../../types/receipt';
import type { Transaction } from '../../types/transaction';

export function ReceiptsPage() {
  const { user, profile } = useAuth();
  const { success, error: notifyError } = useNotification();
  const confirm = useConfirm();
  const { transactions } = useTransactions();

  const [receipts, setReceipts] = useState<Receipt[] | null>(null);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);

  useEffect(() => {
    if (!user) return;
    setReceipts(null);
    setLoadError(null);
    const unsubscribe = subscribeToReceipts(
      user.uid,
      (data) => setReceipts(data),
      (error) => setLoadError(error),
    );
    return unsubscribe;
    // reloadKey lets the "Try again" button force a fresh subscription.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, reloadKey]);

  const transactionsById = useMemo(() => {
    const map = new Map<string, Transaction>();
    (transactions ?? []).forEach((t) => map.set(t.id, t));
    return map;
  }, [transactions]);

  const totals = useMemo(() => {
    if (!receipts) return { count: 0, amount: 0, linked: 0 };
    return receipts.reduce(
      (acc, receipt) => ({
        count: acc.count + 1,
        amount: acc.amount + receipt.amount,
        linked: acc.linked + (receipt.transactionId ? 1 : 0),
      }),
      { count: 0, amount: 0, linked: 0 },
    );
  }, [receipts]);

  const openCreateDialog = () => {
    setEditingReceipt(null);
    setDialogOpen(true);
  };

  const openEditDialog = (receipt: Receipt) => {
    setEditingReceipt(receipt);
    setDialogOpen(true);
  };

  const closeDialog = () => setDialogOpen(false);

  const handleSubmit = async (values: ReceiptFormValues, file: File | null) => {
    if (!user) return;
    if (editingReceipt) {
      await updateReceipt(editingReceipt.id, values);
      success('Receipt updated');
    } else {
      // file is guaranteed non-null here — ReceiptFormDialog itself
      // refuses to submit a create without one. `createReceiptWithFile`
      // cleans up the uploaded file if the Firestore write that follows
      // it fails, so this doesn't leave an orphaned Storage object behind.
      await createReceiptWithFile(user.uid, values, file as File);
      success('Receipt added');
    }
    setDialogOpen(false);
  };

  const handleDelete = async (receipt: Receipt) => {
    const confirmed = await confirm({
      title: 'Delete receipt?',
      message: `This permanently deletes the receipt from "${receipt.merchant}" and its file. This cannot be undone.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await deleteReceipt(receipt.id, receipt.storagePath);
      success('Receipt deleted');
    } catch (error) {
      notifyError(error instanceof Error ? error.message : 'Failed to delete receipt.');
    }
  };

  const initialFormValues: ReceiptFormValues | undefined = editingReceipt
    ? {
        merchant: editingReceipt.merchant,
        amount: toMajorUnits(editingReceipt.amount),
        date: editingReceipt.date ? parseDateOnly(editingReceipt.date) : new Date(),
        notes: editingReceipt.notes,
        transactionId: editingReceipt.transactionId ?? '',
      }
    : undefined;

  const currency = profile?.currency ?? 'INR';

  return (
    <Box>
      <PageHeader
        title="Receipts"
        subtitle="Keep photos and PDFs of your receipts, linked to the transactions they support."
        actions={
          <Button variant="contained" startIcon={<AddOutlinedIcon />} onClick={openCreateDialog}>
            Add Receipt
          </Button>
        }
      />

      {loadError && (
        <ErrorState description={loadError.message} onRetry={() => setReloadKey((k) => k + 1)} />
      )}

      {!loadError && receipts === null && <LoadingState message="Loading receipts…" />}

      {!loadError && receipts !== null && receipts.length === 0 && (
        <EmptyState
          icon={<ReceiptOutlinedIcon fontSize="inherit" />}
          title="No receipts yet"
          description="Add a photo or PDF of a receipt and, optionally, link it to a transaction you've already recorded."
          actionLabel="Add Receipt"
          onAction={openCreateDialog}
        />
      )}

      {!loadError && receipts !== null && receipts.length > 0 && (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <StatCard
                label="Total receipts"
                value={String(totals.count)}
                icon={ReceiptOutlinedIcon}
                color="primary"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <StatCard
                label="Total amount"
                value={<CurrencyText amount={totals.amount} currency={currency} />}
                icon={PaidOutlinedIcon}
                color="secondary"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <StatCard
                label="Linked to transactions"
                value={`${totals.linked} / ${totals.count}`}
                icon={LinkOutlinedIcon}
                color="success"
              />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            {receipts.map((receipt) => (
              <Grid key={receipt.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <ReceiptCard
                  receipt={receipt}
                  linkedTransaction={
                    receipt.transactionId ? (transactionsById.get(receipt.transactionId) ?? null) : null
                  }
                  currency={currency}
                  onEdit={openEditDialog}
                  onDelete={handleDelete}
                />
              </Grid>
            ))}
          </Grid>
        </>
      )}

      <ReceiptFormDialog
        open={dialogOpen}
        mode={editingReceipt ? 'edit' : 'create'}
        initialValues={initialFormValues}
        existingFileName={editingReceipt?.fileName}
        transactions={transactions ?? []}
        onClose={closeDialog}
        onSubmit={handleSubmit}
      />
    </Box>
  );
}
