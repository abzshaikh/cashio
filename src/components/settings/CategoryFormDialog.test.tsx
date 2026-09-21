import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CategoryFormDialog } from './CategoryFormDialog';

describe('CategoryFormDialog', () => {
  it('renders the create title', () => {
    render(<CategoryFormDialog open mode="create" onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Add Category' })).toBeInTheDocument();
  });

  it('renders the edit title and populates the initial name', () => {
    render(
      <CategoryFormDialog
        open
        mode="edit"
        initialValues={{ name: 'Food' }}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Rename Category' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Food')).toBeInTheDocument();
  });

  it('shows a validation error and does not submit a blank name', async () => {
    const onSubmit = vi.fn();
    render(<CategoryFormDialog open mode="create" onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add Category' }));
    await waitFor(() =>
      expect(screen.getByText('Category name is required')).toBeInTheDocument(),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the entered name', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<CategoryFormDialog open mode="create" onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Category name'), { target: { value: 'Pet Care' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Category' }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: 'Pet Care' })),
    );
  });

  it('shows the error message returned by a failed submit', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Network error'));
    render(<CategoryFormDialog open mode="create" onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Category name'), { target: { value: 'Pet Care' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Category' }));
    await waitFor(() => expect(screen.getByText('Network error')).toBeInTheDocument());
  });
});
