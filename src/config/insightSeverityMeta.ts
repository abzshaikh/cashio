import type { InsightSeverity } from '../utils/insightsEngine';

/**
 * Display metadata for each `Insight` severity — the MUI `Alert` color it
 * maps to and a short label for the summary chip row. Centralized here,
 * same convention as `transactionTypeMeta.ts`, so the Insights page doesn't
 * hardcode this mapping inline.
 */
export const INSIGHT_SEVERITY_META: Record<
  InsightSeverity,
  { alertSeverity: 'error' | 'warning' | 'info' | 'success'; label: string }
> = {
  critical: { alertSeverity: 'error', label: 'Critical' },
  warning: { alertSeverity: 'warning', label: 'Warning' },
  info: { alertSeverity: 'info', label: 'Info' },
  positive: { alertSeverity: 'success', label: 'Positive' },
};
