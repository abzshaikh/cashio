import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders as render } from '../../test/renderWithProviders';
import { DateRangeFilter, type DateRangeFilterValue } from './DateRangeFilter';

const defaultValue: DateRangeFilterValue = { preset: 'allTime', customStart: null, customEnd: null };

describe('DateRangeFilter', () => {
  it('renders the preset select with the current value', () => {
    render(<DateRangeFilter value={defaultValue} onChange={vi.fn()} />);
    expect(screen.getByText('All time')).toBeInTheDocument();
  });

  it('does not show custom date pickers unless "Custom range" is selected', () => {
    render(<DateRangeFilter value={defaultValue} onChange={vi.fn()} />);
    expect(screen.queryByRole('group', { name: 'From' })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'To' })).not.toBeInTheDocument();
  });

  it('calls onChange with the new preset when a different option is chosen', async () => {
    const onChange = vi.fn();
    render(<DateRangeFilter value={defaultValue} onChange={onChange} />);
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Date range' }));
    fireEvent.click(screen.getByRole('option', { name: 'This month' }));
    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith({ preset: 'thisMonth', customStart: null, customEnd: null }),
    );
  });

  it('shows custom date pickers when the preset is "custom"', () => {
    render(
      <DateRangeFilter
        value={{ preset: 'custom', customStart: null, customEnd: null }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('group', { name: 'From' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'To' })).toBeInTheDocument();
  });
});
