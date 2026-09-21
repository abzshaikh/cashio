import { useState, type MouseEvent } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import MoreVertOutlinedIcon from '@mui/icons-material/MoreVertOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import { CurrencyText } from '../common/CurrencyText';
import { debtCategoryMeta } from '../../config/debtCategories';
import { getDebtProgress, type DebtStatus } from '../../utils/debtCalculations';
import { formatDate } from '../../utils/formatDate';
import { formatPercent } from '../../utils/formatCurrency';
import type { Debt } from '../../types/debt';
import type { DebtPayment } from '../../types/debtPayment';

interface DebtCardProps {
  debt: Debt;
  payments: DebtPayment[];
  currency?: string;
  onEdit: (debt: Debt) => void;
  onDelete: (debt: Debt) => void;
  onAddPayment: (debt: Debt) => void;
  onDeletePayment: (payment: DebtPayment) => void;
}

const STATUS_LABELS: Record<DebtStatus, string> = {
  safe: 'On track',
  warning: 'Payment approaching',
  nearLimit: 'Payment due soon',
};

/** A short, human line about the next payment — deliberately separate from
 * the status chip's short label, since this one carries the actual day
 * count and due date. */
function dueText(isPaidOff: boolean, daysUntilDue: number, nextPaymentDueDate: string): string | null {
  if (isPaidOff) return null;
  if (daysUntilDue === 0) return `Payment due today (${formatDate(nextPaymentDueDate)})`;
  return `Payment due in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'} (${formatDate(nextPaymentDueDate)})`;
}

export function DebtCard({
  debt,
  payments,
  currency,
  onEdit,
  onDelete,
  onAddPayment,
  onDeletePayment,
}: DebtCardProps) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const openMenu = (event: MouseEvent<HTMLElement>) => setMenuAnchor(event.currentTarget);
  const closeMenu = () => setMenuAnchor(null);

  const { outstandingAmount, percentPaidOff, isPaidOff, daysUntilDue, nextPaymentDueDate, status } =
    getDebtProgress(debt, payments);
  const debtPayments = payments
    .filter((p) => p.debtId === debt.id)
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date));

  const CategoryIcon = debtCategoryMeta[debt.category]?.icon;
  const due = dueText(isPaidOff, daysUntilDue, nextPaymentDueDate);

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
              {CategoryIcon && <CategoryIcon fontSize="small" sx={{ color: 'text.secondary' }} />}
              <Typography variant="subtitle1" noWrap sx={{ fontWeight: 600 }}>
                {debt.lender}
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" noWrap>
              {debt.interestRate}% APR · Min. payment{' '}
              <CurrencyText amount={debt.minimumPayment} currency={currency} component="span" />
            </Typography>
          </Box>
          <IconButton size="small" onClick={openMenu} aria-label={`Actions for ${debt.lender}`}>
            <MoreVertOutlinedIcon fontSize="small" />
          </IconButton>
          <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
            <MenuItem
              onClick={() => {
                closeMenu();
                onEdit(debt);
              }}
            >
              <ListItemIcon>
                <EditOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Edit</ListItemText>
            </MenuItem>
            <MenuItem
              onClick={() => {
                closeMenu();
                onDelete(debt);
              }}
            >
              <ListItemIcon>
                <DeleteOutlineOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Delete</ListItemText>
            </MenuItem>
          </Menu>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap' }}>
          <Chip
            label={debtCategoryMeta[debt.category]?.label ?? debt.category}
            size="small"
            variant="outlined"
          />
          <Chip
            label={isPaidOff ? 'Paid off' : STATUS_LABELS[status]}
            size="small"
            sx={{
              bgcolor: (theme) => theme.palette.status[status],
              color: (theme) => theme.palette.getContrastText(theme.palette.status[status]),
            }}
          />
        </Stack>

        <Stack direction="row" sx={{ alignItems: 'baseline', justifyContent: 'space-between', mt: 2 }}>
          <Typography variant="h5" component="p" sx={{ fontWeight: 700 }}>
            <CurrencyText amount={outstandingAmount} currency={currency} component="span" /> /{' '}
            <CurrencyText amount={debt.originalAmount} currency={currency} component="span" />
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formatPercent(percentPaidOff)} paid
          </Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={Math.min(percentPaidOff, 1) * 100}
          sx={{
            mt: 1,
            height: 8,
            borderRadius: 4,
            bgcolor: 'action.hover',
            '& .MuiLinearProgress-bar': {
              bgcolor: (theme) => theme.palette.status[status],
              borderRadius: 4,
            },
          }}
        />
        {due && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {due}
          </Typography>
        )}

        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddOutlinedIcon />}
            onClick={() => onAddPayment(debt)}
          >
            Record payment
          </Button>
          <Button size="small" onClick={() => setShowHistory((v) => !v)}>
            {showHistory ? 'Hide' : 'Show'} {debtPayments.length} payment
            {debtPayments.length === 1 ? '' : 's'}
          </Button>
        </Stack>

        <Collapse in={showHistory} unmountOnExit>
          <Divider sx={{ my: 1.5 }} />
          {debtPayments.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No payments yet.
            </Typography>
          ) : (
            <Stack spacing={0.75}>
              {debtPayments.map((payment) => (
                <Stack
                  key={payment.id}
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" noWrap>
                      {formatDate(payment.date)}
                      {payment.note ? ` · ${payment.note}` : ''}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexShrink: 0 }}>
                    <CurrencyText amount={payment.amount} currency={currency} />
                    <IconButton
                      size="small"
                      aria-label={`Delete payment of ${payment.amount} on ${formatDate(payment.date)}`}
                      onClick={() => onDeletePayment(payment)}
                    >
                      <DeleteOutlineOutlinedIcon fontSize="inherit" />
                    </IconButton>
                  </Stack>
                </Stack>
              ))}
            </Stack>
          )}
        </Collapse>
      </CardContent>
    </Card>
  );
}
