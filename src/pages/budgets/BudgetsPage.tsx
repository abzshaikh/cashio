import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import PieChartOutlineOutlinedIcon from '@mui/icons-material/PieChartOutlineOutlined';
import { PageHeader } from '../../components/common/PageHeader';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { BudgetCard } from '../../components/budgets/BudgetCard';
import { BudgetFormDialog } from '../../components/budgets/BudgetFormDialog';
import { BudgetTemplatesSection } from '../../components/budgets/BudgetTemplatesSection';
import { SaveAsTemplateDialog } from '../../components/budgets/SaveAsTemplateDialog';
import { SmartSuggestionsSection } from '../../components/budgets/SmartSuggestionsSection';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useConfirm } from '../../context/ConfirmDialogContext';
import { useSettings } from '../../context/SettingsContext';
import { useExpenseCategories } from '../../hooks/useExpenseCategories';
import { useTransactions } from '../../hooks/useTransactions';
import {
  createBudget,
  deleteBudget,
  subscribeToBudgets,
  updateBudget,
} from '../../services/budgetService';
import { createBudgetTemplate, deleteBudgetTemplate } from '../../services/budgetTemplateService';
import {
  budgetTemplateToFormValues,
  budgetToTemplateInput,
} from '../../utils/budgetTemplateCalculations';
import {
  suggestedCategoryBudgetsToFormValues,
  suggestedOverallBudgetToFormValues,
  type CategoryBudgetSuggestion,
} from '../../utils/budgetSuggestionEngine';
import {
  defaultBudgetFormValues,
  endOfCurrentMonth,
  startOfCurrentMonth,
} from '../../schemas/budgetSchemas';
import { parseDateOnly } from '../../utils/formatDate';
import { toMajorUnits } from '../../utils/money';
import type { BudgetFormValues } from '../../schemas/budgetSchemas';
import type { SaveAsTemplateFormValues } from '../../schemas/budgetTemplateSchemas';
import type { Budget } from '../../types/budget';
import type { BudgetTemplate } from '../../types/budgetTemplate';

export function BudgetsPage() {
  const { user, profile } = useAuth();
  const { success, error: notifyError } = useNotification();
  const confirm = useConfirm();
  const { categories } = useExpenseCategories();
  const { transactions } = useTransactions();
  const { settings } = useSettings();

  const [budgets, setBudgets] = useState<Budget[] | null>(null);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [prefilledFormValues, setPrefilledFormValues] = useState<BudgetFormValues | null>(null);
  const [templateSourceBudget, setTemplateSourceBudget] = useState<Budget | null>(null);

  useEffect(() => {
    if (!user) return;
    setBudgets(null);
    setLoadError(null);
    const unsubscribe = subscribeToBudgets(
      user.uid,
      (data) => setBudgets(data),
      (error) => setLoadError(error),
    );
    return unsubscribe;
    // reloadKey lets the "Try again" button force a fresh subscription.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, reloadKey]);

  const openCreateDialog = () => {
    setEditingBudget(null);
    // Phase 36: a brand-new budget starts from the user's saved defaults
    // (period, warning/over thresholds) rather than the hard-coded
    // `defaultBudgetFormValues` — "Use template"/"Create from suggestion"
    // below already prove out `BudgetFormDialog`'s `initialValues` as the
    // right seam for this, so this reuses it rather than adding a second
    // one directly on the dialog.
    setPrefilledFormValues({
      ...defaultBudgetFormValues,
      period: settings.defaultBudgetPeriod,
      warningThreshold: settings.defaultBudgetWarningThreshold,
      overThreshold: settings.defaultBudgetOverThreshold,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (budget: Budget) => {
    setEditingBudget(budget);
    setPrefilledFormValues(null);
    setDialogOpen(true);
  };

  const closeDialog = () => setDialogOpen(false);

  const handleSubmit = async (values: BudgetFormValues) => {
    if (!user) return;
    if (editingBudget) {
      await updateBudget(editingBudget.id, values);
      success('Budget updated');
    } else {
      await createBudget(user.uid, values);
      success('Budget added');
    }
    setDialogOpen(false);
  };

  // Phase 25: "Use template" opens the same create dialog pre-filled from
  // the template's saved shape, defaulted to the current month — exactly
  // like a fresh "Add Budget" except the fields already have values.
  const handleUseTemplate = (template: BudgetTemplate) => {
    setEditingBudget(null);
    setPrefilledFormValues(
      budgetTemplateToFormValues(template, startOfCurrentMonth(), endOfCurrentMonth()),
    );
    setDialogOpen(true);
  };

  // Phase 26: "Create" from a suggestion opens the same create dialog
  // pre-filled from the suggested amount(s) — the exact same reuse of
  // BudgetFormDialog's arbitrary `initialValues` that "Use template" above
  // already relies on.
  const handleUseOverallSuggestion = (amount: number) => {
    setEditingBudget(null);
    setPrefilledFormValues(
      suggestedOverallBudgetToFormValues(amount, startOfCurrentMonth(), endOfCurrentMonth()),
    );
    setDialogOpen(true);
  };

  const handleUseCategorySuggestions = (suggestions: CategoryBudgetSuggestion[]) => {
    setEditingBudget(null);
    setPrefilledFormValues(
      suggestedCategoryBudgetsToFormValues(suggestions, startOfCurrentMonth(), endOfCurrentMonth()),
    );
    setDialogOpen(true);
  };

  const handleDeleteTemplate = async (template: BudgetTemplate) => {
    const confirmed = await confirm({
      title: 'Delete template?',
      message: `This permanently deletes the "${template.name}" template. Budgets already created from it are not affected.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await deleteBudgetTemplate(template.id);
      success('Template deleted');
    } catch (error) {
      notifyError(error instanceof Error ? error.message : 'Failed to delete template.');
    }
  };

  const handleSaveAsTemplate = async (values: SaveAsTemplateFormValues) => {
    if (!user || !templateSourceBudget) return;
    await createBudgetTemplate(user.uid, budgetToTemplateInput(templateSourceBudget, values.name));
    success('Template saved');
    setTemplateSourceBudget(null);
  };

  const handleDelete = async (budget: Budget) => {
    const confirmed = await confirm({
      title: 'Delete budget?',
      message: `This permanently deletes "${budget.name}". Transactions already recorded are not affected.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await deleteBudget(budget.id);
      success('Budget deleted');
    } catch (error) {
      notifyError(error instanceof Error ? error.message : 'Failed to delete budget.');
    }
  };

  const initialFormValues: BudgetFormValues | undefined = editingBudget
    ? {
        name: editingBudget.name,
        period: editingBudget.period,
        startDate: parseDateOnly(editingBudget.startDate),
        endDate: parseDateOnly(editingBudget.endDate),
        scope: editingBudget.scope,
        overallAmount: toMajorUnits(editingBudget.overallAmount),
        items: editingBudget.items.map((item) => ({ ...item, amount: toMajorUnits(item.amount) })),
        warningThreshold: editingBudget.warningThreshold,
        overThreshold: editingBudget.overThreshold,
      }
    : (prefilledFormValues ?? undefined);

  return (
    <Box>
      <PageHeader
        title="Budgets"
        subtitle="Set spending limits overall or by category."
        actions={
          <Button variant="contained" startIcon={<AddOutlinedIcon />} onClick={openCreateDialog}>
            Add Budget
          </Button>
        }
      />

      {loadError && (
        <ErrorState description={loadError.message} onRetry={() => setReloadKey((k) => k + 1)} />
      )}

      <BudgetTemplatesSection onUse={handleUseTemplate} onDelete={handleDeleteTemplate} />

      <SmartSuggestionsSection
        transactions={transactions ?? []}
        categories={categories ?? []}
        currency={profile?.currency}
        onUseOverall={handleUseOverallSuggestion}
        onUseCategories={handleUseCategorySuggestions}
      />

      {!loadError && budgets === null && <LoadingState message="Loading budgets…" />}

      {!loadError && budgets !== null && budgets.length === 0 && (
        <EmptyState
          icon={<PieChartOutlineOutlinedIcon fontSize="inherit" />}
          title="No budgets yet"
          description="Set an overall spending limit or a per-category budget to track how you're doing against your plan."
          actionLabel="Add Budget"
          onAction={openCreateDialog}
        />
      )}

      {!loadError && budgets !== null && budgets.length > 0 && (
        <Grid container spacing={2}>
          {budgets.map((budget) => (
            <Grid key={budget.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <BudgetCard
                budget={budget}
                categories={categories ?? []}
                transactions={transactions ?? []}
                currency={profile?.currency}
                onEdit={openEditDialog}
                onDelete={handleDelete}
                onSaveAsTemplate={setTemplateSourceBudget}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <BudgetFormDialog
        open={dialogOpen}
        mode={editingBudget ? 'edit' : 'create'}
        initialValues={initialFormValues}
        categories={categories ?? []}
        onClose={closeDialog}
        onSubmit={handleSubmit}
      />

      <SaveAsTemplateDialog
        open={templateSourceBudget !== null}
        budget={templateSourceBudget}
        onClose={() => setTemplateSourceBudget(null)}
        onSubmit={handleSaveAsTemplate}
      />
    </Box>
  );
}
