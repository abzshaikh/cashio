import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { YearSelector } from './YearSelector';

describe('YearSelector', () => {
  it('shows the label', () => {
    render(<YearSelector label="2026" onPrevious={vi.fn()} onNext={vi.fn()} nextDisabled={false} />);
    expect(screen.getByText('2026')).toBeInTheDocument();
  });

  it('calls onPrevious and onNext', () => {
    const onPrevious = vi.fn();
    const onNext = vi.fn();
    render(<YearSelector label="2026" onPrevious={onPrevious} onNext={onNext} nextDisabled={false} />);
    fireEvent.click(screen.getByLabelText('Previous year'));
    fireEvent.click(screen.getByLabelText('Next year'));
    expect(onPrevious).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('disables "Next year" when nextDisabled is true', () => {
    render(<YearSelector label="2026" onPrevious={vi.fn()} onNext={vi.fn()} nextDisabled />);
    expect(screen.getByLabelText('Next year')).toBeDisabled();
  });
});
