import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { CategoriesSection } from './CategoriesSection';
import type { ExpenseCategoryRecord } from '../../types/category';

const useAuthMock = vi.fn();
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

const notifySuccess = vi.fn();
const notifyError = vi.fn();
vi.mock('../../context/NotificationContext', () => ({
  useNotification: () => ({ success: notifySuccess, error: notifyError }),
}));

const confirmMock = vi.fn();
vi.mock('../../context/ConfirmDialogContext', () => ({
  useConfirm: () => confirmMock,
}));

const useExpenseCategoriesMock = vi.fn();
vi.mock('../../hooks/useExpenseCategories', () => ({
  useExpenseCategories: () => useExpenseCategoriesMock(),
}));

const createExpenseCategoryMock = vi.fn();
const renameExpenseCategoryMock = vi.fn();
const deleteExpenseCategoryMock = vi.fn();
const addExpenseSubcategoryMock = vi.fn();
const renameExpenseSubcategoryMock = vi.fn();
const removeExpenseSubcategoryMock = vi.fn();
vi.mock('../../services/categoryService', () => ({
  createExpenseCategory: (...args: unknown[]) => createExpenseCategoryMock(...args),
  renameExpenseCategory: (...args: unknown[]) => renameExpenseCategoryMock(...args),
  deleteExpenseCategory: (...args: unknown[]) => deleteExpenseCategoryMock(...args),
  addExpenseSubcategory: (...args: unknown[]) => addExpenseSubcategoryMock(...args),
  renameExpenseSubcategory: (...args: unknown[]) => renameExpenseSubcategoryMock(...args),
  removeExpenseSubcategory: (...args: unknown[]) => removeExpenseSubcategoryMock(...args),
}));

const foodCategory: ExpenseCategoryRecord = {
  id: 'cat-food',
  userId: 'user-1',
  slug: 'food',
  name: 'Food',
  isDefault: true,
  subcategories: [{ slug: 'restaurants', name: 'Restaurants' }],
  createdAt: '',
  updatedAt: '',
};

const petCareCategory: ExpenseCategoryRecord = {
  id: 'cat-pet-care',
  userId: 'user-1',
  slug: 'pet_care',
  name: 'Pet Care',
  isDefault: false,
  subcategories: [],
  createdAt: '',
  updatedAt: '',
};

function setup(overrides: Partial<ReturnType<typeof useExpenseCategoriesMock>> = {}) {
  useAuthMock.mockReturnValue({ user: { uid: 'user-1' } });
  useExpenseCategoriesMock.mockReturnValue({
    categories: [foodCategory, petCareCategory],
    error: null,
    reload: vi.fn(),
    ...overrides,
  });
  render(<CategoriesSection />);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CategoriesSection', () => {
  it('shows a loading state while categories are still subscribing', () => {
    setup({ categories: null });
    expect(screen.getByText('Loading categories…')).toBeInTheDocument();
  });

  it('shows a seeding placeholder when the list is empty', () => {
    setup({ categories: [] });
    expect(screen.getByText('Setting up your categories…')).toBeInTheDocument();
  });

  it('shows an error state and retries on demand', () => {
    const reload = vi.fn();
    setup({ categories: [], error: new Error('Failed to load'), reload });
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(reload).toHaveBeenCalled();
  });

  it('renders each category with its subcategory count and a Default badge', () => {
    setup();
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Pet Care')).toBeInTheDocument();
    expect(screen.getByText('1 subcategory')).toBeInTheDocument();
    expect(screen.getByText('0 subcategories')).toBeInTheDocument();
    expect(screen.getByText('Default')).toBeInTheDocument();
  });

  it('creates a custom category', async () => {
    createExpenseCategoryMock.mockResolvedValue('new-id');
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Add Category' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Category name'), {
      target: { value: 'Travel' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add Category' }));
    await waitFor(() =>
      expect(createExpenseCategoryMock).toHaveBeenCalledWith(
        'user-1',
        ['food', 'pet_care'],
        'Travel',
      ),
    );
    expect(notifySuccess).toHaveBeenCalledWith('Category added');
  });

  it('renames a category from its actions menu', async () => {
    renameExpenseCategoryMock.mockResolvedValue(undefined);
    setup();
    fireEvent.click(screen.getByLabelText('Actions for Pet Care'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Rename' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByDisplayValue('Pet Care')).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText('Category name'), {
      target: { value: 'Pets' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(renameExpenseCategoryMock).toHaveBeenCalledWith('cat-pet-care', 'Pets'),
    );
    expect(notifySuccess).toHaveBeenCalledWith('Category updated');
  });

  it('deletes a category after confirmation', async () => {
    confirmMock.mockResolvedValue(true);
    deleteExpenseCategoryMock.mockResolvedValue(undefined);
    setup();
    fireEvent.click(screen.getByLabelText('Actions for Pet Care'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    await waitFor(() => expect(deleteExpenseCategoryMock).toHaveBeenCalledWith('cat-pet-care'));
    expect(notifySuccess).toHaveBeenCalledWith('Category deleted');
  });

  it('does not delete a category when the confirmation is declined', async () => {
    confirmMock.mockResolvedValue(false);
    setup();
    fireEvent.click(screen.getByLabelText('Actions for Pet Care'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    await waitFor(() => expect(confirmMock).toHaveBeenCalled());
    expect(deleteExpenseCategoryMock).not.toHaveBeenCalled();
  });

  it('adds a subcategory to a category', async () => {
    addExpenseSubcategoryMock.mockResolvedValue(undefined);
    setup();
    // Expand the Food category's accordion to reach its subcategory chips.
    fireEvent.click(screen.getByText('Food'));
    fireEvent.click(screen.getByRole('button', { name: 'Add subcategory' }));
    const dialog = screen.getByRole('dialog');
    expect(
      within(dialog).getByRole('heading', { name: 'Add Subcategory to Food' }),
    ).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText('Subcategory name'), {
      target: { value: 'Meal Kits' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add Subcategory' }));
    await waitFor(() =>
      expect(addExpenseSubcategoryMock).toHaveBeenCalledWith(foodCategory, 'Meal Kits'),
    );
    expect(notifySuccess).toHaveBeenCalledWith('Subcategory added');
  });

  it('renames a subcategory by clicking its chip', async () => {
    renameExpenseSubcategoryMock.mockResolvedValue(undefined);
    setup();
    fireEvent.click(screen.getByText('Food'));
    fireEvent.click(screen.getByText('Restaurants'));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByDisplayValue('Restaurants')).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText('Subcategory name'), {
      target: { value: 'Dining Out' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(renameExpenseSubcategoryMock).toHaveBeenCalledWith(
        foodCategory,
        'restaurants',
        'Dining Out',
      ),
    );
    expect(notifySuccess).toHaveBeenCalledWith('Subcategory updated');
  });

  it('deletes a subcategory after confirmation', async () => {
    confirmMock.mockResolvedValue(true);
    removeExpenseSubcategoryMock.mockResolvedValue(undefined);
    setup();
    fireEvent.click(screen.getByText('Food'));
    const chip = screen.getByText('Restaurants').closest('.MuiChip-root');
    if (!chip) throw new Error('Subcategory chip not found');
    const deleteIcon = chip.querySelector('.MuiChip-deleteIcon');
    if (!deleteIcon) throw new Error('Chip delete icon not found');
    fireEvent.click(deleteIcon);
    await waitFor(() =>
      expect(removeExpenseSubcategoryMock).toHaveBeenCalledWith(foodCategory, 'restaurants'),
    );
    expect(notifySuccess).toHaveBeenCalledWith('Subcategory deleted');
  });
});
