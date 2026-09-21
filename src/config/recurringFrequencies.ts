import type { RecurringFrequency } from '../types/recurringTransaction';

export const recurringFrequencyMeta: Record<RecurringFrequency, { label: string }> = {
  daily: { label: 'Daily' },
  weekly: { label: 'Weekly' },
  monthly: { label: 'Monthly' },
  quarterly: { label: 'Quarterly' },
  yearly: { label: 'Yearly' },
};

export const recurringFrequencyOptions = (
  Object.keys(recurringFrequencyMeta) as RecurringFrequency[]
).map((value) => ({ value, label: recurringFrequencyMeta[value].label }));
