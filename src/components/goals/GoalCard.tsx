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
import { savingsGoalCategoryMeta } from '../../config/savingsGoalCategories';
import { getGoalProgress, type GoalStatus } from '../../utils/goalCalculations';
import { formatDate } from '../../utils/formatDate';
import { formatPercent } from '../../utils/formatCurrency';
import type { SavingsGoal } from '../../types/savingsGoal';
import type { GoalContribution } from '../../types/goalContribution';

interface GoalCardProps {
  goal: SavingsGoal;
  contributions: GoalContribution[];
  currency?: string;
  onEdit: (goal: SavingsGoal) => void;
  onDelete: (goal: SavingsGoal) => void;
  onAddContribution: (goal: SavingsGoal) => void;
  onDeleteContribution: (contribution: GoalContribution) => void;
}

const STATUS_LABELS: Record<GoalStatus, string> = {
  safe: 'On track',
  warning: 'Approaching deadline',
  nearLimit: 'Due soon',
  over: 'Past due',
};

/** A short, human line about the deadline — deliberately separate from the
 * status chip's short label, since this one carries the actual day count. */
function deadlineText(isCompleted: boolean, daysRemaining: number | null): string | null {
  if (isCompleted) return null;
  if (daysRemaining === null) return null;
  if (daysRemaining === 0) return 'Due today';
  if (daysRemaining > 0) return `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left`;
  const overdueBy = Math.abs(daysRemaining);
  return `${overdueBy} day${overdueBy === 1 ? '' : 's'} overdue`;
}

export function GoalCard({
  goal,
  contributions,
  currency,
  onEdit,
  onDelete,
  onAddContribution,
  onDeleteContribution,
}: GoalCardProps) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const openMenu = (event: MouseEvent<HTMLElement>) => setMenuAnchor(event.currentTarget);
  const closeMenu = () => setMenuAnchor(null);

  const { currentAmount, percentComplete, isCompleted, daysRemaining, status } = getGoalProgress(
    goal,
    contributions,
  );
  const goalContributions = contributions
    .filter((c) => c.goalId === goal.id)
    .slice() // getGoalContributionsTotal already reads this same filter; this
    // local copy is just for the history list's own display order.
    .sort((a, b) => b.date.localeCompare(a.date));

  const CategoryIcon = savingsGoalCategoryMeta[goal.category]?.icon;
  const deadline = deadlineText(isCompleted, daysRemaining);

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
              {CategoryIcon && <CategoryIcon fontSize="small" sx={{ color: 'text.secondary' }} />}
              <Typography variant="subtitle1" noWrap sx={{ fontWeight: 600 }}>
                {goal.name}
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" noWrap>
              {goal.targetDate ? `Target: ${formatDate(goal.targetDate)}` : 'No target date'}
            </Typography>
          </Box>
          <IconButton size="small" onClick={openMenu} aria-label={`Actions for ${goal.name}`}>
            <MoreVertOutlinedIcon fontSize="small" />
          </IconButton>
          <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
            <MenuItem
              onClick={() => {
                closeMenu();
                onEdit(goal);
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
                onDelete(goal);
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
            label={savingsGoalCategoryMeta[goal.category]?.label ?? goal.category}
            size="small"
            variant="outlined"
          />
          <Chip
            label={isCompleted ? 'Goal reached' : STATUS_LABELS[status]}
            size="small"
            sx={{
              bgcolor: (theme) => theme.palette.status[status],
              color: (theme) => theme.palette.getContrastText(theme.palette.status[status]),
            }}
          />
        </Stack>

        <Stack direction="row" sx={{ alignItems: 'baseline', justifyContent: 'space-between', mt: 2 }}>
          <Typography variant="h5" component="p" sx={{ fontWeight: 700 }}>
            <CurrencyText amount={currentAmount} currency={currency} component="span" /> /{' '}
            <CurrencyText amount={goal.targetAmount} currency={currency} component="span" />
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formatPercent(percentComplete)}
          </Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={Math.min(percentComplete, 1) * 100}
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
        {deadline && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {deadline}
          </Typography>
        )}

        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddOutlinedIcon />}
            onClick={() => onAddContribution(goal)}
          >
            Add money
          </Button>
          <Button size="small" onClick={() => setShowHistory((v) => !v)}>
            {showHistory ? 'Hide' : 'Show'} {goalContributions.length} contribution
            {goalContributions.length === 1 ? '' : 's'}
          </Button>
        </Stack>

        <Collapse in={showHistory} unmountOnExit>
          <Divider sx={{ my: 1.5 }} />
          {goalContributions.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No contributions yet.
            </Typography>
          ) : (
            <Stack spacing={0.75}>
              {goalContributions.map((contribution) => (
                <Stack
                  key={contribution.id}
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" noWrap>
                      {formatDate(contribution.date)}
                      {contribution.note ? ` · ${contribution.note}` : ''}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexShrink: 0 }}>
                    <CurrencyText amount={contribution.amount} currency={currency} />
                    <IconButton
                      size="small"
                      aria-label={`Delete contribution of ${contribution.amount} on ${formatDate(contribution.date)}`}
                      onClick={() => onDeleteContribution(contribution)}
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
