import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useMonthNavigation } from './useMonthNavigation';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-02-15T12:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useMonthNavigation', () => {
  it('starts on the current month, at the current-month boundary', () => {
    const { result } = renderHook(() => useMonthNavigation());
    expect(result.current.monthLabel).toBe('February 2026');
    expect(result.current.monthStart).toBe('2026-02-01');
    expect(result.current.monthEnd).toBe('2026-02-28');
    expect(result.current.isAtCurrentMonth).toBe(true);
  });

  it('goes to the previous month and back', () => {
    const { result } = renderHook(() => useMonthNavigation());

    act(() => result.current.goToPreviousMonth());
    expect(result.current.monthLabel).toBe('January 2026');
    expect(result.current.isAtCurrentMonth).toBe(false);

    act(() => result.current.goToNextMonth());
    expect(result.current.monthLabel).toBe('February 2026');
    expect(result.current.isAtCurrentMonth).toBe(true);
  });

  it('never navigates past the current month', () => {
    const { result } = renderHook(() => useMonthNavigation());

    act(() => result.current.goToNextMonth());
    expect(result.current.monthLabel).toBe('February 2026');
    expect(result.current.isAtCurrentMonth).toBe(true);
  });

  it('can walk back across a year boundary', () => {
    vi.setSystemTime(new Date('2026-01-15T12:00:00Z'));
    const { result } = renderHook(() => useMonthNavigation());

    act(() => result.current.goToPreviousMonth());
    expect(result.current.monthLabel).toBe('December 2025');
    expect(result.current.monthStart).toBe('2025-12-01');
    expect(result.current.monthEnd).toBe('2025-12-31');
  });
});
