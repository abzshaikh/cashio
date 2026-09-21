import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders as render } from '../../test/renderWithProviders';
import { NotificationProvider } from '../../context/NotificationContext';
import { PreferencesSection } from './PreferencesSection';
import { DEFAULT_USER_SETTINGS } from '../../types/userSettings';
import type { Account } from '../../types/account';
import type { ExpenseCategoryRecord } from '../../types/category';

const useSettingsMock = vi.fn();
vi.mock('../../context/SettingsContext', () => ({
  useSettings: () => useSettingsMock(),
}));

const useAccountsMock = vi.fn();
vi.mock('../../hooks/useAccounts', () => ({
  useAccounts: () => useAccountsMock(),
}));

const useExpenseCategoriesMock = vi.fn();
vi.mock('../../hooks/useExpenseCategories', () => ({
  useExpenseCategories: () => useExpenseCategoriesMock(),
}));

const account: Account = {
  id: 'acc-1',
  userId: 'user-1',
  name: 'HDFC Bank',
  type: 'bank',
  institution: '',
  accountNumber: '',
  openingBalance: 1000,
  currentBalance: 1000,
  currency: 'INR',
  status: 'active',
  notes: '',
  createdAt: '',
  updatedAt: '',
};

const category: ExpenseCategoryRecord = {
  id: 'cat-food',
  userId: 'user-1',
  slug: 'food',
  name: 'Food',
  isDefault: true,
  subcategories: [],
  createdAt: '',
  updatedAt: '',
};

function renderSection(updateSettings = vi.fn().mockResolvedValue(undefined), settingsOverrides = {}) {
  useSettingsMock.mockReturnValue({
    settings: { userId: 'user-1', ...DEFAULT_USER_SETTINGS, updatedAt: '', ...settingsOverrides },
    loading: false,
    error: null,
    updateSettings,
  });
  useAccountsMock.mockReturnValue({ accounts: [account], error: null, reload: vi.fn() });
  useExpenseCategoriesMock.mockReturnValue({ categories: [category], error: null, reload: vi.fn() });
  render(
    <NotificationProvider>
      <PreferencesSection />
    </NotificationProvider>,
  );
  return { updateSettings };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PreferencesSection', () => {
  it('populates the form from the loaded settings', () => {
    renderSection(undefined, {
      defaultBudgetPeriod: 'weekly',
      defaultBudgetWarningThreshold: 70,
      defaultBudgetOverThreshold: 90,
    });
    expect(screen.getByLabelText('Period')).toHaveTextContent('Weekly');
    expect(screen.getByDisplayValue('70')).toBeInTheDocument();
    expect(screen.getByDisplayValue('90')).toBeInTheDocument();
  });

  it('shows "No default" for the account/category selects when unset', () => {
    renderSection();
    expect(screen.getByLabelText('Default account')).toHaveTextContent('No default');
    expect(screen.getByLabelText('Default expense category')).toHaveTextContent('No default');
  });

  it('disables Save preferences until a field is edited', () => {
    renderSection();
    expect(screen.getByRole('button', { name: 'Save preferences' })).toBeDisabled();
  });

  it('saves edited preferences and shows a success toast', async () => {
    const { updateSettings } = renderSection();
    fireEvent.change(screen.getByLabelText('Warn at (% spent)'), { target: { value: '75' } });
    const saveButton = screen.getByRole('button', { name: 'Save preferences' });
    expect(saveButton).not.toBeDisabled();
    fireEvent.click(saveButton);

    await waitFor(() =>
      expect(updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({ defaultBudgetWarningThreshold: 75 }),
      ),
    );
    await waitFor(() => expect(screen.getByText('Preferences updated')).toBeInTheDocument());
  });

  it('toggles a notification severity off and saves it as false', async () => {
    const { updateSettings } = renderSection();
    fireEvent.click(screen.getByRole('switch', { name: /Positive/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save preferences' }));

    await waitFor(() =>
      expect(updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          notifyOnSeverity: { critical: true, warning: true, info: true, positive: false },
        }),
      ),
    );
  });

  it('surfaces an error toast when saving fails', async () => {
    const updateSettings = vi.fn().mockRejectedValue(new Error('Failed to save'));
    renderSection(updateSettings);
    fireEvent.change(screen.getByLabelText('Warn at (% spent)'), { target: { value: '75' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save preferences' }));
    await waitFor(() => expect(screen.getByText('Failed to save')).toBeInTheDocument());
  });
});
