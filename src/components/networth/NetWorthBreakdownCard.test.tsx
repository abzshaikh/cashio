import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders as render } from '../../test/renderWithProviders';
import { NetWorthBreakdownCard } from './NetWorthBreakdownCard';

describe('NetWorthBreakdownCard', () => {
  it('shows the empty message when there are no entries', () => {
    render(
      <NetWorthBreakdownCard title="Assets" entries={[]} emptyMessage="Nothing tracked yet." />,
    );
    expect(screen.getByText('Nothing tracked yet.')).toBeInTheDocument();
  });

  it('lists each entry with its amount', () => {
    render(
      <NetWorthBreakdownCard
        title="Assets"
        entries={[
          { label: 'House', amount: 500000 },
          { label: 'Checking', amount: 1000 },
        ]}
        emptyMessage="Nothing tracked yet."
      />,
    );
    expect(screen.getByText('House')).toBeInTheDocument();
    expect(screen.getByText('Checking')).toBeInTheDocument();
  });
});
