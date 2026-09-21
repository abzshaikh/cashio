import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders as render } from '../../test/renderWithProviders';
import { AuditLogPage } from './AuditLogPage';
import type { Account } from '../../types/account';
import type { ExpenseCategoryRecord } from '../../types/category';
import type { AuditLogEntry } from '../../types/auditLog';

const useAuthMock = vi.fn();
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
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
vi.mock('../../hooks/useAccounts', () => ({
  useAccounts: () => ({ accounts: [account], error: null, reload: vi.fn() }),
}));

const categories: ExpenseCategoryRecord[] = [
  {
    id: 'cat-1',
    userId: 'user-1',
    slug: 'groceries',
    name: 'Groceries',
    isDefault: true,
    subcategories: [],
    createdAt: '',
    updatedAt: '',
  },
];
vi.mock('../../hooks/useExpenseCategories', () => ({
  useExpenseCategories: () => ({ categories, error: null, reload: vi.fn() }),
}));

const subscribeToAuditLogsMock = vi.fn();
vi.mock('../../services/auditLogService', () => ({
  subscribeToAuditLogs: (...args: unknown[]) => subscribeToAuditLogsMock(...args),
}));

const createEntry: AuditLogEntry = {
  id: 'log-1',
  userId: 'user-1',
  action: 'create',
  entity: 'transaction',
  entityId: 'txn-1',
  previousValue: null,
  newValue: { type: 'expense', amount: 450, accountId: 'acc-1', category: 'groceries' },
  timestamp: '2026-03-15T10:00:00.000Z',
};

const updateEntry: AuditLogEntry = {
  id: 'log-2',
  userId: 'user-1',
  action: 'update',
  entity: 'transaction',
  entityId: 'txn-1',
  previousValue: { type: 'expense', amount: 450, accountId: 'acc-1', category: 'groceries' },
  newValue: { type: 'expense', amount: 500, accountId: 'acc-1', category: 'groceries' },
  timestamp: '2026-03-16T10:00:00.000Z',
};

function setup(entries: AuditLogEntry[] | null = [createEntry, updateEntry]) {
  useAuthMock.mockReturnValue({ user: { uid: 'user-1' } });
  subscribeToAuditLogsMock.mockImplementation((_uid, onData) => {
    if (entries !== null) onData(entries);
    return vi.fn();
  });
  return render(<AuditLogPage />);
}

describe('AuditLogPage', () => {
  it('renders a row per audit log entry with its action and summary', () => {
    setup();
    expect(screen.getByText('Created')).toBeInTheDocument();
    expect(screen.getByText('Updated')).toBeInTheDocument();
    expect(screen.getAllByText(/Expense of/).length).toBeGreaterThan(0);
  });

  it('shows an empty state when there is no history yet', () => {
    setup([]);
    expect(screen.getByText('No history yet')).toBeInTheDocument();
  });

  it('shows an error state and retries the subscription', () => {
    useAuthMock.mockReturnValue({ user: { uid: 'user-1' } });
    subscribeToAuditLogsMock.mockImplementation((_uid, _onData, onError) => {
      onError(new Error('Failed to load audit log'));
      return vi.fn();
    });
    render(<AuditLogPage />);
    expect(screen.getByText('Failed to load audit log')).toBeInTheDocument();

    subscribeToAuditLogsMock.mockClear();
    subscribeToAuditLogsMock.mockImplementation((_uid, onData) => {
      onData([createEntry]);
      return vi.fn();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(subscribeToAuditLogsMock).toHaveBeenCalled();
  });

  it('opens the details dialog for an entry when "View details" is clicked', async () => {
    setup([createEntry]);
    fireEvent.click(screen.getByRole('button', { name: 'View details' }));
    await waitFor(() => {
      expect(screen.getByText('Created transaction')).toBeInTheDocument();
    });
  });
});
