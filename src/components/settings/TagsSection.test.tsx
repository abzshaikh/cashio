import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { TagsSection } from './TagsSection';
import type { Tag } from '../../types/tag';

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

const useTagsMock = vi.fn();
vi.mock('../../hooks/useTags', () => ({
  useTags: () => useTagsMock(),
}));

const createTagMock = vi.fn();
const updateTagMock = vi.fn();
const deleteTagMock = vi.fn();
vi.mock('../../services/tagService', () => ({
  createTag: (...args: unknown[]) => createTagMock(...args),
  updateTag: (...args: unknown[]) => updateTagMock(...args),
  deleteTag: (...args: unknown[]) => deleteTagMock(...args),
}));

const vacationTag: Tag = {
  id: 'tag-1',
  userId: 'user-1',
  slug: 'vacation',
  name: 'Vacation',
  color: 'primary',
  createdAt: '',
  updatedAt: '',
};

const businessTag: Tag = {
  id: 'tag-2',
  userId: 'user-1',
  slug: 'business',
  name: 'Business',
  color: 'success',
  createdAt: '',
  updatedAt: '',
};

function setup(overrides: Partial<ReturnType<typeof useTagsMock>> = {}) {
  useAuthMock.mockReturnValue({ user: { uid: 'user-1' } });
  useTagsMock.mockReturnValue({
    tags: [vacationTag, businessTag],
    error: null,
    reload: vi.fn(),
    ...overrides,
  });
  render(<TagsSection />);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TagsSection', () => {
  it('shows a loading state while tags are still subscribing', () => {
    setup({ tags: null });
    expect(screen.getByText('Loading tags…')).toBeInTheDocument();
  });

  it('shows an empty state with a call to action when there are no tags yet', () => {
    setup({ tags: [] });
    expect(screen.getByText('No tags yet')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Add Tag' })[0]);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows an error state and retries on demand', () => {
    const reload = vi.fn();
    setup({ tags: [], error: new Error('Failed to load'), reload });
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(reload).toHaveBeenCalled();
  });

  it('renders each tag as a colored chip', () => {
    setup();
    expect(screen.getByText('Vacation')).toBeInTheDocument();
    expect(screen.getByText('Business')).toBeInTheDocument();
  });

  it('creates a custom tag', async () => {
    createTagMock.mockResolvedValue('new-id');
    setup();
    fireEvent.click(screen.getAllByRole('button', { name: 'Add Tag' })[0]);
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Tag name'), {
      target: { value: 'Reimbursable' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add Tag' }));
    await waitFor(() =>
      expect(createTagMock).toHaveBeenCalledWith('user-1', ['vacation', 'business'], {
        name: 'Reimbursable',
        color: 'default',
      }),
    );
    expect(notifySuccess).toHaveBeenCalledWith('Tag added');
  });

  it('renames and recolors a tag by clicking its chip', async () => {
    updateTagMock.mockResolvedValue(undefined);
    setup();
    fireEvent.click(screen.getByText('Business'));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByDisplayValue('Business')).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText('Tag name'), { target: { value: 'Work' } });
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Blue' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(updateTagMock).toHaveBeenCalledWith('tag-2', { name: 'Work', color: 'primary' }),
    );
    expect(notifySuccess).toHaveBeenCalledWith('Tag updated');
  });

  it('deletes a tag after confirmation', async () => {
    confirmMock.mockResolvedValue(true);
    deleteTagMock.mockResolvedValue(undefined);
    setup();
    const chip = screen.getByText('Vacation').closest('.MuiChip-root');
    if (!chip) throw new Error('Tag chip not found');
    const deleteIcon = chip.querySelector('.MuiChip-deleteIcon');
    if (!deleteIcon) throw new Error('Chip delete icon not found');
    fireEvent.click(deleteIcon);
    await waitFor(() => expect(deleteTagMock).toHaveBeenCalledWith('tag-1'));
    expect(notifySuccess).toHaveBeenCalledWith('Tag deleted');
  });

  it('does not delete a tag when the confirmation is declined', async () => {
    confirmMock.mockResolvedValue(false);
    setup();
    const chip = screen.getByText('Vacation').closest('.MuiChip-root');
    if (!chip) throw new Error('Tag chip not found');
    const deleteIcon = chip.querySelector('.MuiChip-deleteIcon');
    if (!deleteIcon) throw new Error('Chip delete icon not found');
    fireEvent.click(deleteIcon);
    await waitFor(() => expect(confirmMock).toHaveBeenCalled());
    expect(deleteTagMock).not.toHaveBeenCalled();
  });
});
