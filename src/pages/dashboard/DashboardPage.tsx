import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Grid, { type GridSize } from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import TrendingDownOutlinedIcon from '@mui/icons-material/TrendingDownOutlined';
import SavingsOutlinedIcon from '@mui/icons-material/SavingsOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { PageHeader } from '../../components/common/PageHeader';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { StatCard } from '../../components/common/StatCard';
import { CurrencyText } from '../../components/common/CurrencyText';
import { DashboardCustomizeDialog } from '../../components/dashboard/DashboardCustomizeDialog';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useNotification } from '../../context/NotificationContext';
import { useAccounts } from '../../hooks/useAccounts';
import { useTransactions } from '../../hooks/useTransactions';
import { useBudgets } from '../../hooks/useBudgets';
import { useExpenseCategories } from '../../hooks/useExpenseCategories';
import { sumBalancesByCurrency } from '../../utils/accountFormatting';
import {
  getActiveBudgets,
  getCurrentMonthRange,
  getExpenseByCategory,
  getPeriodTotals,
} from '../../utils/dashboardCalculations';
import { getBudgetProgress, type BudgetStatus } from '../../utils/budgetCalculations';
import { getCategoryLabel } from '../../utils/expenseCategoryLookup';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import { TRANSACTION_TYPE_CHIP_META } from '../../config/transactionTypeMeta';
import { CATEGORY_CHART_COLORS as PIE_COLORS } from '../../config/chartColors';
import type { DashboardWidgetId } from '../../config/dashboardWidgets';

const WIDGET_GRID_SIZE: Record<DashboardWidgetId, { xs: GridSize; md: GridSize }> = {
  activeBudgets: { xs: 12, md: 7 },
  recentTransactions: { xs: 12, md: 7 },
  categorySpending: { xs: 12, md: 5 },
};

const STATUS_LABELS: Record<BudgetStatus, string> = {
  safe: 'On track',
  warning: 'Warning',
  nearLimit: 'Near limit',
  over: 'Over budget',
};

export function DashboardPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { settings, updateSettings } = useSettings();
  const { error: notifyError } = useNotification();
  const { accounts, error: accountsError, reload: reloadAccounts } = useAccounts();
  const { transactions, error: transactionsError, reload: reloadTransactions } = useTransactions();
  const { budgets, error: budgetsError, reload: reloadBudgets } = useBudgets();
  const { categories } = useExpenseCategories();
  const [customizeOpen, setCustomizeOpen] = useState(false);

  const currency = profile?.currency ?? 'INR';
  const loadError = accountsError ?? transactionsError ?? budgetsError;
  const stillLoading = accounts === null || transactions === null || budgets === null;

  const totalsByCurrency = useMemo(() => sumBalancesByCurrency(accounts ?? []), [accounts]);
  const { start: monthStart, end: monthEnd } = useMemo(() => getCurrentMonthRange(), []);

  const periodTotals = useMemo(
    () => getPeriodTotals(transactions ?? [], monthStart, monthEnd),
    [transactions, monthStart, monthEnd],
  );

  const activeBudgets = useMemo(() => getActiveBudgets(budgets ?? []), [budgets]);

  const categorySpend = useMemo(
    () => getExpenseByCategory(transactions ?? [], monthStart, monthEnd),
    [transactions, monthStart, monthEnd],
  );

  const recentTransactions = useMemo(() => (transactions ?? []).slice(0, 5), [transactions]);

  const reloadAll = () => {
    reloadAccounts();
    reloadTransactions();
    reloadBudgets();
  };

  const handleSaveWidgets = async (widgets: DashboardWidgetId[]) => {
    try {
      // Explicit field list rather than destructuring-and-omitting `settings`
      // — `noUnusedLocals` would otherwise flag the omitted `userId`/
      // `updatedAt` bindings, and this reads as clearly as a spread anyway.
      await updateSettings({
        defaultBudgetPeriod: settings.defaultBudgetPeriod,
        defaultBudgetWarningThreshold: settings.defaultBudgetWarningThreshold,
        defaultBudgetOverThreshold: settings.defaultBudgetOverThreshold,
        defaultAccountId: settings.defaultAccountId,
        defaultCategoryId: settings.defaultCategoryId,
        notifyOnSeverity: settings.notifyOnSeverity,
        dashboardWidgets: widgets,
      });
    } catch (error) {
      notifyError(error instanceof Error ? error.message : 'Failed to update the dashboard layout.');
    }
  };

  if (loadError) {
    return (
      <Box>
        <PageHeader title="Dashboard" subtitle="Your financial overview at a glance." />
        <ErrorState description={loadError.message} onRetry={reloadAll} />
      </Box>
    );
  }

  if (stillLoading) {
    return (
      <Box>
        <PageHeader title="Dashboard" subtitle="Your financial overview at a glance." />
        <LoadingState message="Loading your dashboard…" />
      </Box>
    );
  }

  const hasCurrencyTotals = Object.keys(totalsByCurrency).length > 0;

  /**
   * Phase 39: one card per customizable widget, keyed by `DashboardWidgetId`
   * so the render loop below can map straight over `settings.dashboardWidgets`
   * without a switch statement growing here every time a widget is added.
   */
  const widgetCards: Record<DashboardWidgetId, ReactNode> = {
    activeBudgets: (
      <Card variant="outlined">
        <CardHeader
          title="Active budgets"
          action={
            <Button size="small" onClick={() => navigate('/budgets')}>
              View all
            </Button>
          }
        />
        <CardContent sx={{ pt: 0 }}>
          {activeBudgets.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No budgets are active for today's date. Create one from the Budgets page.
            </Typography>
          ) : (
            <Stack spacing={2}>
              {activeBudgets.map((budget) => {
                const { total, actual, percentSpent, status } = getBudgetProgress(budget, transactions ?? []);
                return (
                  <Box key={budget.id}>
                    <Stack
                      direction="row"
                      sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 0.5 }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {budget.name}
                      </Typography>
                      <Chip
                        label={STATUS_LABELS[status]}
                        size="small"
                        sx={{
                          bgcolor: (theme) => theme.palette.status[status],
                          color: (theme) => theme.palette.getContrastText(theme.palette.status[status]),
                        }}
                      />
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(percentSpent, 1) * 100}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        bgcolor: 'action.hover',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: (theme) => theme.palette.status[status],
                          borderRadius: 3,
                        },
                      }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      <CurrencyText amount={actual} currency={currency} component="span" />
                      {' / '}
                      <CurrencyText amount={total} currency={currency} component="span" />
                    </Typography>
                  </Box>
                );
              })}
            </Stack>
          )}
        </CardContent>
      </Card>
    ),
    recentTransactions: (
      <Card variant="outlined">
        <CardHeader
          title="Recent transactions"
          action={
            <Button size="small" onClick={() => navigate('/transactions')}>
              View all
            </Button>
          }
        />
        <CardContent sx={{ pt: 0 }}>
          {recentTransactions.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No transactions recorded yet.
            </Typography>
          ) : (
            <Stack spacing={1.5}>
              {recentTransactions.map((transaction) => (
                <Stack
                  key={transaction.id}
                  direction="row"
                  sx={{ justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
                    <Chip
                      label={TRANSACTION_TYPE_CHIP_META[transaction.type].label}
                      color={TRANSACTION_TYPE_CHIP_META[transaction.type].color}
                      size="small"
                    />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" noWrap>
                        {transaction.description || '(No description)'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(transaction.date)}
                      </Typography>
                    </Box>
                  </Stack>
                  <CurrencyText amount={transaction.amount} currency={currency} component="span" />
                </Stack>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    ),
    categorySpending: (
      <Card variant="outlined">
        <CardHeader title="Spending by category (this month)" />
        <CardContent sx={{ pt: 0 }}>
          {categorySpend.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No expenses recorded this month yet.
            </Typography>
          ) : (
            <>
              <Box sx={{ width: '100%', height: 220 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={categorySpend}
                      dataKey="amount"
                      nameKey="categoryId"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={2}
                    >
                      {categorySpend.map((entry, index) => (
                        <Cell key={entry.categoryId} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [
                        formatCurrency(Number(value), { currency }),
                        getCategoryLabel(categories ?? [], String(name)),
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
              <Stack spacing={0.75} sx={{ mt: 1 }}>
                {categorySpend.slice(0, 6).map((entry, index) => (
                  <Stack
                    key={entry.categoryId}
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          bgcolor: PIE_COLORS[index % PIE_COLORS.length],
                        }}
                      />
                      <Typography variant="body2">{getCategoryLabel(categories ?? [], entry.categoryId)}</Typography>
                    </Stack>
                    <CurrencyText amount={entry.amount} currency={currency} component="span" />
                  </Stack>
                ))}
              </Stack>
            </>
          )}
        </CardContent>
      </Card>
    ),
  };

  const visibleWidgets = settings.dashboardWidgets.filter((id) => id in widgetCards);

  return (
    <Box>
      <PageHeader
        title="Dashboard"
        subtitle="Your financial overview at a glance."
        actions={
          <Button
            size="small"
            startIcon={<TuneOutlinedIcon />}
            onClick={() => setCustomizeOpen(true)}
          >
            Customize
          </Button>
        }
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {hasCurrencyTotals ? (
          Object.entries(totalsByCurrency).map(([curr, total]) => (
            <Grid key={curr} size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard
                label={`Total balance (${curr})`}
                value={<CurrencyText amount={total} currency={curr} />}
                icon={AccountBalanceWalletOutlinedIcon}
              />
            </Grid>
          ))
        ) : (
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              label="Total balance"
              value={<CurrencyText amount={0} currency={currency} />}
              icon={AccountBalanceWalletOutlinedIcon}
            />
          </Grid>
        )}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="Income this month"
            value={<CurrencyText amount={periodTotals.income} currency={currency} />}
            icon={TrendingUpOutlinedIcon}
            color="success"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="Expenses this month"
            value={<CurrencyText amount={periodTotals.expense} currency={currency} />}
            icon={TrendingDownOutlinedIcon}
            color="error"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="Net this month"
            value={<CurrencyText amount={periodTotals.net} currency={currency} colorBySign />}
            icon={SavingsOutlinedIcon}
            color={periodTotals.net >= 0 ? 'success' : 'error'}
          />
        </Grid>
      </Grid>

      {visibleWidgets.length === 0 ? (
        <EmptyState
          title="All dashboard sections are hidden"
          description="Use Customize to bring back active budgets, recent transactions, or spending by category."
          actionLabel="Customize"
          onAction={() => setCustomizeOpen(true)}
        />
      ) : (
        <Grid container spacing={2}>
          {visibleWidgets.map((id) => (
            <Grid key={id} size={WIDGET_GRID_SIZE[id]}>
              {widgetCards[id]}
            </Grid>
          ))}
        </Grid>
      )}

      <DashboardCustomizeDialog
        open={customizeOpen}
        value={settings.dashboardWidgets}
        onClose={() => setCustomizeOpen(false)}
        onSave={handleSaveWidgets}
      />
    </Box>
  );
}
