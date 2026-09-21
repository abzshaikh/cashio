import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import PieChartOutlineOutlinedIcon from '@mui/icons-material/PieChartOutlineOutlined';
import AutorenewOutlinedIcon from '@mui/icons-material/AutorenewOutlined';
import SubscriptionsOutlinedIcon from '@mui/icons-material/SubscriptionsOutlined';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import RequestQuoteOutlinedIcon from '@mui/icons-material/RequestQuoteOutlined';
import ReceiptOutlinedIcon from '@mui/icons-material/ReceiptOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import type { NavItem } from '../types/nav';

/**
 * Primary navigation, built incrementally phase by phase.
 */
export const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: DashboardOutlinedIcon },
  { label: 'Transactions', path: '/transactions', icon: ReceiptLongOutlinedIcon },
  { label: 'Recurring', path: '/recurring', icon: AutorenewOutlinedIcon },
  { label: 'Subscriptions', path: '/subscriptions', icon: SubscriptionsOutlinedIcon },
  { label: 'Accounts', path: '/accounts', icon: AccountBalanceWalletOutlinedIcon },
  { label: 'Budgets', path: '/budgets', icon: PieChartOutlineOutlinedIcon },
  { label: 'Goals', path: '/goals', icon: FlagOutlinedIcon },
  { label: 'Debts', path: '/debts', icon: RequestQuoteOutlinedIcon },
  { label: 'Receipts', path: '/receipts', icon: ReceiptOutlinedIcon },
  { label: 'Reports', path: '/reports', icon: AssessmentOutlinedIcon },
  { label: 'Monthly Summary', path: '/monthly-summary', icon: CalendarMonthOutlinedIcon },
  { label: 'Yearly Summary', path: '/yearly-summary', icon: EventNoteOutlinedIcon },
  { label: 'Insights', path: '/insights', icon: InsightsOutlinedIcon },
  { label: 'Net Worth', path: '/net-worth', icon: TrendingUpOutlinedIcon },
  { label: 'Audit Log', path: '/audit-log', icon: HistoryOutlinedIcon },
  { label: 'Settings', path: '/settings', icon: SettingsOutlinedIcon },
];
