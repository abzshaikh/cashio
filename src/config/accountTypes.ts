import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import SavingsOutlinedIcon from '@mui/icons-material/SavingsOutlined';
import CreditCardOutlinedIcon from '@mui/icons-material/CreditCardOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import type { SvgIconComponent } from '@mui/icons-material';
import type { AccountStatus, AccountType } from '../types/account';

export const accountTypeMeta: Record<AccountType, { label: string; icon: SvgIconComponent }> = {
  cash: { label: 'Cash', icon: PaymentsOutlinedIcon },
  bank: { label: 'Bank Account', icon: AccountBalanceOutlinedIcon },
  savings: { label: 'Savings Account', icon: SavingsOutlinedIcon },
  credit_card: { label: 'Credit Card', icon: CreditCardOutlinedIcon },
  wallet: { label: 'Wallet', icon: AccountBalanceWalletOutlinedIcon },
  investment: { label: 'Investment Account', icon: TrendingUpOutlinedIcon },
  other: { label: 'Other', icon: CategoryOutlinedIcon },
};

export const accountTypeOptions = (Object.keys(accountTypeMeta) as AccountType[]).map((value) => ({
  value,
  label: accountTypeMeta[value].label,
}));

export const accountStatusMeta: Record<
  AccountStatus,
  { label: string; color: 'success' | 'default' | 'error' }
> = {
  active: { label: 'Active', color: 'success' },
  inactive: { label: 'Inactive', color: 'default' },
  closed: { label: 'Closed', color: 'error' },
};

export const accountStatusOptions = (Object.keys(accountStatusMeta) as AccountStatus[]).map(
  (value) => ({ value, label: accountStatusMeta[value].label }),
);
