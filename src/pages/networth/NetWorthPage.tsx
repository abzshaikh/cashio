import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import RequestQuoteOutlinedIcon from '@mui/icons-material/RequestQuoteOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import { PageHeader } from '../../components/common/PageHeader';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { StatCard } from '../../components/common/StatCard';
import { CurrencyText } from '../../components/common/CurrencyText';
import { AssetsSection } from '../../components/networth/AssetsSection';
import { LiabilitiesSection } from '../../components/networth/LiabilitiesSection';
import { AssetFormDialog } from '../../components/networth/AssetFormDialog';
import { LiabilityFormDialog } from '../../components/networth/LiabilityFormDialog';
import { NetWorthBreakdownCard } from '../../components/networth/NetWorthBreakdownCard';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useConfirm } from '../../context/ConfirmDialogContext';
import { useAccounts } from '../../hooks/useAccounts';
import { useDebts } from '../../hooks/useDebts';
import { useDebtPayments } from '../../hooks/useDebtPayments';
import { createAsset, deleteAsset, subscribeToAssets, updateAsset } from '../../services/assetService';
import {
  createLiability,
  deleteLiability,
  subscribeToLiabilities,
  updateLiability,
} from '../../services/liabilityService';
import {
  getAssetBreakdown,
  getLiabilityBreakdown,
  getNetWorthSummary,
} from '../../utils/netWorthCalculations';
import { parseDateOnly } from '../../utils/formatDate';
import { toMajorUnits } from '../../utils/money';
import type { AssetFormValues } from '../../schemas/assetSchemas';
import type { LiabilityFormValues } from '../../schemas/liabilitySchemas';
import type { Asset } from '../../types/asset';
import type { Liability } from '../../types/liability';

type AssetDialogState = { mode: 'create' } | { mode: 'edit'; asset: Asset } | null;
type LiabilityDialogState = { mode: 'create' } | { mode: 'edit'; liability: Liability } | null;

/**
 * Phase 27: a genuinely new, dedicated page — unlike Phase 25/26's
 * additions to the existing Budgets page, net worth spans accounts, debts,
 * and two brand-new collections, and stands on its own the same way
 * Phase 22/23/24's summary/insights pages do. Almost all of its numbers
 * are reuse rather than new math (see `utils/netWorthCalculations.ts`'s
 * doc comment): only the two manual `assets`/`liabilities` collections are
 * new state this phase actually owns and mutates, so — mirroring
 * `BudgetsPage`'s own reasoning for managing budgets directly — those two
 * subscriptions are managed here rather than through a shared hook, while
 * accounts/debts/debt payments are read via the existing read-only hooks.
 */
export function NetWorthPage() {
  const { user, profile } = useAuth();
  const { success, error: notifyError } = useNotification();
  const confirm = useConfirm();

  const { accounts, error: accountsError, reload: reloadAccounts } = useAccounts();
  const { debts, error: debtsError, reload: reloadDebts } = useDebts();
  const { payments, error: paymentsError, reload: reloadPayments } = useDebtPayments();

  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [assetsError, setAssetsError] = useState<Error | null>(null);
  const [assetsReloadKey, setAssetsReloadKey] = useState(0);

  const [liabilities, setLiabilities] = useState<Liability[] | null>(null);
  const [liabilitiesError, setLiabilitiesError] = useState<Error | null>(null);
  const [liabilitiesReloadKey, setLiabilitiesReloadKey] = useState(0);

  const [assetDialog, setAssetDialog] = useState<AssetDialogState>(null);
  const [liabilityDialog, setLiabilityDialog] = useState<LiabilityDialogState>(null);

  useEffect(() => {
    if (!user) return;
    setAssets(null);
    setAssetsError(null);
    return subscribeToAssets(user.uid, setAssets, setAssetsError);
    // assetsReloadKey lets a "Try again" action force a fresh subscription.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, assetsReloadKey]);

  useEffect(() => {
    if (!user) return;
    setLiabilities(null);
    setLiabilitiesError(null);
    return subscribeToLiabilities(user.uid, setLiabilities, setLiabilitiesError);
    // liabilitiesReloadKey lets a "Try again" action force a fresh subscription.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, liabilitiesReloadKey]);

  const loadError = accountsError ?? debtsError ?? paymentsError;
  const stillLoading = accounts === null || debts === null || payments === null || assets === null || liabilities === null;

  const summary = useMemo(
    () =>
      getNetWorthSummary(accounts ?? [], debts ?? [], payments ?? [], assets ?? [], liabilities ?? []),
    [accounts, debts, payments, assets, liabilities],
  );
  const assetBreakdown = useMemo(
    () => getAssetBreakdown(accounts ?? [], assets ?? []),
    [accounts, assets],
  );
  const liabilityBreakdown = useMemo(
    () => getLiabilityBreakdown(accounts ?? [], debts ?? [], payments ?? [], liabilities ?? []),
    [accounts, debts, payments, liabilities],
  );

  const handleAssetSubmit = async (values: AssetFormValues) => {
    if (!user) return;
    if (assetDialog?.mode === 'edit') {
      await updateAsset(assetDialog.asset.id, values);
      success('Asset updated');
    } else {
      await createAsset(user.uid, values);
      success('Asset added');
    }
    setAssetDialog(null);
  };

  const handleDeleteAsset = async (asset: Asset) => {
    const confirmed = await confirm({
      title: 'Delete asset?',
      message: `This permanently removes "${asset.label}" from your net worth.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await deleteAsset(asset.id);
      success('Asset deleted');
    } catch (error) {
      notifyError(error instanceof Error ? error.message : 'Failed to delete asset.');
    }
  };

  const handleLiabilitySubmit = async (values: LiabilityFormValues) => {
    if (!user) return;
    if (liabilityDialog?.mode === 'edit') {
      await updateLiability(liabilityDialog.liability.id, values);
      success('Liability updated');
    } else {
      await createLiability(user.uid, values);
      success('Liability added');
    }
    setLiabilityDialog(null);
  };

  const handleDeleteLiability = async (liability: Liability) => {
    const confirmed = await confirm({
      title: 'Delete liability?',
      message: `This permanently removes "${liability.label}" from your net worth.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await deleteLiability(liability.id);
      success('Liability deleted');
    } catch (error) {
      notifyError(error instanceof Error ? error.message : 'Failed to delete liability.');
    }
  };

  const assetInitialValues: AssetFormValues | undefined =
    assetDialog?.mode === 'edit'
      ? {
          type: assetDialog.asset.type,
          label: assetDialog.asset.label,
          value: toMajorUnits(assetDialog.asset.value),
          asOf: parseDateOnly(assetDialog.asset.asOf),
        }
      : undefined;

  const liabilityInitialValues: LiabilityFormValues | undefined =
    liabilityDialog?.mode === 'edit'
      ? {
          type: liabilityDialog.liability.type,
          label: liabilityDialog.liability.label,
          value: toMajorUnits(liabilityDialog.liability.value),
          asOf: parseDateOnly(liabilityDialog.liability.asOf),
        }
      : undefined;

  return (
    <Box>
      <PageHeader
        title="Net Worth"
        subtitle="What you own minus what you owe, as of today — reflects your current account balances and any assets or liabilities you track manually."
      />

      {loadError && (
        <ErrorState
          description={loadError.message}
          onRetry={() => {
            reloadAccounts();
            reloadDebts();
            reloadPayments();
          }}
        />
      )}

      {!loadError && stillLoading && <LoadingState message="Loading net worth…" />}

      {!loadError && !stillLoading && (
        <Stack spacing={3}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <StatCard
                label="Total Assets"
                value={<CurrencyText amount={summary.totalAssets} currency={profile?.currency} component="span" />}
                icon={AccountBalanceWalletOutlinedIcon}
                color="success"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <StatCard
                label="Total Liabilities"
                value={<CurrencyText amount={summary.totalLiabilities} currency={profile?.currency} component="span" />}
                icon={RequestQuoteOutlinedIcon}
                color="error"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <StatCard
                label="Net Worth"
                value={<CurrencyText amount={summary.netWorth} currency={profile?.currency} component="span" />}
                icon={TrendingUpOutlinedIcon}
                color={summary.netWorth >= 0 ? 'success' : 'error'}
              />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <NetWorthBreakdownCard
                title="Assets breakdown"
                entries={assetBreakdown}
                currency={profile?.currency}
                emptyMessage="No assets tracked yet."
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <NetWorthBreakdownCard
                title="Liabilities breakdown"
                entries={liabilityBreakdown}
                currency={profile?.currency}
                emptyMessage="No liabilities tracked yet."
              />
            </Grid>
          </Grid>

          <AssetsSection
            assets={assets}
            error={assetsError}
            currency={profile?.currency}
            onAdd={() => setAssetDialog({ mode: 'create' })}
            onEdit={(asset) => setAssetDialog({ mode: 'edit', asset })}
            onDelete={handleDeleteAsset}
            onRetry={() => setAssetsReloadKey((k) => k + 1)}
          />

          <LiabilitiesSection
            liabilities={liabilities}
            error={liabilitiesError}
            currency={profile?.currency}
            onAdd={() => setLiabilityDialog({ mode: 'create' })}
            onEdit={(liability) => setLiabilityDialog({ mode: 'edit', liability })}
            onDelete={handleDeleteLiability}
            onRetry={() => setLiabilitiesReloadKey((k) => k + 1)}
          />
        </Stack>
      )}

      <AssetFormDialog
        open={assetDialog !== null}
        mode={assetDialog?.mode ?? 'create'}
        initialValues={assetInitialValues}
        onClose={() => setAssetDialog(null)}
        onSubmit={handleAssetSubmit}
      />

      <LiabilityFormDialog
        open={liabilityDialog !== null}
        mode={liabilityDialog?.mode ?? 'create'}
        initialValues={liabilityInitialValues}
        onClose={() => setLiabilityDialog(null)}
        onSubmit={handleLiabilitySubmit}
      />
    </Box>
  );
}
