import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useYearNavigation } from './useYearNavigation';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-02-15T12:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useYearNavigation', () => {
  it('starts on the current year, at the current-year boundary', () => {
    const { result } = renderHook(() => useYearNavigation());
    expect(result.current.yearLabel).toBe('2026');
    expect(result.current.selectedYear).toBe(2026);
    expect(result.current.yearStart).toBe('2026-01-01');
    expect(result.current.yearEnd).toBe('2026-12-31');
    expect(result.current.isAtCurrentYear).toBe(true);
  });

  it('goes to the previous year and back', () => {
    const { result } = renderHook(() => useYearNavigation());

    act(() => result.current.goToPreviousYear());
    expect(result.current.yearLabel).toBe('2025');
    expect(result.current.isAtCurrentYear).toBe(false);

    act(() => result.current.goToNextYear());
    expect(result.current.yearLabel).toBe('2026');
    expect(result.current.isAtCurrentYear).toBe(true);
  });

  it('never navigates past the current year', () => {
    const { result } = renderHook(() => useYearNavigation());

    act(() => result.current.goToNextYear());
    expect(result.current.yearLabel).toBe('2026');
    expect(result.current.isAtCurrentYear).toBe(true);
  });

  it('can walk back multiple years', () => {
    const { result } = renderHook(() => useYearNavigation());

    act(() => result.current.goToPreviousYear());
    act(() => result.current.goToPreviousYear());
    expect(result.current.yearLabel).toBe('2024');
    expect(result.current.yearStart).toBe('2024-01-01');
    expect(result.current.yearEnd).toBe('2024-12-31');
  });
});
