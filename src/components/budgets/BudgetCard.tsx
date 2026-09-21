import { useState, type MouseEvent } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import MoreVertOutlinedIcon from '@mui/icons-material/MoreVertOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import { CurrencyText } from '../common/CurrencyText';
import { budgetPeriodMeta } from '../../config/budgetPeriods';
import {
  getBudgetProgress,
  getCategoryActualSpent,
  getBudgetPeriodTransactions,
  type BudgetStatus,
} from '../../utils/budgetCalculations';
import { getCategoryLabel } from '../../utils/expenseCategoryLookup';
import { formatDate } from '../../utils/formatDate';
import { formatPercent } from '../../utils/formatCurrency';
import type { Budget } from '../../types/budget';
import type { ExpenseCategoryRecord } from '../../types/category';
import type { Transaction } from '../../types/transaction';

interface BudgetCardProps {
  budget: Budget;
  categories: ExpenseCategoryRecord[];
  transactions: Transaction[];
  currency?: string;
  onEdit: (budget: Budget) => void;
  onDelete: (budget: Budget) => void;
  /** Phase 25: optional so existing callers/tests are unaffected — when
   * omitted, the "Save as template" menu item isn't shown. */
  onSaveAsTemplate?: (budget: Budget) => void;
}

const STATUS_LABELS: Record<BudgetStatus, string> = {
  safe: 'On track',
  warning: 'Warning',
  nearLimit: 'Near limit',
  over: 'Over budget',
};

export function BudgetCard({
  budget,
  categories,
  transactions,
  currency,
  onEdit,
  onDelete,
  onSaveAsTemplate,
}: BudgetCardProps) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const openMenu = (event: MouseEvent<HTMLElement>) => setMenuAnchor(event.currentTarget);
  const closeMenu = () => setMenuAnchor(null);

  const { total, actual, percentSpent, status } = getBudgetProgress(budget, transactions);
  const periodTransactions = getBudgetPeriodTransactions(budget, transactions);

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" noWrap sx={{ fontWeight: 600 }}>
              {budget.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {formatDate(budget.startDate)} – {formatDate(budget.endDate)}
            </Typography>
          </Box>
          <IconButton size="small" onClick={openMenu} aria-label={`Actions for ${budget.name}`}>
            <MoreVertOutlinedIcon fontSize="small" />
          </IconButton>
          <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
            <MenuItem
              onClick={() => {
                closeMenu();
                onEdit(budget);
              }}
            >
              <ListItemIcon>
                <EditOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Edit</ListItemText>
            </MenuItem>
            {onSaveAsTemplate && (
              <MenuItem
                onClick={() => {
                  closeMenu();
                  onSaveAsTemplate(budget);
                }}
              >
                <ListItemIcon>
                  <ContentCopyOutlinedIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Save as template</ListItemText>
              </MenuItem>
            )}
            <MenuItem
              onClick={() => {
                closeMenu();
                onDelete(budget);
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
          <Chip label={budgetPeriodMeta[budget.period].label} size="small" variant="outlined" />
          <Chip
            label={budget.scope === 'overall' ? 'Overall' : 'By category'}
            size="small"
            variant="outlined"
          />
          <Chip
            label={STATUS_LABELS[status]}
            size="small"
            sx={{
              bgcolor: (theme) => theme.palette.status[status],
              color: (theme) => theme.palette.getContrastText(theme.palette.status[status]),
            }}
          />
        </Stack>

        <Stack direction="row" sx={{ alignItems: 'baseline', justifyContent: 'space-between', mt: 2 }}>
          <Typography variant="h5" component="p" sx={{ fontWeight: 700 }}>
            <CurrencyText amount={actual} currency={currency} component="span" /> / {' '}
            <CurrencyText amount={total} currency={currency} component="span" />
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formatPercent(percentSpent)}
          </Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={Math.min(percentSpent, 1) * 100}
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
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          Warn at {budget.warningThreshold}% · Over at {budget.overThreshold}%
        </Typography>

        {budget.scope === 'category' && budget.items.length > 0 && (
          <Stack spacing={0.5} sx={{ mt: 1.5 }}>
            {budget.items.map((item) => {
              const itemActual = getCategoryActualSpent(periodTransactions, item.categoryId);
              return (
                <Stack
                  key={item.categoryId}
                  direction="row"
                  sx={{ justifyContent: 'space-between' }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {getCategoryLabel(categories, item.categoryId)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <CurrencyText amount={itemActual} currency={currency} component="span" />
                    {' / '}
                    <CurrencyText amount={item.amount} currency={currency} component="span" />
                  </Typography>
                </Stack>
              );
            })}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
