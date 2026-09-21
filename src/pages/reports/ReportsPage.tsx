import { useMemo } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import { PageHeader } from '../../components/common/PageHeader';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { StatCard } from '../../components/common/StatCard';
import { CurrencyText } from '../../components/common/CurrencyText';
import { MonthSelector } from '../../components/common/MonthSelector';
import { useAuth } from '../../context/AuthContext';
import { useTransactions } from '../../hooks/useTransactions';
import { useExpenseCategories } from '../../hooks/useExpenseCategories';
import { useMonthNavigation } from '../../hooks/useMonthNavigation';
import { getExpenseByCategory, getPeriodTotals } from '../../utils/dashboardCalculations';
import { getMonthlyTrend } from '../../utils/reportCalculations';
import { getCategoryLabel } from '../../utils/expenseCategoryLookup';
import { formatCurrency } from '../../utils/formatCurrency';

const TREND_MONTHS = 6;

export function ReportsPage() {
  const { profile } = useAuth();
  const { transactions, error: transactionsError, reload } = useTransactions();
  const { categories } = useExpenseCategories();

  const currency = profile?.currency ?? 'INR';
  const {
    selectedMonthDate,
    monthStart,
    monthEnd,
    monthLabel,
    goToPreviousMonth,
    goToNextMonth,
    isAtCurrentMonth,
  } = useMonthNavigation();

  const periodTotals = useMemo(
    () => getPeriodTotals(transactions ?? [], monthStart, monthEnd),
    [transactions, monthStart, monthEnd],
  );

  const categorySpend = useMemo(
    () => getExpenseByCategory(transactions ?? [], monthStart, monthEnd),
    [transactions, monthStart, monthEnd],
  );

  const trend = useMemo(
    () => getMonthlyTrend(transactions ?? [], TREND_MONTHS, selectedMonthDate),
    [transactions, selectedMonthDate],
  );

  const topCategoryTotal = categorySpend.reduce((sum, c) => sum + c.amount, 0);

  if (transactionsError) {
    return (
      <Box>
        <PageHeader title="Reports" subtitle="Analyze spending patterns and compare periods." />
        <ErrorState description={transactionsError.message} onRetry={reload} />
      </Box>
    );
  }

  if (transactions === null) {
    return (
      <Box>
        <PageHeader title="Reports" subtitle="Analyze spending patterns and compare periods." />
        <LoadingState message="Loading your reports…" />
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader title="Reports" subtitle="Analyze spending patterns and compare periods." />

      <Box sx={{ mb: 3 }}>
        <MonthSelector
          label={monthLabel}
          onPrevious={goToPreviousMonth}
          onNext={goToNextMonth}
          nextDisabled={isAtCurrentMonth}
        />
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard
            label="Income"
            value={<CurrencyText amount={periodTotals.income} currency={currency} />}
            color="success"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard
            label="Expenses"
            value={<CurrencyText amount={periodTotals.expense} currency={currency} />}
            color="error"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard
            label="Net"
            value={<CurrencyText amount={periodTotals.net} currency={currency} colorBySign />}
            color={periodTotals.net >= 0 ? 'success' : 'error'}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card variant="outlined">
            <CardHeader
              title={`Income vs. expenses (last ${TREND_MONTHS} months)`}
            />
            <CardContent sx={{ pt: 0 }}>
              <Box sx={{ width: '100%', height: 280 }}>
                <ResponsiveContainer>
                  <BarChart data={trend}>
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

        <Grid size={{ xs: 12, md: 5 }}>
          <Card variant="outlined">
            <CardHeader title="Top categories" />
            <CardContent sx={{ pt: 0 }}>
              {categorySpend.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No expenses recorded for {monthLabel}.
                </Typography>
              ) : (
                <Stack spacing={1.5}>
                  {categorySpend.slice(0, 8).map((entry) => {
                    const share = topCategoryTotal > 0 ? entry.amount / topCategoryTotal : 0;
                    return (
                      <Box key={entry.categoryId}>
                        <Stack
                          direction="row"
                          sx={{ justifyContent: 'space-between', mb: 0.5 }}
                        >
                          <Typography variant="body2">
                            {getCategoryLabel(categories ?? [], entry.categoryId)}
                          </Typography>
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
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
