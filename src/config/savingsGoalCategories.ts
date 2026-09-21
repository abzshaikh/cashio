import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import FlightTakeoffOutlinedIcon from '@mui/icons-material/FlightTakeoffOutlined';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import DirectionsCarOutlinedIcon from '@mui/icons-material/DirectionsCarOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import FavoriteBorderOutlinedIcon from '@mui/icons-material/FavoriteBorderOutlined';
import SavingsOutlinedIcon from '@mui/icons-material/SavingsOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import type { SvgIconComponent } from '@mui/icons-material';
import type { SavingsGoalCategory } from '../types/savingsGoal';

export const savingsGoalCategoryMeta: Record<
  SavingsGoalCategory,
  { label: string; icon: SvgIconComponent }
> = {
  emergency_fund: { label: 'Emergency Fund', icon: SecurityOutlinedIcon },
  vacation: { label: 'Vacation', icon: FlightTakeoffOutlinedIcon },
  major_purchase: { label: 'Major Purchase', icon: ShoppingBagOutlinedIcon },
  home: { label: 'Home', icon: HomeOutlinedIcon },
  vehicle: { label: 'Vehicle', icon: DirectionsCarOutlinedIcon },
  education: { label: 'Education', icon: SchoolOutlinedIcon },
  wedding: { label: 'Wedding', icon: FavoriteBorderOutlinedIcon },
  retirement: { label: 'Retirement', icon: SavingsOutlinedIcon },
  other: { label: 'Other', icon: CategoryOutlinedIcon },
};

export const savingsGoalCategoryOptions = (
  Object.keys(savingsGoalCategoryMeta) as SavingsGoalCategory[]
).map((value) => ({ value, label: savingsGoalCategoryMeta[value].label }));
