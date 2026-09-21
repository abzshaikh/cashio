import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders as render } from '../../test/renderWithProviders';
import { GoalCard } from './GoalCard';
import { toDateOnlyString } from '../../utils/formatDate';
import type { SavingsGoal } from '../../types/savingsGoal';
import type { GoalContribution } from '../../types/goalContribution';

const goal: SavingsGoal = {
  id: 'g1',
  userId: 'user-1',
  name: 'Rainy Day Fund',
  category: 'emergency_fund',
  targetAmount: 1000,
  targetDate: null,
  notes: '',
  createdAt: '',
  updatedAt: '',
};

function makeContribution(overrides: Partial<GoalContribution> = {}): GoalContribution {
  return {
    id: 'c1',
    userId: 'user-1',
    goalId: 'g1',
    amount: 100,
    date: '2026-02-01',
    note: '',
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

function renderCard(props: Partial<Parameters<typeof GoalCard>[0]> = {}) {
  return render(
    <GoalCard
      goal={goal}
      contributions={[]}
      onEdit={vi.fn()}
      onDelete={vi.fn()}
      onAddContribution={vi.fn()}
      onDeleteContribution={vi.fn()}
      {...props}
    />,
  );
}

describe('GoalCard', () => {
  it('renders the goal name, category, and current/target amounts', () => {
    renderCard({ contributions: [makeContribution({ amount: 400 })] });
    expect(screen.getByText('Rainy Day Fund')).toBeInTheDocument();
    expect(screen.getByText('40.0%')).toBeInTheDocument();
  });

  it('shows "No target date" when the goal has none', () => {
    renderCard();
    expect(screen.getByText('No target date')).toBeInTheDocument();
  });

  it('shows the target date and days remaining when one is set', () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 10);
    renderCard({
      // A goal's `targetDate` is a local-calendar "YYYY-MM-DD" string (see
      // `goalService.ts`'s `mapSavingsGoalDoc`), never a full ISO instant —
      // matching that here, not `.toISOString()`, is what makes this
      // "10 days left" assertion timezone-independent.
      goal: { ...goal, targetDate: toDateOnlyString(soon) },
      contributions: [],
    });
    expect(screen.getByText('10 days left')).toBeInTheDocument();
  });

  it('shows "Goal reached" once contributions meet the target', () => {
    renderCard({ contributions: [makeContribution({ amount: 1000 })] });
    expect(screen.getByText('Goal reached')).toBeInTheDocument();
  });

  it('shows "Past due" once the target date has passed without completing', () => {
    const past = new Date();
    past.setDate(past.getDate() - 5);
    renderCard({ goal: { ...goal, targetDate: toDateOnlyString(past) }, contributions: [] });
    expect(screen.getByText('Past due')).toBeInTheDocument();
    expect(screen.getByText('5 days overdue')).toBeInTheDocument();
  });

  it('calls onEdit when Edit is chosen from the menu', () => {
    const onEdit = vi.fn();
    renderCard({ onEdit });
    fireEvent.click(screen.getByLabelText('Actions for Rainy Day Fund'));
    fireEvent.click(screen.getByText('Edit'));
    expect(onEdit).toHaveBeenCalledWith(goal);
  });

  it('calls onDelete when Delete is chosen from the menu', () => {
    const onDelete = vi.fn();
    renderCard({ onDelete });
    fireEvent.click(screen.getByLabelText('Actions for Rainy Day Fund'));
    fireEvent.click(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalledWith(goal);
  });

  it('calls onAddContribution when "Add money" is clicked', () => {
    const onAddContribution = vi.fn();
    renderCard({ onAddContribution });
    fireEvent.click(screen.getByRole('button', { name: /Add money/ }));
    expect(onAddContribution).toHaveBeenCalledWith(goal);
  });

  it('toggles the contribution history and calls onDeleteContribution', async () => {
    const onDeleteContribution = vi.fn();
    const contribution = makeContribution({ amount: 250, note: 'Birthday money' });
    renderCard({ contributions: [contribution], onDeleteContribution });

    expect(screen.queryByText('Birthday money', { exact: false })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Show 1 contribution/ }));
    expect(screen.getByText(/Birthday money/)).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/Delete contribution of 250/));
    expect(onDeleteContribution).toHaveBeenCalledWith(contribution);

    fireEvent.click(screen.getByRole('button', { name: /Hide 1 contribution/ }));
    // MUI's Collapse animates the exit and only unmounts the content once
    // that transition finishes, so this needs to be awaited rather than
    // checked synchronously right after the click.
    await waitFor(() => expect(screen.queryByText(/Birthday money/)).not.toBeInTheDocument());
  });

  it('shows "No contributions yet" when the history is expanded with none', () => {
    renderCard({ contributions: [] });
    fireEvent.click(screen.getByRole('button', { name: /Show 0 contributions/ }));
    expect(screen.getByText('No contributions yet.')).toBeInTheDocument();
  });
});
