import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { AuthLayout } from '../components/layout/AuthLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { PublicOnlyRoute } from './PublicOnlyRoute';
import { LoadingState } from '../components/common/LoadingState';

// Route-level code splitting: each page is its own chunk, loaded on demand
// instead of bloating the initial bundle (see PHASE_LOG.md, Phase 40).
const DashboardPage = lazy(() =>
  import('../pages/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const TransactionsPage = lazy(() =>
  import('../pages/transactions/TransactionsPage').then((m) => ({ default: m.TransactionsPage })),
);
const AccountsPage = lazy(() =>
  import('../pages/accounts/AccountsPage').then((m) => ({ default: m.AccountsPage })),
);
const BudgetsPage = lazy(() =>
  import('../pages/budgets/BudgetsPage').then((m) => ({ default: m.BudgetsPage })),
);
const RecurringTransactionsPage = lazy(() =>
  import('../pages/recurring/RecurringTransactionsPage').then((m) => ({
    default: m.RecurringTransactionsPage,
  })),
);
const SubscriptionsPage = lazy(() =>
  import('../pages/subscriptions/SubscriptionsPage').then((m) => ({
    default: m.SubscriptionsPage,
  })),
);
const GoalsPage = lazy(() =>
  import('../pages/goals/GoalsPage').then((m) => ({ default: m.GoalsPage })),
);
const DebtsPage = lazy(() =>
  import('../pages/debts/DebtsPage').then((m) => ({ default: m.DebtsPage })),
);
const ReceiptsPage = lazy(() =>
  import('../pages/receipts/ReceiptsPage').then((m) => ({ default: m.ReceiptsPage })),
);
const ReportsPage = lazy(() =>
  import('../pages/reports/ReportsPage').then((m) => ({ default: m.ReportsPage })),
);
const MonthlySummaryPage = lazy(() =>
  import('../pages/monthlySummary/MonthlySummaryPage').then((m) => ({
    default: m.MonthlySummaryPage,
  })),
);
const YearlySummaryPage = lazy(() =>
  import('../pages/yearlySummary/YearlySummaryPage').then((m) => ({
    default: m.YearlySummaryPage,
  })),
);
const InsightsPage = lazy(() =>
  import('../pages/insights/InsightsPage').then((m) => ({ default: m.InsightsPage })),
);
const NetWorthPage = lazy(() =>
  import('../pages/networth/NetWorthPage').then((m) => ({ default: m.NetWorthPage })),
);
const AuditLogPage = lazy(() =>
  import('../pages/auditLog/AuditLogPage').then((m) => ({ default: m.AuditLogPage })),
);
// Not listed in `navConfig.ts` (see PHASE_LOG.md, Phase 28) — reached via
// the "Import CSV" button on `TransactionsPage` instead, since it's a
// one-off workflow rather than a page a user browses repeatedly.
const ImportPage = lazy(() =>
  import('../pages/importData/ImportPage').then((m) => ({ default: m.ImportPage })),
);
const SettingsPage = lazy(() =>
  import('../pages/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);
const LoginPage = lazy(() =>
  import('../pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })),
);
const RegisterPage = lazy(() =>
  import('../pages/auth/RegisterPage').then((m) => ({ default: m.RegisterPage })),
);
const ForgotPasswordPage = lazy(() =>
  import('../pages/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })),
);
const NotFoundPage = lazy(() =>
  import('../pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
);

function withSuspense(node: ReactNode) {
  return <Suspense fallback={<LoadingState message="Loading…" />}>{node}</Suspense>;
}

export const router = createBrowserRouter([
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: '/', element: withSuspense(<DashboardPage />) },
      { path: '/transactions', element: withSuspense(<TransactionsPage />) },
      { path: '/accounts', element: withSuspense(<AccountsPage />) },
      { path: '/budgets', element: withSuspense(<BudgetsPage />) },
      { path: '/recurring', element: withSuspense(<RecurringTransactionsPage />) },
      { path: '/subscriptions', element: withSuspense(<SubscriptionsPage />) },
      { path: '/goals', element: withSuspense(<GoalsPage />) },
      { path: '/debts', element: withSuspense(<DebtsPage />) },
      { path: '/receipts', element: withSuspense(<ReceiptsPage />) },
      { path: '/reports', element: withSuspense(<ReportsPage />) },
      { path: '/monthly-summary', element: withSuspense(<MonthlySummaryPage />) },
      { path: '/yearly-summary', element: withSuspense(<YearlySummaryPage />) },
      { path: '/insights', element: withSuspense(<InsightsPage />) },
      { path: '/net-worth', element: withSuspense(<NetWorthPage />) },
      { path: '/audit-log', element: withSuspense(<AuditLogPage />) },
      { path: '/import', element: withSuspense(<ImportPage />) },
      { path: '/settings', element: withSuspense(<SettingsPage />) },
    ],
  },
  {
    element: (
      <PublicOnlyRoute>
        <AuthLayout />
      </PublicOnlyRoute>
    ),
    children: [
      { path: '/login', element: withSuspense(<LoginPage />) },
      { path: '/register', element: withSuspense(<RegisterPage />) },
      { path: '/forgot-password', element: withSuspense(<ForgotPasswordPage />) },
    ],
  },
  { path: '*', element: withSuspense(<NotFoundPage />) },
]);
