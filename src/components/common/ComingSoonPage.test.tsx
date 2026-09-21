import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import { ComingSoonPage } from './ComingSoonPage';

describe('ComingSoonPage', () => {
  it('renders the title, subtitle and phase label', () => {
    render(
      <ComingSoonPage
        title="Dashboard"
        subtitle="Your financial overview at a glance."
        icon={DashboardOutlinedIcon}
        phaseLabel="Phase 11"
      />,
    );
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByText('Your financial overview at a glance.')).toBeInTheDocument();
    expect(screen.getByText('Phase 11')).toBeInTheDocument();
    expect(screen.getByText('Coming soon')).toBeInTheDocument();
  });
});
