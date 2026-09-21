import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders as render } from '../../test/renderWithProviders';
import { SaveAsTemplateDialog } from './SaveAsTemplateDialog';
import type { Budget } from '../../types/budget';

const budget: Budget = {
  id: 'b1',
  userId: 'user-1',
  name: 'Monthly essentials',
  period: 'monthly',
  startDate: '2026-02-01',
  endDate: '2026-02-28',
  scope: 'overall',
  overallAmount: 1000,
  items: [],
  warningThreshold: 80,
  overThreshold: 100,
  createdAt: '',
  updatedAt: '',
};

describe('SaveAsTemplateDialog', () => {
  it('renders nothing when there is no source budget', () => {
    render(<SaveAsTemplateDialog open={false} budget={null} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.queryByText('Save as template')).not.toBeInTheDocument();
  });

  it('defaults the name field to the budget\'s own name', () => {
    render(<SaveAsTemplateDialog open budget={budget} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByDisplayValue('Monthly essentials')).toBeInTheDocument();
  });

  it('submits the entered name', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<SaveAsTemplateDialog open budget={budget} onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Template name'), {
      target: { value: 'Standard month' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save template' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ name: 'Standard month' }));
  });

  it('rejects an empty name', async () => {
    const onSubmit = vi.fn();
    render(<SaveAsTemplateDialog open budget={budget} onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Template name'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save template' }));
    await waitFor(() => expect(screen.getByText('Enter a template name')).toBeInTheDocument());
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
