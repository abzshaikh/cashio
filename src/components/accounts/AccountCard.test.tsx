import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders as render } from '../../test/renderWithProviders';
import { AccountCard } from './AccountCard';
import type { Account } from '../../types/account';

const account: Account = {
  id: 'a1',
  userId: 'user-1',
  name: 'Main Checking',
  type: 'bank',
  institution: 'Test Bank',
  accountNumber: '1234567890',
  openingBalance: 100000,
  currentBalance: 150000,
  currency: 'INR',
  status: 'active',
  notes: '',
  createdAt: '',
  updatedAt: '',
};

describe('AccountCard', () => {
  it('renders the account name, institution, balance, status and masked account number', () => {
    render(<AccountCard account={account} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('Main Checking')).toBeInTheDocument();
    expect(screen.getByText(/Test Bank/)).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('•••• 7890')).toBeInTheDocument();
    expect(screen.getByText(/1,500/)).toBeInTheDocument();
  });

  it('calls onEdit when Edit is chosen from the menu', () => {
    const onEdit = vi.fn();
    render(<AccountCard account={account} onEdit={onEdit} onDelete={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Actions for Main Checking'));
    fireEvent.click(screen.getByText('Edit'));
    expect(onEdit).toHaveBeenCalledWith(account);
  });

  it('calls onDelete when Delete is chosen from the menu', () => {
    const onDelete = vi.fn();
    render(<AccountCard account={account} onEdit={vi.fn()} onDelete={onDelete} />);
    fireEvent.click(screen.getByLabelText('Actions for Main Checking'));
    fireEvent.click(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalledWith(account);
  });

  it('does not show a utilization block for a non-credit-card account', () => {
    render(<AccountCard account={account} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.queryByText(/used$/)).not.toBeInTheDocument();
  });

  const creditCard: Account = {
    id: 'a2',
    userId: 'user-1',
    name: 'Rewards Card',
    type: 'credit_card',
    institution: 'Test Bank',
    accountNumber: '9876543210',
    openingBalance: 0,
    currentBalance: -600000,
    currency: 'INR',
    status: 'active',
    notes: '',
    creditLimit: 1000000,
    statementDay: 20,
    paymentDueDay: 5,
    createdAt: '',
    updatedAt: '',
  };

  it('shows debt, limit, utilization, and status for a credit card', () => {
    render(<AccountCard account={creditCard} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('Utilization elevated')).toBeInTheDocument();
    expect(screen.getByText('60.0% used')).toBeInTheDocument();
    expect(screen.getByText(/owed of/)).toBeInTheDocument();
  });

  it('shows a payment-due message for a credit card', () => {
    render(<AccountCard account={creditCard} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText(/Payment due/)).toBeInTheDocument();
  });

  it('falls back to a plain account card when a credit card has no limit set', () => {
    render(
      <AccountCard
        account={{ ...creditCard, creditLimit: null }}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.queryByText(/used$/)).not.toBeInTheDocument();
  });
});
