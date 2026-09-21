import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderWithProviders as render } from '../../test/renderWithProviders';
import { BudgetsPage } from './BudgetsPage';
import type { Budget } from '../../types/budget';
import type { BudgetTemplate } from '../../types/budgetTemplate';
import type { ExpenseCategoryRecord } from '../../types/category';

// Phase 34: stored `Budget`/`BudgetTemplate`/`Transaction` amount fixtures
// below are minor units (paise) — e.g. `overallAmount: 2000000` is ₹20,000.
// Values typed into form fields, and the `createBudgetMock`/
// `createBudgetTemplateMock` payloads they produce, stay major-unit decimals.
const useAuthMock = vi.fn();
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

const notifySuccess = vi.fn();
const notifyError = vi.fn();
vi.mock('../../context/NotificationContext', () => ({
  useNotification: () => ({ success: notifySuccess, error: notifyError }),
}));

const confirmMock = vi.fn();
vi.mock('../../context/ConfirmDialogContext', () => ({
  useConfirm: () => confirmMock,
}));

const useSettingsMock = vi.fn();
vi.mock('../../context/SettingsContext', () => ({
  useSettings: () => useSettingsMock(),
}));

const categories: ExpenseCategoryRecord[] = [
  {
    id: 'cat-food',
    userId: 'user-1',
    slug: 'food',
    name: 'Food',
    isDefault: true,
    subcategories: [],
    createdAt: '',
    updatedAt: '',
  },
];
vi.mock('../../hooks/useExpenseCategories', () => ({
  useExpenseCategories: () => ({ categories, error: null, reload: vi.fn() }),
}));

const subscribeToBudgetsMock = vi.fn();
const createBudgetMock = vi.fn();
const updateBudgetMock = vi.fn();
const deleteBudgetMock = vi.fn();
vi.mock('../../services/budgetService', () => ({
  subscribeToBudgets: (...args: unknown[]) => subscribeToBudgetsMock(...args),
  createBudget: (...args: unknown[]) => createBudgetMock(...args),
  updateBudget: (...args: unknown[]) => updateBudgetMock(...args),
  deleteBudget: (...args: unknown[]) => deleteBudgetMock(...args),
}));

const createBudgetTemplateMock = vi.fn();
const deleteBudgetTemplateMock = vi.fn();
vi.mock('../../services/budgetTemplateService', () => ({
  createBudgetTemplate: (...args: unknown[]) => createBudgetTemplateMock(...args),
  deleteBudgetTemplate: (...args: unknown[]) => deleteBudgetTemplateMock(...args),
}));

let templates: BudgetTemplate[] = [];
vi.mock('../../hooks/useBudgetTemplates', () => ({
  useBudgetTemplates: () => ({ templates, error: null, reload: vi.fn() }),
}));

let mockTransactions: import('../../types/transaction').Transaction[] = [];
vi.mock('../../hooks/useTransactions', () => ({
  useTransactions: () => ({ transactions: mockTransactions, error: null, reload: vi.fn() }),
}));

const overallBudget: Budget = {
  id: 'b1',
  userId: 'user-1',
  name: 'Monthly essentials',
  period: 'monthly',
  startDate: '2026-02-01',
  endDate: '2026-02-28',
  scope: 'overall',
  overallAmount: 2000000,
  items: [],
  warningThreshold: 80,
  overThreshold: 100,
  createdAt: '',
  updatedAt: '',
};

const categoryBudget: Budget = {
  id: 'b2',
  userId: 'user-1',
  name: 'Food limit',
  period: 'monthly',
  startDate: '2026-02-01',
  endDate: '2026-02-28',
  scope: 'category',
  overallAmount: 0,
  items: [{ categoryId: 'food', amount: 500000 }],
  warningThreshold: 80,
  overThreshold: 100,
  createdAt: '',
  updatedAt: '',
};

const template: BudgetTemplate = {
  id: 't1',
  userId: 'user-1',
  name: 'Standard month',
  period: 'monthly',
  scope: 'overall',
  overallAmount: 1500000,
  items: [],
  warningThreshold: 80,
  overThreshold: 100,
  createdAt: '',
  updatedAt: '',
};

function setup(
  budgets: Budget[] | 'error' = [overallBudget],
  settingsOverrides: Partial<{
    defaultBudgetPeriod: string;
    defaultBudgetWarningThreshold: number;
    defaultBudgetOverThreshold: number;
  }> = {},
) {
  useAuthMock.mockReturnValue({
    user: { uid: 'user-1' },
    profile: { currency: 'INR' },
  });
  useSettingsMock.mockReturnValue({
    settings: {
      defaultBudgetPeriod: 'monthly',
      defaultBudgetWarningThreshold: 80,
      defaultBudgetOverThreshold: 100,
      ...settingsOverrides,
    },
    loading: false,
  });
  subscribeToBudgetsMock.mockImplementation((_uid, onData, onError) => {
    if (budgets === 'error') {
      onError(new Error('Failed to load'));
    } else {
      onData(budgets);
    }
    return vi.fn();
  });
  render(<BudgetsPage />);
}

beforeEach(() => {
  vi.clearAllMocks();
  templates = [];
  mockTransactions = [];
});

describe('BudgetsPage', () => {
  it('shows an empty state when there are no budgets', () => {
    setup([]);
    expect(screen.getByText('No budgets yet')).toBeInTheDocument();
  });

  it('renders a card per budget', () => {
    setup([overallBudget, categoryBudget]);
    expect(screen.getByText('Monthly essentials')).toBeInTheDocument();
    expect(screen.getByText('Food limit')).toBeInTheDocument();
  });

  it('shows an error state when the subscription fails', () => {
    setup('error');
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });

  it('opens the create dialog and creates a budget', async () => {
    createBudgetMock.mockResolvedValue('new-id');
    setup([]);
    fireEvent.click(screen.getAllByRole('button', { name: /Add Budget/ })[0]);
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Budget name'), {
      target: { value: 'Vacation fund' },
    });
    fireEvent.change(within(dialog).getByLabelText('Budget amount'), {
      target: { value: '15000' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add Budget' }));
    await waitFor(() =>
      expect(createBudgetMock).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ name: 'Vacation fund', overallAmount: 15000 }),
      ),
    );
    expect(notifySuccess).toHaveBeenCalledWith('Budget added');
  });

  it('pre-fills a new budget from the saved default period and thresholds', async () => {
    createBudgetMock.mockResolvedValue('new-id');
    setup([], {
      defaultBudgetPeriod: 'weekly',
      defaultBudgetWarningThreshold: 70,
      defaultBudgetOverThreshold: 90,
    });
    fireEvent.click(screen.getAllByRole('button', { name: /Add Budget/ })[0]);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByLabelText('Period')).toHaveTextContent('Weekly');
    fireEvent.change(within(dialog).getByLabelText('Budget name'), {
      target: { value: 'Groceries' },
    });
    fireEvent.change(within(dialog).getByLabelText('Budget amount'), {
      target: { value: '5000' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add Budget' }));
    await waitFor(() =>
      expect(createBudgetMock).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ period: 'weekly', warningThreshold: 70, overThreshold: 90 }),
      ),
    );
  });

  it('opens the edit dialog with populated values and updates a budget', async () => {
    updateBudgetMock.mockResolvedValue(undefined);
    setup([overallBudget]);
    fireEvent.click(screen.getByLabelText('Actions for Monthly essentials'));
    fireEvent.click(screen.getByText('Edit'));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByDisplayValue('Monthly essentials')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(updateBudgetMock).toHaveBeenCalledWith(
        'b1',
        expect.objectContaining({ name: 'Monthly essentials' }),
      ),
    );
    expect(notifySuccess).toHaveBeenCalledWith('Budget updated');
  });

  it('deletes a budget after confirmation', async () => {
    confirmMock.mockResolvedValue(true);
    deleteBudgetMock.mockResolvedValue(undefined);
    setup([overallBudget]);
    fireEvent.click(screen.getByLabelText('Actions for Monthly essentials'));
    fireEvent.click(screen.getByText('Delete'));
    await waitFor(() => expect(deleteBudgetMock).toHaveBeenCalledWith('b1'));
    expect(notifySuccess).toHaveBeenCalledWith('Budget deleted');
  });

  it('does not delete when the confirmation is declined', async () => {
    confirmMock.mockResolvedValue(false);
    setup([overallBudget]);
    fireEvent.click(screen.getByLabelText('Actions for Monthly essentials'));
    fireEvent.click(screen.getByText('Delete'));
    await waitFor(() => expect(confirmMock).toHaveBeenCalled());
    expect(deleteBudgetMock).not.toHaveBeenCalled();
  });

  it('shows an empty templates state when there are none', () => {
    setup([]);
    expect(screen.getByText('No templates yet')).toBeInTheDocument();
  });

  it('opens the create dialog pre-filled when a template is used', () => {
    templates = [template];
    setup([]);
    fireEvent.click(screen.getByLabelText('Use template Standard month'));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByDisplayValue('Standard month')).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue('15000')).toBeInTheDocument();
  });

  it('saves a budget as a template', async () => {
    createBudgetTemplateMock.mockResolvedValue('new-template-id');
    setup([overallBudget]);
    fireEvent.click(screen.getByLabelText('Actions for Monthly essentials'));
    fireEvent.click(screen.getByText('Save as template'));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save template' }));
    await waitFor(() =>
      expect(createBudgetTemplateMock).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ name: 'Monthly essentials', overallAmount: 20000 }),
      ),
    );
    expect(notifySuccess).toHaveBeenCalledWith('Template saved');
  });

  it('deletes a template after confirmation', async () => {
    templates = [template];
    confirmMock.mockResolvedValue(true);
    deleteBudgetTemplateMock.mockResolvedValue(undefined);
    setup([]);
    fireEvent.click(screen.getByLabelText('Delete template Standard month'));
    await waitFor(() => expect(deleteBudgetTemplateMock).toHaveBeenCalledWith('t1'));
    expect(notifySuccess).toHaveBeenCalledWith('Template deleted');
  });

  it('shows a "not enough history" suggestions state with no trailing expense data', () => {
    setup([]);
    expect(screen.getByText('Not enough history yet')).toBeInTheDocument();
  });

  it('opens the create dialog pre-filled from the overall suggestion', () => {
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 10);
    mockTransactions = [
      {
        id: 'e1',
        userId: 'user-1',
        type: 'expense',
        amount: 90000,
        date: lastMonth.toISOString().slice(0, 10),
        description: '',
        notes: '',
        merchant: '',
        tags: [],
        accountId: 'acc-1',
        category: 'food',
        subcategory: '',
        paymentMethod: 'cash',
        createdAt: '',
        updatedAt: '',
      },
    ];
    setup([]);
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByDisplayValue('300')).toBeInTheDocument();
  });
});
