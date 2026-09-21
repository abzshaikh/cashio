import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders as render } from '../../test/renderWithProviders';
import { AdjustmentFormDialog } from './AdjustmentFormDialog';
import type { AdjustmentFormValues } from '../../schemas/adjustmentSchemas';
import type { Tag } from '../../types/tag';

const accountOptions = [
  { value: 'acc-1', label: 'HDFC Bank' },
  { value: 'acc-2', label: 'Cash' },
];

const tags: Tag[] = [
  {
    id: 'tag-1',
    userId: 'user-1',
    slug: 'vacation',
    name: 'Vacation',
    color: 'primary',
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'tag-2',
    userId: 'user-1',
    slug: 'business',
    name: 'Business',
    color: 'success',
    createdAt: '',
    updatedAt: '',
  },
];

describe('AdjustmentFormDialog', () => {
  it('renders the create title', () => {
    render(
      <AdjustmentFormDialog
        open
        mode="create"
        accountOptions={accountOptions}
        tags={tags}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Add Adjustment' })).toBeInTheDocument();
  });

  it('renders the edit title and populates initial values', () => {
    const initialValues: AdjustmentFormValues = {
      amount: 100,
      date: new Date('2026-01-15'),
      accountId: 'acc-1',
      direction: 'decrease',
      reason: 'Reconciled cash count',
      description: '',
      notes: '',
      tags: [],
    };
    render(
      <AdjustmentFormDialog
        open
        mode="edit"
        initialValues={initialValues}
        accountOptions={accountOptions}
        tags={tags}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Edit Adjustment' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('100')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Reconciled cash count')).toBeInTheDocument();
  });

  it('shows a validation error and does not submit without an account', async () => {
    const onSubmit = vi.fn();
    render(
      <AdjustmentFormDialog
        open
        mode="create"
        accountOptions={accountOptions}
        tags={tags}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Cash count' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Adjustment' }));
    await waitFor(() => expect(screen.getByText('Select an account')).toBeInTheDocument());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('requires a reason', async () => {
    const onSubmit = vi.fn();
    render(
      <AdjustmentFormDialog
        open
        mode="create"
        accountOptions={accountOptions}
        tags={tags}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '100' } });
    fireEvent.mouseDown(screen.getByLabelText('Account'));
    fireEvent.click(screen.getByRole('option', { name: 'HDFC Bank' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add Adjustment' }));
    await waitFor(() =>
      expect(screen.getByText('Enter a reason for this adjustment')).toBeInTheDocument(),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('defaults direction to "Increase balance" and submits the entered values', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <AdjustmentFormDialog
        open
        mode="create"
        accountOptions={accountOptions}
        tags={tags}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    expect(screen.getByText('Increase balance')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '200' } });
    fireEvent.change(screen.getByLabelText('Reason'), {
      target: { value: 'Reconciled cash count' },
    });
    fireEvent.mouseDown(screen.getByLabelText('Account'));
    fireEvent.click(screen.getByRole('option', { name: 'HDFC Bank' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add Adjustment' }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 200,
          accountId: 'acc-1',
          direction: 'increase',
          reason: 'Reconciled cash count',
        }),
      ),
    );
  });

  it('submits "decrease" when that direction is chosen', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <AdjustmentFormDialog
        open
        mode="create"
        accountOptions={accountOptions}
        tags={tags}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.mouseDown(screen.getByLabelText('Direction'));
    fireEvent.click(screen.getByRole('option', { name: 'Decrease balance' }));
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '75' } });
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Bank fee correction' } });
    fireEvent.mouseDown(screen.getByLabelText('Account'));
    fireEvent.click(screen.getByRole('option', { name: 'Cash' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add Adjustment' }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ direction: 'decrease' })),
    );
  });

  it('shows the error message returned by a failed submit', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Network error'));
    render(
      <AdjustmentFormDialog
        open
        mode="create"
        accountOptions={accountOptions}
        tags={tags}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Cash count' } });
    fireEvent.mouseDown(screen.getByLabelText('Account'));
    fireEvent.click(screen.getByRole('option', { name: 'Cash' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add Adjustment' }));
    await waitFor(() => expect(screen.getByText('Network error')).toBeInTheDocument());
  });

  it('lets the user pick tags from the real tag list and submits their slugs', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <AdjustmentFormDialog
        open
        mode="create"
        accountOptions={accountOptions}
        tags={tags}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Cash count' } });
    fireEvent.mouseDown(screen.getByLabelText('Account'));
    fireEvent.click(screen.getByRole('option', { name: 'HDFC Bank' }));
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());

    const tagsInput = screen.getByLabelText('Tags (optional)');
    fireEvent.mouseDown(tagsInput);
    fireEvent.click(screen.getByRole('option', { name: 'Vacation' }));
    expect(screen.getByText('Vacation')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add Adjustment' }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ tags: ['vacation'] })),
    );
  });
});
