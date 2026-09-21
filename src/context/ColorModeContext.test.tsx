import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ColorModeProvider, useColorMode } from './ColorModeContext';

function TestHarness() {
  const { mode, toggleMode } = useColorMode();
  return (
    <div>
      <span>Current mode: {mode}</span>
      <button onClick={toggleMode}>Toggle</button>
    </div>
  );
}

describe('ColorModeProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('defaults to light mode when nothing is stored', () => {
    render(
      <ColorModeProvider>
        <TestHarness />
      </ColorModeProvider>,
    );
    expect(screen.getByText('Current mode: light')).toBeInTheDocument();
  });

  it('toggles between light and dark, persisting the choice', () => {
    render(
      <ColorModeProvider>
        <TestHarness />
      </ColorModeProvider>,
    );
    fireEvent.click(screen.getByText('Toggle'));
    expect(screen.getByText('Current mode: dark')).toBeInTheDocument();
    expect(window.localStorage.getItem('budget-tracker:color-mode')).toBe('dark');
  });
});
