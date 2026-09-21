import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders as render } from '../../test/renderWithProviders';
import { ImportPage } from './ImportPage';
import type { Account } from '../../types/account';
import type { ExpenseCategoryRecord } from '../../types/category';

const useAuthMock = vi.fn();
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

const notifySuccess = vi.fn();
const notifyError = vi.fn();
vi.mock('../../context/NotificationContext', () => ({
  useNotification: () => ({ success: notifySuccess, error: notifyError }),
}));

let mockAccounts: Account[] | null = [];
vi.mock('../../hooks/useAccounts', () => ({
  useAccounts: () => ({ accounts: mockAccounts, error: null, reload: vi.fn() }),
}));

let mockCategories: ExpenseCategoryRecord[] | null = [];
vi.mock('../../hooks/useExpenseCategories', () => ({
  useExpenseCategories: () => ({ categories: mockCategories, error: null, reload: vi.fn() }),
}));

const createIncomeTransactionMock = vi.fn();
const createExpenseTransactionMock = vi.fn();
vi.mock('../../services/transactionService', () => ({
  createIncomeTransaction: (...args: unknown[]) => createIncomeTransactionMock(...args),
  createExpenseTransaction: (...args: unknown[]) => createExpenseTransactionMock(...args),
}));

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: 'acc1',
    userId: 'user-1',
    name: 'Checking',
    type: 'bank',
    institution: '',
    accountNumber: '',
    openingBalance: 0,
    currentBalance: 1000,
    currency: 'INR',
    status: 'active',
    notes: '',
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

function makeCategory(overrides: Partial<ExpenseCategoryRecord> = {}): ExpenseCategoryRecord {
  return {
    id: 'cat1',
    userId: 'user-1',
    slug: 'food',
    name: 'Food',
    isDefault: true,
    subcategories: [],
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

const SAMPLE_CSV = [
  'Date,Amount,Category,Merchant',
  '2026-03-15,-450,Food,Cafe Coffee Day',
  '2026-03-16,50000,Salary,Employer Inc',
  'not-a-date,100,Food,Broken Row',
].join('\n');

function setup() {
  useAuthMock.mockReturnValue({ user: { uid: 'user-1' }, profile: { currency: 'INR' } });
  render(<ImportPage />);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAccounts = [makeAccount()];
  mockCategories = [makeCategory(), makeCategory({ id: 'cat2', slug: 'other', name: 'Other' })];
});

async function advanceToPreview() {
  fireEvent.mouseDown(screen.getByLabelText('Import into account'));
  fireEvent.click(await screen.findByRole('option', { name: 'Checking' }));

  fireEvent.change(screen.getByPlaceholderText(/Date,Amount,Category,Merchant/), {
    target: { value: SAMPLE_CSV },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

  // Mapping step: auto-guessed from headers, so Date/Amount are already
  // mapped — just continue.
  const continueButtons = await screen.findAllByRole('button', { name: 'Continue' });
  fireEvent.click(continueButtons[continueButtons.length - 1]);
}

describe('ImportPage', () => {
  it('shows an "add an account first" prompt when there are no accounts', () => {
    mockAccounts = [];
    setup();
    expect(screen.getByText('Add an account first')).toBeInTheDocument();
  });

  it('parses a pasted CSV, previews rows, and reports invalid rows', async () => {
    setup();
    await advanceToPreview();

    expect(await screen.findByText(/2 of 3 rows ready to import/)).toBeInTheDocument();
    expect(screen.getByText(/1 row will be skipped due to errors/)).toBeInTheDocument();
  });

  it('imports valid rows via the transaction service and skips invalid ones', async () => {
    createIncomeTransactionMock.mockResolvedValue('new-id-1');
    createExpenseTransactionMock.mockResolvedValue('new-id-2');
    setup();
    await advanceToPreview();

    fireEvent.click(await screen.findByRole('button', { name: /Import 2 transactions/ }));

    await waitFor(() => expect(screen.getByText('Import complete')).toBeInTheDocument());
    expect(createExpenseTransactionMock).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ amount: 450, category: 'food', merchant: 'Cafe Coffee Day' }),
    );
    expect(createIncomeTransactionMock).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ amount: 50000, category: 'salary', source: 'Employer Inc' }),
    );
    expect(notifySuccess).toHaveBeenCalledWith('Imported 2 transactions');
  });

  it('lets the user navigate to Transactions after a successful import', async () => {
    createIncomeTransactionMock.mockResolvedValue('new-id-1');
    createExpenseTransactionMock.mockResolvedValue('new-id-2');
    setup();
    await advanceToPreview();
    fireEvent.click(await screen.findByRole('button', { name: /Import 2 transactions/ }));
    await waitFor(() => expect(screen.getByText('Import complete')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Go to Transactions' }));
    expect(navigateMock).toHaveBeenCalledWith('/transactions');
  });
});
