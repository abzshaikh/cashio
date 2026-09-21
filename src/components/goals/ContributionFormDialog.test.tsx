import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders as render } from '../../test/renderWithProviders';
import { ContributionFormDialog } from './ContributionFormDialog';

describe('ContributionFormDialog', () => {
  it('shows the goal name in the title', () => {
    render(
      <ContributionFormDialog open goalName="Emergency Fund" onClose={vi.fn()} onSubmit={vi.fn()} />,
    );
    expect(screen.getByText('Add money to "Emergency Fund"')).toBeInTheDocument();
  });

  it('requires a positive amount', async () => {
    const onSubmit = vi.fn();
    render(<ContributionFormDialog open goalName="Emergency Fund" onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() =>
      expect(screen.getByText('Amount must be greater than zero')).toBeInTheDocument(),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits an amount, date, and optional note', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ContributionFormDialog open goalName="Emergency Fund" onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '5000' } });
    fireEvent.change(screen.getByLabelText('Note (optional)'), {
      target: { value: 'Diwali bonus' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 5000, note: 'Diwali bonus' }),
      ),
    );
  });

  it('shows the error message returned by a failed submit', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Network error'));
    render(<ContributionFormDialog open goalName="Emergency Fund" onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '5000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() => expect(screen.getByText('Network error')).toBeInTheDocument());
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<ContributionFormDialog open goalName="Emergency Fund" onClose={onClose} onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });
});
