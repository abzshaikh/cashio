import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders as render } from '../../test/renderWithProviders';
import { BudgetTemplatesSection } from './BudgetTemplatesSection';
import type { BudgetTemplate } from '../../types/budgetTemplate';

const useBudgetTemplatesMock = vi.fn();
vi.mock('../../hooks/useBudgetTemplates', () => ({
  useBudgetTemplates: () => useBudgetTemplatesMock(),
}));

const template: BudgetTemplate = {
  id: 't1',
  userId: 'user-1',
  name: 'Standard month',
  period: 'monthly',
  scope: 'overall',
  overallAmount: 1000,
  items: [],
  warningThreshold: 80,
  overThreshold: 100,
  createdAt: '',
  updatedAt: '',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('BudgetTemplatesSection', () => {
  it('shows an empty state when there are no templates', () => {
    useBudgetTemplatesMock.mockReturnValue({ templates: [], error: null, reload: vi.fn() });
    render(<BudgetTemplatesSection onUse={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('No templates yet')).toBeInTheDocument();
  });

  it('shows an error state when loading fails', () => {
    useBudgetTemplatesMock.mockReturnValue({
      templates: null,
      error: new Error('Failed to load'),
      reload: vi.fn(),
    });
    render(<BudgetTemplatesSection onUse={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });

  it('renders a row per template and calls onUse/onDelete', () => {
    const onUse = vi.fn();
    const onDelete = vi.fn();
    useBudgetTemplatesMock.mockReturnValue({ templates: [template], error: null, reload: vi.fn() });
    render(<BudgetTemplatesSection onUse={onUse} onDelete={onDelete} />);
    expect(screen.getByText('Standard month')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Use template Standard month'));
    expect(onUse).toHaveBeenCalledWith(template);

    fireEvent.click(screen.getByLabelText('Delete template Standard month'));
    expect(onDelete).toHaveBeenCalledWith(template);
  });
});
