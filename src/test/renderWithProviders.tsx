import type { ReactElement } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { createAppTheme } from '../theme/theme';

/**
 * Wraps a component under test with the same `LocalizationProvider` and
 * `ThemeProvider` App.tsx provides for the whole real app. Any test that
 * renders a `FormDatePicker` (income, and every form with a date field
 * since — expense, budgets, goals, debts, …) or that reads a custom theme
 * token such as `palette.status` (Phase 10's budget-vs-actual status
 * colors) needs this instead of Testing Library's plain `render` — a bare
 * `render` gives components MUI's default theme, which has no `status`
 * palette and throws "Can not find the date and time pickers localization
 * context." for date pickers.
 */
export function renderWithProviders(ui: ReactElement, options?: RenderOptions) {
  return render(
    <ThemeProvider theme={createAppTheme('light')}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>{ui}</LocalizationProvider>
    </ThemeProvider>,
    options,
  );
}
