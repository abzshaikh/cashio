import { useEffect } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import CircleIcon from '@mui/icons-material/Circle';
import { FormSelect, type FormSelectOption } from '../common/form/FormSelect';
import { FormTextField } from '../common/form/FormTextField';
import { FormSwitch } from '../common/form/FormSwitch';
import { useSettings } from '../../context/SettingsContext';
import { useAccounts } from '../../hooks/useAccounts';
import { useExpenseCategories } from '../../hooks/useExpenseCategories';
import { useNotification } from '../../context/NotificationContext';
import {
  settingsFormSchema,
  toSettingsFormValues,
  fromSettingsFormValues,
  type SettingsFormValues,
} from '../../schemas/settingsSchemas';
import { budgetPeriodOptions } from '../../config/budgetPeriods';
import { toCategoryOptions } from '../../utils/expenseCategoryLookup';
import { INSIGHT_SEVERITY_META } from '../../config/insightSeverityMeta';
import type { InsightSeverity } from '../../utils/insightsEngine';

const NO_DEFAULT_OPTION: FormSelectOption = { value: '', label: 'No default' };

const SEVERITY_ORDER: InsightSeverity[] = ['critical', 'warning', 'info', 'positive'];

/**
 * Phase 36: the app-preferences half of the Settings page — everything
 * that isn't the user's own identity (`ProfileSection`, Phase 2) or a
 * managed list (`CategoriesSection`/`TagsSection`, Phases 6/21). One form,
 * submitted as a whole, same convention as `ProfileSection` right above it
 * on this page.
 */
export function PreferencesSection() {
  const { settings, updateSettings } = useSettings();
  const { accounts } = useAccounts();
  const { categories } = useExpenseCategories();
  const { success, error: notifyError } = useNotification();

  const accountOptions: FormSelectOption[] = [
    NO_DEFAULT_OPTION,
    ...(accounts ?? []).map((account) => ({ value: account.id, label: account.name })),
  ];
  const categoryOptions: FormSelectOption[] = [NO_DEFAULT_OPTION, ...toCategoryOptions(categories ?? [])];

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting, isDirty },
  } = useForm<SettingsFormValues>({
    // See the matching comment in BudgetFormDialog.tsx/ExpenseFormDialog.tsx
    // — zod v4's z.coerce.number() has an `unknown` input type that doesn't
    // quite fit a plain Resolver<SettingsFormValues>. The coercion still
    // happens correctly at runtime.
    resolver: zodResolver(settingsFormSchema) as Resolver<SettingsFormValues>,
    defaultValues: toSettingsFormValues(settings),
  });

  // Re-sync the form whenever a fresh settings snapshot arrives (initial
  // load, or another tab/device saving a change) — same "reset on load"
  // shape `ProfileSection` already uses for the profile document.
  useEffect(() => {
    reset(toSettingsFormValues(settings));
  }, [settings, reset]);

  const onSubmit = async (values: SettingsFormValues) => {
    try {
      await updateSettings(fromSettingsFormValues(values, settings));
      success('Preferences updated');
    } catch (error) {
      notifyError(error instanceof Error ? error.message : 'Failed to update preferences.');
    }
  };

  return (
    <Card variant="outlined">
      <CardHeader title="Preferences" subheader="Defaults for new budgets and transactions, and which insights notify you." />
      <CardContent>
        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Stack spacing={3}>
            <Stack spacing={2}>
              <Typography variant="subtitle2">New budget defaults</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <FormSelect
                  name="defaultBudgetPeriod"
                  control={control}
                  label="Period"
                  options={budgetPeriodOptions}
                />
                <FormTextField
                  name="defaultBudgetWarningThreshold"
                  control={control}
                  label="Warn at (% spent)"
                  type="number"
                />
                <FormTextField
                  name="defaultBudgetOverThreshold"
                  control={control}
                  label="Over budget at (% spent)"
                  type="number"
                />
              </Stack>
            </Stack>

            <Divider />

            <Stack spacing={2}>
              <Typography variant="subtitle2">New transaction defaults</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <FormSelect
                  name="defaultAccountId"
                  control={control}
                  label="Default account"
                  options={accountOptions}
                  displayEmpty
                />
                <FormSelect
                  name="defaultCategoryId"
                  control={control}
                  label="Default expense category"
                  options={categoryOptions}
                  displayEmpty
                />
              </Stack>
            </Stack>

            <Divider />

            <Stack spacing={1}>
              <Typography variant="subtitle2">Notify me about</Typography>
              <Typography variant="caption" color="text.secondary">
                Turns Phase 24&apos;s spending insights into a notification (bell icon, top right) when they fire.
                Turning a severity off doesn&apos;t change what shows on the Insights page — only whether it also
                becomes a notification.
              </Typography>
              {SEVERITY_ORDER.map((severity) => (
                <FormSwitch
                  key={severity}
                  name={`notifyOnSeverity.${severity}`}
                  control={control}
                  label={
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <CircleIcon
                        sx={{ fontSize: 10, color: `${INSIGHT_SEVERITY_META[severity].alertSeverity}.main` }}
                      />
                      <span>{INSIGHT_SEVERITY_META[severity].label}</span>
                    </Stack>
                  }
                />
              ))}
            </Stack>

            <Box>
              <Button type="submit" variant="contained" loading={isSubmitting} disabled={!isDirty}>
                Save preferences
              </Button>
            </Box>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
}
