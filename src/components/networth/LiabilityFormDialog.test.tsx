import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders as render } from '../../test/renderWithProviders';
import { LiabilityFormDialog } from './LiabilityFormDialog';
import type { LiabilityFormValues } from '../../schemas/liabilitySchemas';

describe('LiabilityFormDialog', () => {
  it('renders the create title', () => {
    render(<LiabilityFormDialog open mode="create" onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Add Liability' })).toBeInTheDocument();
  });

  it('renders the edit title and populates initial values', () => {
    const initialValues: LiabilityFormValues = {
      type: 'tax',
      label: 'Back taxes',
      value: 3000,
      asOf: new Date('2026-01-01'),
    };
    render(
      <LiabilityFormDialog
        open
        mode="edit"
        initialValues={initialValues}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Edit Liability' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Back taxes')).toBeInTheDocument();
    expect(screen.getByDisplayValue('3000')).toBeInTheDocument();
  });

  it('requires a label', async () => {
    const onSubmit = vi.fn();
    render(<LiabilityFormDialog open mode="create" onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Amount owed'), { target: { value: '1000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Liability' }));
    await waitFor(() => expect(screen.getByText('Enter a label')).toBeInTheDocument());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('requires a positive value', async () => {
    const onSubmit = vi.fn();
    render(<LiabilityFormDialog open mode="create" onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'IOU' } });
    fireEvent.change(screen.getByLabelText('Amount owed'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Liability' }));
    await waitFor(() =>
      expect(screen.getByText('Value must be greater than zero')).toBeInTheDocument(),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits valid values', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<LiabilityFormDialog open mode="create" onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'IOU' } });
    fireEvent.change(screen.getByLabelText('Amount owed'), { target: { value: '500' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Liability' }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ label: 'IOU', value: 500, type: 'other' }),
      ),
    );
  });
});
