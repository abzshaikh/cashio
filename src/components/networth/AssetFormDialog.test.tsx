import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders as render } from '../../test/renderWithProviders';
import { AssetFormDialog } from './AssetFormDialog';
import type { AssetFormValues } from '../../schemas/assetSchemas';

describe('AssetFormDialog', () => {
  it('renders the create title', () => {
    render(<AssetFormDialog open mode="create" onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Add Asset' })).toBeInTheDocument();
  });

  it('renders the edit title and populates initial values', () => {
    const initialValues: AssetFormValues = {
      type: 'property',
      label: 'Family home',
      value: 500000,
      asOf: new Date('2026-01-01'),
    };
    render(
      <AssetFormDialog open mode="edit" initialValues={initialValues} onClose={vi.fn()} onSubmit={vi.fn()} />,
    );
    expect(screen.getByRole('heading', { name: 'Edit Asset' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Family home')).toBeInTheDocument();
    expect(screen.getByDisplayValue('500000')).toBeInTheDocument();
  });

  it('requires a label', async () => {
    const onSubmit = vi.fn();
    render(<AssetFormDialog open mode="create" onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Current value'), { target: { value: '1000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Asset' }));
    await waitFor(() => expect(screen.getByText('Enter a label')).toBeInTheDocument());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('requires a positive value', async () => {
    const onSubmit = vi.fn();
    render(<AssetFormDialog open mode="create" onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'Car' } });
    fireEvent.change(screen.getByLabelText('Current value'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Asset' }));
    await waitFor(() =>
      expect(screen.getByText('Value must be greater than zero')).toBeInTheDocument(),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits valid values', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<AssetFormDialog open mode="create" onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'Car' } });
    fireEvent.change(screen.getByLabelText('Current value'), { target: { value: '20000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Asset' }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ label: 'Car', value: 20000, type: 'other' }),
      ),
    );
  });
});
