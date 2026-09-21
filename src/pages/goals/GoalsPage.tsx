import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import SavingsOutlinedIcon from '@mui/icons-material/SavingsOutlined';
import TrackChangesOutlinedIcon from '@mui/icons-material/TrackChangesOutlined';
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined';
import { PageHeader } from '../../components/common/PageHeader';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { StatCard } from '../../components/common/StatCard';
import { CurrencyText } from '../../components/common/CurrencyText';
import { GoalCard } from '../../components/goals/GoalCard';
import { GoalFormDialog } from '../../components/goals/GoalFormDialog';
import { ContributionFormDialog } from '../../components/goals/ContributionFormDialog';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useConfirm } from '../../context/ConfirmDialogContext';
import {
  createGoalContribution,
  createSavingsGoal,
  deleteGoalContribution,
  deleteSavingsGoal,
  subscribeToGoalContributions,
  subscribeToSavingsGoals,
  updateSavingsGoal,
} from '../../services/goalService';
import { getGoalProgress } from '../../utils/goalCalculations';
import { parseDateOnly } from '../../utils/formatDate';
import { toMajorUnits } from '../../utils/money';
import type { SavingsGoalFormValues } from '../../schemas/savingsGoalSchemas';
import type { GoalContributionFormValues } from '../../schemas/goalContributionSchemas';
import type { SavingsGoal } from '../../types/savingsGoal';
import type { GoalContribution } from '../../types/goalContribution';

export function GoalsPage() {
  const { user, profile } = useAuth();
  const { success, error: notifyError } = useNotification();
  const confirm = useConfirm();

  const [goals, setGoals] = useState<SavingsGoal[] | null>(null);
  const [contributions, setContributions] = useState<GoalContribution[] | null>(null);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [contributionGoal, setContributionGoal] = useState<SavingsGoal | null>(null);

  useEffect(() => {
    if (!user) return;
    setGoals(null);
    setContributions(null);
    setLoadError(null);

    const unsubscribeGoals = subscribeToSavingsGoals(
      user.uid,
      (data) => setGoals(data),
      (error) => setLoadError(error),
    );
    const unsubscribeContributions = subscribeToGoalContributions(
      user.uid,
      (data) => setContributions(data),
      (error) => setLoadError(error),
    );
    return () => {
      unsubscribeGoals();
      unsubscribeContributions();
    };
    // reloadKey lets the "Try again" button force a fresh subscription.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, reloadKey]);

  const totals = useMemo(() => {
    if (!goals) return { saved: 0, target: 0, completed: 0 };
    return goals.reduce(
      (acc, goal) => {
        const progress = getGoalProgress(goal, contributions ?? []);
        return {
          saved: acc.saved + progress.currentAmount,
          target: acc.target + goal.targetAmount,
          completed: acc.completed + (progress.isCompleted ? 1 : 0),
        };
      },
      { saved: 0, target: 0, completed: 0 },
    );
  }, [goals, contributions]);

  const openCreateDialog = () => {
    setEditingGoal(null);
    setGoalDialogOpen(true);
  };

  const openEditDialog = (goal: SavingsGoal) => {
    setEditingGoal(goal);
    setGoalDialogOpen(true);
  };

  const closeGoalDialog = () => setGoalDialogOpen(false);

  const handleSubmitGoal = async (values: SavingsGoalFormValues) => {
    if (!user) return;
    if (editingGoal) {
      await updateSavingsGoal(editingGoal.id, values);
      success('Goal updated');
    } else {
      await createSavingsGoal(user.uid, values);
      success('Goal added');
    }
    setGoalDialogOpen(false);
  };

  const handleDeleteGoal = async (goal: SavingsGoal) => {
    if (!user) return;
    const confirmed = await confirm({
      title: 'Delete goal?',
      message: `This permanently deletes "${goal.name}" and every contribution recorded against it.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await deleteSavingsGoal(user.uid, goal.id);
      success('Goal deleted');
    } catch (error) {
      notifyError(error instanceof Error ? error.message : 'Failed to delete goal.');
    }
  };

  const handleSubmitContribution = async (values: GoalContributionFormValues) => {
    if (!user || !contributionGoal) return;
    await createGoalContribution(user.uid, { ...values, goalId: contributionGoal.id });
    success('Contribution added');
    setContributionGoal(null);
  };

  const handleDeleteContribution = async (contribution: GoalContribution) => {
    const confirmed = await confirm({
      title: 'Delete contribution?',
      message: 'This removes it from the goal\'s progress. This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await deleteGoalContribution(contribution.id);
      success('Contribution deleted');
    } catch (error) {
      notifyError(error instanceof Error ? error.message : 'Failed to delete contribution.');
    }
  };

  const initialFormValues: SavingsGoalFormValues | undefined = editingGoal
    ? {
        name: editingGoal.name,
        category: editingGoal.category,
        targetAmount: toMajorUnits(editingGoal.targetAmount),
        hasTargetDate: editingGoal.targetDate !== null,
        targetDate: editingGoal.targetDate ? parseDateOnly(editingGoal.targetDate) : null,
        notes: editingGoal.notes,
      }
    : undefined;

  const currency = profile?.currency ?? 'INR';

  return (
    <Box>
      <PageHeader
        title="Savings Goals"
        subtitle="Set a target, save toward it, and watch the progress."
        actions={
          <Button variant="contained" startIcon={<AddOutlinedIcon />} onClick={openCreateDialog}>
            Add Goal
          </Button>
        }
      />

      {loadError && (
        <ErrorState description={loadError.message} onRetry={() => setReloadKey((k) => k + 1)} />
      )}

      {!loadError && (goals === null || contributions === null) && (
        <LoadingState message="Loading goals…" />
      )}

      {!loadError && goals !== null && contributions !== null && goals.length === 0 && (
        <EmptyState
          icon={<FlagOutlinedIcon fontSize="inherit" />}
          title="No savings goals yet"
          description="Set a target — an emergency fund, a vacation, a big purchase — and start tracking contributions toward it."
          actionLabel="Add Goal"
          onAction={openCreateDialog}
        />
      )}

      {!loadError && goals !== null && contributions !== null && goals.length > 0 && (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <StatCard
                label="Total saved"
                value={<CurrencyText amount={totals.saved} currency={currency} />}
                icon={SavingsOutlinedIcon}
                color="success"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <StatCard
                label="Total target"
                value={<CurrencyText amount={totals.target} currency={currency} />}
                icon={TrackChangesOutlinedIcon}
                color="primary"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <StatCard
                label="Goals completed"
                value={`${totals.completed} / ${goals.length}`}
                icon={EmojiEventsOutlinedIcon}
                color="secondary"
              />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            {goals.map((goal) => (
              <Grid key={goal.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <GoalCard
                  goal={goal}
                  contributions={contributions}
                  currency={currency}
                  onEdit={openEditDialog}
                  onDelete={handleDeleteGoal}
                  onAddContribution={setContributionGoal}
                  onDeleteContribution={handleDeleteContribution}
                />
              </Grid>
            ))}
          </Grid>
        </>
      )}

      <GoalFormDialog
        open={goalDialogOpen}
        mode={editingGoal ? 'edit' : 'create'}
        initialValues={initialFormValues}
        onClose={closeGoalDialog}
        onSubmit={handleSubmitGoal}
      />

      <ContributionFormDialog
        open={contributionGoal !== null}
        goalName={contributionGoal?.name ?? ''}
        onClose={() => setContributionGoal(null)}
        onSubmit={handleSubmitContribution}
      />
    </Box>
  );
}
