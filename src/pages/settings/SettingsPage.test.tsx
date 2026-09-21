import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NotificationProvider } from '../../context/NotificationContext';
import { SettingsPage } from './SettingsPage';

const useAuthMock = vi.fn();
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

const confirmMock = vi.fn();
vi.mock('../../context/ConfirmDialogContext', () => ({
  useConfirm: () => confirmMock,
}));

// CategoriesSection's own data loading/seeding is covered by
// CategoriesSection.test.tsx — mocked here to a fixed, already-loaded list
// so SettingsPage's tests stay focused on the Profile section.
const useExpenseCategoriesMock = vi.fn();
vi.mock('../../hooks/useExpenseCategories', () => ({
  useExpenseCategories: () => useExpenseCategoriesMock(),
}));

// TagsSection's own data loading is covered by TagsSection.test.tsx —
// mocked here the same way as useExpenseCategories, above.
const useTagsMock = vi.fn();
vi.mock('../../hooks/useTags', () => ({
  useTags: () => useTagsMock(),
}));

// PreferencesSection (Phase 36) has its own dedicated test file
// (PreferencesSection.test.tsx) — mocked here to a fixed, already-loaded
// state so SettingsPage's own tests stay focused on the Profile section.
const useSettingsMock = vi.fn();
vi.mock('../../context/SettingsContext', () => ({
  useSettings: () => useSettingsMock(),
}));

const useAccountsMock = vi.fn();
vi.mock('../../hooks/useAccounts', () => ({
  useAccounts: () => useAccountsMock(),
}));

const baseProfile = {
  uid: 'user-1',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  photoURL: null,
  currency: 'INR',
  country: 'India',
  timezone: 'Asia/Kolkata',
  createdAt: '',
  updatedAt: '',
};

function renderPage(updateProfile = vi.fn().mockResolvedValue(undefined)) {
  useAuthMock.mockReturnValue({
    user: { uid: 'user-1', email: 'ada@example.com' },
    profile: baseProfile,
    profileLoading: false,
    updateProfile,
  });
  useExpenseCategoriesMock.mockReturnValue({
    categories: [],
    error: null,
    reload: vi.fn(),
  });
  useTagsMock.mockReturnValue({
    tags: [],
    error: null,
    reload: vi.fn(),
  });
  useSettingsMock.mockReturnValue({
    settings: {
      userId: 'user-1',
      defaultBudgetPeriod: 'monthly',
      defaultBudgetWarningThreshold: 80,
      defaultBudgetOverThreshold: 100,
      defaultAccountId: null,
      defaultCategoryId: null,
      notifyOnSeverity: { critical: true, warning: true, info: true, positive: true },
      updatedAt: '',
    },
    loading: false,
    error: null,
    updateSettings: vi.fn().mockResolvedValue(undefined),
  });
  useAccountsMock.mockReturnValue({ accounts: [], error: null, reload: vi.fn() });
  render(
    <NotificationProvider>
      <SettingsPage />
    </NotificationProvider>,
  );
  return { updateProfile };
}

describe('SettingsPage', () => {
  it('populates the profile form from the loaded profile', () => {
    renderPage();
    expect(screen.getByDisplayValue('Ada')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Lovelace')).toBeInTheDocument();
    expect(screen.getByDisplayValue('ada@example.com')).toBeInTheDocument();
  });

  it('disables Save changes until a field is edited', () => {
    renderPage();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
  });

  it('saves edited fields and shows a success toast', async () => {
    const { updateProfile } = renderPage();
    fireEvent.change(screen.getByDisplayValue('Ada'), { target: { value: 'Grace' } });
    const saveButton = screen.getByRole('button', { name: 'Save changes' });
    expect(saveButton).not.toBeDisabled();
    fireEvent.click(saveButton);

    await waitFor(() => expect(updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: 'Grace', lastName: 'Lovelace', currency: 'INR' }),
    ));
    await waitFor(() => expect(screen.getByText('Profile updated')).toBeInTheDocument());
  });
});
