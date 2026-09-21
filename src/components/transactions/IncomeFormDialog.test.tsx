import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders as render } from '../../test/renderWithProviders';
import { IncomeFormDialog } from './IncomeFormDialog';
import type { IncomeFormValues } from '../../schemas/incomeSchemas';
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

describe('IncomeFormDialog', () => {
  it('renders the create title', () => {
    render(
      <IncomeFormDialog
        open
        mode="create"
        accountOptions={accountOptions}
        tags={tags}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Add Income' })).toBeInTheDocument();
  });

  it('renders the edit title and populates initial values', () => {
    const initialValues: IncomeFormValues = {
      amount: 5000,
      date: new Date('2026-01-15'),
      accountId: 'acc-1',
      category: 'salary',
      source: 'Acme Corp',
      description: '',
      notes: '',
      isRecurring: false,
      tags: [],
    };
    render(
      <IncomeFormDialog
        open
        mode="edit"
        initialValues={initialValues}
        accountOptions={accountOptions}
        tags={tags}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Edit Income' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('5000')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Acme Corp')).toBeInTheDocument();
  });

  it('shows a validation error and does not submit without an account', async () => {
    const onSubmit = vi.fn();
    render(
      <IncomeFormDialog
        open
        mode="create"
        accountOptions={accountOptions}
        tags={tags}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Income' }));
    await waitFor(() => expect(screen.getByText('Select an account')).toBeInTheDocument());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects a zero or negative amount', async () => {
    const onSubmit = vi.fn();
    render(
      <IncomeFormDialog
        open
        mode="create"
        accountOptions={accountOptions}
        tags={tags}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Income' }));
    await waitFor(() =>
      expect(screen.getByText('Amount must be greater than zero')).toBeInTheDocument(),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the entered values', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <IncomeFormDialog
        open
        mode="create"
        accountOptions={accountOptions}
        tags={tags}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '5000' } });
    fireEvent.change(screen.getByLabelText('Source (optional)'), {
      target: { value: 'Acme Corp' },
    });
    fireEvent.mouseDown(screen.getByLabelText('Account'));
    fireEvent.click(screen.getByRole('option', { name: 'HDFC Bank' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add Income' }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 5000, accountId: 'acc-1', source: 'Acme Corp' }),
      ),
    );
  });

  it('shows the error message returned by a failed submit', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Network error'));
    render(
      <IncomeFormDialog
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
    fireEvent.click(screen.getByRole('option', { name: 'Cash' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add Income' }));
    await waitFor(() => expect(screen.getByText('Network error')).toBeInTheDocument());
  });

  it('lets the user pick tags from the real tag list and submits their slugs', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <IncomeFormDialog
        open
        mode="create"
        accountOptions={accountOptions}
        tags={tags}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '5000' } });
    fireEvent.mouseDown(screen.getByLabelText('Account'));
    fireEvent.click(screen.getByRole('option', { name: 'HDFC Bank' }));
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());

    const tagsInput = screen.getByLabelText('Tags (optional)');
    fireEvent.mouseDown(tagsInput);
    fireEvent.click(screen.getByRole('option', { name: 'Business' }));
    expect(screen.getByText('Business')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add Income' }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ tags: ['business'] })),
    );
  });
});
