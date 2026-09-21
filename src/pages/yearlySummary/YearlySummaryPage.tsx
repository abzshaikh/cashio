import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import { PageHeader } from '../../components/common/PageHeader';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { StatCard } from '../../components/common/StatCard';
import { CurrencyText } from '../../components/common/CurrencyText';
import { YearSelector } from '../../components/common/YearSelector';
import { useAuth } from '../../context/AuthContext';
import { useTransactions } from '../../hooks/useTransactions';
import { useBudgets } from '../../hooks/useBudgets';
import { useExpenseCategories } from '../../hooks/useExpenseCategories';
import { useYearNavigation } from '../../hooks/useYearNavigation';
import { getExpenseByCategory, getPeriodTotals } from '../../utils/dashboardCalculations';
import { getYearRange } from '../../utils/reportCalculations';
import { getBudgetProgress, type BudgetStatus } from '../../utils/budgetCalculations';
import {
  getBiggestExpense,
  getBudgetsForMonth,
  getTransactionCountByType,
} from '../../utils/monthlySummaryCalculations';
import {
  formatChangePercent,
  formatSavingsRateChange,
  getSavingsRate,
  getTrendDirection,
  getYearlyMonthlyBreakdown,
  getYearOverYearChange,
} from '../../utils/yearlySummaryCalculations';
import { getCategoryLabel } from '../../utils/expenseCategoryLookup';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import { downloadSummaryPdf } from '../../utils/summaryPdfExport';
import { TRANSACTION_TYPE_CHIP_META } from '../../config/transactionTypeMeta';
import { CATEGORY_CHART_COLORS as PIE_COLORS } from '../../config/chartColors';
import { TRANSACTION_TYPES } from '../../types/transaction';

const STATUS_LABELS: Record<BudgetStatus, string> = {
  safe: 'On track',
  warning: 'Warning',
  nearLimit: 'Near limit',
  over: 'Over budget',
};

const YEAR_COMPARISON_LABEL = 'last year';

export function YearlySummaryPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { transactions, error: transactionsError, reload: reloadTransactions } = useTransactions();
  const { budgets, error: budgetsError, reload: reloadBudgets } = useBudgets();
  const { categories } = useExpenseCategories();

  const currency = profile?.currency ?? 'INR';
  const {
    selectedYear,
    yearStart,
    yearEnd,
    yearLabel,
    goToPreviousYear,
    goToNextYear,
    isAtCurrentYear,
  } = useYearNavigation();

  const previousYearRange = useMemo(() => getYearRange(selectedYear - 1), [selectedYear]);

  const loadError = transactionsError ?? budgetsError;
  const stillLoading = transactions === null || budgets === null;

  const currentTotals = useMemo(
    () => getPeriodTotals(transactions ?? [], yearStart, yearEnd),
    [transactions, yearStart, yearEnd],
  );

  const previousTotals = useMemo(
    () => getPeriodTotals(transactions ?? [], previousYearRange.start, previousYearRange.end),
    [transactions, previousYearRange],
  );

  const change = useMemo(
    () => getYearOverYearChange(currentTotals, previousTotals),
    [currentTotals, previousTotals],
  );

  const currentSavingsRate = useMemo(() => getSavingsRate(currentTotals), [currentTotals]);
  const previousSavingsRate = useMemo(() => getSavingsRate(previousTotals), [previousTotals]);
  const savingsRateChangePercent =
    currentSavingsRate !== null && previousSavingsRate !== null
      ? (currentSavingsRate - previousSavingsRate) * 100
      : null;

  const monthlyBreakdown = useMemo(
    () => getYearlyMonthlyBreakdown(transactions ?? [], selectedYear),
    [transactions, selectedYear],
  );

  const categorySpend = useMemo(
    () => getExpenseByCategory(transactions ?? [], yearStart, yearEnd),
    [transactions, yearStart, yearEnd],
  );
  const categoryTotal = categorySpend.reduce((sum, c) => sum + c.amount, 0);

  // `getBudgetsForMonth` is period-agnostic despite its name — it just
  // filters by date-range overlap, so it works unmodified for a full-year
  // range too (see yearlySummaryCalculations.ts's file comment).
  const yearBudgets = useMemo(
    () => getBudgetsForMonth(budgets ?? [], yearStart, yearEnd),
    [budgets, yearStart, yearEnd],
  );

  const biggestExpense = useMemo(
    () => getBiggestExpense(transactions ?? [], yearStart, yearEnd),
    [transactions, yearStart, yearEnd],
  );

  const transactionCounts = useMemo(
    () => getTransactionCountByType(transactions ?? [], yearStart, yearEnd),
    [transactions, yearStart, yearEnd],
  );
  const totalTransactionCount = TRANSACTION_TYPES.reduce(
    (sum, type) => sum + transactionCounts[type],
    0,
  );

  const reloadAll = () => {
    reloadTransactions();
    reloadBudgets();
  };

  const handleExportPdf = () => {
    downloadSummaryPdf(
      {
        title: 'Yearly Summary',
        periodLabel: yearLabel,
        currency,
        income: currentTotals.income,
        expense: currentTotals.expense,
        net: currentTotals.net,
        savingsRate: currentSavingsRate,
        categorySpend: categorySpend.map((c) => ({
          label: getCategoryLabel(categories ?? [], c.categoryId),
          amount: c.amount,
        })),
        budgets: yearBudgets.map((budget) => {
          const { total, actual, status } = getBudgetProgress(budget, transactions ?? []);
          return { name: budget.name, actual, total, statusLabel: STATUS_LABELS[status] };
        }),
        biggestExpense: biggestExpense
          ? {
              amount: biggestExpense.amount,
              payee: biggestExpense.merchant || biggestExpense.description || 'No description',
              date: formatDate(biggestExpense.date),
              category: getCategoryLabel(categories ?? [], biggestExpense.category),
            }
          : null,
        transactionCounts: TRANSACTION_TYPES.filter((type) => transactionCounts[type] > 0).map(
          (type) => ({ label: TRANSACTION_TYPE_CHIP_META[type].label, count: transactionCounts[type] }),
        ),
        totalTransactionCount,
      },
      `yearly-summary-${selectedYear}.pdf`,
    );
  };

  if (loadError) {
    return (
      <Box>
        <PageHeader
          title="Yearly Summary"
          subtitle="A complete recap of one year's income, spending, and budgets."
        />
        <ErrorState description={loadError.message} onRetry={reloadAll} />
      </Box>
    );
  }

  if (stillLoading) {
    return (
      <Box>
        <PageHeader
          title="Yearly Summary"
          subtitle="A complete recap of one year's income, spending, and budgets."
        />
        <LoadingState message="Loading your yearly summary…" />
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title="Yearly Summary"
        subtitle="A complete recap of one year's income, spending, and budgets."
        actions={
          <Button
            variant="outlined"
            startIcon={<PictureAsPdfOutlinedIcon />}
            onClick={handleExportPdf}
          >
            Export PDF
          </Button>
        }
      />

      <Box sx={{ mb: 3 }}>
        <YearSelector
          label={yearLabel}
          onPrevious={goToPreviousYear}
          onNext={goToNextYear}
          nextDisabled={isAtCurrentYear}
        />
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="Income"
            value={<CurrencyText amount={currentTotals.income} currency={currency} />}
            color="success"
            trend={formatChangePercent(change.incomeChangePercent, YEAR_COMPARISON_LABEL)}
            trendDirection={getTrendDirection(change.incomeChangePercent, true)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="Expenses"
            value={<CurrencyText amount={currentTotals.expense} currency={currency} />}
            color="error"
            trend={formatChangePercent(change.expenseChangePercent, YEAR_COMPARISON_LABEL)}
            trendDirection={getTrendDirection(change.expenseChangePercent, false)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="Net savings"
            value={<CurrencyText amount={currentTotals.net} currency={currency} colorBySign />}
            color={currentTotals.net >= 0 ? 'success' : 'error'}
            trend={formatChangePercent(change.netChangePercent, YEAR_COMPARISON_LABEL)}
            trendDirection={getTrendDirection(change.netChangePercent, true)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="Savings rate"
            value={currentSavingsRate === null ? '—' : `${(currentSavingsRate * 100).toFixed(1)}%`}
            color={currentSavingsRate !== null && currentSavingsRate >= 0 ? 'success' : 'error'}
            trend={formatSavingsRateChange(currentSavingsRate, previousSavingsRate, YEAR_COMPARISON_LABEL)}
            trendDirection={getTrendDirection(savingsRateChangePercent, true)}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12 }}>
          <Card variant="outlined">
            <CardHeader title="Income vs. expenses by month" subheader={yearLabel} />
            <CardContent sx={{ pt: 0 }}>
              <Box sx={{ width: '100%', height: 280 }}>
                <ResponsiveContainer>
                  <BarChart data={monthlyBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} width={70} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value), { currency })} />
                    <Legend />
                    <Bar dataKey="income" name="Income" fill="#2e7d5b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Expenses" fill="#d32f2f" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined">
            <CardHeader title="Spending by category" subheader={yearLabel} />
            <CardContent sx={{ pt: 0 }}>
              {categorySpend.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No expenses recorded for {yearLabel}.
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
                  <Stack spacing={1.5} sx={{ mt: 1 }}>
                    {categorySpend.map((entry, index) => {
                      const share = categoryTotal > 0 ? entry.amount / categoryTotal : 0;
                      return (
                        <Box key={entry.categoryId}>
                          <Stack
                            direction="row"
                            spacing={1}
                            sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}
                          >
                            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
                              <Box
                                sx={{
                                  width: 10,
                                  height: 10,
                                  borderRadius: '50%',
                                  bgcolor: PIE_COLORS[index % PIE_COLORS.length],
                                  flexShrink: 0,
                                }}
                              />
                              <Typography variant="body2" noWrap>
                                {getCategoryLabel(categories ?? [], entry.categoryId)}
                              </Typography>
                            </Stack>
                            <CurrencyText amount={entry.amount} currency={currency} component="span" />
                          </Stack>
                          <LinearProgress
                            variant="determinate"
                            value={share * 100}
                            sx={{ height: 6, borderRadius: 3, bgcolor: 'action.hover' }}
                          />
                        </Box>
                      );
                    })}
                  </Stack>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined">
            <CardHeader
              title="Budget performance"
              subheader={yearLabel}
              action={
                <Button size="small" onClick={() => navigate('/budgets')}>
                  View all
                </Button>
              }
            />
            <CardContent sx={{ pt: 0 }}>
              {yearBudgets.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No budgets cover {yearLabel}. Create one from the Budgets page.
                </Typography>
              ) : (
                <Stack spacing={2}>
                  {yearBudgets.map((budget) => {
                    const { total, actual, percentSpent, status } = getBudgetProgress(
                      budget,
                      transactions ?? [],
                    );
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
                              color: (theme) =>
                                theme.palette.getContrastText(theme.palette.status[status]),
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
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined">
            <CardHeader title="Biggest expense" subheader={yearLabel} />
            <CardContent sx={{ pt: 0 }}>
              {biggestExpense === null ? (
                <Typography variant="body2" color="text.secondary">
                  No expenses recorded for {yearLabel}.
                </Typography>
              ) : (
                <Stack spacing={0.5}>
                  <CurrencyText
                    amount={biggestExpense.amount}
                    currency={currency}
                    sx={{ fontSize: '1.5rem', fontWeight: 700 }}
                  />
                  <Typography variant="body2">
                    {biggestExpense.merchant || biggestExpense.description || 'No description'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(biggestExpense.date)} ·{' '}
                    {getCategoryLabel(categories ?? [], biggestExpense.category)}
                  </Typography>
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined">
            <CardHeader title="Transactions this year" subheader={yearLabel} />
            <CardContent sx={{ pt: 0 }}>
              {totalTransactionCount === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No transactions recorded for {yearLabel}.
                </Typography>
              ) : (
                <Stack spacing={1.5}>
                  <Typography variant="body2" color="text.secondary">
                    {totalTransactionCount} total
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                    {TRANSACTION_TYPES.filter((type) => transactionCounts[type] > 0).map((type) => (
                      <Chip
                        key={type}
                        label={`${TRANSACTION_TYPE_CHIP_META[type].label}: ${transactionCounts[type]}`}
                        color={TRANSACTION_TYPE_CHIP_META[type].color}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Stack>
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
