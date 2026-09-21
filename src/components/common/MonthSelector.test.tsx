import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MonthSelector } from './MonthSelector';

describe('MonthSelector', () => {
  it('shows the label', () => {
    render(<MonthSelector label="February 2026" onPrevious={vi.fn()} onNext={vi.fn()} nextDisabled={false} />);
    expect(screen.getByText('February 2026')).toBeInTheDocument();
  });

  it('calls onPrevious and onNext', () => {
    const onPrevious = vi.fn();
    const onNext = vi.fn();
    render(<MonthSelector label="February 2026" onPrevious={onPrevious} onNext={onNext} nextDisabled={false} />);
    fireEvent.click(screen.getByLabelText('Previous month'));
    fireEvent.click(screen.getByLabelText('Next month'));
    expect(onPrevious).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('disables "Next month" when nextDisabled is true', () => {
    render(<MonthSelector label="February 2026" onPrevious={vi.fn()} onNext={vi.fn()} nextDisabled />);
    expect(screen.getByLabelText('Next month')).toBeDisabled();
  });
});
