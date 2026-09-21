import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders as render } from '../../test/renderWithProviders';
import { TransactionFilters } from './TransactionFilters';
import { defaultTransactionFilters, type TransactionFilters as TransactionFiltersValue } from '../../utils/transactionSearch';

const accountOptions = [
  { value: 'acc-1', label: 'HDFC Bank' },
  { value: 'acc-2', label: 'Cash' },
];

describe('TransactionFilters', () => {
  it('shows the helper caption and no "Clear filters" button when no filters are active', () => {
    render(
      <TransactionFilters value={defaultTransactionFilters} onChange={vi.fn()} accountOptions={accountOptions} resultCount={5} />,
    );
    expect(screen.getByText(/Search by merchant/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();
  });

  it('shows the result count and a "Clear filters" button once a filter is active', () => {
    const value: TransactionFiltersValue = { ...defaultTransactionFilters, query: 'coffee' };
    render(<TransactionFilters value={value} onChange={vi.fn()} accountOptions={accountOptions} resultCount={2} />);
    expect(screen.getByText('2 matching transactions')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument();
  });

  it('uses singular wording for exactly one matching transaction', () => {
    const value: TransactionFiltersValue = { ...defaultTransactionFilters, query: 'coffee' };
    render(<TransactionFilters value={value} onChange={vi.fn()} accountOptions={accountOptions} resultCount={1} />);
    expect(screen.getByText('1 matching transaction')).toBeInTheDocument();
  });

  it('calls onChange with the typed query', () => {
    const onChange = vi.fn();
    render(
      <TransactionFilters value={defaultTransactionFilters} onChange={onChange} accountOptions={accountOptions} resultCount={0} />,
    );
    fireEvent.change(screen.getByPlaceholderText(/Search merchant/), { target: { value: 'restaurant' } });
    expect(onChange).toHaveBeenCalledWith({ ...defaultTransactionFilters, query: 'restaurant' });
  });

  it('calls onChange with the selected type', () => {
    const onChange = vi.fn();
    render(
      <TransactionFilters value={defaultTransactionFilters} onChange={onChange} accountOptions={accountOptions} resultCount={0} />,
    );
    fireEvent.mouseDown(screen.getByLabelText('Type'));
    fireEvent.click(screen.getByRole('option', { name: 'Income' }));
    expect(onChange).toHaveBeenCalledWith({ ...defaultTransactionFilters, types: ['income'] });
  });

  it('calls onChange with the selected account', () => {
    const onChange = vi.fn();
    render(
      <TransactionFilters value={defaultTransactionFilters} onChange={onChange} accountOptions={accountOptions} resultCount={0} />,
    );
    fireEvent.mouseDown(screen.getByLabelText('Account'));
    fireEvent.click(screen.getByRole('option', { name: 'Cash' }));
    expect(onChange).toHaveBeenCalledWith({ ...defaultTransactionFilters, accountIds: ['acc-2'] });
  });

  it('calls onChange with a numeric minimum amount converted to minor units', () => {
    const onChange = vi.fn();
    render(
      <TransactionFilters value={defaultTransactionFilters} onChange={onChange} accountOptions={accountOptions} resultCount={0} />,
    );
    fireEvent.change(screen.getByLabelText('Min amount'), { target: { value: '100' } });
    expect(onChange).toHaveBeenCalledWith({ ...defaultTransactionFilters, minAmount: 10000 });
  });

  it('calls onChange with a null minimum amount when the field is cleared', () => {
    const onChange = vi.fn();
    const value: TransactionFiltersValue = { ...defaultTransactionFilters, minAmount: 100 };
    render(<TransactionFilters value={value} onChange={onChange} accountOptions={accountOptions} resultCount={0} />);
    fireEvent.change(screen.getByLabelText('Min amount'), { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith({ ...defaultTransactionFilters, minAmount: null });
  });

  it('calls onChange with a numeric maximum amount converted to minor units', () => {
    const onChange = vi.fn();
    render(
      <TransactionFilters value={defaultTransactionFilters} onChange={onChange} accountOptions={accountOptions} resultCount={0} />,
    );
    fireEvent.change(screen.getByLabelText('Max amount'), { target: { value: '500' } });
    expect(onChange).toHaveBeenCalledWith({ ...defaultTransactionFilters, maxAmount: 50000 });
  });

  it('resets to the default filters when "Clear filters" is clicked', () => {
    const onChange = vi.fn();
    const value: TransactionFiltersValue = {
      query: 'restaurant',
      types: ['expense'],
      accountIds: ['acc-1'],
      minAmount: 10,
      maxAmount: 500,
    };
    render(<TransactionFilters value={value} onChange={onChange} accountOptions={accountOptions} resultCount={1} />);
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(onChange).toHaveBeenCalledWith(defaultTransactionFilters);
  });
});
