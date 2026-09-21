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
import RequestQuoteOutlinedIcon from '@mui/icons-material/RequestQuoteOutlined';
import { CurrencyText } from '../common/CurrencyText';
import { EmptyState } from '../common/EmptyState';
import { ErrorState } from '../common/ErrorState';
import { formatDate } from '../../utils/formatDate';
import { liabilityTypeMeta } from '../../config/liabilityTypes';
import type { Liability } from '../../types/liability';

interface LiabilitiesSectionProps {
  liabilities: Liability[] | null;
  error: Error | null;
  currency?: string;
  onAdd: () => void;
  onEdit: (liability: Liability) => void;
  onDelete: (liability: Liability) => void;
  onRetry: () => void;
}

/** The debt-side mirror of `AssetsSection` — everything owed that isn't
 * already a credit card `Account` or a tracked `Debt` (see
 * `types/liability.ts`). */
export function LiabilitiesSection({
  liabilities,
  error,
  currency,
  onAdd,
  onEdit,
  onDelete,
  onRetry,
}: LiabilitiesSectionProps) {
  return (
    <Card variant="outlined">
      <CardHeader
        title="Other Liabilities"
        subheader="Back taxes, informal loans, or anything else owed that isn't already a credit card or tracked debt."
        action={
          <Button variant="outlined" size="small" startIcon={<AddOutlinedIcon />} onClick={onAdd}>
            Add Liability
          </Button>
        }
      />
      <CardContent>
        {error && <ErrorState description={error.message} onRetry={onRetry} />}
        {!error && liabilities === null && <EmptyState title="Loading liabilities…" />}
        {!error && liabilities !== null && liabilities.length === 0 && (
          <EmptyState
            icon={<RequestQuoteOutlinedIcon fontSize="inherit" />}
            title="No other liabilities yet"
            description="Add anything owed that isn't already a credit card or a tracked debt — back taxes, an informal loan."
            actionLabel="Add Liability"
            onAction={onAdd}
          />
        )}
        {!error && liabilities !== null && liabilities.length > 0 && (
          <Stack spacing={1}>
            {liabilities.map((liability) => {
              const Icon = liabilityTypeMeta[liability.type].icon;
              return (
                <Stack
                  key={liability.id}
                  direction="row"
                  spacing={1.5}
                  sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0 }}>
                    <Icon fontSize="small" color="action" />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                        {liability.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {liabilityTypeMeta[liability.type].label} · as of {formatDate(liability.asOf)}
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexShrink: 0 }}>
                    <CurrencyText amount={liability.value} currency={currency} component="span" />
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        aria-label={`Edit liability ${liability.label}`}
                        onClick={() => onEdit(liability)}
                      >
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        aria-label={`Delete liability ${liability.label}`}
                        onClick={() => onDelete(liability)}
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
