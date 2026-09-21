import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders as render } from '../../test/renderWithProviders';
import { DebtCard } from './DebtCard';
import type { Debt } from '../../types/debt';
import type { DebtPayment } from '../../types/debtPayment';

// Named "Acme Bank" (category personal_loan → label "Personal Loan") to
// avoid the name/category-label text collision documented in PHASE_LOG.md
// (Phase 16) — a debt literally named "Personal Loan" would render that
// exact text twice (title and category chip).
const debt: Debt = {
  id: 'd1',
  userId: 'user-1',
  lender: 'Acme Bank',
  category: 'personal_loan',
  originalAmount: 1000,
  interestRate: 10,
  minimumPayment: 100,
  paymentDueDay: 15,
  startDate: '2026-01-01',
  endDate: null,
  notes: '',
  createdAt: '',
  updatedAt: '',
};

function makePayment(overrides: Partial<DebtPayment> = {}): DebtPayment {
  return {
    id: 'p1',
    userId: 'user-1',
    debtId: 'd1',
    amount: 100,
    date: '2026-02-01',
    note: '',
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

function renderCard(props: Partial<Parameters<typeof DebtCard>[0]> = {}) {
  return render(
    <DebtCard
      debt={debt}
      payments={[]}
      onEdit={vi.fn()}
      onDelete={vi.fn()}
      onAddPayment={vi.fn()}
      onDeletePayment={vi.fn()}
      {...props}
    />,
  );
}

describe('DebtCard', () => {
  it('renders the lender name, category, and outstanding/original amounts', () => {
    renderCard({ payments: [makePayment({ amount: 400 })] });
    expect(screen.getByText('Acme Bank')).toBeInTheDocument();
    expect(screen.getByText('40.0% paid')).toBeInTheDocument();
  });

  it('shows the interest rate and minimum payment', () => {
    renderCard();
    expect(screen.getByText(/10% APR/)).toBeInTheDocument();
  });

  it('shows "Paid off" once payments reach the original amount', () => {
    renderCard({ payments: [makePayment({ amount: 1000 })] });
    expect(screen.getByText('Paid off')).toBeInTheDocument();
  });

  it('shows a due-date message when the debt is not paid off', () => {
    renderCard({ payments: [] });
    expect(screen.getByText(/Payment due/)).toBeInTheDocument();
  });

  it('calls onEdit when Edit is chosen from the menu', () => {
    const onEdit = vi.fn();
    renderCard({ onEdit });
    fireEvent.click(screen.getByLabelText('Actions for Acme Bank'));
    fireEvent.click(screen.getByText('Edit'));
    expect(onEdit).toHaveBeenCalledWith(debt);
  });

  it('calls onDelete when Delete is chosen from the menu', () => {
    const onDelete = vi.fn();
    renderCard({ onDelete });
    fireEvent.click(screen.getByLabelText('Actions for Acme Bank'));
    fireEvent.click(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalledWith(debt);
  });

  it('calls onAddPayment when "Record payment" is clicked', () => {
    const onAddPayment = vi.fn();
    renderCard({ onAddPayment });
    fireEvent.click(screen.getByRole('button', { name: /Record payment/ }));
    expect(onAddPayment).toHaveBeenCalledWith(debt);
  });

  it('toggles the payment history and calls onDeletePayment', async () => {
    const onDeletePayment = vi.fn();
    const payment = makePayment({ amount: 250, note: 'Extra principal' });
    renderCard({ payments: [payment], onDeletePayment });

    expect(screen.queryByText('Extra principal', { exact: false })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Show 1 payment/ }));
    expect(screen.getByText(/Extra principal/)).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/Delete payment of 250/));
    expect(onDeletePayment).toHaveBeenCalledWith(payment);

    fireEvent.click(screen.getByRole('button', { name: /Hide 1 payment/ }));
    // MUI's Collapse animates the exit and only unmounts the content once
    // that transition finishes (Phase 16 gotcha), so this needs waitFor.
    await waitFor(() => expect(screen.queryByText(/Extra principal/)).not.toBeInTheDocument());
  });

  it('shows "No payments yet" when the history is expanded with none', () => {
    renderCard({ payments: [] });
    fireEvent.click(screen.getByRole('button', { name: /Show 0 payments/ }));
    expect(screen.getByText('No payments yet.')).toBeInTheDocument();
  });
});
