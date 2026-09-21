import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Button from '@mui/material/Button';
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined';
import { PageHeader } from '../../components/common/PageHeader';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { useTransactions } from '../../hooks/useTransactions';
import { useBudgets } from '../../hooks/useBudgets';
import { useExpenseCategories } from '../../hooks/useExpenseCategories';
import { useDebts } from '../../hooks/useDebts';
import { useDebtPayments } from '../../hooks/useDebtPayments';
import { useRecurringTransactions } from '../../hooks/useRecurringTransactions';
import { generateInsights, type InsightSeverity } from '../../utils/insightsEngine';
import { INSIGHT_SEVERITY_META } from '../../config/insightSeverityMeta';

const SEVERITY_ORDER: InsightSeverity[] = ['critical', 'warning', 'info', 'positive'];

export function InsightsPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { transactions, error: transactionsError, reload: reloadTransactions } = useTransactions();
  const { budgets, error: budgetsError, reload: reloadBudgets } = useBudgets();
  const { categories, error: categoriesError, reload: reloadCategories } = useExpenseCategories();
  const { debts, error: debtsError, reload: reloadDebts } = useDebts();
  const { payments: debtPayments, error: paymentsError, reload: reloadPayments } = useDebtPayments();
  const {
    recurringTransactions,
    error: recurringError,
    reload: reloadRecurring,
  } = useRecurringTransactions();

  const currency = profile?.currency ?? 'INR';

  const loadError =
    transactionsError ?? budgetsError ?? categoriesError ?? debtsError ?? paymentsError ?? recurringError;
  const stillLoading =
    transactions === null ||
    budgets === null ||
    categories === null ||
    debts === null ||
    debtPayments === null ||
    recurringTransactions === null;

  const insights = useMemo(() => {
    if (stillLoading) return [];
    return generateInsights({
      transactions: transactions ?? [],
      budgets: budgets ?? [],
      categories: categories ?? [],
      debts: debts ?? [],
      debtPayments: debtPayments ?? [],
      recurringTransactions: recurringTransactions ?? [],
      currency,
    });
  }, [stillLoading, transactions, budgets, categories, debts, debtPayments, recurringTransactions, currency]);

  const severityCounts = useMemo(() => {
    const counts: Record<InsightSeverity, number> = { critical: 0, warning: 0, info: 0, positive: 0 };
    for (const insight of insights) counts[insight.severity] += 1;
    return counts;
  }, [insights]);

  const reloadAll = () => {
    reloadTransactions();
    reloadBudgets();
    reloadCategories();
    reloadDebts();
    reloadPayments();
    reloadRecurring();
  };

  if (loadError) {
    return (
      <Box>
        <PageHeader
          title="Insights"
          subtitle="Automatic, rule-based callouts about your spending, budgets, and bills."
        />
        <ErrorState description={loadError.message} onRetry={reloadAll} />
      </Box>
    );
  }

  if (stillLoading) {
    return (
      <Box>
        <PageHeader
          title="Insights"
          subtitle="Automatic, rule-based callouts about your spending, budgets, and bills."
        />
        <LoadingState message="Checking your finances for anything worth flagging…" />
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title="Insights"
        subtitle="Automatic, rule-based callouts about your spending, budgets, and bills."
      />

      {insights.length === 0 ? (
        <EmptyState
          icon={<TaskAltOutlinedIcon fontSize="inherit" />}
          title="You're all caught up"
          description="No insights need your attention right now — check back after your next few transactions."
        />
      ) : (
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            {SEVERITY_ORDER.filter((severity) => severityCounts[severity] > 0).map((severity) => (
              <Chip
                key={severity}
                label={`${INSIGHT_SEVERITY_META[severity].label}: ${severityCounts[severity]}`}
                color={INSIGHT_SEVERITY_META[severity].alertSeverity}
                size="small"
                variant="outlined"
              />
            ))}
          </Stack>

          {insights.map((insight) => (
            <Alert
              key={insight.id}
              severity={INSIGHT_SEVERITY_META[insight.severity].alertSeverity}
              action={
                insight.actionPath && insight.actionLabel ? (
                  <Button color="inherit" size="small" onClick={() => navigate(insight.actionPath!)}>
                    {insight.actionLabel}
                  </Button>
                ) : undefined
              }
            >
              <AlertTitle>{insight.title}</AlertTitle>
              {insight.description}
            </Alert>
          ))}
        </Stack>
      )}
    </Box>
  );
}
