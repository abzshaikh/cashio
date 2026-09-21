import { useState, type MouseEvent } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import MoreVertOutlinedIcon from '@mui/icons-material/MoreVertOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import { CurrencyText } from '../common/CurrencyText';
import { accountTypeMeta, accountStatusMeta } from '../../config/accountTypes';
import { maskAccountNumber } from '../../utils/accountFormatting';
import { getCreditCardProgress, type CreditCardStatus } from '../../utils/creditCardCalculations';
import { formatPercent } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import type { Account } from '../../types/account';

interface AccountCardProps {
  account: Account;
  onEdit: (account: Account) => void;
  onDelete: (account: Account) => void;
}

const CREDIT_CARD_STATUS_LABELS: Record<CreditCardStatus, string> = {
  safe: 'Utilization healthy',
  warning: 'Utilization elevated',
  nearLimit: 'Near credit limit',
  over: 'Over credit limit',
};

export function AccountCard({ account, onEdit, onDelete }: AccountCardProps) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const typeMeta = accountTypeMeta[account.type];
  const statusMeta = accountStatusMeta[account.status];
  const Icon = typeMeta.icon;

  const openMenu = (event: MouseEvent<HTMLElement>) => setMenuAnchor(event.currentTarget);
  const closeMenu = () => setMenuAnchor(null);

  // Only a credit_card account with a real credit limit gets the
  // utilization block below — a credit_card account created before Phase
  // 18 (or one that just hasn't had a limit entered yet) falls back to
  // looking like any other account.
  const creditProgress =
    account.type === 'credit_card' && account.creditLimit
      ? getCreditCardProgress({
          currentBalance: account.currentBalance,
          creditLimit: account.creditLimit,
          statementDay: account.statementDay ?? null,
          paymentDueDay: account.paymentDueDay ?? null,
        })
      : null;

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              borderRadius: 2,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              opacity: 0.9,
              flexShrink: 0,
            }}
          >
            <Icon />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" noWrap sx={{ fontWeight: 600 }}>
              {account.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {typeMeta.label}
              {account.institution ? ` · ${account.institution}` : ''}
            </Typography>
          </Box>
          <IconButton size="small" onClick={openMenu} aria-label={`Actions for ${account.name}`}>
            <MoreVertOutlinedIcon fontSize="small" />
          </IconButton>
          <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
            <MenuItem
              onClick={() => {
                closeMenu();
                onEdit(account);
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
                onDelete(account);
              }}
              sx={{ color: 'error.main' }}
            >
              <ListItemIcon>
                <DeleteOutlineOutlinedIcon fontSize="small" color="error" />
              </ListItemIcon>
              <ListItemText>Delete</ListItemText>
            </MenuItem>
          </Menu>
        </Stack>

        <Typography variant="h5" component="p" sx={{ mt: 2, fontWeight: 700 }}>
          <CurrencyText amount={account.currentBalance} currency={account.currency} />
        </Typography>

        <Stack direction="row" spacing={1} sx={{ mt: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
          <Chip label={statusMeta.label} size="small" color={statusMeta.color} variant="outlined" />
          {creditProgress && (
            <Chip
              label={CREDIT_CARD_STATUS_LABELS[creditProgress.status]}
              size="small"
              sx={{
                bgcolor: (theme) => theme.palette.status[creditProgress.status],
                color: (theme) => theme.palette.getContrastText(theme.palette.status[creditProgress.status]),
              }}
            />
          )}
          {account.accountNumber && (
            <Typography variant="caption" color="text.secondary">
              {maskAccountNumber(account.accountNumber)}
            </Typography>
          )}
        </Stack>

        {creditProgress && (
          <Box sx={{ mt: 2 }}>
            <Stack direction="row" sx={{ alignItems: 'baseline', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                <CurrencyText amount={creditProgress.debt} currency={account.currency} component="span" />{' '}
                owed of{' '}
                <CurrencyText amount={account.creditLimit ?? 0} currency={account.currency} component="span" />{' '}
                limit
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatPercent(creditProgress.utilization)} used
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={Math.min(creditProgress.utilization, 1) * 100}
              sx={{
                mt: 1,
                height: 8,
                borderRadius: 4,
                bgcolor: 'action.hover',
                '& .MuiLinearProgress-bar': {
                  bgcolor: (theme) => theme.palette.status[creditProgress.status],
                  borderRadius: 4,
                },
              }}
            />
            {creditProgress.daysUntilPaymentDue !== null && creditProgress.nextPaymentDueDate && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {creditProgress.daysUntilPaymentDue === 0
                  ? `Payment due today (${formatDate(creditProgress.nextPaymentDueDate)})`
                  : `Payment due in ${creditProgress.daysUntilPaymentDue} day${
                      creditProgress.daysUntilPaymentDue === 1 ? '' : 's'
                    } (${formatDate(creditProgress.nextPaymentDueDate)})`}
              </Typography>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
