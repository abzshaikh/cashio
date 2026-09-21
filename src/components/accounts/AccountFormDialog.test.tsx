import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AccountFormDialog } from './AccountFormDialog';
import type { AccountFormValues } from '../../schemas/accountSchemas';

describe('AccountFormDialog', () => {
  it('renders the create title and disables nothing by default', () => {
    render(
      <AccountFormDialog open mode="create" onClose={vi.fn()} onSubmit={vi.fn()} />,
    );
    expect(screen.getByRole('heading', { name: 'Add Account' })).toBeInTheDocument();
    expect(screen.getByLabelText('Opening balance')).not.toBeDisabled();
  });

  it('renders the edit title and disables the opening balance field', () => {
    const initialValues: AccountFormValues = {
      name: 'Main Checking',
      type: 'bank',
      institution: 'Test Bank',
      accountNumber: '1234567890',
      openingBalance: 1000,
      currency: 'INR',
      status: 'active',
      notes: '',
      creditLimit: 0,
      statementDay: 1,
      paymentDueDay: 1,
    };
    render(
      <AccountFormDialog
        open
        mode="edit"
        initialValues={initialValues}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByText('Edit Account')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Main Checking')).toBeInTheDocument();
    expect(screen.getByLabelText('Opening balance')).toBeDisabled();
  });

  it('shows a validation error and does not submit when the name is blank', async () => {
    const onSubmit = vi.fn();
    render(<AccountFormDialog open mode="create" onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add Account' }));
    await waitFor(() => expect(screen.getByText('Account name is required')).toBeInTheDocument());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the entered values', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<AccountFormDialog open mode="create" onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Account name'), { target: { value: 'Wallet' } });
    fireEvent.change(screen.getByLabelText('Opening balance'), { target: { value: '250' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Account' }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Wallet', openingBalance: 250 }),
      ),
    );
  });

  it('shows the error message returned by a failed submit', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Network error'));
    render(<AccountFormDialog open mode="create" onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Account name'), { target: { value: 'Wallet' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Account' }));
    await waitFor(() => expect(screen.getByText('Network error')).toBeInTheDocument());
  });

  it('does not show credit card fields by default', () => {
    render(<AccountFormDialog open mode="create" onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.queryByLabelText('Credit limit')).not.toBeInTheDocument();
  });

  it('shows credit card fields once the type is set to Credit Card', () => {
    render(<AccountFormDialog open mode="create" onClose={vi.fn()} onSubmit={vi.fn()} />);
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Account type' }));
    fireEvent.click(screen.getByRole('option', { name: 'Credit Card' }));
    expect(screen.getByLabelText('Credit limit')).toBeInTheDocument();
    expect(screen.getByLabelText('Statement day (1–31)')).toBeInTheDocument();
    expect(screen.getByLabelText('Payment due day (1–31)')).toBeInTheDocument();
  });

  it('requires a positive credit limit once the type is Credit Card', async () => {
    const onSubmit = vi.fn();
    render(<AccountFormDialog open mode="create" onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Account name'), { target: { value: 'Rewards Card' } });
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Account type' }));
    fireEvent.click(screen.getByRole('option', { name: 'Credit Card' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add Account' }));
    await waitFor(() =>
      expect(screen.getByText('Enter a credit limit greater than zero')).toBeInTheDocument(),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits credit limit, statement day, and payment due day for a credit card', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<AccountFormDialog open mode="create" onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Account name'), { target: { value: 'Rewards Card' } });
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Account type' }));
    fireEvent.click(screen.getByRole('option', { name: 'Credit Card' }));
    fireEvent.change(screen.getByLabelText('Credit limit'), { target: { value: '100000' } });
    fireEvent.change(screen.getByLabelText('Statement day (1–31)'), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText('Payment due day (1–31)'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Account' }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ creditLimit: 100000, statementDay: 20, paymentDueDay: 5 }),
      ),
    );
  });

  it('clears credit card fields to null when the type is not Credit Card', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<AccountFormDialog open mode="create" onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Account name'), { target: { value: 'Wallet' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Account' }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ creditLimit: null, statementDay: null, paymentDueDay: null }),
      ),
    );
  });
});
