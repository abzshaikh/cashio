import { z } from 'zod';
import { BUDGET_PERIODS } from '../types/budget';
import { DEFAULT_USER_SETTINGS, type UpdatableUserSettingsFields, type UserSettings } from '../types/userSettings';

/**
 * The form's own shape differs from `UserSettings` in one deliberate way:
 * `defaultAccountId`/`defaultCategoryId` are plain `string` here (`''`
 * meaning "no default"), matching `FormSelect`'s existing convention of
 * rendering `field.value ?? ''` and needing every option's `value` to be a
 * string — the same reason `BudgetFormDialog`'s `overallAmount` etc. stay
 * as form-friendly primitives and only get converted at the schema/service
 * boundary (`toSettingsFormValues`/`fromSettingsFormValues` below), not
 * because the domain type itself uses `''`.
 */
export const settingsFormSchema = z.object({
  defaultBudgetPeriod: z.enum(BUDGET_PERIODS),
  defaultBudgetWarningThreshold: z.coerce
    .number({ error: 'Enter a valid percentage' })
    .min(0, 'Must be 0 or greater'),
  defaultBudgetOverThreshold: z.coerce
    .number({ error: 'Enter a valid percentage' })
    .min(0, 'Must be 0 or greater'),
  defaultAccountId: z.string(),
  defaultCategoryId: z.string(),
  notifyOnSeverity: z.object({
    critical: z.boolean(),
    warning: z.boolean(),
    info: z.boolean(),
    positive: z.boolean(),
  }),
});
export type SettingsFormValues = z.infer<typeof settingsFormSchema>;

export const defaultSettingsFormValues: SettingsFormValues = {
  defaultBudgetPeriod: DEFAULT_USER_SETTINGS.defaultBudgetPeriod,
  defaultBudgetWarningThreshold: DEFAULT_USER_SETTINGS.defaultBudgetWarningThreshold,
  defaultBudgetOverThreshold: DEFAULT_USER_SETTINGS.defaultBudgetOverThreshold,
  defaultAccountId: '',
  defaultCategoryId: '',
  notifyOnSeverity: { ...DEFAULT_USER_SETTINGS.notifyOnSeverity },
};

export function toSettingsFormValues(settings: UserSettings): SettingsFormValues {
  return {
    defaultBudgetPeriod: settings.defaultBudgetPeriod,
    defaultBudgetWarningThreshold: settings.defaultBudgetWarningThreshold,
    defaultBudgetOverThreshold: settings.defaultBudgetOverThreshold,
    defaultAccountId: settings.defaultAccountId ?? '',
    defaultCategoryId: settings.defaultCategoryId ?? '',
    notifyOnSeverity: { ...settings.notifyOnSeverity },
  };
}

/**
 * `current` supplies `dashboardWidgets` unchanged — this form doesn't edit
 * it (that's `DashboardCustomizeDialog`'s job, Phase 39), but
 * `UpdatableUserSettingsFields` is still the whole entity, so submitting
 * this form must carry forward whatever the user's dashboard is currently
 * set to rather than silently resetting it.
 */
export function fromSettingsFormValues(
  values: SettingsFormValues,
  current: UserSettings,
): UpdatableUserSettingsFields {
  return {
    defaultBudgetPeriod: values.defaultBudgetPeriod,
    defaultBudgetWarningThreshold: values.defaultBudgetWarningThreshold,
    defaultBudgetOverThreshold: values.defaultBudgetOverThreshold,
    defaultAccountId: values.defaultAccountId || null,
    defaultCategoryId: values.defaultCategoryId || null,
    notifyOnSeverity: { ...values.notifyOnSeverity },
    dashboardWidgets: [...current.dashboardWidgets],
  };
}
