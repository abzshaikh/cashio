import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SubcategoryFormDialog } from './SubcategoryFormDialog';

describe('SubcategoryFormDialog', () => {
  it('renders the create title with the parent category name', () => {
    render(
      <SubcategoryFormDialog
        open
        mode="create"
        categoryName="Food"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(
      screen.getByRole('heading', { name: 'Add Subcategory to Food' }),
    ).toBeInTheDocument();
  });

  it('renders the edit title and populates the initial name', () => {
    render(
      <SubcategoryFormDialog
        open
        mode="edit"
        categoryName="Food"
        initialValues={{ name: 'Restaurants' }}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Rename Subcategory' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Restaurants')).toBeInTheDocument();
  });

  it('shows a validation error and does not submit a blank name', async () => {
    const onSubmit = vi.fn();
    render(
      <SubcategoryFormDialog
        open
        mode="create"
        categoryName="Food"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Add Subcategory' }));
    await waitFor(() =>
      expect(screen.getByText('Subcategory name is required')).toBeInTheDocument(),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the entered name', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <SubcategoryFormDialog
        open
        mode="create"
        categoryName="Food"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.change(screen.getByLabelText('Subcategory name'), {
      target: { value: 'Meal Kits' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add Subcategory' }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: 'Meal Kits' })),
    );
  });
});
