import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderWithProviders as render } from '../../test/renderWithProviders';
import { GoalFormDialog } from './GoalFormDialog';
import type { SavingsGoalFormValues } from '../../schemas/savingsGoalSchemas';

describe('GoalFormDialog', () => {
  it('renders the create title', () => {
    render(<GoalFormDialog open mode="create" onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Add Savings Goal' })).toBeInTheDocument();
  });

  it('renders the edit title and populates initial values', () => {
    const initialValues: SavingsGoalFormValues = {
      name: 'Emergency Fund',
      category: 'emergency_fund',
      targetAmount: 100000,
      hasTargetDate: true,
      targetDate: new Date('2027-01-01'),
      notes: 'Six months of expenses',
    };
    render(
      <GoalFormDialog
        open
        mode="edit"
        initialValues={initialValues}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Edit Savings Goal' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Emergency Fund')).toBeInTheDocument();
    expect(screen.getByDisplayValue('100000')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Target date' })).toBeInTheDocument();
  });

  it('does not show the target date field until "Set a target date" is on', () => {
    render(<GoalFormDialog open mode="create" onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.queryByRole('group', { name: 'Target date' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch', { name: /Set a target date/ }));
    expect(screen.getByRole('group', { name: 'Target date' })).toBeInTheDocument();
  });

  it('requires a name', async () => {
    const onSubmit = vi.fn();
    render(<GoalFormDialog open mode="create" onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Target amount'), { target: { value: '5000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Goal' }));
    await waitFor(() => expect(screen.getByText('Enter a goal name')).toBeInTheDocument());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('requires a positive target amount', async () => {
    const onSubmit = vi.fn();
    render(<GoalFormDialog open mode="create" onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Goal name'), { target: { value: 'New Laptop' } });
    fireEvent.change(screen.getByLabelText('Target amount'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Goal' }));
    await waitFor(() =>
      expect(screen.getByText('Amount must be greater than zero')).toBeInTheDocument(),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits a goal with no target date', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<GoalFormDialog open mode="create" onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Goal name'), { target: { value: 'New Laptop' } });
    fireEvent.change(screen.getByLabelText('Target amount'), { target: { value: '80000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Goal' }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Laptop', targetAmount: 80000, targetDate: null }),
      ),
    );
  });

  it('requires a target date once "Set a target date" is on', async () => {
    const onSubmit = vi.fn();
    render(<GoalFormDialog open mode="create" onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Goal name'), { target: { value: 'New Laptop' } });
    fireEvent.change(screen.getByLabelText('Target amount'), { target: { value: '80000' } });
    fireEvent.click(screen.getByRole('switch', { name: /Set a target date/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Add Goal' }));
    await waitFor(() =>
      expect(
        screen.getByText('Select a target date, or turn off "Set a target date"'),
      ).toBeInTheDocument(),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('changes category via the select', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<GoalFormDialog open mode="create" onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Goal name'), { target: { value: 'Bali Trip' } });
    fireEvent.change(screen.getByLabelText('Target amount'), { target: { value: '50000' } });
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Category' }));
    fireEvent.click(screen.getByRole('option', { name: 'Vacation' }));
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Add Goal' }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ category: 'vacation' })),
    );
  });

  it('shows the error message returned by a failed submit', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Network error'));
    render(<GoalFormDialog open mode="create" onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Goal name'), { target: { value: 'New Laptop' } });
    fireEvent.change(screen.getByLabelText('Target amount'), { target: { value: '80000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Goal' }));
    await waitFor(() => expect(screen.getByText('Network error')).toBeInTheDocument());
  });

  it('closes when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<GoalFormDialog open mode="create" onClose={onClose} onSubmit={vi.fn()} />);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });
});
