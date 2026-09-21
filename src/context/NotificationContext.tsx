import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert, { type AlertColor } from '@mui/material/Alert';

interface NotifyOptions {
  message: string;
  severity?: AlertColor;
  /** Milliseconds before auto-hide. Defaults to 5000. */
  duration?: number;
}

interface QueuedNotification extends Required<Omit<NotifyOptions, 'duration'>> {
  key: number;
  duration: number;
}

interface NotificationContextValue {
  notify: (options: NotifyOptions | string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(
  null,
);

let nextKey = 1;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<QueuedNotification[]>([]);
  const [current, setCurrent] = useState<QueuedNotification | null>(null);
  const [open, setOpen] = useState(false);

  const notify = useCallback((options: NotifyOptions | string) => {
    const normalized: NotifyOptions =
      typeof options === 'string' ? { message: options } : options;
    setQueue((prev) => [
      ...prev,
      {
        key: nextKey++,
        message: normalized.message,
        severity: normalized.severity ?? 'info',
        duration: normalized.duration ?? 5000,
      },
    ]);
  }, []);

  // Advance the queue: when nothing is showing, pop the next item.
  if (!current && queue.length > 0) {
    setCurrent(queue[0]);
    setQueue((prev) => prev.slice(1));
    setOpen(true);
  }

  const handleClose = useCallback(
    (_event?: unknown, reason?: string) => {
      if (reason === 'clickaway') return;
      setOpen(false);
    },
    [],
  );

  const handleExited = useCallback(() => {
    setCurrent(null);
  }, []);

  const value = useMemo<NotificationContextValue>(
    () => ({
      notify,
      success: (message) => notify({ message, severity: 'success' }),
      error: (message) => notify({ message, severity: 'error' }),
      warning: (message) => notify({ message, severity: 'warning' }),
      info: (message) => notify({ message, severity: 'info' }),
    }),
    [notify],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <Snackbar
        key={current?.key}
        open={open}
        autoHideDuration={current?.duration}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        slotProps={{ transition: { onExited: handleExited } }}
      >
        {current ? (
          <Alert
            onClose={handleClose}
            severity={current.severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {current.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </NotificationContext.Provider>
  );
}

export function useNotification(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error(
      'useNotification must be used within a NotificationProvider',
    );
  }
  return ctx;
}
