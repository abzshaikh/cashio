import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderWithProviders as render } from '../../test/renderWithProviders';
import { GoalsPage } from './GoalsPage';
import type { SavingsGoal } from '../../types/savingsGoal';
import type { GoalContribution } from '../../types/goalContribution';

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

const subscribeToSavingsGoalsMock = vi.fn();
const subscribeToGoalContributionsMock = vi.fn();
const createSavingsGoalMock = vi.fn();
const updateSavingsGoalMock = vi.fn();
const deleteSavingsGoalMock = vi.fn();
const createGoalContributionMock = vi.fn();
const deleteGoalContributionMock = vi.fn();
vi.mock('../../services/goalService', () => ({
  subscribeToSavingsGoals: (...args: unknown[]) => subscribeToSavingsGoalsMock(...args),
  subscribeToGoalContributions: (...args: unknown[]) => subscribeToGoalContributionsMock(...args),
  createSavingsGoal: (...args: unknown[]) => createSavingsGoalMock(...args),
  updateSavingsGoal: (...args: unknown[]) => updateSavingsGoalMock(...args),
  deleteSavingsGoal: (...args: unknown[]) => deleteSavingsGoalMock(...args),
  createGoalContribution: (...args: unknown[]) => createGoalContributionMock(...args),
  deleteGoalContribution: (...args: unknown[]) => deleteGoalContributionMock(...args),
}));

const emergencyGoal: SavingsGoal = {
  id: 'g1',
  userId: 'user-1',
  name: 'Rainy Day Fund',
  category: 'emergency_fund',
  targetAmount: 100000,
  targetDate: null,
  notes: '',
  createdAt: '',
  updatedAt: '',
};

const vacationGoal: SavingsGoal = {
  id: 'g2',
  userId: 'user-1',
  name: 'Bali Trip',
  category: 'vacation',
  targetAmount: 50000,
  targetDate: '2026-12-01',
  notes: '',
  createdAt: '',
  updatedAt: '',
};

const contribution: GoalContribution = {
  id: 'c1',
  userId: 'user-1',
  goalId: 'g1',
  amount: 20000,
  date: '2026-02-01',
  note: 'Bonus',
  createdAt: '',
  updatedAt: '',
};

function setup(
  goals: SavingsGoal[] | 'error' = [emergencyGoal],
  contributions: GoalContribution[] = [contribution],
) {
  useAuthMock.mockReturnValue({ user: { uid: 'user-1' }, profile: { currency: 'INR' } });
  subscribeToSavingsGoalsMock.mockImplementation((_uid, onData, onError) => {
    if (goals === 'error') {
      onError(new Error('Failed to load'));
    } else {
      onData(goals);
    }
    return vi.fn();
  });
  subscribeToGoalContributionsMock.mockImplementation((_uid, onData) => {
    onData(contributions);
    return vi.fn();
  });
  render(<GoalsPage />);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GoalsPage', () => {
  it('shows an empty state when there are no goals', () => {
    setup([], []);
    expect(screen.getByText('No savings goals yet')).toBeInTheDocument();
  });

  it('renders a card per goal with its progress', () => {
    setup([emergencyGoal, vacationGoal], [contribution]);
    expect(screen.getByText('Rainy Day Fund')).toBeInTheDocument();
    expect(screen.getByText('Bali Trip')).toBeInTheDocument();
  });

  it('shows an error state when the subscription fails', () => {
    setup('error', []);
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });

  it('shows total saved, total target, and goals completed stat cards', () => {
    setup([emergencyGoal], [contribution]);
    expect(screen.getByText('Total saved')).toBeInTheDocument();
    expect(screen.getByText('Total target')).toBeInTheDocument();
    expect(screen.getByText('Goals completed')).toBeInTheDocument();
    expect(screen.getByText('0 / 1')).toBeInTheDocument();
  });

  it('opens the create dialog and creates a goal', async () => {
    createSavingsGoalMock.mockResolvedValue('new-id');
    setup([], []);
    fireEvent.click(screen.getAllByRole('button', { name: 'Add Goal' })[0]);
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Goal name'), {
      target: { value: 'New Laptop' },
    });
    fireEvent.change(within(dialog).getByLabelText('Target amount'), {
      target: { value: '80000' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add Goal' }));
    await waitFor(() =>
      expect(createSavingsGoalMock).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ name: 'New Laptop', targetAmount: 80000, targetDate: null }),
      ),
    );
    expect(notifySuccess).toHaveBeenCalledWith('Goal added');
  });

  it('opens the edit dialog with populated values and updates a goal', async () => {
    updateSavingsGoalMock.mockResolvedValue(undefined);
    setup([emergencyGoal], []);
    fireEvent.click(screen.getByLabelText('Actions for Rainy Day Fund'));
    fireEvent.click(screen.getByText('Edit'));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByDisplayValue('Rainy Day Fund')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(updateSavingsGoalMock).toHaveBeenCalledWith(
        'g1',
        expect.objectContaining({ name: 'Rainy Day Fund' }),
      ),
    );
    expect(notifySuccess).toHaveBeenCalledWith('Goal updated');
  });

  it('deletes a goal after confirmation', async () => {
    confirmMock.mockResolvedValue(true);
    deleteSavingsGoalMock.mockResolvedValue(undefined);
    setup([emergencyGoal], []);
    fireEvent.click(screen.getByLabelText('Actions for Rainy Day Fund'));
    fireEvent.click(screen.getByText('Delete'));
    await waitFor(() => expect(deleteSavingsGoalMock).toHaveBeenCalledWith('user-1', 'g1'));
    expect(notifySuccess).toHaveBeenCalledWith('Goal deleted');
  });

  it('does not delete a goal when the confirmation is declined', async () => {
    confirmMock.mockResolvedValue(false);
    setup([emergencyGoal], []);
    fireEvent.click(screen.getByLabelText('Actions for Rainy Day Fund'));
    fireEvent.click(screen.getByText('Delete'));
    await waitFor(() => expect(confirmMock).toHaveBeenCalled());
    expect(deleteSavingsGoalMock).not.toHaveBeenCalled();
  });

  it('opens the add-contribution dialog from a goal card and adds a contribution', async () => {
    createGoalContributionMock.mockResolvedValue('new-contribution-id');
    setup([emergencyGoal], []);
    fireEvent.click(screen.getByRole('button', { name: /Add money/ }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Add money to "Rainy Day Fund"')).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText('Amount'), { target: { value: '5000' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add' }));
    await waitFor(() =>
      expect(createGoalContributionMock).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ amount: 5000, goalId: 'g1' }),
      ),
    );
    expect(notifySuccess).toHaveBeenCalledWith('Contribution added');
  });

  it('deletes a contribution from the history list after confirmation', async () => {
    confirmMock.mockResolvedValue(true);
    deleteGoalContributionMock.mockResolvedValue(undefined);
    setup([emergencyGoal], [contribution]);
    fireEvent.click(screen.getByRole('button', { name: /Show 1 contribution/ }));
    fireEvent.click(screen.getByLabelText(/Delete contribution of 20000/));
    await waitFor(() => expect(deleteGoalContributionMock).toHaveBeenCalledWith('c1'));
    expect(notifySuccess).toHaveBeenCalledWith('Contribution deleted');
  });
});
