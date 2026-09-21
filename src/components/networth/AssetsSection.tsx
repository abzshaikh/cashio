import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import SavingsOutlinedIcon from '@mui/icons-material/SavingsOutlined';
import { CurrencyText } from '../common/CurrencyText';
import { EmptyState } from '../common/EmptyState';
import { ErrorState } from '../common/ErrorState';
import { formatDate } from '../../utils/formatDate';
import { assetTypeMeta } from '../../config/assetTypes';
import type { Asset } from '../../types/asset';

interface AssetsSectionProps {
  assets: Asset[] | null;
  error: Error | null;
  currency?: string;
  onAdd: () => void;
  onEdit: (asset: Asset) => void;
  onDelete: (asset: Asset) => void;
  onRetry: () => void;
}

/**
 * The "Other Assets" management card on `NetWorthPage` — everything the
 * page tracks manually rather than reading from an `Account` (see
 * `types/asset.ts`). Same "named list with edit/delete icon actions"
 * shape as `BudgetTemplatesSection`, plus an "Add" action since (unlike a
 * template) a manual asset has nothing else to be derived from.
 */
export function AssetsSection({ assets, error, currency, onAdd, onEdit, onDelete, onRetry }: AssetsSectionProps) {
  return (
    <Card variant="outlined">
      <CardHeader
        title="Other Assets"
        subheader="Property, vehicles, and anything else with value that isn't already an account."
        action={
          <Button variant="outlined" size="small" startIcon={<AddOutlinedIcon />} onClick={onAdd}>
            Add Asset
          </Button>
        }
      />
      <CardContent>
        {error && <ErrorState description={error.message} onRetry={onRetry} />}
        {!error && assets === null && <EmptyState title="Loading assets…" />}
        {!error && assets !== null && assets.length === 0 && (
          <EmptyState
            icon={<SavingsOutlinedIcon fontSize="inherit" />}
            title="No other assets yet"
            description="Add anything with value that isn't already tracked as an account — a home, a vehicle, an outside investment."
            actionLabel="Add Asset"
            onAction={onAdd}
          />
        )}
        {!error && assets !== null && assets.length > 0 && (
          <Stack spacing={1}>
            {assets.map((asset) => {
              const Icon = assetTypeMeta[asset.type].icon;
              return (
                <Stack
                  key={asset.id}
                  direction="row"
                  spacing={1.5}
                  sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0 }}>
                    <Icon fontSize="small" color="action" />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                        {asset.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {assetTypeMeta[asset.type].label} · as of {formatDate(asset.asOf)}
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexShrink: 0 }}>
                    <CurrencyText amount={asset.value} currency={currency} component="span" />
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        aria-label={`Edit asset ${asset.label}`}
                        onClick={() => onEdit(asset)}
                      >
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        aria-label={`Delete asset ${asset.label}`}
                        onClick={() => onDelete(asset)}
                      >
                        <DeleteOutlineOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Stack>
              );
            })}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
