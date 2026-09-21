import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { NotificationProvider, useNotification } from './NotificationContext';

function TestHarness() {
  const { success } = useNotification();
  return <button onClick={() => success('Saved successfully')}>Trigger</button>;
}

describe('NotificationProvider', () => {
  it('shows a snackbar with the notified message', async () => {
    render(
      <NotificationProvider>
        <TestHarness />
      </NotificationProvider>,
    );
    screen.getByText('Trigger').click();
    await waitFor(() => expect(screen.getByText('Saved successfully')).toBeInTheDocument());
  });
});
