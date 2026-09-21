import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders as render } from '../../test/renderWithProviders';
import { AuditLogDetailsDialog } from './AuditLogDetailsDialog';
import type { AuditLogEntry } from '../../types/auditLog';
import type { AuditLookupContext } from '../../utils/auditLogFormatting';
import type { Account } from '../../types/account';
import type { ExpenseCategoryRecord } from '../../types/category';

const checking: Account = {
  id: 'acc-checking',
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
};

const groceries: ExpenseCategoryRecord = {
  id: 'cat-1',
  userId: 'user-1',
  slug: 'groceries',
  name: 'Groceries',
  subcategories: [],
  isDefault: true,
  createdAt: '',
  updatedAt: '',
};

const ctx: AuditLookupContext = {
  accountsById: { [checking.id]: checking },
  categories: [groceries],
};

function makeEntry(overrides: Partial<AuditLogEntry>): AuditLogEntry {
  return {
    id: 'log-1',
    userId: 'user-1',
    action: 'create',
    entity: 'transaction',
    entityId: 'txn-1',
    previousValue: null,
    newValue: null,
    timestamp: '2026-03-15T10:00:00.000Z',
    ...overrides,
  };
}

describe('AuditLogDetailsDialog', () => {
  it('renders no content when there is no entry', () => {
    render(<AuditLogDetailsDialog open={true} entry={null} ctx={ctx} onClose={vi.fn()} />);
    expect(screen.queryByText(/transaction$/)).not.toBeInTheDocument();
  });

  it('describes the new snapshot for a create entry', () => {
    const entry = makeEntry({
      action: 'create',
      newValue: { type: 'expense', amount: 450, accountId: checking.id, category: 'groceries' },
    });
    render(<AuditLogDetailsDialog open={true} entry={entry} ctx={ctx} onClose={vi.fn()} />);
    expect(screen.getByText('Created transaction')).toBeInTheDocument();
    expect(screen.getByText(/Expense of/)).toBeInTheDocument();
    expect(screen.getByText(/Groceries/)).toBeInTheDocument();
  });

  it('describes the previous snapshot for a delete entry', () => {
    const entry = makeEntry({
      action: 'delete',
      previousValue: { type: 'expense', amount: 450, accountId: checking.id, category: 'groceries' },
      newValue: null,
    });
    render(<AuditLogDetailsDialog open={true} entry={entry} ctx={ctx} onClose={vi.fn()} />);
    expect(screen.getByText('Deleted transaction')).toBeInTheDocument();
    expect(screen.getByText(/Expense of/)).toBeInTheDocument();
  });

  it('shows a field-by-field diff table for an update entry', () => {
    const entry = makeEntry({
      action: 'update',
      previousValue: { type: 'expense', amount: 450, accountId: checking.id, category: 'groceries' },
      newValue: { type: 'expense', amount: 500, accountId: checking.id, category: 'groceries' },
    });
    render(<AuditLogDetailsDialog open={true} entry={entry} ctx={ctx} onClose={vi.fn()} />);
    expect(screen.getByText('Updated transaction')).toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();
    // Only the changed field (amount) should appear as a row — type and
    // accountId are identical on both sides.
    expect(screen.queryByText('Type')).not.toBeInTheDocument();
    expect(screen.queryByText('Account')).not.toBeInTheDocument();
  });

  it('shows a fallback message when an update entry has no field changes', () => {
    const entry = makeEntry({
      action: 'update',
      previousValue: { type: 'expense', amount: 450 },
      newValue: { type: 'expense', amount: 450 },
    });
    render(<AuditLogDetailsDialog open={true} entry={entry} ctx={ctx} onClose={vi.fn()} />);
    expect(screen.getByText('No field changes were recorded for this update.')).toBeInTheDocument();
  });

  it('resolves an account and category referenced in a diff to their display names', () => {
    const entry = makeEntry({
      action: 'update',
      previousValue: { accountId: checking.id },
      newValue: { accountId: 'deleted-account-id' },
    });
    render(<AuditLogDetailsDialog open={true} entry={entry} ctx={ctx} onClose={vi.fn()} />);
    expect(screen.getByText('Checking')).toBeInTheDocument();
    expect(screen.getByText('deleted-account-id')).toBeInTheDocument();
  });
});
