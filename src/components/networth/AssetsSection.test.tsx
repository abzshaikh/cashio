import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders as render } from '../../test/renderWithProviders';
import { AssetsSection } from './AssetsSection';
import type { Asset } from '../../types/asset';

const asset: Asset = {
  id: 'a1',
  userId: 'user-1',
  type: 'property',
  label: 'House',
  value: 500000,
  asOf: '2026-01-01',
  createdAt: '',
  updatedAt: '',
};

describe('AssetsSection', () => {
  it('shows an empty state when there are no assets', () => {
    render(
      <AssetsSection
        assets={[]}
        error={null}
        onAdd={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onRetry={vi.fn()}
      />,
    );
    expect(screen.getByText('No other assets yet')).toBeInTheDocument();
  });

  it('shows an error state and retries', () => {
    const onRetry = vi.fn();
    render(
      <AssetsSection
        assets={null}
        error={new Error('Failed to load')}
        onAdd={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onRetry={onRetry}
      />,
    );
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });

  it('renders a row per asset and calls onEdit/onDelete/onAdd', () => {
    const onAdd = vi.fn();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(
      <AssetsSection
        assets={[asset]}
        error={null}
        onAdd={onAdd}
        onEdit={onEdit}
        onDelete={onDelete}
        onRetry={vi.fn()}
      />,
    );
    expect(screen.getByText('House')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add Asset' }));
    expect(onAdd).toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText('Edit asset House'));
    expect(onEdit).toHaveBeenCalledWith(asset);

    fireEvent.click(screen.getByLabelText('Delete asset House'));
    expect(onDelete).toHaveBeenCalledWith(asset);
  });
});
