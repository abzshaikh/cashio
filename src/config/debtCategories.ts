import RequestQuoteOutlinedIcon from '@mui/icons-material/RequestQuoteOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import DirectionsCarOutlinedIcon from '@mui/icons-material/DirectionsCarOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import LocalHospitalOutlinedIcon from '@mui/icons-material/LocalHospitalOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import type { SvgIconComponent } from '@mui/icons-material';
import type { DebtCategory } from '../types/debt';

export const debtCategoryMeta: Record<DebtCategory, { label: string; icon: SvgIconComponent }> = {
  personal_loan: { label: 'Personal Loan', icon: RequestQuoteOutlinedIcon },
  student_loan: { label: 'Student Loan', icon: SchoolOutlinedIcon },
  auto_loan: { label: 'Auto Loan', icon: DirectionsCarOutlinedIcon },
  mortgage: { label: 'Mortgage', icon: HomeOutlinedIcon },
  medical_debt: { label: 'Medical Debt', icon: LocalHospitalOutlinedIcon },
  borrowed_from_family: { label: 'Borrowed from Family/Friends', icon: GroupsOutlinedIcon },
  other: { label: 'Other', icon: CategoryOutlinedIcon },
};

export const debtCategoryOptions = (Object.keys(debtCategoryMeta) as DebtCategory[]).map((value) => ({
  value,
  label: debtCategoryMeta[value].label,
}));
