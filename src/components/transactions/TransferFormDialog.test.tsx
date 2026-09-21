import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders as render } from '../../test/renderWithProviders';
import { TransferFormDialog } from './TransferFormDialog';
import type { TransferFormValues } from '../../schemas/transferSchemas';
import type { Tag } from '../../types/tag';

const accountOptions = [
  { value: 'acc-1', label: 'HDFC Bank' },
  { value: 'acc-2', label: 'Cash' },
  { value: 'acc-3', label: 'ICICI Bank' },
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

describe('TransferFormDialog', () => {
  it('renders the create title', () => {
    render(
      <TransferFormDialog
        open
        mode="create"
        accountOptions={accountOptions}
        tags={tags}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Add Transfer' })).toBeInTheDocument();
  });

  it('renders the edit title and populates initial values', () => {
    const initialValues: TransferFormValues = {
      amount: 1000,
      date: new Date('2026-01-15'),
      fromAccountId: 'acc-1',
      toAccountId: 'acc-2',
      description: 'Move to savings',
      notes: '',
      tags: [],
    };
    render(
      <TransferFormDialog
        open
        mode="edit"
        initialValues={initialValues}
        accountOptions={accountOptions}
        tags={tags}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Edit Transfer' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('1000')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Move to savings')).toBeInTheDocument();
  });

  it('shows a validation error and does not submit without a source account', async () => {
    const onSubmit = vi.fn();
    render(
      <TransferFormDialog
        open
        mode="create"
        accountOptions={accountOptions}
        tags={tags}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Transfer' }));
    await waitFor(() => expect(screen.getByText('Select a source account')).toBeInTheDocument());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('excludes the "From Account" selection from the "To Account" options, and vice versa', async () => {
    render(
      <TransferFormDialog
        open
        mode="create"
        accountOptions={accountOptions}
        tags={tags}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    fireEvent.mouseDown(screen.getByLabelText('From Account'));
    fireEvent.click(screen.getByRole('option', { name: 'HDFC Bank' }));
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());

    fireEvent.mouseDown(screen.getByLabelText('To Account'));
    expect(screen.queryByRole('option', { name: 'HDFC Bank' })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Cash' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'ICICI Bank' })).toBeInTheDocument();
  });

  it('submits the entered values', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <TransferFormDialog
        open
        mode="create"
        accountOptions={accountOptions}
        tags={tags}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '500' } });
    fireEvent.mouseDown(screen.getByLabelText('From Account'));
    fireEvent.click(screen.getByRole('option', { name: 'HDFC Bank' }));
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    fireEvent.mouseDown(screen.getByLabelText('To Account'));
    fireEvent.click(screen.getByRole('option', { name: 'Cash' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add Transfer' }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 500, fromAccountId: 'acc-1', toAccountId: 'acc-2' }),
      ),
    );
  });

  it('shows the error message returned by a failed submit', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Network error'));
    render(
      <TransferFormDialog
        open
        mode="create"
        accountOptions={accountOptions}
        tags={tags}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '100' } });
    fireEvent.mouseDown(screen.getByLabelText('From Account'));
    fireEvent.click(screen.getByRole('option', { name: 'HDFC Bank' }));
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    fireEvent.mouseDown(screen.getByLabelText('To Account'));
    fireEvent.click(screen.getByRole('option', { name: 'Cash' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add Transfer' }));
    await waitFor(() => expect(screen.getByText('Network error')).toBeInTheDocument());
  });

  it('lets the user pick tags from the real tag list and submits their slugs', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <TransferFormDialog
        open
        mode="create"
        accountOptions={accountOptions}
        tags={tags}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '500' } });
    fireEvent.mouseDown(screen.getByLabelText('From Account'));
    fireEvent.click(screen.getByRole('option', { name: 'HDFC Bank' }));
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    fireEvent.mouseDown(screen.getByLabelText('To Account'));
    fireEvent.click(screen.getByRole('option', { name: 'Cash' }));
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());

    const tagsInput = screen.getByLabelText('Tags (optional)');
    fireEvent.mouseDown(tagsInput);
    fireEvent.click(screen.getByRole('option', { name: 'Vacation' }));
    expect(screen.getByText('Vacation')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add Transfer' }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ tags: ['vacation'] })),
    );
  });
});
