import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders as render } from '../../test/renderWithProviders';
import { DashboardCustomizeDialog } from './DashboardCustomizeDialog';

describe('DashboardCustomizeDialog', () => {
  it('lists every widget, checked according to the given value', () => {
    render(
      <DashboardCustomizeDialog
        open
        value={['activeBudgets', 'categorySpending']}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('Active budgets')).toBeChecked();
    expect(screen.getByLabelText('Spending by category')).toBeChecked();
    expect(screen.getByLabelText('Recent transactions')).not.toBeChecked();
  });

  it('renders hidden widgets after the visible ones, in default order', () => {
    render(
      <DashboardCustomizeDialog
        open
        value={['categorySpending']}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    const rows = screen.getAllByRole('checkbox').map((el) => el.getAttribute('aria-label'));
    expect(rows).toEqual(['Spending by category', 'Active budgets', 'Recent transactions']);
  });

  it('saves the widgets in their default order and visibility when nothing changes', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(
      <DashboardCustomizeDialog
        open
        value={['activeBudgets', 'recentTransactions', 'categorySpending']}
        onClose={onClose}
        onSave={onSave}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(['activeBudgets', 'recentTransactions', 'categorySpending']),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('excludes an unchecked widget from the saved order', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <DashboardCustomizeDialog
        open
        value={['activeBudgets', 'recentTransactions', 'categorySpending']}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );
    fireEvent.click(screen.getByLabelText('Recent transactions'));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(['activeBudgets', 'categorySpending']),
    );
  });

  it('moves a widget up and down within the order', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <DashboardCustomizeDialog
        open
        value={['activeBudgets', 'recentTransactions', 'categorySpending']}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );
    fireEvent.click(screen.getByLabelText('Move Recent transactions up'));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(['recentTransactions', 'activeBudgets', 'categorySpending']),
    );
  });

  it('disables the up arrow on the first row and the down arrow on the last', () => {
    render(
      <DashboardCustomizeDialog
        open
        value={['activeBudgets', 'recentTransactions', 'categorySpending']}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('Move Active budgets up')).toBeDisabled();
    expect(screen.getByLabelText('Move Spending by category down')).toBeDisabled();
  });

  it('calls onClose without saving when Cancel is clicked', () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    render(
      <DashboardCustomizeDialog open value={['activeBudgets']} onClose={onClose} onSave={onSave} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('re-seeds its working state from a fresh value each time it opens', () => {
    const { rerender } = render(
      <DashboardCustomizeDialog open={false} value={['activeBudgets']} onClose={vi.fn()} onSave={vi.fn()} />,
    );
    rerender(
      <DashboardCustomizeDialog open value={['categorySpending']} onClose={vi.fn()} onSave={vi.fn()} />,
    );
    expect(screen.getByLabelText('Spending by category')).toBeChecked();
    expect(screen.getByLabelText('Active budgets')).not.toBeChecked();
  });
});
