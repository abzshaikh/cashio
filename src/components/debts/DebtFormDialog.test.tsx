import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderWithProviders as render } from '../../test/renderWithProviders';
import { DebtFormDialog } from './DebtFormDialog';
import type { DebtFormValues } from '../../schemas/debtSchemas';

describe('DebtFormDialog', () => {
  it('renders the create title', () => {
    render(<DebtFormDialog open mode="create" onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Add Debt' })).toBeInTheDocument();
  });

  it('renders the edit title and populates initial values', () => {
    const initialValues: DebtFormValues = {
      lender: 'Acme Bank',
      category: 'personal_loan',
      originalAmount: 50000,
      interestRate: 12.5,
      minimumPayment: 2000,
      paymentDueDay: 15,
      startDate: new Date('2026-01-01'),
      hasEndDate: true,
      endDate: new Date('2028-01-01'),
      notes: 'Consolidation loan',
    };
    render(
      <DebtFormDialog
        open
        mode="edit"
        initialValues={initialValues}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Edit Debt' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Acme Bank')).toBeInTheDocument();
    expect(screen.getByDisplayValue('50000')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Target payoff date' })).toBeInTheDocument();
  });

  it('does not show the target payoff date field until the toggle is on', () => {
    render(<DebtFormDialog open mode="create" onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.queryByRole('group', { name: 'Target payoff date' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch', { name: /Set a target payoff date/ }));
    expect(screen.getByRole('group', { name: 'Target payoff date' })).toBeInTheDocument();
  });

  it('requires a lender name', async () => {
    const onSubmit = vi.fn();
    render(<DebtFormDialog open mode="create" onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Original amount'), { target: { value: '5000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Debt' }));
    await waitFor(() => expect(screen.getByText('Enter a lender name')).toBeInTheDocument());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('requires a positive original amount', async () => {
    const onSubmit = vi.fn();
    render(<DebtFormDialog open mode="create" onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Lender'), { target: { value: 'Acme Bank' } });
    fireEvent.change(screen.getByLabelText('Original amount'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Debt' }));
    await waitFor(() =>
      expect(screen.getByText('Amount must be greater than zero')).toBeInTheDocument(),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits a debt with no target payoff date', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<DebtFormDialog open mode="create" onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Lender'), { target: { value: 'Acme Bank' } });
    fireEvent.change(screen.getByLabelText('Original amount'), { target: { value: '50000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Debt' }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ lender: 'Acme Bank', originalAmount: 50000, endDate: null }),
      ),
    );
  });

  it('requires a target payoff date once the toggle is on', async () => {
    const onSubmit = vi.fn();
    render(<DebtFormDialog open mode="create" onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Lender'), { target: { value: 'Acme Bank' } });
    fireEvent.change(screen.getByLabelText('Original amount'), { target: { value: '50000' } });
    fireEvent.click(screen.getByRole('switch', { name: /Set a target payoff date/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Add Debt' }));
    await waitFor(() =>
      expect(
        screen.getByText('Select a target payoff date, or turn off "Set a target payoff date"'),
      ).toBeInTheDocument(),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('changes category via the select', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<DebtFormDialog open mode="create" onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Lender'), { target: { value: 'State Bank' } });
    fireEvent.change(screen.getByLabelText('Original amount'), { target: { value: '50000' } });
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Category' }));
    fireEvent.click(screen.getByRole('option', { name: 'Auto Loan' }));
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Add Debt' }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ category: 'auto_loan' })),
    );
  });

  it('shows the error message returned by a failed submit', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Network error'));
    render(<DebtFormDialog open mode="create" onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Lender'), { target: { value: 'Acme Bank' } });
    fireEvent.change(screen.getByLabelText('Original amount'), { target: { value: '50000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Debt' }));
    await waitFor(() => expect(screen.getByText('Network error')).toBeInTheDocument());
  });

  it('closes when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<DebtFormDialog open mode="create" onClose={onClose} onSubmit={vi.fn()} />);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });
});
