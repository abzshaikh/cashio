import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TagFormDialog } from './TagFormDialog';

describe('TagFormDialog', () => {
  it('renders the create title, defaulting to the "Gray" color', () => {
    render(<TagFormDialog open mode="create" onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Add Tag' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Gray' })).toHaveAttribute('aria-checked', 'true');
  });

  it('renders the edit title and populates the initial name and color', () => {
    render(
      <TagFormDialog
        open
        mode="edit"
        initialValues={{ name: 'Vacation', color: 'primary' }}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Edit Tag' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Vacation')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Blue' })).toHaveAttribute('aria-checked', 'true');
  });

  it('shows a validation error and does not submit a blank name', async () => {
    const onSubmit = vi.fn();
    render(<TagFormDialog open mode="create" onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add Tag' }));
    await waitFor(() => expect(screen.getByText('Tag name is required')).toBeInTheDocument());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the entered name with the default color', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<TagFormDialog open mode="create" onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Tag name'), { target: { value: 'Business' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Tag' }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ name: 'Business', color: 'default' }),
    );
  });

  it('lets the user pick a different color before submitting', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<TagFormDialog open mode="create" onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Tag name'), { target: { value: 'Business' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Green' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add Tag' }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ name: 'Business', color: 'success' }),
    );
  });

  it('shows the error message returned by a failed submit', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Network error'));
    render(<TagFormDialog open mode="create" onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Tag name'), { target: { value: 'Business' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Tag' }));
    await waitFor(() => expect(screen.getByText('Network error')).toBeInTheDocument());
  });
});
