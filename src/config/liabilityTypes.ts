import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import GavelOutlinedIcon from '@mui/icons-material/GavelOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import type { SvgIconComponent } from '@mui/icons-material';
import type { LiabilityType } from '../types/liability';

export const liabilityTypeMeta: Record<LiabilityType, { label: string; icon: SvgIconComponent }> = {
  loan: { label: 'Loan', icon: AccountBalanceOutlinedIcon },
  tax: { label: 'Tax owed', icon: GavelOutlinedIcon },
  other: { label: 'Other', icon: CategoryOutlinedIcon },
};

export const liabilityTypeOptions = (Object.keys(liabilityTypeMeta) as LiabilityType[]).map(
  (value) => ({ value, label: liabilityTypeMeta[value].label }),
);
