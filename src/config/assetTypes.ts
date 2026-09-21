import HomeWorkOutlinedIcon from '@mui/icons-material/HomeWorkOutlined';
import DirectionsCarOutlinedIcon from '@mui/icons-material/DirectionsCarOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import type { SvgIconComponent } from '@mui/icons-material';
import type { AssetType } from '../types/asset';

export const assetTypeMeta: Record<AssetType, { label: string; icon: SvgIconComponent }> = {
  property: { label: 'Property', icon: HomeWorkOutlinedIcon },
  vehicle: { label: 'Vehicle', icon: DirectionsCarOutlinedIcon },
  investment: { label: 'Investment', icon: TrendingUpOutlinedIcon },
  other: { label: 'Other', icon: CategoryOutlinedIcon },
};

export const assetTypeOptions = (Object.keys(assetTypeMeta) as AssetType[]).map((value) => ({
  value,
  label: assetTypeMeta[value].label,
}));
