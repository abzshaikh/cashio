import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders as render } from '../../test/renderWithProviders';
import { LiabilitiesSection } from './LiabilitiesSection';
import type { Liability } from '../../types/liability';

const liability: Liability = {
  id: 'l1',
  userId: 'user-1',
  type: 'tax',
  label: 'Back taxes',
  value: 3000,
  asOf: '2026-01-01',
  createdAt: '',
  updatedAt: '',
};

describe('LiabilitiesSection', () => {
  it('shows an empty state when there are no liabilities', () => {
    render(
      <LiabilitiesSection
        liabilities={[]}
        error={null}
        onAdd={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onRetry={vi.fn()}
      />,
    );
    expect(screen.getByText('No other liabilities yet')).toBeInTheDocument();
  });

  it('shows an error state', () => {
    render(
      <LiabilitiesSection
        liabilities={null}
        error={new Error('Failed to load')}
        onAdd={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onRetry={vi.fn()}
      />,
    );
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });

  it('renders a row per liability and calls onEdit/onDelete/onAdd', () => {
    const onAdd = vi.fn();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(
      <LiabilitiesSection
        liabilities={[liability]}
        error={null}
        onAdd={onAdd}
        onEdit={onEdit}
        onDelete={onDelete}
        onRetry={vi.fn()}
      />,
    );
    expect(screen.getByText('Back taxes')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add Liability' }));
    expect(onAdd).toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText('Edit liability Back taxes'));
    expect(onEdit).toHaveBeenCalledWith(liability);

    fireEvent.click(screen.getByLabelText('Delete liability Back taxes'));
    expect(onDelete).toHaveBeenCalledWith(liability);
  });
});
